'use client';

import Image from 'next/image';
import { Users } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Spinner } from '@/components/ui/spinner';
import type { AlternativeGame } from '../types/pos-check-in.interface';

interface AlternativeGamesGridProps {
  games: AlternativeGame[];
  isLoading: boolean;
  selectedInventoryId: string | null;
  onSelect: (game: AlternativeGame) => void;
}

export function AlternativeGamesGrid({
  games,
  isLoading,
  selectedInventoryId,
  onSelect,
}: AlternativeGamesGridProps) {
  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-10">
        <Spinner className="h-6 w-6" />
        <span className="ml-2 text-sm text-muted-foreground">Äang quÃ©t kho game...</span>
      </div>
    );
  }

  if (games.length === 0) {
    return (
      <div className="rounded-lg border border-dashed border-orange-200 bg-orange-50/50 px-4 py-8 text-center text-sm text-orange-700">
        KhÃ´ng tÃ¬m tháº¥y game thay tháº¿ phÃ¹ há»£p vá»›i sá»‘ ngÆ°á»i hiá»‡n táº¡i trong kho quÃ¡n.
      </div>
    );
  }

  return (
    <div className="grid gap-3 sm:grid-cols-2 md:gap-4">
      {games.map((game) => {
        const isSelected = selectedInventoryId === game.inventoryId;

        return (
          <article
            key={game.inventoryId}
            className={`flex touch-manipulation gap-3 rounded-xl border p-3 transition-all active:scale-[0.99] md:p-4 ${
              isSelected
                ? 'border-primary bg-primary/5 ring-2 ring-primary/30'
                : 'border-border bg-card hover:border-primary/40'
            }`}
          >
            <div className="relative h-20 w-20 shrink-0 overflow-hidden rounded-lg bg-muted">
              <Image
                src={game.imageUrl}
                alt={game.name}
                fill
                className="object-cover"
                sizes="80px"
                unoptimized
              />
            </div>

            <div className="flex min-w-0 flex-1 flex-col justify-between gap-2">
              <div>
                <h4 className="truncate font-semibold">{game.name}</h4>
                <p className="mt-0.5 flex items-center gap-1 text-xs text-muted-foreground">
                  <Users className="h-3.5 w-3.5" />
                  {game.minPlayers}â€“{game.maxPlayers} ngÆ°á»i
                </p>
                <Badge variant="outline" className="mt-1 text-[10px]">
                  CÃ²n {game.boxQuantity} há»™p
                </Badge>
              </div>

              <Button
                type="button"
                size="lg"
                variant={isSelected ? 'default' : 'outline'}
                className="h-11 w-full touch-manipulation text-sm md:h-12"
                onClick={() => onSelect(game)}
              >
                {isSelected ? 'ÄÃ£ chá»n' : 'Äá»•i sang game nÃ y'}
              </Button>
            </div>
          </article>
        );
      })}
    </div>
  );
}
