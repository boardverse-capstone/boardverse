'use client';

import { useState } from 'react';
import { AlertTriangle, ClipboardCheck, PackagePlus, Square } from 'lucide-react';
import { toast } from 'sonner';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Spinner } from '@/components/ui/spinner';
import { useAlternativeGames } from '../hooks/usePosCheckIn';
import {
  useAssignSessionGames,
  useCheckSessionGames,
  useEndGame,
  useReportInventoryLoss,
} from '../hooks/usePosMutations';
import type { ActiveSessionDetail, InventoryLossType } from '../types/pos-check-in.interface';

interface SessionGamesPanelProps {
  cafeId: string;
  session: ActiveSessionDetail;
  presentCount: number;
  onEnded?: () => void;
}

export function SessionGamesPanel({
  cafeId,
  session,
  presentCount,
  onEnded,
}: SessionGamesPanelProps) {
  const { data: games = [], isLoading: loadingGames } = useAlternativeGames(
    cafeId,
    Math.max(presentCount, 1),
    true,
  );

  const assignGames = useAssignSessionGames(cafeId, session.sessionId);
  const checkGames = useCheckSessionGames(cafeId, session.sessionId);
  const reportLoss = useReportInventoryLoss(cafeId, session.sessionId);
  const endGame = useEndGame(cafeId, session.sessionId);

  const [selectedInventoryIds, setSelectedInventoryIds] = useState<Set<string>>(new Set());
  const [expectedQty, setExpectedQty] = useState(1);
  const [actualQty, setActualQty] = useState(1);
  const [checkInventoryId, setCheckInventoryId] = useState(
    session.game.inventoryId ?? '',
  );
  const [lossInventoryId, setLossInventoryId] = useState(session.game.inventoryId ?? '');
  const [lossQty, setLossQty] = useState(1);
  const [lossType, setLossType] = useState<InventoryLossType>('Lost');
  const [lossNote, setLossNote] = useState('');

  const toggleInventory = (id: string) => {
    setSelectedInventoryIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const handleAssign = async () => {
    if (selectedInventoryIds.size === 0) {
      toast.error('Chọn ít nhất 1 game để gán.');
      return;
    }
    try {
      await assignGames.mutateAsync({ inventoryIds: Array.from(selectedInventoryIds) });
      setSelectedInventoryIds(new Set());
      toast.success('Đã gán thêm game vào phiên.');
    } catch {
      toast.error('Không thể gán game.');
    }
  };

  const handleCheck = async () => {
    const inventoryId = checkInventoryId || session.game.inventoryId;
    if (!inventoryId) {
      toast.error('Chọn inventory để kiểm kê.');
      return;
    }
    try {
      await checkGames.mutateAsync({
        items: [
          {
            inventoryId,
            expectedQuantity: expectedQty,
            actualQuantity: actualQty,
          },
        ],
      });
      toast.success('Đã ghi nhận kiểm kê linh kiện.');
    } catch {
      toast.error('Không thể kiểm kê.');
    }
  };

  const handleLoss = async () => {
    const inventoryId = lossInventoryId || session.game.inventoryId;
    if (!inventoryId) {
      toast.error('Chọn inventory để ghi mất mát.');
      return;
    }
    try {
      await reportLoss.mutateAsync({
        inventoryId,
        quantity: lossQty,
        lossType,
        note: lossNote || undefined,
      });
      setLossNote('');
      toast.success('Đã ghi nhận mất mát / hư hỏng.');
    } catch {
      toast.error('Không thể ghi nhận mất mát.');
    }
  };

  const handleEndGame = async () => {
    try {
      await endGame.mutateAsync();
      toast.success('Đã nhận lại game · phiên chuyển sang CHECKING.');
      onEnded?.();
    } catch {
      toast.error('Không thể kết thúc game.');
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
            Gán thêm board game
          </p>
          <Badge variant="secondary">{session.game.name}</Badge>
        </div>
        {loadingGames ? (
          <div className="flex justify-center py-6">
            <Spinner className="h-5 w-5" />
          </div>
        ) : (
          <div className="max-h-48 space-y-2 overflow-y-auto">
            {games.map((game) => (
              <label
                key={game.inventoryId}
                className="flex cursor-pointer items-center gap-2 rounded-md border px-3 py-2 text-sm hover:bg-muted/40"
              >
                <input
                  type="checkbox"
                  checked={selectedInventoryIds.has(game.inventoryId)}
                  onChange={() => toggleInventory(game.inventoryId)}
                />
                <span className="flex-1">{game.name}</span>
                <span className="text-xs text-muted-foreground">
                  {game.minPlayers}–{game.maxPlayers}p
                </span>
              </label>
            ))}
          </div>
        )}
        <Button type="button" className="w-full" disabled={busy} onClick={() => void handleAssign()}>
          {assignGames.isPending ? <Spinner className="mr-2 h-4 w-4" /> : null}
          Gán game đã chọn
        </Button>
      </section>

      <Button
        type="button"
        className="h-11 w-full bg-amber-600 text-white hover:bg-amber-700"
        disabled={busy}
        onClick={() => void handleEndGame()}
      >
        {endGame.isPending ? (
          <Spinner className="mr-2 h-4 w-4" />
        ) : (
          <Square className="mr-2 h-4 w-4" />
        )}
        Nhận lại game · End game (CHECKING)
      </Button>

      <section className="space-y-3 rounded-lg border bg-background p-3 md:p-4">
        <p className="flex items-center gap-2 text-sm font-medium">
          <ClipboardCheck className="h-4 w-4" />
          Kiểm kê linh kiện
        </p>
        <div className="space-y-1.5">
          <Label htmlFor="check-inv">Inventory ID</Label>
          <Input
            id="check-inv"
            value={checkInventoryId}
            onChange={(e) => setCheckInventoryId(e.target.value)}
            placeholder={session.game.inventoryId ?? 'inv-xxx'}
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
        <Button
          type="button"
          variant="secondary"
          className="w-full"
          disabled={busy}
          onClick={() => void handleCheck()}
        >
          {checkGames.isPending ? <Spinner className="mr-2 h-4 w-4" /> : null}
          Lưu kiểm kê
        </Button>
      </section>

      <section className="space-y-3 rounded-lg border border-rose-200 bg-rose-50/40 p-3 md:p-4">
        <p className="flex items-center gap-2 text-sm font-medium text-rose-800">
          <AlertTriangle className="h-4 w-4" />
          Ghi nhận mất mát / hư hỏng
        </p>
        <div className="space-y-1.5">
          <Label htmlFor="loss-inv">Inventory ID</Label>
          <Input
            id="loss-inv"
            value={lossInventoryId}
            onChange={(e) => setLossInventoryId(e.target.value)}
            placeholder={session.game.inventoryId ?? 'inv-xxx'}
          />
        </div>
        <div className="grid grid-cols-2 gap-2">
          <div className="space-y-1.5">
            <Label htmlFor="loss-qty">Số lượng</Label>
            <Input
              id="loss-qty"
              type="number"
              min={1}
              value={lossQty}
              onChange={(e) => setLossQty(Math.max(1, Number(e.target.value) || 1))}
            />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="loss-type">Loại</Label>
            <select
              id="loss-type"
              className="flex h-9 w-full rounded-md border border-input bg-transparent px-3 text-sm"
              value={lossType}
              onChange={(e) => setLossType(e.target.value as InventoryLossType)}
            >
              <option value="Lost">Mất</option>
              <option value="Damaged">Hỏng</option>
            </select>
          </div>
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="loss-note">Ghi chú</Label>
          <Textarea
            id="loss-note"
            rows={2}
            value={lossNote}
            onChange={(e) => setLossNote(e.target.value)}
            placeholder="Mô tả linh kiện bị mất/hỏng..."
          />
        </div>
        <Button
          type="button"
          variant="destructive"
          className="w-full"
          disabled={busy}
          onClick={() => void handleLoss()}
        >
          {reportLoss.isPending ? <Spinner className="mr-2 h-4 w-4" /> : null}
          Ghi nhận mất mát
        </Button>
      </section>
    </div>
  );
}
