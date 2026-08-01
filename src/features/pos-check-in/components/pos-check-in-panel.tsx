'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import { ArrowLeft, Clock, Play, UserX } from 'lucide-react';
import { toast } from 'sonner';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Spinner } from '@/components/ui/spinner';
import { NO_SHOW_KARMA_PENALTY } from '@/core/constants/pos-check-in';
import { ROUTES } from '@/core/constants/routes';
import { AttendeeChecklist } from './attendee-checklist';
import { SessionOpsPanel } from './session-ops-panel';
import { UnderstaffedAlertDialog } from './understaffed-alert-dialog';
import {
  useAlternativeGames,
  useTableBooking,
} from '../hooks/usePosCheckIn';
import { useActivateSession, useMarkAbsent } from '../hooks/usePosMutations';
import type { AlternativeGame, BookedGame, TableBooking } from '../types/pos-check-in.interface';

interface PosCheckInPanelProps {
  bookingId: string;
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
    booking.participants.filter((p) => p.isPresent && p.attendanceStatus !== 'Absent').map((p) => p.id),
  );
}

export function PosCheckInPanel({ bookingId }: PosCheckInPanelProps) {
  const { data: booking, isLoading, isError, refetch } = useTableBooking(bookingId);
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
      setSessionActive(
        booking.sessionStatus === 'Active' || booking.sessionStatus === 'Checking',
      );
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

  const needsAlternative = Boolean(
    booking && presentCount < booking.bookedGame.minPlayers,
  );

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
    if (!booking || absentIds.length === 0) {
      toast.info('Không có thành viên vắng mặt cần xử lý.');
      return;
    }

    try {
      const result = await markAbsent.mutateAsync(absentIds);
      setAbsentProcessed(true);
      toast.success(
        `Đã xử lý ${result.processed} người vắng mặt — tịch thu ${formatCurrency(result.depositForfeitedTotal)}, trừ ${NO_SHOW_KARMA_PENALTY} Karma/người.`,
      );
      refetch();
    } catch {
      toast.error('Không thể xử lý vắng mặt. Vui lòng thử lại.');
    }
  };

  const doActivate = async (game: BookedGame) => {
    if (!booking) return;

    const presentParticipantIds = booking.participants
      .filter((p) => presentIds.has(p.id))
      .map((p) => p.id);

    try {
      const session = await activateSession.mutateAsync({
        game,
        presentParticipantIds,
      });
      setSessionActive(true);
      setAlertOpen(false);
      toast.success(
        `Bàn ${booking.tableLabel} đã kích hoạt — chơi ${game.name} (${session.presentCount} người). Cọc Credit: ${formatCurrency(session.depositCreditTotal)}.`,
      );
    } catch {
      toast.error('Không thể kích hoạt phiên chơi. Vui lòng thử lại.');
    }
  };

  const handleCheckIn = () => {
    if (!booking || sessionActive) return;

    if (presentCount === 0) {
      toast.error('Cần ít nhất 1 thành viên có mặt để check-in.');
      return;
    }

    if (needsAlternative) {
      setSelectedGame(null);
      setAlertOpen(true);
      return;
    }

    void doActivate(booking.bookedGame);
  };

  const handleConfirmSwap = () => {
    if (!selectedGame) {
      toast.error('Vui lòng chọn game thay thế trước khi kích hoạt.');
      return;
    }
    void doActivate(toBookedGame(selectedGame));
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-20">
        <Spinner className="h-8 w-8" />
      </div>
    );
  }

  if (isError || !booking) {
    return (
      <div className="rounded-lg border border-dashed p-8 text-center text-sm text-muted-foreground">
        Không tìm thấy đơn đặt bàn.{' '}
        <Link href={ROUTES.STAFF.POS} className="text-primary underline">
          Quay lại POS
        </Link>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <Button variant="ghost" size="icon" className="h-11 w-11 touch-manipulation md:h-12 md:w-12" asChild>
          <Link href={ROUTES.STAFF.POS}>
            <ArrowLeft className="h-4 w-4" />
          </Link>
        </Button>
        <div>
          <h1 className="text-2xl font-bold tracking-tight">
            {sessionActive ? `Vận hành ${booking.tableLabel}` : `Check-in ${booking.tableLabel}`}
          </h1>
          <p className="text-sm text-muted-foreground flex items-center gap-1">
            <Clock className="h-3.5 w-3.5" />
            {formatTime(booking.scheduledAt)}
          </p>
        </div>
        {sessionActive && <Badge className="ml-auto bg-green-600">Đang chơi</Badge>}
      </div>

      {sessionActive ? (
        <SessionOpsPanel booking={booking} />
      ) : (
        <div className="grid gap-6 md:grid-cols-[1fr_340px] md:items-start">
          <Card>
            <CardHeader>
              <CardTitle>Điểm danh thành viên</CardTitle>
            </CardHeader>
            <CardContent>
              <AttendeeChecklist
                participants={booking.participants}
                presentIds={presentIds}
                onToggle={handleToggle}
                disabled={sessionActive || markAbsent.isPending}
              />

              {absentIds.length > 0 && (
                <div className="mt-4 flex justify-end">
                  <Button
                    type="button"
                    variant="outline"
                    className="h-12 min-w-[180px] touch-manipulation border-rose-200 text-base text-rose-700 hover:bg-rose-50 md:h-14"
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
                </div>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Game đã đặt</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="relative aspect-[4/3] overflow-hidden rounded-lg bg-muted">
                <Image
                  src={booking.bookedGame.imageUrl}
                  alt={booking.bookedGame.name}
                  fill
                  className="object-cover"
                  sizes="320px"
                  unoptimized
                />
              </div>
              <div>
                <h3 className="font-semibold">{booking.bookedGame.name}</h3>
                <p className="text-sm text-muted-foreground">
                  {booking.bookedGame.minPlayers}–{booking.bookedGame.maxPlayers} người
                </p>
              </div>

              <div className="rounded-lg bg-muted/60 p-3 text-sm">
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Có mặt</span>
                  <span className="font-medium">{presentCount} người</span>
                </div>
                <div className="mt-1 flex justify-between">
                  <span className="text-muted-foreground">Yêu cầu tối thiểu</span>
                  <span
                    className={`font-medium ${needsAlternative ? 'text-rose-600' : 'text-green-600'}`}
                  >
                    {booking.bookedGame.minPlayers} người
                  </span>
                </div>
              </div>

              <Button
                type="button"
                className="h-12 w-full touch-manipulation text-base md:h-14"
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
            </CardContent>
          </Card>
        </div>
      )}

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
        onConfirm={handleConfirmSwap}
        isConfirming={activateSession.isPending}
      />
    </div>
  );
}
