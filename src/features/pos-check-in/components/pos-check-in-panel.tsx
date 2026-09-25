'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import { ArrowLeft, Clock, Play, ScanBarcode, UserX } from 'lucide-react';
import { toast } from 'sonner';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
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
import { usePosBoxes } from '../hooks/usePosBoxes';
import { useMarkAbsent, usePosCheckIn } from '../hooks/usePosMutations';
import { resolvePosCheckInCode } from '../utils/pos-check-in.mapper';
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
  const posCheckIn = usePosCheckIn(booking?.cafeId, bookingId);
  const { data: boxes = [], isLoading: boxesLoading, isError: boxesError } = usePosBoxes(
    booking?.cafeId,
  );

  const [presentIds, setPresentIds] = useState<Set<string>>(new Set());
  const [absentProcessed, setAbsentProcessed] = useState(false);
  const [alertOpen, setAlertOpen] = useState(false);
  const [selectedGame, setSelectedGame] = useState<AlternativeGame | null>(null);
  const [sessionActive, setSessionActive] = useState(false);
  const [checkInCode, setCheckInCode] = useState('');
  const [barcode, setBarcode] = useState('');

  const checkInGame = useMemo(() => {
    if (selectedGame) {
      return { id: selectedGame.gameTemplateId, name: selectedGame.name };
    }
    return {
      id: booking?.bookedGame?.id || '',
      name: booking?.bookedGame?.name || '',
    };
  }, [selectedGame, booking?.bookedGame?.id, booking?.bookedGame?.name]);

  const { availableBoxes, boxesFallback } = useMemo(() => {
    const isSelectable = (status: string) => {
      const s = status.toLowerCase();
      return s === 'available' || s === '0' || s === 'held' || s === 'reserved';
    };
    const selectable = boxes.filter((b) => isSelectable(String(b.status || '')) && Boolean(b.barcode));
    const gameId = (checkInGame.id || '').toLowerCase();
    const gameName = (checkInGame.name || '').trim().toLowerCase();
    const matched = selectable.filter((b) => {
      if (gameId && b.gameTemplateId && b.gameTemplateId.toLowerCase() === gameId) return true;
      const name = (b.gameName || '').trim().toLowerCase();
      if (gameName && name === gameName) return true;
      if (gameName && name.includes(gameName)) return true;
      return false;
    });
    if (matched.length > 0) return { availableBoxes: matched, boxesFallback: false };
    return { availableBoxes: selectable, boxesFallback: selectable.length > 0 };
  }, [boxes, checkInGame.id, checkInGame.name]);

  useEffect(() => {
    if (!availableBoxes.length) {
      const bookedBarcode = booking?.bookedGame?.inventoryId?.trim();
      if (bookedBarcode) {
        setBarcode(bookedBarcode);
        return;
      }
      setBarcode('');
      return;
    }
    if (barcode && availableBoxes.some((b) => b.barcode === barcode)) return;
    const bookedBarcode = booking?.bookedGame?.inventoryId?.trim();
    if (bookedBarcode && availableBoxes.some((b) => b.barcode === bookedBarcode)) {
      setBarcode(bookedBarcode);
      return;
    }
    setBarcode(availableBoxes[0].barcode);
  }, [availableBoxes, barcode, booking?.bookedGame?.inventoryId]);

  useEffect(() => {
    if (booking) {
      setPresentIds(initPresentIds(booking));
      setSessionActive(
        booking.sessionStatus === 'Active' || booking.sessionStatus === 'Checking',
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
      toast.info('KhÃ´ng cÃ³ thÃ nh viÃªn váº¯ng máº·t cáº§n xá»­ lÃ½.');
      return;
    }

    try {
      const result = await markAbsent.mutateAsync(absentIds);
      setAbsentProcessed(true);
      toast.success(
        result.depositForfeitedTotal > 0
          ? `ÄÃ£ xá»­ lÃ½ ${result.processed} ngÆ°á»i váº¯ng máº·t â€” tá»‹ch thu ${formatCurrency(result.depositForfeitedTotal)}, trá»« ${NO_SHOW_KARMA_PENALTY} Karma/ngÆ°á»i.`
          : `ÄÃ£ Ä‘Ã¡nh dáº¥u ${result.processed} ngÆ°á»i váº¯ng (local). No-show/forfeit do player vote sau checkout.`,
      );
      refetch();
    } catch {
      toast.error('KhÃ´ng thá»ƒ xá»­ lÃ½ váº¯ng máº·t. Vui lÃ²ng thá»­ láº¡i.');
    }
  };

  const doActivate = async (_game?: BookedGame) => {
    if (!booking) return;

    const code = checkInCode.trim();
    const boxBarcode = barcode.trim();
    if (!code) {
      toast.error('Vui lÃ²ng nháº­p / quÃ©t mÃ£ check-in (QR).');
      return;
    }
    if (!booking.tableId) {
      toast.error('Booking chÆ°a gáº¯n bÃ n.');
      return;
    }
    if (!boxBarcode) {
      toast.error('Vui lÃ²ng quÃ©t barcode há»™p game.');
      return;
    }

    try {
      const session = await posCheckIn.mutateAsync({
        code,
        cafeTableId: booking.tableId,
        barcode: boxBarcode,
        idempotencyKey: `pos-checkin:${booking.id}`,
        bookingId: booking.id,
        lobbyId: booking.lobbyId,
      });
      setSessionActive(true);
      setAlertOpen(false);
      toast.success(
        `BÃ n ${booking.tableLabel} Ä‘Ã£ kÃ­ch hoáº¡t â€” chÆ¡i ${session.game.name} (${session.presentCount} ngÆ°á»i). Cá»c Credit: ${formatCurrency(session.depositCreditTotal)}.`,
      );
    } catch (err) {
      toast.error((err as Error)?.message || 'KhÃ´ng thá»ƒ kÃ­ch hoáº¡t phiÃªn chÆ¡i. Vui lÃ²ng thá»­ láº¡i.');
    }
  };

  const handleCheckIn = () => {
    if (!booking || sessionActive) return;

    if (presentCount === 0) {
      toast.error('Cáº§n Ã­t nháº¥t 1 thÃ nh viÃªn cÃ³ máº·t Ä‘á»ƒ check-in.');
      return;
    }

    if (!barcode.trim()) {
      toast.error('Vui lÃ²ng quÃ©t barcode há»™p game trÆ°á»›c khi check-in.');
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
      toast.error('Vui lÃ²ng chá»n game thay tháº¿ trÆ°á»›c khi kÃ­ch hoáº¡t.');
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
        KhÃ´ng tÃ¬m tháº¥y Ä‘Æ¡n Ä‘áº·t bÃ n.{' '}
        <Link href={ROUTES.STAFF.POS} className="text-primary underline">
          Quay láº¡i POS
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
            {sessionActive ? `Váº­n hÃ nh ${booking.tableLabel}` : `Check-in ${booking.tableLabel}`}
          </h1>
          <p className="text-sm text-muted-foreground flex items-center gap-1">
            <Clock className="h-3.5 w-3.5" />
            {formatTime(booking.scheduledAt)}
          </p>
        </div>
        {sessionActive && <Badge className="ml-auto bg-orange-600">Äang chÆ¡i</Badge>}
      </div>

      {sessionActive ? (
        <SessionOpsPanel booking={booking} />
      ) : (
        <div className="grid gap-6 md:grid-cols-[1fr_340px] md:items-start">
          <Card>
            <CardHeader>
              <CardTitle>Äiá»ƒm danh thÃ nh viÃªn</CardTitle>
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
                    className="h-12 min-w-[180px] touch-manipulation border-orange-200 text-base text-orange-700 hover:bg-orange-50 md:h-14"
                    disabled={markAbsent.isPending || absentProcessed}
                    onClick={() => void handleProcessAbsent()}
                  >
                    {markAbsent.isPending ? (
                      <Spinner className="mr-2 h-4 w-4" />
                    ) : (
                      <UserX className="mr-2 h-4 w-4" />
                    )}
                    Xá»­ lÃ½ váº¯ng máº·t ({absentIds.length})
                  </Button>
                </div>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Game Ä‘Ã£ Ä‘áº·t</CardTitle>
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
                  {booking.bookedGame.minPlayers}â€“{booking.bookedGame.maxPlayers} ngÆ°á»i
                </p>
              </div>

              <div className="space-y-3 rounded-lg border p-3">
                <div className="space-y-1.5">
                  <label className="text-xs font-medium text-muted-foreground">
                    MÃ£ check-in (QR)
                  </label>
                  <Input
                    value={checkInCode}
                    readOnly
                    className="font-mono bg-muted/50 cursor-default"
                    autoComplete="off"
                    title="MÃ£ láº¥y tá»« booking â€” khÃ´ng chá»‰nh sá»­a"
                  />
                </div>
                <div className="space-y-1.5">
                  <label className="flex items-center gap-1.5 text-xs font-medium text-muted-foreground">
                    <ScanBarcode className="h-3.5 w-3.5" />
                    Há»™p váº­t lÃ½ {checkInGame.name ? `Â· ${checkInGame.name}` : ''} *
                  </label>
                  <p className="text-[11px] text-muted-foreground">
                    Game Ä‘Ã£ chá»n á»Ÿ trÃªn â€” chá»n há»™p váº­t lÃ½ Ä‘á»ƒ giao. ThÃªm tá»±a khÃ¡c sau khi má»Ÿ phiÃªn
                    (tab Game).
                  </p>
                  {boxesLoading ? (
                    <div className="flex h-9 items-center gap-2 text-xs text-muted-foreground">
                      <Spinner className="h-3.5 w-3.5" />
                      Äang táº£i danh sÃ¡ch há»™pâ€¦
                    </div>
                  ) : (
                    <select
                      className="flex h-9 w-full rounded-md border border-input bg-transparent px-3 font-mono text-sm"
                      value={barcode}
                      onChange={(e) => setBarcode(e.target.value)}
                      disabled={availableBoxes.length === 0}
                    >
                      <option value="">
                        {availableBoxes.length === 0
                          ? `KhÃ´ng cÃ²n há»™p trong kho`
                          : 'Chá»n há»™p váº­t lÃ½'}
                      </option>
                      {availableBoxes.map((box) => (
                        <option key={box.id || box.barcode} value={box.barcode}>
                          {box.barcode}
                          {box.gameName ? ` Â· ${box.gameName}` : ''}
                          {box.status && String(box.status).toLowerCase() !== 'available'
                            ? ` (${box.status})`
                            : ''}
                        </option>
                      ))}
                    </select>
                  )}
                  {boxesError ? (
                    <p className="text-xs text-orange-600">KhÃ´ng táº£i Ä‘Æ°á»£c danh sÃ¡ch há»™p. Thá»­ F5.</p>
                  ) : boxesFallback ? (
                    <p className="text-xs text-amber-700">
                      KhÃ´ng tÃ¬m tháº¥y há»™p gáº¯n tÃªn â€œ{checkInGame.name}â€ â€” Ä‘ang hiá»‡n má»i há»™p sáºµn dÃ¹ng.
                    </p>
                  ) : !boxesLoading && availableBoxes.length === 0 ? (
                    <p className="text-xs text-amber-700">
                      Kho khÃ´ng cÃ²n há»™p Available/Held. Kiá»ƒm tra tab Há»™p game.
                    </p>
                  ) : null}
                </div>
              </div>

              <div className="rounded-lg bg-muted/60 p-3 text-sm">
                <div className="flex justify-between">
                  <span className="text-muted-foreground">CÃ³ máº·t</span>
                  <span className="font-medium">{presentCount} ngÆ°á»i</span>
                </div>
                <div className="mt-1 flex justify-between">
                  <span className="text-muted-foreground">YÃªu cáº§u tá»‘i thiá»ƒu</span>
                  <span
                    className={`font-medium ${needsAlternative ? 'text-orange-600' : 'text-orange-600'}`}
                  >
                    {booking.bookedGame.minPlayers} ngÆ°á»i
                  </span>
                </div>
              </div>

              <Button
                type="button"
                className="h-12 w-full touch-manipulation text-base md:h-14"
                size="lg"
                disabled={
                  posCheckIn.isPending ||
                  boxesLoading ||
                  presentCount === 0 ||
                  !barcode.trim()
                }
                onClick={handleCheckIn}
              >
                {posCheckIn.isPending ? (
                  <Spinner className="mr-2 h-4 w-4" />
                ) : (
                  <Play className="mr-2 h-4 w-4" />
                )}
                XÃ¡c nháº­n Check-in vÃ  Má»Ÿ phiÃªn
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
        isConfirming={posCheckIn.isPending}
      />
    </div>
  );
}
