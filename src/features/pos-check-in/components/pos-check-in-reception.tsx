'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import Image from 'next/image';
import { Clock, Play, UserX, X } from 'lucide-react';
import { toast } from 'sonner';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Spinner } from '@/components/ui/spinner';
import { NO_SHOW_KARMA_PENALTY } from '@/core/constants/pos-check-in';
import { AttendeeChecklist } from './attendee-checklist';
import { UnderstaffedAlertDialog } from './understaffed-alert-dialog';
import { useAlternativeGames, useTableBooking } from '../hooks/usePosCheckIn';
import { useActivateSession, useMarkAbsent } from '../hooks/usePosMutations';
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
}: PosCheckInReceptionProps) {
  const { data: fetchedBooking, isLoading, refetch } = useTableBooking(bookingId);
  const booking = fetchedBooking ?? initialBooking;
  const markAbsent = useMarkAbsent(bookingId);
  const activateSession = useActivateSession(bookingId);

  const [presentIds, setPresentIds] = useState<Set<string>>(new Set());
  const [absentProcessed, setAbsentProcessed] = useState(false);
  const [alertOpen, setAlertOpen] = useState(false);
  const [selectedGame, setSelectedGame] = useState<AlternativeGame | null>(null);
  const [sessionActive, setSessionActive] = useState(false);

  useEffect(() => {
    if (booking) {
      setPresentIds(initPresentIds(booking));
      setSessionActive(booking.sessionStatus === 'Active');
      setAbsentProcessed(booking.participants.some((p) => p.attendanceStatus === 'Absent'));
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
        `Đã xử lý ${result.processed} người vắng — tịch thu ${formatCurrency(result.depositForfeitedTotal)}, -${NO_SHOW_KARMA_PENALTY} Karma.`,
      );
      refetch();
    } catch {
      toast.error('Không thể xử lý vắng mặt.');
    }
  };

  const doActivate = async (game: BookedGame) => {
    if (!booking) return;

    const presentParticipantIds = booking.participants
      .filter((p) => presentIds.has(p.id))
      .map((p) => p.id);

    try {
      const session = await activateSession.mutateAsync({ game, presentParticipantIds });
      setSessionActive(true);
      setAlertOpen(false);
      onSessionActivated?.(session);
      toast.success(
        `${booking.tableLabel} → Occupied · ${game.name} · Cọc ghi Credit: ${formatCurrency(session.depositCreditTotal)} · Mobile: "Đang chơi tại quán".`,
      );
    } catch {
      toast.error('Không thể kích hoạt phiên chơi.');
    }
  };

  const handleCheckIn = () => {
    if (!booking || sessionActive) return;
    if (presentCount === 0) {
      toast.error('Cần ít nhất 1 thành viên có mặt.');
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
          <CardTitle className="text-base">Check-in {booking.tableLabel}</CardTitle>
          <p className="mt-1 flex items-center gap-1 text-xs text-muted-foreground">
            <Clock className="h-3 w-3" />
            {formatTime(booking.scheduledAt)}
          </p>
        </div>
        <Button variant="ghost" size="icon" onClick={onClose} aria-label="Đóng">
          <X className="h-4 w-4" />
        </Button>
      </CardHeader>

      <CardContent className="space-y-4">
        <div className="flex gap-3 rounded-lg border bg-muted/30 p-3">
          <div className="relative h-16 w-16 shrink-0 overflow-hidden rounded-md">
            <Image
              src={booking.bookedGame.imageUrl}
              alt={booking.bookedGame.name}
              fill
              className="object-cover"
              sizes="64px"
              unoptimized
            />
          </div>
          <div>
            <p className="text-xs text-muted-foreground">Game đã chọn</p>
            <p className="font-semibold">{booking.bookedGame.name}</p>
            <p className="text-xs text-muted-foreground">
              {booking.bookedGame.minPlayers}–{booking.bookedGame.maxPlayers} người ·{' '}
              {booking.participants.length} đăng ký
            </p>
          </div>
          {sessionActive && <Badge className="ml-auto bg-green-600">Active Session</Badge>}
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
            size="sm"
            className="w-full border-rose-200 text-rose-700"
            disabled={markAbsent.isPending || absentProcessed}
            onClick={() => void handleProcessAbsent()}
          >
            {markAbsent.isPending ? <Spinner className="mr-2 h-4 w-4" /> : <UserX className="mr-2 h-4 w-4" />}
            Xử lý vắng mặt ({absentIds.length})
          </Button>
        )}

        <div className="rounded-lg bg-muted/60 p-3 text-sm">
          <div className="flex justify-between">
            <span className="text-muted-foreground">Có mặt</span>
            <span className="font-medium">{presentCount}/{booking.participants.length}</span>
          </div>
          {allPresent && !sessionActive && (
            <p className="mt-2 text-xs text-green-700">✓ Đủ người — sẵn sàng mở phiên</p>
          )}
        </div>

        {!sessionActive && (
          <Button
            type="button"
            className="w-full"
            size="lg"
            disabled={activateSession.isPending || presentCount === 0}
            onClick={handleCheckIn}
          >
            {activateSession.isPending ? (
              <Spinner className="mr-2 h-4 w-4" />
            ) : (
              <Play className="mr-2 h-4 w-4" />
            )}
            Xác nhận Check-in và Mở phiên
          </Button>
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
        isConfirming={activateSession.isPending}
      />
    </Card>
  );
}

export type { QrResolveResult };
