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
    <Card className="relative overflow-hidden rounded-xl border-2 border-violet-400 bg-gradient-to-br from-violet-50 via-white to-purple-50 shadow-[3px_3px_0_rgba(139,92,246,0.4)]">
      {/* CRT scanlines + LED corners */}
      <div className="pointer-events-none absolute inset-0 bg-[repeating-linear-gradient(0deg,transparent_0,transparent_3px,rgba(255,255,255,0.04)_3px,rgba(255,255,255,0.04)_4px)]" />
      <span className="pointer-events-none absolute right-3 top-3 size-2 animate-pulse rounded-full bg-violet-500 shadow-[0_0_8px_currentColor]" />
      <span className="pointer-events-none absolute left-3 top-3 size-2 animate-pulse rounded-full bg-fuchsia-500 shadow-[0_0_8px_currentColor] [animation-delay:0.3s]" />

      <CardHeader className="relative border-b-2 border-violet-300/60 bg-gradient-to-r from-violet-100 via-purple-100 to-fuchsia-100 pb-3">
        <CardTitle className="flex items-center gap-2 font-mono text-sm font-extrabold uppercase tracking-widest text-violet-950">
          <span className="text-yellow-400">►</span>
          Quán gần bạn
          <span className="ml-auto flex items-center gap-1 font-mono text-[10px] font-bold text-violet-700">
            <span className="size-1.5 animate-pulse rounded-full bg-emerald-500 shadow-[0_0_6px_currentColor]" />
            LIVE
          </span>
        </CardTitle>
      </CardHeader>

      <CardContent className="relative space-y-3 pt-4">
        <ProfileLocationSection onSaved={() => void handleLocationSaved()} />

        <div className="space-y-2 rounded-xl border-2 border-violet-300 bg-gradient-to-br from-violet-50 via-white to-purple-50 p-3 shadow-[2px_2px_0_rgba(139,92,246,0.3)]">
          <div className="space-y-1.5">
            <Label className="font-mono text-[10px] font-extrabold uppercase tracking-widest text-violet-700">
              <span className="mr-1 text-yellow-400">▸</span>Game trong kho quán
            </Label>
            {gamesLoading ? (
              <Skeleton className="h-11 w-full rounded-lg border-2 border-violet-200" />
            ) : gameOptions.length === 0 ? (
              <p className="font-mono text-xs font-bold uppercase tracking-wide text-violet-500">
                ▸ Kho quán chưa có game để tìm gần đây.
              </p>
            ) : (
              <Popover open={gameListOpen} onOpenChange={setGameListOpen}>
                <PopoverTrigger asChild>
                  <Button
                    type="button"
                    variant="outline"
                    className="h-auto w-full justify-between gap-3 rounded-lg border-2 border-violet-400 bg-white px-2.5 py-2 shadow-[2px_2px_0_rgba(139,92,246,0.35)] hover:bg-violet-50 hover:shadow-[3px_3px_0_rgba(139,92,246,0.55)]"
                  >
                    <span className="flex min-w-0 items-center gap-3">
                      {selectedGame ? (
                        <>
                          <span className="relative size-9 shrink-0 overflow-hidden rounded-md border-2 border-violet-300 bg-muted shadow-[inset_0_-1px_0_rgba(0,0,0,0.1)]">
                            {selectedGame.imageUrl ? (
                              <Image
                                src={selectedGame.imageUrl}
                                alt={selectedGame.name}
                                fill
                                className="object-cover"
                                sizes="36px"
                              />
                            ) : (
                              <span className="flex size-full items-center justify-center font-mono text-[10px] font-bold text-violet-400">
                                N/A
                              </span>
                            )}
                          </span>
                          <span className="truncate font-mono text-xs font-extrabold uppercase tracking-wide text-violet-950">
                            ► {selectedGame.name}
                          </span>
                        </>
                      ) : (
                        <span className="font-mono text-xs font-bold uppercase tracking-widest text-violet-400">
                          ▸ Chọn game…
                        </span>
                      )}
                    </span>
                    <ChevronDown className="h-4 w-4 shrink-0 text-violet-500" />
                  </Button>
                </PopoverTrigger>
                <PopoverContent
                  align="start"
                  className="w-[var(--radix-popover-trigger-width)] border-2 border-violet-400 bg-gradient-to-br from-violet-50 via-white to-purple-50 p-2 shadow-[3px_3px_0_rgba(139,92,246,0.45)]"
                >
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
                            'flex w-full items-center gap-3 rounded-lg border-2 px-2.5 py-2 text-left transition-all',
                            isActive
                              ? 'border-yellow-400 bg-gradient-to-r from-yellow-100 to-amber-100 shadow-[inset_0_-2px_0_rgba(0,0,0,0.1),0_0_8px_rgba(250,204,21,0.4)]'
                              : 'border-transparent bg-white/60 hover:border-violet-300 hover:bg-violet-50',
                          )}
                        >
                          <div className="relative size-11 shrink-0 overflow-hidden rounded-md border-2 border-violet-300 bg-muted shadow-[inset_0_-1px_0_rgba(0,0,0,0.1)]">
                            {game.imageUrl ? (
                              <Image
                                src={game.imageUrl}
                                alt={game.name}
                                fill
                                className="object-cover"
                                sizes="44px"
                              />
                            ) : (
                              <div className="flex size-full items-center justify-center font-mono text-[10px] font-bold text-violet-400">
                                N/A
                              </div>
                            )}
                          </div>
                          <span className="truncate font-mono text-xs font-extrabold uppercase tracking-wide text-violet-950">
                            {game.name}
                          </span>
                          {isActive && (
                            <span className="ml-auto text-xs text-yellow-500">★</span>
                          )}
                        </button>
                      );
                    })}
                  </div>
                </PopoverContent>
              </Popover>
            )}
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="nearby-radius-km" className="font-mono text-[10px] font-extrabold uppercase tracking-widest text-violet-700">
              <span className="mr-1 text-yellow-400">▸</span>Bán kính (km, 0.1–50)
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
              className="border-2 border-violet-300 bg-white font-mono text-xs font-bold focus-visible:border-violet-500 focus-visible:ring-violet-300"
            />
          </div>
          <button
            type="button"
            disabled={!selectedGameTemplateId}
            onClick={handleSearch}
            className="group inline-flex h-9 w-full items-center justify-center gap-1.5 rounded-md border-2 border-violet-700 bg-gradient-to-b from-violet-500 to-violet-700 px-4 font-mono text-xs font-extrabold uppercase tracking-widest text-white shadow-[inset_0_-2px_0_rgba(0,0,0,0.25),3px_3px_0_rgba(0,0,0,0.15)] transition-all hover:from-violet-400 hover:to-violet-600 disabled:cursor-not-allowed disabled:from-gray-400 disabled:to-gray-500 disabled:shadow-[inset_0_-2px_0_rgba(0,0,0,0.2)] sm:w-auto"
          >
            <span className="text-yellow-300 transition-transform group-hover:translate-x-0.5">►</span>
            Tìm quán gần
          </button>
        </div>

        {hasSearched && selectedGameName ? (
          <p className="flex items-center gap-1.5 font-mono text-[10px] font-extrabold uppercase tracking-widest text-violet-700">
            <span className="size-1.5 animate-pulse rounded-full bg-violet-500 shadow-[0_0_6px_currentColor]" />
            Đang tìm: <span className="text-violet-950">► {selectedGameName}</span>
          </p>
        ) : !hasSearched ? (
          <p className="font-mono text-[10px] font-bold uppercase tracking-widest text-violet-500">
            ▸ Chọn game từ kho quán rồi bấm tìm.
          </p>
        ) : null}

        {!hasSearched ? null : nearbyLoading ? (
          <div className="space-y-2">
            {[1, 2].map((item) => (
              <Skeleton
                key={item}
                className="h-16 w-full rounded-lg border-2 border-violet-200"
              />
            ))}
          </div>
        ) : nearbyError ? (
          <div className="space-y-2 rounded-lg border-2 border-rose-400 bg-gradient-to-r from-rose-100 via-pink-50 to-fuchsia-100 p-3 font-mono text-xs font-bold text-rose-700 shadow-[2px_2px_0_rgba(244,63,94,0.4)]">
            <p>
              <span className="mr-1">⚠</span>
              {(nearbyErrorObj as Error)?.message || 'Không thể tải quán gần bạn.'}{' '}
              <button
                type="button"
                className="underline decoration-2 underline-offset-2"
                onClick={() => void refetchNearby()}
              >
                ► Thử lại
              </button>
            </p>
          </div>
        ) : cafes.length === 0 ? (
          <p className="rounded-lg border-2 border-dashed border-violet-300 bg-violet-50/40 p-3 font-mono text-xs font-bold uppercase tracking-widest text-violet-500">
            <span className="mr-1">▸</span>Không có quán nào trong bán kính tìm kiếm.
          </p>
        ) : (
          <div className="space-y-2">
            {cafes.map((cafe, idx) => {
              const isSelected = selectedCafeId === cafe.id;
              return (
                <div
                  key={cafe.id}
                  className={cn(
                    'group relative overflow-hidden rounded-xl border-2 p-3 transition-all',
                    isSelected
                      ? 'border-yellow-400 bg-gradient-to-br from-yellow-50 via-amber-50 to-orange-50 shadow-[3px_3px_0_rgba(250,204,21,0.5),0_0_12px_rgba(250,204,21,0.3)]'
                      : 'border-violet-300 bg-gradient-to-br from-white via-violet-50/40 to-purple-50/30 shadow-[2px_2px_0_rgba(139,92,246,0.25)] hover:border-violet-500 hover:shadow-[3px_3px_0_rgba(139,92,246,0.4)]',
                  )}
                >
                  {/* LED indicator */}
                  <span className="pointer-events-none absolute right-2 top-2 size-1.5 animate-pulse rounded-full bg-violet-500 opacity-0 shadow-[0_0_6px_currentColor] group-hover:opacity-100" />

                  <div className="flex items-start gap-3">
                    <div className="flex size-10 shrink-0 items-center justify-center rounded-lg border-2 border-violet-300 bg-gradient-to-br from-violet-200 via-purple-100 to-fuchsia-100 shadow-[inset_0_-2px_0_rgba(0,0,0,0.1)]">
                      <Store className="h-4 w-4 text-violet-700" />
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="flex flex-wrap items-center gap-2">
                        <p className="truncate font-mono text-sm font-extrabold uppercase tracking-wide text-violet-950">
                          <span className="mr-1 text-violet-400">#{String(idx + 1).padStart(2, '0')}</span>
                          {cafe.name}
                        </p>
                        {cafe.distanceLabel && (
                          <Badge
                            variant="secondary"
                            className="border-2 border-cyan-400 bg-cyan-100 font-mono text-[10px] font-extrabold uppercase tracking-widest text-cyan-800 shadow-[1px_1px_0_rgba(0,0,0,0.1)]"
                          >
                            ◉ {cafe.distanceLabel}
                          </Badge>
                        )}
                        {cafe.selectedGameAvailabilityStatus === 'GameAvailable' && (
                          <Badge className="border-2 border-emerald-400 bg-gradient-to-r from-emerald-400 to-emerald-500 font-mono text-[10px] font-extrabold uppercase tracking-widest text-white shadow-[1px_1px_0_rgba(0,0,0,0.15)] hover:from-emerald-400 hover:to-emerald-500">
                            ✓ CÓ GAME
                          </Badge>
                        )}
                      </div>
                      {cafe.address && (
                        <p className="mt-1 line-clamp-2 font-mono text-[11px] font-semibold tracking-wide text-violet-700">
                          <span className="mr-1 text-violet-400">▸</span>
                          {cafe.address}
                        </p>
                      )}
                      <div className="mt-1.5 flex flex-wrap gap-x-3 gap-y-0.5 font-mono text-[11px] font-bold uppercase tracking-wider text-violet-600">
                        <span>
                          <span className="text-violet-400">Bàn:</span>{' '}
                          <span className="text-violet-900">
                            {cafe.availableTableCount}/{cafe.totalTableCount}
                          </span>
                        </span>
                        <span>
                          <span className="text-violet-400">Box:</span>{' '}
                          <span className="text-violet-900">
                            {cafe.availableGameCount}/{cafe.totalGameBoxCount}
                          </span>
                        </span>
                        {cafe.estimatedWaitMinutes != null && (
                          <span>
                            <span className="text-violet-400">Chờ:</span>{' '}
                            <span className="text-amber-700">~{cafe.estimatedWaitMinutes}p</span>
                          </span>
                        )}
                      </div>
                    </div>
                    {onSelectCafe ? (
                      <button
                        type="button"
                        onClick={() => onSelectCafe(cafe)}
                        className={cn(
                          'inline-flex h-8 shrink-0 items-center justify-center gap-1 rounded-md border-2 px-3 font-mono text-[11px] font-extrabold uppercase tracking-widest shadow-[inset_0_-2px_0_rgba(0,0,0,0.2),2px_2px_0_rgba(0,0,0,0.15)] transition-all',
                          isSelected
                            ? 'border-yellow-600 bg-gradient-to-b from-yellow-400 to-amber-500 text-white shadow-[inset_0_-2px_0_rgba(0,0,0,0.3),2px_2px_0_rgba(0,0,0,0.2),0_0_8px_rgba(250,204,21,0.5)]'
                            : 'border-violet-700 bg-gradient-to-b from-violet-500 to-violet-700 text-white hover:from-violet-400 hover:to-violet-600',
                        )}
                      >
                        {isSelected ? '★ ĐANG CHỌN' : '► CHỌN'}
                      </button>
                    ) : (
                      !compact && (
                        <Button
                          size="sm"
                          variant="outline"
                          asChild
                          className="h-8 shrink-0 border-2 border-violet-400 bg-white font-mono text-[11px] font-extrabold uppercase tracking-widest text-violet-700 shadow-[2px_2px_0_rgba(139,92,246,0.35)] hover:bg-violet-50"
                        >
                          <Link href={`/staff/inventory?cafeId=${cafe.id}`}>
                            ► Xem kho
                          </Link>
                        </Button>
                      )
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
