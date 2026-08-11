'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import Image from 'next/image';
import { Clock, Play, ScanBarcode, UserX, X } from 'lucide-react';
import { toast } from 'sonner';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Spinner } from '@/components/ui/spinner';
import { NO_SHOW_KARMA_PENALTY } from '@/core/constants/pos-check-in';
import { AttendeeChecklist } from './attendee-checklist';
import { SessionOpsPanel } from './session-ops-panel';
import { UnderstaffedAlertDialog } from './understaffed-alert-dialog';
import { useActiveSession, useAlternativeGames, useTableBooking } from '../hooks/usePosCheckIn';
import { useMarkAbsent, usePosCheckIn } from '../hooks/usePosMutations';
import { resolvePosCheckInCode } from '../utils/pos-check-in.mapper';
import type {
  ActivatedSession,
  AlternativeGame,
  BookedGame,
  QrResolveResult,
  TableBooking,
} from '../types/pos-check-in.interface';

interface PosCheckInReceptionProps {
  bookingId: string;
  initialBooking?: TableBooking;
  onClose: () => void;
  onSessionActivated?: (session: ActivatedSession) => void;
  onSessionCompleted?: () => void;
}

function formatCurrency(amount: number) {
  return new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(amount);
}

function formatTime(iso: string) {
  return new Intl.DateTimeFormat('vi-VN', {
    hour: '2-digit',
    minute: '2-digit',
    day: '2-digit',
    month: '2-digit',
  }).format(new Date(iso));
}

function toBookedGame(game: AlternativeGame): BookedGame {
  return {
    id: game.gameTemplateId,
    inventoryId: game.inventoryId,
    name: game.name,
    imageUrl: game.imageUrl,
    minPlayers: game.minPlayers,
    maxPlayers: game.maxPlayers,
  };
}

function initPresentIds(booking: TableBooking) {
  return new Set(
    booking.participants
      .filter((p) => p.isPresent && p.attendanceStatus !== 'Absent')
      .map((p) => p.id),
  );
}

export function PosCheckInReception({
  bookingId,
  initialBooking,
  onClose,
  onSessionActivated,
  onSessionCompleted,
}: PosCheckInReceptionProps) {
  const { data: fetchedBooking, isLoading, refetch } = useTableBooking(bookingId);
  const booking = fetchedBooking ?? initialBooking;
  const { data: activeSession } = useActiveSession(bookingId, Boolean(bookingId));
  const markAbsent = useMarkAbsent(bookingId);
  const posCheckIn = usePosCheckIn(booking?.cafeId, bookingId);

  const [presentIds, setPresentIds] = useState<Set<string>>(new Set());
  const [absentProcessed, setAbsentProcessed] = useState(false);
  const [alertOpen, setAlertOpen] = useState(false);
  const [selectedGame, setSelectedGame] = useState<AlternativeGame | null>(null);
  const [sessionActive, setSessionActive] = useState(false);
  const [checkInCode, setCheckInCode] = useState('');
  const [barcode, setBarcode] = useState('');

  const displayGame = useMemo(() => {
    if (activeSession?.game?.name && activeSession.game.name !== 'Chưa có tên game') {
      return activeSession.game;
    }
    if (booking?.bookedGame?.name && booking.bookedGame.name !== 'Chưa có tên game') {
      return booking.bookedGame;
    }
    return activeSession?.game ?? booking?.bookedGame ?? {
      id: '',
      name: 'Chưa có tên game',
      imageUrl: 'https://picsum.photos/seed/game/400/300',
      minPlayers: 2,
      maxPlayers: 4,
    };
  }, [activeSession?.game, booking?.bookedGame]);

  useEffect(() => {
    if (booking) {
      setPresentIds(initPresentIds(booking));
      setSessionActive(
        booking.sessionStatus === 'Active' ||
          booking.sessionStatus === 'Checking' ||
          booking.sessionStatus === 'Completed',
      );
      setAbsentProcessed(booking.participants.some((p) => p.attendanceStatus === 'Absent'));
      setCheckInCode(resolvePosCheckInCode(booking));
    }
  }, [booking]);

  const presentCount = useMemo(
    () => booking?.participants.filter((p) => presentIds.has(p.id)).length ?? 0,
    [booking, presentIds],
  );

  const absentIds = useMemo(() => {
    if (!booking) return [];
    return booking.participants.filter((p) => !presentIds.has(p.id)).map((p) => p.id);
  }, [booking, presentIds]);

  const needsAlternative = Boolean(booking && presentCount < booking.bookedGame.minPlayers);
  const allPresent =
    Boolean(booking) &&
    presentCount === booking!.participants.length &&
    absentIds.length === 0;

  const { data: alternativeGames = [], isLoading: isLoadingAlternatives } = useAlternativeGames(
    booking?.cafeId,
    presentCount,
    alertOpen && needsAlternative,
  );

  const handleToggle = useCallback((participantId: string, isPresent: boolean) => {
    setPresentIds((prev) => {
      const next = new Set(prev);
      if (isPresent) next.add(participantId);
      else next.delete(participantId);
      return next;
    });
  }, []);

  const handleProcessAbsent = async () => {
    if (!booking || absentIds.length === 0) return;
    try {
      const result = await markAbsent.mutateAsync(absentIds);
      setAbsentProcessed(true);
      toast.success(
        result.depositForfeitedTotal > 0
          ? `Đã xử lý ${result.processed} người vắng — tịch thu ${formatCurrency(result.depositForfeitedTotal)}, -${NO_SHOW_KARMA_PENALTY} Karma.`
          : `Đã đánh dấu ${result.processed} người vắng (local). No-show/forfeit do player vote sau checkout.`,
      );
      refetch();
    } catch {
      toast.error('Không thể xử lý vắng mặt.');
    }
  };

  const doActivate = async (_game?: BookedGame) => {
    if (!booking) return;

    const code = checkInCode.trim();
    const boxBarcode = barcode.trim();
    if (!code) {
      toast.error('Vui lòng nhập / quét mã check-in (QR).');
      return;
    }
    if (!booking.tableId) {
      toast.error('Booking chưa gắn bàn.');
      return;
    }
    if (!boxBarcode) {
      toast.error('Vui lòng quét barcode hộp game.');
      return;
    }

    try {
      const session = await posCheckIn.mutateAsync({
        code,
        cafeTableId: booking.tableId,
        barcode: boxBarcode,
        idempotencyKey: `pos-checkin:${code}`,
      });
      setSessionActive(true);
      setAlertOpen(false);
      onSessionActivated?.(session);
      toast.success(
        `${booking.tableLabel} → Occupied · ${session.game.name} · Cọc ghi Credit: ${formatCurrency(session.depositCreditTotal)} · Mobile: "Đang chơi tại quán".`,
      );
    } catch (err) {
      toast.error((err as Error)?.message || 'Không thể kích hoạt phiên chơi.');
    }
  };

  const handleCheckIn = () => {
    if (!booking || sessionActive) return;
    if (presentCount === 0) {
      toast.error('Cần ít nhất 1 thành viên có mặt.');
      return;
    }
    if (!barcode.trim()) {
      toast.error('Vui lòng quét barcode hộp game trước khi check-in.');
      return;
    }
    if (needsAlternative) {
      setSelectedGame(null);
      setAlertOpen(true);
      return;
    }
    void doActivate(booking.bookedGame);
  };

  if (isLoading && !booking) {
    return (
      <Card>
        <CardContent className="flex justify-center py-12">
          <Spinner className="h-6 w-6" />
        </CardContent>
      </Card>
    );
  }

  if (!booking) return null;

  return (
    <Card className="border-primary/20">
      <CardHeader className="flex flex-row items-start justify-between space-y-0 pb-3">
        <div>
          <CardTitle className="text-base md:text-lg">
            {sessionActive ? `Thanh toán ${booking.tableLabel}` : `Check-in ${booking.tableLabel}`}
          </CardTitle>
          <p className="mt-1 flex items-center gap-1 text-xs text-muted-foreground md:text-sm">
            <Clock className="h-3 w-3 md:h-4 md:w-4" />
            {formatTime(booking.scheduledAt)}
          </p>
        </div>
        <Button
          variant="ghost"
          size="icon"
          className="h-11 w-11 shrink-0 touch-manipulation md:h-12 md:w-12"
          onClick={onClose}
          aria-label="Đóng"
        >
          <X className="h-4 w-4" />
        </Button>
      </CardHeader>

      <CardContent className="space-y-4 md:space-y-5">
        <div className="flex gap-3 rounded-lg border bg-muted/30 p-3 md:p-4">
          <div className="relative h-16 w-16 shrink-0 overflow-hidden rounded-md md:h-20 md:w-20">
            <Image
              src={displayGame.imageUrl}
              alt={displayGame.name}
              fill
              className="object-cover"
              sizes="64px"
              unoptimized
            />
          </div>
          <div>
            <p className="text-xs text-muted-foreground">Game đã chọn</p>
            <p className="font-semibold">{displayGame.name}</p>
            <p className="text-xs text-muted-foreground">
              {displayGame.minPlayers}–{displayGame.maxPlayers} người ·{' '}
              {booking.participants.length} đăng ký
            </p>
          </div>
          {sessionActive && <Badge className="ml-auto bg-green-600">Active Session</Badge>}
        </div>

        {sessionActive ? (
          <SessionOpsPanel
            booking={booking}
            onCompleted={() => {
              setSessionActive(false);
              onSessionCompleted?.();
            }}
          />
        ) : (
          <>
            <div className="space-y-3 rounded-lg border p-3">
              <div className="space-y-1.5">
                <label className="text-xs font-medium text-muted-foreground">
                  Mã check-in (QR / ReservationCode / BookingCode)
                </label>
                <Input
                  value={checkInCode}
                  onChange={(e) => setCheckInCode(e.target.value)}
                  placeholder="ABC234XY hoặc BV…"
                  className="font-mono"
                  autoComplete="off"
                />
              </div>
              <div className="space-y-1.5">
                <label className="flex items-center gap-1.5 text-xs font-medium text-muted-foreground">
                  <ScanBarcode className="h-3.5 w-3.5" />
                  Barcode hộp game *
                </label>
                <Input
                  value={barcode}
                  onChange={(e) => setBarcode(e.target.value)}
                  placeholder="VD: BV-CATAN-001"
                  className="font-mono"
                  autoComplete="off"
                />
              </div>
            </div>

            <AttendeeChecklist
              participants={booking.participants}
              presentIds={presentIds}
              onToggle={handleToggle}
              disabled={sessionActive || markAbsent.isPending}
            />

            {absentIds.length > 0 && !sessionActive && (
              <Button
                type="button"
                variant="outline"
                size="lg"
                className="h-12 w-full touch-manipulation border-rose-200 text-base text-rose-700 md:h-14"
                disabled={markAbsent.isPending || absentProcessed}
                onClick={() => void handleProcessAbsent()}
              >
                {markAbsent.isPending ? (
                  <Spinner className="mr-2 h-4 w-4" />
                ) : (
                  <UserX className="mr-2 h-4 w-4" />
                )}
                Xử lý vắng mặt ({absentIds.length})
              </Button>
            )}

            <div className="rounded-lg bg-muted/60 p-3 text-sm md:p-4 md:text-base">
              <div className="flex justify-between">
                <span className="text-muted-foreground">Có mặt</span>
                <span className="font-medium">
                  {presentCount}/{booking.participants.length}
                </span>
              </div>
              {allPresent && !sessionActive && (
                <p className="mt-2 text-xs text-green-700">✓ Đủ người — sẵn sàng mở phiên</p>
              )}
            </div>

            <Button
              type="button"
              className="h-12 w-full touch-manipulation text-base md:h-14"
              size="lg"
              disabled={posCheckIn.isPending || presentCount === 0 || !barcode.trim()}
              onClick={handleCheckIn}
            >
              {posCheckIn.isPending ? (
                <Spinner className="mr-2 h-4 w-4" />
              ) : (
                <Play className="mr-2 h-4 w-4" />
              )}
              Xác nhận Check-in và Mở phiên
            </Button>
          </>
        )}
      </CardContent>

      <UnderstaffedAlertDialog
        open={alertOpen}
        onOpenChange={setAlertOpen}
        originalGameName={booking.bookedGame.name}
        presentCount={presentCount}
        minPlayers={booking.bookedGame.minPlayers}
        games={alternativeGames}
        isLoadingGames={isLoadingAlternatives}
        selectedGame={selectedGame}
        onSelectGame={setSelectedGame}
        onConfirm={() => selectedGame && void doActivate(toBookedGame(selectedGame))}
        isConfirming={posCheckIn.isPending}
      />
    </Card>
  );
}

export type { QrResolveResult };
