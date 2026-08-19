'use client';

import { AlertTriangle } from 'lucide-react';
import {
  AlertDialog,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogMedia,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { Button } from '@/components/ui/button';
import { Spinner } from '@/components/ui/spinner';
import { AlternativeGamesGrid } from './alternative-games-grid';
import type { AlternativeGame } from '../types/pos-check-in.interface';

interface UnderstaffedAlertDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  originalGameName: string;
  presentCount: number;
  minPlayers: number;
  games: AlternativeGame[];
  isLoadingGames: boolean;
  selectedGame: AlternativeGame | null;
  onSelectGame: (game: AlternativeGame) => void;
  onConfirm: () => void;
  isConfirming: boolean;
}

export function UnderstaffedAlertDialog({
  open,
  onOpenChange,
  originalGameName,
  presentCount,
  minPlayers,
  games,
  isLoadingGames,
  selectedGame,
  onSelectGame,
  onConfirm,
  isConfirming,
}: UnderstaffedAlertDialogProps) {
  const canConfirm = Boolean(selectedGame) && !isConfirming;

  return (
    <AlertDialog open={open} onOpenChange={onOpenChange}>
      <AlertDialogContent className="max-h-[90dvh] overflow-y-auto sm:max-w-2xl md:max-w-3xl">
        <AlertDialogHeader className="text-start">
          <AlertDialogMedia className="bg-rose-100 text-rose-600">
            <AlertTriangle className="h-8 w-8" />
          </AlertDialogMedia>
          <AlertDialogTitle className="text-rose-700">
            Không đủ số lượng người tối thiểu để chơi game {originalGameName}
          </AlertDialogTitle>
          <AlertDialogDescription className="text-start">
            Hiện có <strong>{presentCount}</strong> người có mặt, trong khi game yêu cầu tối thiểu{' '}
            <strong>{minPlayers}</strong> người. Luồng mở phiên thông thường đã bị chặn. Vui lòng
            chọn game thay thế phù hợp từ kho quán trước khi kích hoạt bàn.
          </AlertDialogDescription>
        </AlertDialogHeader>

        <div className="space-y-3">
          <h3 className="text-sm font-semibold">Game thay thế gợi ý</h3>
          <AlternativeGamesGrid
            games={games}
            isLoading={isLoadingGames}
            selectedInventoryId={selectedGame?.inventoryId ?? null}
            onSelect={onSelectGame}
          />
        </div>

        <AlertDialogFooter className="gap-2 sm:gap-0">
          <AlertDialogCancel disabled={isConfirming} className="h-11 min-h-[44px] touch-manipulation md:h-12">
            Hủy
          </AlertDialogCancel>
          <Button
            type="button"
            variant="destructive"
            disabled={!canConfirm}
            className="h-11 min-h-[44px] touch-manipulation md:h-12"
            onClick={onConfirm}
          >
            {isConfirming ? (
              <>
                <Spinner className="mr-2 h-4 w-4" />
                Đang kích hoạt...
              </>
            ) : (
              'Xác nhận kích hoạt bàn'
            )}
          </Button>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
