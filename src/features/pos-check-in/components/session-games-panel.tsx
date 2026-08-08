'use client';

import { useState } from 'react';
import { AlertTriangle, CheckCircle2, ClipboardCheck, PackagePlus, Square } from 'lucide-react';
import { toast } from 'sonner';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Spinner } from '@/components/ui/spinner';
import {
  useAlternativeGames,
  useStaffCafe,
} from '../hooks/usePosCheckIn';
import {
  useAssignSessionGames,
  useCheckSessionGames,
  useEndGame,
  useReportInventoryLoss,
} from '../hooks/usePosMutations';
import type { ActiveSessionDetail } from '../types/pos-check-in.interface';

interface SessionGamesPanelProps {
  cafeId: string;
  session: ActiveSessionDetail;
  presentCount: number;
  onEnded?: () => void;
}

export function SessionGamesPanel({
  cafeId,
  session,
  onEnded,
}: SessionGamesPanelProps) {
  const { data: cafe } = useStaffCafe();
  const effectiveCafeId = cafeId || session.cafeId || cafe?.id || '';
  const assignGames = useAssignSessionGames(effectiveCafeId, session.sessionId);
  const checkGames = useCheckSessionGames(effectiveCafeId, session.sessionId);
  const reportLoss = useReportInventoryLoss(effectiveCafeId, session.sessionId);
  const endGame = useEndGame(effectiveCafeId, session.sessionId);

  const [assignBarcode, setAssignBarcode] = useState('');
  const [expectedQty, setExpectedQty] = useState(1);
  const [actualQty, setActualQty] = useState(1);
  const [componentTemplateId, setComponentTemplateId] = useState('');
  const [sessionGameId, setSessionGameId] = useState(session.game.inventoryId ?? session.sessionId);
  const [lossQty, setLossQty] = useState(1);
  const [lossComponentId, setLossComponentId] = useState('');
  const [lossNote, setLossNote] = useState('');

  const isAlreadyChecking = session.status === 'Checking' || session.status === 'Completed';

  const handleAssign = async () => {
    const barcode = assignBarcode.trim();
    if (!barcode) {
      toast.error('Quét / nhập barcode hộp game cần gán.');
      return;
    }
    try {
      await assignGames.mutateAsync({ barcode });
      setAssignBarcode('');
      toast.success('Đã gán thêm game vào phiên.');
    } catch (err) {
      toast.error((err as Error)?.message || 'Không thể gán game.');
    }
  };

  const handleCheck = async () => {
    try {
      await checkGames.mutateAsync({
        sessionId: session.sessionId,
        sessionGameId: sessionGameId || undefined,
        items: [
          {
            sessionGameId: sessionGameId || undefined,
            componentTemplateId: componentTemplateId || undefined,
            inventoryId: session.game.inventoryId,
            expectedQuantity: expectedQty,
            actualQuantity: actualQty,
          },
        ],
      });
      toast.success('Đã ghi nhận kiểm kê linh kiện.');
    } catch (err) {
      toast.error((err as Error)?.message || 'Không thể kiểm kê.');
    }
  };

  const handleLoss = async () => {
    if (!sessionGameId.trim()) {
      toast.error('Nhập sessionGameId để ghi hao hụt.');
      return;
    }
    if (!lossComponentId.trim()) {
      toast.error('Nhập componentTemplateId bị thiếu.');
      return;
    }
    try {
      await reportLoss.mutateAsync({
        sessionGameId: sessionGameId.trim(),
        missingComponents: [
          {
            componentTemplateId: lossComponentId.trim(),
            missingQuantity: lossQty,
          },
        ],
        notes: lossNote || undefined,
      });
      setLossNote('');
      toast.success('Đã ghi nhận hao hụt linh kiện.');
    } catch (err) {
      toast.error((err as Error)?.message || 'Không thể ghi nhận mất mát.');
    }
  };

  const handleEndGame = async () => {
    if (isAlreadyChecking) {
      toast.info('Phiên chơi đã ở bước Checking. Chuyển sang Tab Thanh toán...');
      onEnded?.();
      return;
    }
    try {
      await endGame.mutateAsync();
      toast.success('Đã nhận lại game thành công · Phiên chuyển sang trạng thái Checking.');
      onEnded?.();
    } catch (err) {
      toast.error((err as Error)?.message || 'Không thể kết thúc game.');
    }
  };

  const busy =
    assignGames.isPending ||
    checkGames.isPending ||
    reportLoss.isPending ||
    endGame.isPending;

  return (
    <div className="space-y-4">
      <section className="space-y-3 rounded-lg border bg-background p-3 md:p-4">
        <div className="flex items-center justify-between gap-2">
          <p className="flex items-center gap-2 text-sm font-medium">
            <PackagePlus className="h-4 w-4" />
            Gán thêm hộp (barcode)
          </p>
          <Badge variant="secondary">{session.game.name}</Badge>
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="assign-barcode">Barcode hộp</Label>
          <Input
            id="assign-barcode"
            value={assignBarcode}
            onChange={(e) => setAssignBarcode(e.target.value)}
            placeholder="VD: BV-CATAN-002"
            className="font-mono"
            autoComplete="off"
          />
        </div>
        <Button type="button" className="w-full" disabled={busy} onClick={() => void handleAssign()}>
          {assignGames.isPending ? <Spinner className="mr-2 h-4 w-4" /> : null}
          Gán hộp vào phiên
        </Button>
      </section>

      <Button
        type="button"
        className={`h-11 w-full text-white ${
          isAlreadyChecking
            ? 'bg-emerald-600 hover:bg-emerald-700'
            : 'bg-amber-600 hover:bg-amber-700'
        }`}
        disabled={busy}
        onClick={() => void handleEndGame()}
      >
        {endGame.isPending ? (
          <Spinner className="mr-2 h-4 w-4" />
        ) : isAlreadyChecking ? (
          <CheckCircle2 className="mr-2 h-4 w-4" />
        ) : (
          <Square className="mr-2 h-4 w-4" />
        )}
        {isAlreadyChecking
          ? '✓ Đã nhận lại game (Chuyển sang Thanh toán)'
          : 'Nhận lại game · Kết thúc phiên chơi'}
      </Button>

      <section className="space-y-3 rounded-lg border bg-background p-3 md:p-4">
        <p className="flex items-center gap-2 text-sm font-medium">
          <ClipboardCheck className="h-4 w-4" />
          Kiểm kê linh kiện
        </p>
        <div className="space-y-1.5">
          <Label htmlFor="session-game-id">Session game ID</Label>
          <Input
            id="session-game-id"
            value={sessionGameId}
            onChange={(e) => setSessionGameId(e.target.value)}
            className="font-mono text-xs"
          />
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="comp-id">Component template ID (tuỳ chọn)</Label>
          <Input
            id="comp-id"
            value={componentTemplateId}
            onChange={(e) => setComponentTemplateId(e.target.value)}
            className="font-mono text-xs"
          />
        </div>
        <div className="grid grid-cols-2 gap-2">
          <div className="space-y-1.5">
            <Label htmlFor="expected-qty">Kỳ vọng</Label>
            <Input
              id="expected-qty"
              type="number"
              min={0}
              value={expectedQty}
              onChange={(e) => setExpectedQty(Math.max(0, Number(e.target.value) || 0))}
            />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="actual-qty">Thực tế</Label>
            <Input
              id="actual-qty"
              type="number"
              min={0}
              value={actualQty}
              onChange={(e) => setActualQty(Math.max(0, Number(e.target.value) || 0))}
            />
          </div>
        </div>
        <Button type="button" className="w-full" disabled={busy} onClick={() => void handleCheck()}>
          {checkGames.isPending ? <Spinner className="mr-2 h-4 w-4" /> : null}
          Submit kiểm kê
        </Button>
      </section>

      <section className="space-y-3 rounded-lg border border-amber-200 bg-amber-50/40 p-3 md:p-4">
        <p className="flex items-center gap-2 text-sm font-medium text-amber-900">
          <AlertTriangle className="h-4 w-4" />
          Hao hụt trước phiên
        </p>
        <div className="space-y-1.5">
          <Label htmlFor="loss-comp">Component template ID</Label>
          <Input
            id="loss-comp"
            value={lossComponentId}
            onChange={(e) => setLossComponentId(e.target.value)}
            className="font-mono text-xs"
          />
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="loss-qty">Số lượng thiếu</Label>
          <Input
            id="loss-qty"
            type="number"
            min={1}
            value={lossQty}
            onChange={(e) => setLossQty(Math.max(1, Number(e.target.value) || 1))}
          />
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="loss-note">Ghi chú</Label>
          <Textarea
            id="loss-note"
            value={lossNote}
            onChange={(e) => setLossNote(e.target.value)}
            rows={2}
          />
        </div>
        <Button
          type="button"
          variant="outline"
          className="w-full border-amber-300"
          disabled={busy}
          onClick={() => void handleLoss()}
        >
          {reportLoss.isPending ? <Spinner className="mr-2 h-4 w-4" /> : null}
          Ghi nhận hao hụt
        </Button>
      </section>
    </div>
  );
}
