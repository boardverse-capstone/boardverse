'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import Image from 'next/image';
import QRCode from 'react-qr-code';
import { Clock, Play, QrCode, ScanBarcode, UserX, X } from 'lucide-react';
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
import { usePosBoxes } from '../hooks/usePosBoxes';
import { useMarkAbsent, usePosCheckIn } from '../hooks/usePosMutations';
import { PosCheckInService } from '../services/pos-check-in.service';
import {
  resolvePosCheckInCode,
} from '../utils/pos-check-in.mapper';
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

  /** Game template đang giao: booking / game đổi (understaffed) */
  const checkInGame = useMemo(() => {
    if (selectedGame) {
      return { id: selectedGame.gameTemplateId, name: selectedGame.name };
    }
    return {
      id: booking?.bookedGame?.id || '',
      name: booking?.bookedGame?.name || '',
    };
  }, [selectedGame, booking?.bookedGame?.id, booking?.bookedGame?.name]);

  /** Hộp giao: ưu tiên đúng tựa Azul; nếu kho không map tên → fallback mọi hộp Available */
  const { availableBoxes, boxesFallback } = useMemo(() => {
    const isSelectable = (status: string) => {
      const s = status.toLowerCase();
      return (
        s === 'available' ||
        s === '0' ||
        s === 'held' ||
        s === 'reserved'
      );
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

  // Tự chọn: inventoryId từ booking → hộp đầu danh sách
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

  const [membersRefresh, setMembersRefresh] = useState(0);

  useEffect(() => {
    const onMembersUpdated = () => setMembersRefresh((n) => n + 1);
    window.addEventListener('pos_session_members_updated', onMembersUpdated);
    return () => window.removeEventListener('pos_session_members_updated', onMembersUpdated);
  }, []);

  const liveGuestCount = useMemo(() => {
    const realMembers = (activeSession?.members || []).filter(
      (m) =>
        !String(m.id).startsWith('guest-slot-') &&
        !String(m.id).startsWith('guest-auto-'),
    );
    // Có members thật → đếm đúng số đó (không lấy PresentCount/booking = 4 ghế)
    if (realMembers.length > 0) return realMembers.length;
    return Math.max(activeSession?.presentCount || 0, booking?.participants?.length || 0, 1);
  }, [activeSession?.presentCount, activeSession?.members, booking?.participants, membersRefresh]);

  const [extraBoxes, setExtraBoxes] = useState<{ barcode: string; name: string }[]>(() => {
    const sId = activeSession?.sessionId || bookingId;
    if (typeof window === 'undefined' || !sId) return [];
    try {
      const stored = localStorage.getItem(`pos_assigned_boxes_${sId}`);
      return stored ? JSON.parse(stored) : [];
    } catch {
      return [];
    }
  });

  useEffect(() => {
    const sId = activeSession?.sessionId || bookingId;
    if (!sId) return;

    const handleBoxesUpdated = () => {
      if (typeof window !== 'undefined') {
        try {
          const stored = localStorage.getItem(`pos_assigned_boxes_${sId}`);
          setExtraBoxes(stored ? JSON.parse(stored) : []);
        } catch {
          // ignore
        }
      }
    };

    handleBoxesUpdated();
    window.addEventListener('pos_session_boxes_updated', handleBoxesUpdated);
    return () => window.removeEventListener('pos_session_boxes_updated', handleBoxesUpdated);
  }, [activeSession?.sessionId, bookingId]);

  const assignedBoxesCount = 1 + extraBoxes.length;

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

  const displayGameName = useMemo(() => {
    const base = displayGame.name;
    if (extraBoxes.length === 0) return base;
    const addedNames = extraBoxes.map((b) => b.name).join(' + ');
    return `${base} + ${addedNames}`;
  }, [displayGame.name, extraBoxes]);

  useEffect(() => {
    if (!booking) return;
    setPresentIds(initPresentIds(booking));
    setAbsentProcessed(booking.participants.some((p) => p.attendanceStatus === 'Absent'));
    setCheckInCode(resolvePosCheckInCode(booking));
    // Chỉ Active/Checking — Completed không còn session ops
    setSessionActive(
      booking.sessionStatus === 'Active' || booking.sessionStatus === 'Checking',
    );

    let cancelled = false;
    void PosCheckInService.getBookingById(booking.id, booking.cafeId)
      .then((detail) => {
        if (cancelled) return;
        const code = resolvePosCheckInCode(detail);
        if (code) setCheckInCode(code);
      })
      .catch(() => {
        // giữ mã hiện tại
      });

    return () => {
      cancelled = true;
    };
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
        idempotencyKey: `pos-checkin:${booking.id}`,
        bookingId: booking.id,
        lobbyId: booking.lobbyId,
      });
      setSessionActive(true);
      setAlertOpen(false);
      onSessionActivated?.(session);
      toast.success(
        `Đã mở phiên ${booking.tableLabel} · ${session.game.name}${
          session.depositCreditTotal > 0
            ? ` · Cọc: ${formatCurrency(session.depositCreditTotal)}`
            : ''
        }.`,
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
            {sessionActive ? `Quản lý ${booking.tableLabel}` : `Check-in ${booking.tableLabel}`}
          </CardTitle>
          <p className="mt-1 flex items-center gap-1 text-xs text-muted-foreground md:text-sm">
            <Clock className="h-3 w-3 md:h-4 md:w-4" />
            {formatTime(booking.scheduledAt)}
          </p>
        </div>
      </CardHeader>

      <CardContent className="space-y-4 md:space-y-5">
        <div className="flex flex-col sm:flex-row items-center justify-between gap-4 rounded-xl border border-emerald-200/80 bg-emerald-50/30 p-3 md:p-4 shadow-sm">
          <div className="flex items-center gap-3 w-full sm:w-auto">
            <div className="relative h-16 w-16 shrink-0 overflow-hidden rounded-lg border bg-background shadow-xs md:h-20 md:w-20">
              <Image
                src={displayGame.imageUrl}
                alt={displayGame.name}
                fill
                className="object-cover"
                sizes="80px"
                unoptimized
              />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <p className="text-xs font-semibold text-emerald-800 uppercase tracking-wider">Game đã chọn</p>
                {sessionActive && <Badge className="bg-emerald-600 text-white text-[10px] px-2 py-0.5">Bàn đang mở</Badge>}
              </div>
              <div className="flex items-center gap-2 flex-wrap">
                <p className="text-base sm:text-lg font-bold text-foreground">{displayGameName}</p>
                {assignedBoxesCount > 1 && (
                  <Badge variant="outline" className="bg-emerald-50 text-emerald-800 border-emerald-300 font-bold text-[11px]">
                    📦 Tổng {assignedBoxesCount} hộp game
                  </Badge>
                )}
              </div>
              <p className="text-xs text-muted-foreground">
                {displayGame.minPlayers}–{displayGame.maxPlayers} người chơi · {liveGuestCount} khách
              </p>
            </div>
          </div>

          {/* Mã QR Check-in Bàn (Khung to nổi bật) */}
          <div className="flex items-center gap-4 rounded-xl border border-emerald-300 bg-white p-3 md:p-3.5 shadow-md shrink-0 self-stretch sm:self-auto justify-between sm:justify-start">
            <div className="space-y-1 text-left">
              <p className="flex items-center gap-1.5 text-sm font-bold text-emerald-950">
                <QrCode className="h-4 w-4 text-emerald-600" />
                Mã QR Check-in
              </p>
              <p className="font-mono text-xs font-semibold text-emerald-800 tracking-wider">
                {booking.qrCode || `BV-RESERV-${booking.id.slice(0, 8)}`}
              </p>
              <p className="text-[11px] text-muted-foreground">
                📱 Quét bằng App BoardVerse
              </p>
            </div>
            <div className="bg-white p-2 rounded-xl border-2 border-emerald-200 ring-2 ring-emerald-50 shrink-0">
              <QRCode
                value={booking.qrCode || `BV-RESERV-${booking.id}`}
                size={124}
                className="h-28 w-28 md:h-32 md:w-32"
              />
            </div>
          </div>
        </div>

        {sessionActive ? (
          <SessionOpsPanel
            booking={booking}
            onCompleted={() => {
              setSessionActive(false);
              onSessionCompleted?.();
            }}
            onSessionMissing={() => setSessionActive(false)}
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
                  readOnly
                  className="font-mono bg-muted/50 cursor-default"
                  autoComplete="off"
                  title="Mã lấy từ booking — không chỉnh sửa"
                />
              </div>
              <div className="space-y-1.5">
                <label className="flex items-center gap-1.5 text-xs font-medium text-muted-foreground">
                  <ScanBarcode className="h-3.5 w-3.5" />
                  Hộp vật lý {checkInGame.name ? `· ${checkInGame.name}` : ''} *
                </label>
                <p className="text-[11px] text-muted-foreground">
                  Chọn hộp vật lý để giao. Muốn thêm game khác: mở phiên xong, sang tab Game.
                </p>
                {boxesLoading ? (
                  <div className="flex h-9 items-center gap-2 text-xs text-muted-foreground">
                    <Spinner className="h-3.5 w-3.5" />
                    Đang tải danh sách hộp…
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
                        ? `Không còn hộp trong kho`
                        : 'Chọn hộp vật lý'}
                    </option>
                    {availableBoxes.map((box) => (
                      <option key={box.id || box.barcode} value={box.barcode}>
                        {box.barcode}
                        {box.gameName ? ` · ${box.gameName}` : ''}
                        {box.status && String(box.status).toLowerCase() !== 'available'
                          ? ` (${box.status})`
                          : ''}
                      </option>
                    ))}
                  </select>
                )}
                {boxesError ? (
                  <p className="text-xs text-rose-600">Không tải được danh sách hộp. Thử F5.</p>
                ) : boxesFallback ? (
                  <p className="text-xs text-amber-700">
                    Không tìm thấy hộp gắn tên “{checkInGame.name}” — đang hiện mọi hộp sẵn dùng.
                    Chọn đúng hộp Azul trong kho.
                  </p>
                ) : !boxesLoading && availableBoxes.length === 0 ? (
                  <p className="text-xs text-amber-700">
                    Kho không còn hộp Available/Held. Kiểm tra tab Hộp game.
                  </p>
                ) : null}
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
