'use client';

import { useCallback, useMemo, useState } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { CalendarDays, LayoutGrid, Play, Timer, Wifi, Banknote } from 'lucide-react';
import { toast } from 'sonner';
import { PageHeader } from '@/components/common/page-header';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Spinner } from '@/components/ui/spinner';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { QR_BOOKING_PREFIX } from '@/core/constants/pos-check-in';
import { POS_QUERY_KEYS } from '../services/pos-check-in.service';
import { useActiveSessions, useFloorPlan, usePendingBookings, useStaffCafe } from '../hooks/usePosCheckIn';
import { usePosHub, usePosHubCleanup } from '../hooks/usePosHub';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { CafeFloorPlan } from './cafe-floor-plan';
import { PosActiveSessionsPanel } from './pos-active-sessions-panel';
import { PosBookingList } from './pos-booking-list';
import { PosCheckInReception } from './pos-check-in-reception';
import { PosSettlementsPanel } from './pos-settlements-panel';
import { PosWalkInPanel } from './pos-walk-in-panel';
import { QrScanPanel } from './qr-scan-panel';
import type {
  ActivatedSession,
  CafeSessionDetail,
  CafeTable,
  FloorPlanQueryParams,
  FloorPlanStatusFilter,
  QrResolveResult,
  TableBooking,
} from '../types/pos-check-in.interface';

/** Query params cho sơ đồ — luôn lấy đủ bàn; status lọc trên UI sau khi merge */
function buildFloorPlanParams(includeInactive: boolean): FloorPlanQueryParams {
  return {
    includeOnlyAvailable: false,
    includeInactive,
  };
}

function mergeTablesWithActiveSessionsAndBookings(
  baseTables: CafeTable[],
  bookings: TableBooking[],
  activeSessions: CafeSessionDetail[],
): CafeTable[] {
  const tableMap = new Map<string, CafeTable>();

  baseTables.forEach((t) => {
    tableMap.set(t.id, { ...t });
  });

  activeSessions.forEach((session) => {
    // Server còn Active/Checking/Unpaid → luôn hiện Occupied (không tin localStorage paid)
    const status = String(session.status || '');
    if (
      status === 'Completed' ||
      status === 'Paid' ||
      status === 'Cancelled' ||
      !session.sessionId
    ) {
      return;
    }

    let targetTable = session.tableId ? tableMap.get(session.tableId) : undefined;
    if (!targetTable && session.tableLabel) {
      for (const t of tableMap.values()) {
        if (t.label.toLowerCase().trim() === session.tableLabel.toLowerCase().trim()) {
          targetTable = t;
          break;
        }
      }
    }

    if (targetTable) {
      tableMap.set(targetTable.id, {
        ...targetTable,
        status: 'Occupied',
        sessionId: session.sessionId,
        bookingId: session.bookingId || targetTable.bookingId,
        startedAt: session.startedAt || targetTable.startedAt,
        gameName: session.game?.name || targetTable.gameName || 'Chưa có tên game',
        presentCount: session.presentCount || session.guestCount || targetTable.presentCount || 1,
      });
    } else {
      const newId = session.tableId || `table-${session.sessionId}`;
      const label = session.tableLabel || 'Bàn';
      const nextIndex = tableMap.size;
      tableMap.set(newId, {
        id: newId,
        label,
        zone: 'Khu chính',
        seats: session.presentCount || 4,
        position: { row: Math.floor(nextIndex / 4), col: nextIndex % 4 },
        status: 'Occupied',
        sessionId: session.sessionId,
        bookingId: session.bookingId,
        startedAt: session.startedAt,
        gameName: session.game?.name || 'Chưa có tên game',
        presentCount: session.presentCount || session.guestCount || 1,
      });
    }
  });

  bookings.forEach((booking) => {
    if (!booking.tableId) return;

    if (typeof window !== 'undefined') {
      const isPaidBooking = booking.id && localStorage.getItem(`pos_paid_session_${booking.id}`) === 'true';
      const isPaidTable =
        booking.tableLabel &&
        localStorage.getItem(`pos_paid_table_${booking.tableLabel.toLowerCase().trim()}`) === 'true';
      if (isPaidBooking || isPaidTable) return;
    }

    let targetTable = tableMap.get(booking.tableId);
    if (!targetTable && booking.tableLabel) {
      for (const t of tableMap.values()) {
        if (t.label.toLowerCase().trim() === booking.tableLabel.toLowerCase().trim()) {
          targetTable = t;
          break;
        }
      }
    }

    if (targetTable) {
      if (booking.sessionStatus === 'Active' || booking.sessionStatus === 'Checking') {
        tableMap.set(targetTable.id, {
          ...targetTable,
          status: 'Occupied',
          bookingId: booking.id,
          sessionId: booking.sessionId || targetTable.sessionId,
          gameName: booking.bookedGame?.name || targetTable.gameName,
          presentCount: booking.participants?.length || targetTable.presentCount,
          startedAt: booking.checkedInAt || targetTable.startedAt,
        });
      } else if (booking.sessionStatus === 'Pending' && targetTable.status !== 'Occupied') {
        tableMap.set(targetTable.id, {
          ...targetTable,
          status: 'Reserved',
          bookingId: booking.id,
          gameName: booking.bookedGame?.name || targetTable.gameName,
          presentCount: booking.playerQuantity ?? booking.participants?.length ?? 2,
        });
      }
    }
  });

  return Array.from(tableMap.values());
}

export function PosWorkspace() {
  const queryClient = useQueryClient();
  const { data: cafe, isLoading: cafeLoading } = useStaffCafe();
  const [statusFilter, setStatusFilter] = useState<FloorPlanStatusFilter>('all');
  const [includeInactive, setIncludeInactive] = useState(false);
  const floorPlanParams = useMemo(
    () => buildFloorPlanParams(includeInactive),
    [includeInactive],
  );
  const { data: floorPlan, isLoading: floorLoading } = useFloorPlan(cafe?.id, floorPlanParams);
  const { data: bookings = [] } = usePendingBookings(cafe?.id);
  const { data: activeSessions = [] } = useActiveSessions(cafe?.id);
  const { connected: hubConnected } = usePosHub({ enabled: Boolean(cafe?.id) });
  usePosHubCleanup(true);

  const [activeTab, setActiveTab] = useState('floor-plan');
  const [focusedBooking, setFocusedBooking] = useState<TableBooking | null>(null);
  const [checkInOpen, setCheckInOpen] = useState(false);
  const [walkInOpen, setWalkInOpen] = useState(false);
  const [selectedTableId, setSelectedTableId] = useState<string | undefined>();
  const [selectedTableLabel, setSelectedTableLabel] = useState<string | undefined>();
  const [resolvedBooking, setResolvedBooking] = useState<QrResolveResult | null>(null);

  const sampleCodes: Array<{ bookingId: string; qrCode: string; tableLabel: string }> = [];

  const allTables = useMemo(
    () =>
      mergeTablesWithActiveSessionsAndBookings(
        floorPlan?.tables ?? [],
        bookings,
        activeSessions,
      ),
    [floorPlan?.tables, bookings, activeSessions],
  );

  const tables = useMemo(() => {
    if (statusFilter === 'all') return allTables;
    return allTables.filter((t) => t.status === statusFilter);
  }, [allTables, statusFilter]);

  const activeBooking = focusedBooking ?? resolvedBooking?.booking ?? null;
  const selectedBookingId = checkInOpen ? activeBooking?.id ?? null : null;

  const presetQr = useMemo(() => {
    if (activeBooking?.qrCode) return activeBooking.qrCode;
    if (!activeBooking?.id) return undefined;
    const sample = sampleCodes.find((item) => item.bookingId === activeBooking.id);
    return sample?.qrCode ?? `${QR_BOOKING_PREFIX}${activeBooking.id}`;
  }, [activeBooking, sampleCodes]);

  const focusBooking = useCallback((booking: TableBooking) => {
    setFocusedBooking(booking);
    setCheckInOpen(false);
    setSelectedTableId(booking.tableId);
    setSelectedTableLabel(booking.tableLabel);
    setResolvedBooking({
      booking,
      table: {
        id: booking.tableId,
        label: booking.tableLabel,
        zone: 'Khu chính',
        seats: booking.playerQuantity ?? booking.participants.length,
        position: { row: 0, col: 0 },
        status: booking.sessionStatus === 'Active' ? 'Occupied' : 'Reserved',
        bookingId: booking.id,
        sessionId: booking.sessionId,
        gameName: booking.bookedGame.name,
        presentCount: booking.participants.length,
      },
    });
    setActiveTab('floor-plan');
  }, []);

  const handleQrResolved = useCallback((result: QrResolveResult) => {
    setResolvedBooking(result);
    setFocusedBooking(result.booking);
    setCheckInOpen(true);
    setSelectedTableId(result.table.id);
    setSelectedTableLabel(result.table.label);
    setActiveTab('floor-plan');
    toast.success(`Đã nhận booking ${result.table.label} — tiếp tục check-in.`);
  }, []);

  const handleSessionCompleted = useCallback(() => {
    queryClient.invalidateQueries({ queryKey: [POS_QUERY_KEYS.floorPlan] });
    queryClient.invalidateQueries({ queryKey: [POS_QUERY_KEYS.bookings] });
    queryClient.invalidateQueries({ queryKey: [POS_QUERY_KEYS.activeSessions] });
    setFocusedBooking(null);
    setCheckInOpen(false);
    setResolvedBooking(null);
    setSelectedTableId(undefined);
    setSelectedTableLabel(undefined);
  }, [queryClient]);

  const handleSessionActivated = useCallback(
    (_session: ActivatedSession) => {
      queryClient.invalidateQueries({ queryKey: [POS_QUERY_KEYS.floorPlan] });
      queryClient.invalidateQueries({ queryKey: [POS_QUERY_KEYS.bookings] });
      queryClient.invalidateQueries({ queryKey: [POS_QUERY_KEYS.activeSessions] });
    },
    [queryClient],
  );

  const handleSelectActiveSession = useCallback(
    (session: CafeSessionDetail) => {
      const booking =
        bookings.find((b) => b.id === session.bookingId) ??
        bookings.find((b) => b.sessionId === session.sessionId);

      if (booking) {
        focusBooking(booking);
        setCheckInOpen(true);
        setActiveTab('floor-plan');
        return;
      }

      const synthetic: TableBooking = {
        id: session.bookingId || session.sessionId,
        cafeId: session.cafeId || cafe?.id || '',
        tableId: session.tableId,
        tableLabel: session.tableLabel,
        qrCode: '',
        scheduledAt: session.startedAt,
        bookedGame: session.game,
        participants: [],
        playerQuantity: session.presentCount,
        sessionStatus: 'Active',
        sessionId: session.sessionId,
        checkedInAt: session.startedAt,
        statusText: session.status,
        depositAmount: session.depositCreditTotal,
      };
      focusBooking(synthetic);
      setCheckInOpen(true);
      setActiveTab('floor-plan');
    },
    [bookings, cafe?.id, focusBooking],
  );

  const handleTableSelect = useCallback(
    (table: CafeTable) => {
      setSelectedTableId(table.id);
      setSelectedTableLabel(table.label);

      if (table.status === 'Occupied') {
        const activeSession = activeSessions.find(
          (s) =>
            (s.sessionId && s.sessionId === table.sessionId) ||
            (s.tableId && s.tableId === table.id) ||
            (s.tableLabel && s.tableLabel.toLowerCase().trim() === table.label.toLowerCase().trim()),
        );

        if (activeSession) {
          handleSelectActiveSession(activeSession);
          return;
        }

        const booking =
          bookings.find((b) => b.id === table.bookingId) ??
          bookings.find((b) => b.tableId === table.id);

        if (booking) {
          focusBooking(booking);
          setCheckInOpen(true);
          return;
        }

        if (table.sessionId || table.bookingId || table.id) {
          const synthetic: TableBooking = {
            id: table.bookingId || table.sessionId || table.id,
            cafeId: cafe?.id || '',
            tableId: table.id,
            tableLabel: table.label,
            qrCode: '',
            scheduledAt: table.startedAt || new Date().toISOString(),
            bookedGame: {
              id: 'game',
              name: table.gameName || 'Board Game',
              imageUrl: '',
              minPlayers: 1,
              maxPlayers: 8,
            },
            participants: [],
            playerQuantity: table.presentCount || 1,
            sessionStatus: 'Active',
            sessionId: table.sessionId || table.bookingId,
            checkedInAt: table.startedAt,
            statusText: 'Active',
            depositAmount: 0,
          };
          focusBooking(synthetic);
          setCheckInOpen(true);
          return;
        }
      }

      if (table.status === 'Available') {
        setWalkInOpen(true);
        return;
      }

      if (table.status === 'Reserved') {
        const booking =
          bookings.find((b) => b.id === table.bookingId) ??
          bookings.find((b) => b.tableId === table.id);

        if (booking) {
          focusBooking(booking);
          setCheckInOpen(true);
          return;
        }
      }
    },
    [activeSessions, bookings, cafe?.id, focusBooking, handleSelectActiveSession],
  );

  const handleCloseReception = () => {
    setCheckInOpen(false);
  };

  if (cafeLoading) {
    return (
      <div className="flex justify-center py-20">
        <Spinner className="h-8 w-8" />
      </div>
    );
  }

  return (
    <div className="space-y-4 md:space-y-5">
      <PageHeader
        title="Web POS"
        description={`${cafe?.name ?? 'Quán'} · Chọn bàn / booking rồi mở check-in`}
      />
      <div className="flex items-center gap-2 text-xs text-muted-foreground">
        <Wifi className={`h-3.5 w-3.5 ${hubConnected ? 'text-emerald-600' : 'text-muted-foreground'}`} />
        SignalR /hubs/pos: {hubConnected ? 'Đã kết nối' : 'Chưa kết nối'}
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full space-y-4">
        <TabsList className="grid h-auto w-full grid-cols-1 gap-2 bg-muted/60 p-1.5 rounded-xl sm:grid-cols-2">
          <TabsTrigger value="floor-plan" className="gap-2 py-2.5 text-xs font-medium sm:text-sm">
            <LayoutGrid className="h-4 w-4" />
            Sơ đồ bàn & Vận hành
          </TabsTrigger>
          <TabsTrigger value="settlements" className="gap-2 py-2.5 text-xs font-medium sm:text-sm">
            <Banknote className="h-4 w-4" />
            Giải ngân & Thanh toán
          </TabsTrigger>
        </TabsList>

        {/* TAB 1: Sơ đồ bàn & Vận hành */}
        <TabsContent value="floor-plan" className="mt-0">
          <div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_380px] xl:grid-cols-[minmax(0,1fr)_420px] md:items-start">
            <Card className="min-h-[380px] md:min-h-[480px]">
              <CardHeader className="pb-3">
                <CardTitle className="flex items-center justify-between text-base md:text-lg">
                  <span className="flex items-center gap-2">
                    <LayoutGrid className="h-5 w-5 shrink-0" />
                    Sơ đồ mặt bằng quán
                  </span>
                  
                </CardTitle>
              </CardHeader>
              <CardContent className="pb-4 md:pb-6">
                {floorLoading ? (
                  <div className="flex justify-center py-16">
                    <Spinner className="h-6 w-6" />
                  </div>
                ) : (
                  <CafeFloorPlan
                    tables={tables}
                    selectedTableId={selectedTableId}
                    onSelectTable={handleTableSelect}
                    statusFilter={statusFilter}
                    onStatusFilterChange={setStatusFilter}
                    includeInactive={includeInactive}
                    onIncludeInactiveChange={setIncludeInactive}
                  />
                )}
              </CardContent>
            </Card>

            <div className="space-y-4 md:sticky md:top-4">
              <QrScanPanel
                cafeId={cafe?.id}
                reservationId={activeBooking?.id}
                onResolved={handleQrResolved}
                presetCode={presetQr}
                presetLabel={selectedTableLabel ?? activeBooking?.tableLabel}
                sampleCodes={sampleCodes}
              />
            </div>
          </div>
        </TabsContent>

        {/* TAB 4: Giải ngân & Thanh toán */}
        <TabsContent value="settlements" className="mt-0">
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="flex items-center gap-2 text-base md:text-lg">
                <Banknote className="h-5 w-5 shrink-0" />
                Quản lý giải ngân & Thanh toán
              </CardTitle>
            </CardHeader>
            <CardContent>
              <PosSettlementsPanel cafeId={cafe?.id} />
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Modal Popup Cửa sổ nổi hiển thị duy nhất nội dung của bàn được chọn */}
      <Dialog
        open={Boolean(selectedBookingId && activeBooking)}
        onOpenChange={(open) => {
          if (!open) handleCloseReception();
        }}
      >
        <DialogContent className="max-w-5xl lg:max-w-6xl max-h-[92vh] overflow-y-auto p-4 sm:p-6 rounded-2xl border-emerald-200/80 shadow-2xl">
          <DialogHeader className="sr-only">
            <DialogTitle>Quản lý {selectedTableLabel || activeBooking?.tableLabel || 'Bàn'}</DialogTitle>
          </DialogHeader>
          {selectedBookingId && activeBooking ? (
            <PosCheckInReception
              bookingId={selectedBookingId}
              initialBooking={activeBooking}
              onClose={handleCloseReception}
              onSessionActivated={handleSessionActivated}
              onSessionCompleted={handleSessionCompleted}
            />
          ) : null}
        </DialogContent>
      </Dialog>

      {/* Modal Mở phiên chơi trực tiếp cho Bàn trống (Walk-in) */}
      <Dialog open={walkInOpen} onOpenChange={setWalkInOpen}>
        <DialogContent className="max-w-lg p-6 rounded-2xl">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-base md:text-lg">
              <Play className="h-5 w-5 text-emerald-600" />
              Mở phiên chơi trực tiếp — {selectedTableLabel || 'Bàn trống'}
            </DialogTitle>
          </DialogHeader>
          <PosWalkInPanel
            cafeId={cafe?.id}
            tables={allTables}
            selectedTableId={selectedTableId}
            onStarted={(session) => {
              queryClient.invalidateQueries({ queryKey: [POS_QUERY_KEYS.activeSessions] });
              queryClient.invalidateQueries({ queryKey: [POS_QUERY_KEYS.floorPlan] });
              setWalkInOpen(false);
              handleSelectActiveSession({
                status: 'Active',
                cafeId: cafe?.id || '',
                billingModel: 'BY_HOUR',
                ...session,
              } as unknown as CafeSessionDetail);
            }}
          />
        </DialogContent>
      </Dialog>
    </div>
  );
}
