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
          <AlertDialogMedia className="bg-orange-100 text-orange-600">
            <AlertTriangle className="h-8 w-8" />
          </AlertDialogMedia>
          <AlertDialogTitle className="text-orange-700">
            KhÃ´ng Ä‘á»§ sá»‘ lÆ°á»£ng ngÆ°á»i tá»‘i thiá»ƒu Ä‘á»ƒ chÆ¡i game {originalGameName}
          </AlertDialogTitle>
          <AlertDialogDescription className="text-start">
            Hiá»‡n cÃ³ <strong>{presentCount}</strong> ngÆ°á»i cÃ³ máº·t, trong khi game yÃªu cáº§u tá»‘i thiá»ƒu{' '}
            <strong>{minPlayers}</strong> ngÆ°á»i. Luá»“ng má»Ÿ phiÃªn thÃ´ng thÆ°á»ng Ä‘Ã£ bá»‹ cháº·n. Vui lÃ²ng
            chá»n game thay tháº¿ phÃ¹ há»£p tá»« kho quÃ¡n trÆ°á»›c khi kÃ­ch hoáº¡t bÃ n.
          </AlertDialogDescription>
        </AlertDialogHeader>

        <div className="space-y-3">
          <h3 className="text-sm font-semibold">Game thay tháº¿ gá»£i Ã½</h3>
          <AlternativeGamesGrid
            games={games}
            isLoading={isLoadingGames}
            selectedInventoryId={selectedGame?.inventoryId ?? null}
            onSelect={onSelectGame}
          />
        </div>

        <AlertDialogFooter className="gap-2 sm:gap-0">
          <AlertDialogCancel disabled={isConfirming} className="h-11 min-h-[44px] touch-manipulation md:h-12">
            Há»§y
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
                Äang kÃ­ch hoáº¡t...
              </>
            ) : (
              'XÃ¡c nháº­n kÃ­ch hoáº¡t bÃ n'
            )}
          </Button>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
