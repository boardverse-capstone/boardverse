'use client';

import Link from 'next/link';
import { MapPin, Store } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { cn } from '@/lib/utils';
import { useNearbyCafes } from '../hooks/useStaffCafe';
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
  const { data, isLoading, isError, refetch } = useNearbyCafes();

  if (isLoading) {
    return (
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base">Quán gần bạn</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          {[1, 2, 3].map((item) => (
            <Skeleton key={item} className="h-16 w-full rounded-lg" />
          ))}
        </CardContent>
      </Card>
    );
  }

  if (isError) {
    return (
      <Card>
        <CardContent className="py-8 text-center text-sm text-rose-600">
          Không thể tải quán gần bạn.{' '}
          <button type="button" className="underline" onClick={() => refetch()}>
            Thử lại
          </button>
        </CardContent>
      </Card>
    );
  }

  const cafes = data ?? [];

  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center gap-2 text-base">
          <MapPin className="h-4 w-4" />
          Quán gần bạn
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-2">
        {cafes.length === 0 ? (
          <p className="text-sm text-muted-foreground">
            Chưa có quán nào gần vị trí trong hồ sơ. Cập nhật tọa độ trong Profile.
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
                  </div>
                  {cafe.address && (
                    <p className="mt-0.5 line-clamp-2 text-xs text-muted-foreground">{cafe.address}</p>
                  )}
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
