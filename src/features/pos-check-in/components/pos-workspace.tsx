'use client';

import { useCallback, useMemo, useState } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { CalendarDays, LayoutGrid, Play } from 'lucide-react';
import { PageHeader } from '@/components/common/page-header';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Spinner } from '@/components/ui/spinner';
import { QR_BOOKING_PREFIX } from '@/core/constants/pos-check-in';
import { POS_QUERY_KEYS } from '../services/pos-check-in.service';
import { PosCheckInMockService } from '../services/pos-check-in.mock';
import { useFloorPlan, usePendingBookings, useStaffCafe } from '../hooks/usePosCheckIn';
import { CafeFloorPlan } from './cafe-floor-plan';
import { PosBookingList } from './pos-booking-list';
import { PosCheckInReception } from './pos-check-in-reception';
import { QrScanPanel } from './qr-scan-panel';
import type {
  ActivatedSession,
  CafeTable,
  QrResolveResult,
  TableBooking,
} from '../types/pos-check-in.interface';

function mergeTablesWithBookings(tables: CafeTable[], bookings: TableBooking[]): CafeTable[] {
  if (tables.length === 0) return tables;

  return tables.map((table) => {
    const booking = bookings.find((b) => b.tableId === table.id);
    if (!booking) return table;

    if (booking.sessionStatus === 'Active' || booking.sessionStatus === 'Checking') {
      return {
        ...table,
        status: 'Occupied',
        bookingId: booking.id,
        sessionId: booking.sessionId,
        gameName: booking.bookedGame.name,
        presentCount: booking.participants.length,
        startedAt: booking.checkedInAt || table.startedAt,
      };
    }

    if (booking.sessionStatus === 'Pending') {
      return {
        ...table,
        status: 'Reserved',
        bookingId: booking.id,
        gameName: booking.bookedGame.name,
        presentCount: booking.playerQuantity ?? booking.participants.length,
      };
    }

    return table;
  });
}

export function PosWorkspace() {
  const queryClient = useQueryClient();
  const { data: cafe, isLoading: cafeLoading } = useStaffCafe();
  const { data: floorPlan, isLoading: floorLoading } = useFloorPlan(cafe?.id);
  const { data: bookings = [] } = usePendingBookings(cafe?.id);

  const [focusedBooking, setFocusedBooking] = useState<TableBooking | null>(null);
  const [checkInOpen, setCheckInOpen] = useState(false);
  const [selectedTableId, setSelectedTableId] = useState<string | undefined>();
  const [selectedTableLabel, setSelectedTableLabel] = useState<string | undefined>();
  const [resolvedBooking, setResolvedBooking] = useState<QrResolveResult | null>(null);

  const sampleCodes = useMemo(() => PosCheckInMockService.getSampleQrCodes(), []);

  const tables = useMemo(
    () => mergeTablesWithBookings(floorPlan?.tables ?? [], bookings),
    [floorPlan?.tables, bookings],
  );

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
  }, []);

  const handleQrResolved = useCallback((result: QrResolveResult) => {
    setResolvedBooking(result);
    setFocusedBooking(result.booking);
    setCheckInOpen(false);
    setSelectedTableId(result.table.id);
    setSelectedTableLabel(result.table.label);
  }, []);

  const handleTableSelect = useCallback(
    (table: CafeTable) => {
      setSelectedTableId(table.id);
      setSelectedTableLabel(table.label);

      if ((table.status === 'Reserved' || table.status === 'Occupied') && table.bookingId) {
        const booking =
          bookings.find((b) => b.id === table.bookingId) ??
          bookings.find((b) => b.tableId === table.id);
        if (booking) {
          focusBooking(booking);
          if (table.status === 'Occupied') setCheckInOpen(true);
          return;
        }
        setFocusedBooking(null);
        setCheckInOpen(table.status === 'Occupied');
        setResolvedBooking(null);
      }
    },
    [bookings, focusBooking],
  );

  const handleSessionCompleted = useCallback(() => {
    queryClient.invalidateQueries({ queryKey: [POS_QUERY_KEYS.floorPlan] });
    queryClient.invalidateQueries({ queryKey: [POS_QUERY_KEYS.bookings] });
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
    },
    [queryClient],
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

      <div className="grid gap-4 md:grid-cols-[minmax(0,1fr)_minmax(300px,400px)] md:items-start xl:grid-cols-[minmax(0,1fr)_420px]">
        <Card className="min-h-[320px] md:min-h-[420px]">
          <CardHeader className="pb-3">
            <CardTitle className="flex items-center gap-2 text-base md:text-lg">
              <LayoutGrid className="h-5 w-5 shrink-0" />
              Sơ đồ mặt bằng
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
              />
            )}
          </CardContent>
        </Card>

        <div className="space-y-4 md:sticky md:top-4 md:max-h-[calc(100dvh-6rem)] md:overflow-y-auto md:overscroll-contain md:pr-1">
          <QrScanPanel
            onResolved={handleQrResolved}
            presetCode={presetQr}
            presetLabel={selectedTableLabel ?? activeBooking?.tableLabel}
            sampleCodes={sampleCodes}
          />

          {selectedBookingId && activeBooking ? (
            <PosCheckInReception
              bookingId={selectedBookingId}
              initialBooking={activeBooking}
              onClose={handleCloseReception}
              onSessionActivated={handleSessionActivated}
              onSessionCompleted={handleSessionCompleted}
            />
          ) : activeBooking ? (
            <Card>
              <CardHeader className="pb-2">
                <div className="flex items-start justify-between gap-2">
                  <div>
                    <CardTitle className="text-base">{activeBooking.tableLabel}</CardTitle>
                    <p className="mt-1 text-sm text-muted-foreground">
                      {activeBooking.bookedGame.name} ·{' '}
                      {activeBooking.playerQuantity ?? activeBooking.participants.length} người
                    </p>
                  </div>
                  <Badge variant="secondary">{activeBooking.statusText ?? 'Chờ check-in'}</Badge>
                </div>
              </CardHeader>
              <CardContent>
                <Button
                  type="button"
                  className="h-12 w-full text-base"
                  onClick={() => setCheckInOpen(true)}
                >
                  <Play className="mr-2 h-4 w-4" />
                  Mở check-in
                </Button>
              </CardContent>
            </Card>
          ) : (
            <Card className="border-dashed">
              <CardContent className="py-10 text-center text-sm text-muted-foreground md:py-12 md:text-base">
                Chọn booking bên dưới hoặc bàn vàng (Đã đặt) để hiện nút Mở check-in.
              </CardContent>
            </Card>
          )}
        </div>
      </div>

      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="flex items-center gap-2 text-base md:text-lg">
            <CalendarDays className="h-5 w-5 shrink-0" />
            Danh sách booking quán
          </CardTitle>
        </CardHeader>
        <CardContent>
          <PosBookingList embedded onSelectBooking={focusBooking} />
        </CardContent>
      </Card>
    </div>
  );
}
