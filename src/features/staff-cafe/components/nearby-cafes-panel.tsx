'use client';

import { useMemo, useState } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import { ChevronDown, Store } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Skeleton } from '@/components/ui/skeleton';
import { cn } from '@/lib/utils';
import { ProfileLocationSection } from '@/features/profile/components/profile-location-section';
import { useMyLocation } from '@/features/profile/hooks/useMyLocation';
import { useInventoryList } from '../hooks/useInventoryList';
import { useNearbyCafes, useStaffWorkingCafe } from '../hooks/useStaffCafe';
import type { NearbyCafe } from '../types/cafe.interface';

interface NearbyCafesPanelProps {
  selectedCafeId?: string;
  onSelectCafe?: (cafe: NearbyCafe) => void;
  compact?: boolean;
}

export function NearbyCafesPanel({
  selectedCafeId,
  onSelectCafe,
  compact = false,
}: NearbyCafesPanelProps) {
  const { data: workingCafe } = useStaffWorkingCafe();
  const { data: location, refetch: refetchLocation } = useMyLocation();

  const { data: inventoryPage, isLoading: gamesLoading } = useInventoryList(workingCafe?.id, {
    page: 1,
    limit: 100,
  });

  const gameOptions = useMemo(() => {
    const items = inventoryPage?.data ?? [];
    const byTemplate = new Map<
      string,
      { gameTemplateId: string; name: string; imageUrl: string | null }
    >();
    for (const item of items) {
      if (!item.gameTemplateId || byTemplate.has(item.gameTemplateId)) continue;
      byTemplate.set(item.gameTemplateId, {
        gameTemplateId: item.gameTemplateId,
        name: item.name || item.gameTemplateId,
        imageUrl: item.imageUrl,
      });
    }
    return Array.from(byTemplate.values()).sort((a, b) => a.name.localeCompare(b.name, 'vi'));
  }, [inventoryPage?.data]);

  const [selectedGameTemplateId, setSelectedGameTemplateId] = useState('');
  const [gameListOpen, setGameListOpen] = useState(false);
  const [radiusKmDraft, setRadiusKmDraft] = useState('15');
  const [gameTemplateId, setGameTemplateId] = useState('');
  const [radiusKm, setRadiusKm] = useState(15);
  const [hasSearched, setHasSearched] = useState(false);

  const selectedGame =
    gameOptions.find((g) => g.gameTemplateId === selectedGameTemplateId) ?? null;
  const selectedGameName =
    gameOptions.find((g) => g.gameTemplateId === (hasSearched ? gameTemplateId : selectedGameTemplateId))
      ?.name ?? null;

  const {
    data: cafes = [],
    isLoading: nearbyLoading,
    isError: nearbyError,
    error: nearbyErrorObj,
    refetch: refetchNearby,
  } = useNearbyCafes({
    gameTemplateId: hasSearched ? gameTemplateId : undefined,
    latitude: location?.latitude,
    longitude: location?.longitude,
    radiusKm,
    enabled: hasSearched && Boolean(gameTemplateId),
  });

  const handleSearch = () => {
    if (!selectedGameTemplateId) return;

    const parsedRadius = Number(radiusKmDraft);
    const nextRadius =
      Number.isFinite(parsedRadius) && parsedRadius >= 0.1 && parsedRadius <= 50
        ? parsedRadius
        : 15;

    setGameTemplateId(selectedGameTemplateId);
    setRadiusKm(nextRadius);
    setRadiusKmDraft(String(nextRadius));
    setHasSearched(true);
  };

  const handleLocationSaved = async () => {
    await refetchLocation();
    if (hasSearched && gameTemplateId) {
      await refetchNearby();
    }
  };

  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="text-base">Quán gần bạn</CardTitle>
      </CardHeader>

      <CardContent className="space-y-3">
        <ProfileLocationSection onSaved={() => void handleLocationSaved()} />

        <div className="space-y-2 rounded-xl border border-border/70 bg-muted/20 p-3">
          <div className="space-y-1.5">
            <Label className="text-xs">Game trong kho quán</Label>
            {gamesLoading ? (
              <Skeleton className="h-11 w-full rounded-lg" />
            ) : gameOptions.length === 0 ? (
              <p className="text-xs text-muted-foreground">
                Kho quán chưa có game để tìm gần đây.
              </p>
            ) : (
              <Popover open={gameListOpen} onOpenChange={setGameListOpen}>
                <PopoverTrigger asChild>
                  <Button
                    type="button"
                    variant="outline"
                    className="h-auto w-full justify-between gap-3 px-2.5 py-2"
                  >
                    <span className="flex min-w-0 items-center gap-3">
                      {selectedGame ? (
                        <>
                          <span className="relative size-9 shrink-0 overflow-hidden rounded-md bg-muted">
                            {selectedGame.imageUrl ? (
                              <Image
                                src={selectedGame.imageUrl}
                                alt={selectedGame.name}
                                fill
                                className="object-cover"
                                sizes="36px"
                              />
                            ) : (
                              <span className="flex size-full items-center justify-center text-[10px] text-muted-foreground">
                                N/A
                              </span>
                            )}
                          </span>
                          <span className="truncate text-sm font-medium">{selectedGame.name}</span>
                        </>
                      ) : (
                        <span className="text-sm text-muted-foreground">Chọn game…</span>
                      )}
                    </span>
                    <ChevronDown className="h-4 w-4 shrink-0 text-muted-foreground" />
                  </Button>
                </PopoverTrigger>
                <PopoverContent align="start" className="w-[var(--radix-popover-trigger-width)] p-2">
                  <div className="max-h-56 space-y-1 overflow-y-auto">
                    {gameOptions.map((game) => {
                      const isActive = selectedGameTemplateId === game.gameTemplateId;
                      return (
                        <button
                          key={game.gameTemplateId}
                          type="button"
                          onClick={() => {
                            setSelectedGameTemplateId(game.gameTemplateId);
                            setGameListOpen(false);
                          }}
                          className={cn(
                            'flex w-full items-center gap-3 rounded-lg border px-2.5 py-2 text-left transition-colors',
                            isActive
                              ? 'border-primary bg-primary/5'
                              : 'border-transparent hover:bg-muted/60',
                          )}
                        >
                          <div className="relative size-11 shrink-0 overflow-hidden rounded-md bg-muted">
                            {game.imageUrl ? (
                              <Image
                                src={game.imageUrl}
                                alt={game.name}
                                fill
                                className="object-cover"
                                sizes="44px"
                              />
                            ) : (
                              <div className="flex size-full items-center justify-center text-[10px] text-muted-foreground">
                                N/A
                              </div>
                            )}
                          </div>
                          <span className="truncate text-sm font-medium">{game.name}</span>
                        </button>
                      );
                    })}
                  </div>
                </PopoverContent>
              </Popover>
            )}
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="nearby-radius-km" className="text-xs">
              Bán kính (km, 0.1–50)
            </Label>
            <Input
              id="nearby-radius-km"
              type="number"
              min={0.1}
              max={50}
              step={0.1}
              value={radiusKmDraft}
              onChange={(e) => setRadiusKmDraft(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter') handleSearch();
              }}
            />
          </div>
          <Button
            type="button"
            size="sm"
            className="w-full sm:w-auto"
            disabled={!selectedGameTemplateId}
            onClick={handleSearch}
          >
            Tìm quán gần
          </Button>
        </div>

        {hasSearched && selectedGameName ? (
          <p className="text-xs text-muted-foreground">Đang tìm quán gần có game: {selectedGameName}</p>
        ) : !hasSearched ? (
          <p className="text-xs text-muted-foreground">
            Chọn game từ kho quán rồi bấm tìm.
          </p>
        ) : null}

        {!hasSearched ? null : nearbyLoading ? (
          <div className="space-y-2">
            {[1, 2].map((item) => (
              <Skeleton key={item} className="h-16 w-full rounded-lg" />
            ))}
          </div>
        ) : nearbyError ? (
          <div className="space-y-2 text-sm text-rose-600">
            <p>
              {(nearbyErrorObj as Error)?.message || 'Không thể tải quán gần bạn.'}{' '}
              <button type="button" className="underline" onClick={() => void refetchNearby()}>
                Thử lại
              </button>
            </p>
          </div>
        ) : cafes.length === 0 ? (
          <p className="text-sm text-muted-foreground">
            Không có quán nào trong bán kính tìm kiếm.
          </p>
        ) : (
          cafes.map((cafe) => {
            const isSelected = selectedCafeId === cafe.id;

            return (
              <div
                key={cafe.id}
                className={cn(
                  'flex items-start gap-3 rounded-xl border p-3 transition-colors',
                  isSelected ? 'border-primary bg-primary/5' : 'border-border/70 bg-muted/20',
                )}
              >
                <div className="flex size-9 shrink-0 items-center justify-center rounded-lg bg-background">
                  <Store className="h-4 w-4 text-muted-foreground" />
                </div>
                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <p className="truncate font-medium">{cafe.name}</p>
                    {cafe.distanceLabel && (
                      <Badge variant="secondary" className="text-[10px]">
                        {cafe.distanceLabel}
                      </Badge>
                    )}
                    {cafe.selectedGameAvailabilityStatus === 'GameAvailable' && (
                      <Badge className="bg-emerald-100 text-[10px] text-emerald-800 hover:bg-emerald-100">
                        Có game
                      </Badge>
                    )}
                  </div>
                  {cafe.address && (
                    <p className="mt-0.5 line-clamp-2 text-xs text-muted-foreground">
                      {cafe.address}
                    </p>
                  )}
                  <p className="mt-1 text-[11px] text-muted-foreground">
                    Bàn trống {cafe.availableTableCount}/{cafe.totalTableCount}
                    {` · Box game ${cafe.availableGameCount}/${cafe.totalGameBoxCount}`}
                    {cafe.estimatedWaitMinutes != null
                      ? ` · Chờ ~${cafe.estimatedWaitMinutes} phút`
                      : ''}
                  </p>
                </div>
                {onSelectCafe ? (
                  <Button
                    type="button"
                    size="sm"
                    variant={isSelected ? 'default' : 'outline'}
                    className="shrink-0"
                    onClick={() => onSelectCafe(cafe)}
                  >
                    {isSelected ? 'Đang chọn' : 'Chọn'}
                  </Button>
                ) : (
                  !compact && (
                    <Button size="sm" variant="outline" asChild className="shrink-0">
                      <Link href={`/staff/inventory?cafeId=${cafe.id}`}>Xem kho</Link>
                    </Button>
                  )
                )}
              </div>
            );
          })
        )}
      </CardContent>
    </Card>
  );
}
