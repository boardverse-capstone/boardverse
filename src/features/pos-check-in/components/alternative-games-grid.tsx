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
        <span className="ml-2 text-sm text-muted-foreground">Đang quét kho game...</span>
      </div>
    );
  }

  if (games.length === 0) {
    return (
      <div className="rounded-lg border border-dashed border-rose-200 bg-rose-50/50 px-4 py-8 text-center text-sm text-rose-700">
        Không tìm thấy game thay thế phù hợp với số người hiện tại trong kho quán.
      </div>
    );
  }

  return (
    <div className="grid gap-3 sm:grid-cols-2">
      {games.map((game) => {
        const isSelected = selectedInventoryId === game.inventoryId;

        return (
          <article
            key={game.inventoryId}
            className={`flex gap-3 rounded-xl border p-3 transition-all ${
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
                  {game.minPlayers}–{game.maxPlayers} người
                </p>
                <Badge variant="outline" className="mt-1 text-[10px]">
                  Còn {game.boxQuantity} hộp
                </Badge>
              </div>

              <Button
                type="button"
                size="sm"
                variant={isSelected ? 'default' : 'outline'}
                className="w-full"
                onClick={() => onSelect(game)}
              >
                {isSelected ? 'Đã chọn' : 'Đổi sang game này'}
              </Button>
            </div>
          </article>
        );
      })}
    </div>
  );
}
