'use client';

import Link from 'next/link';
import Image from 'next/image';
import { ArrowLeft, Package, Timer, Users } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { INVENTORY_CONDITION_LABELS } from '@/core/constants/inventory';
import { ROUTES } from '@/core/constants/routes';
import { useInventoryDetail } from '../hooks/useInventoryDetail';
import { formatCurrencyVnd, formatInventoryDate } from '../utils/inventory.mapper';
import { InventoryStatusBadge } from './inventory-status-badge';

interface InventoryDetailViewProps {
  cafeId: string;
  inventoryId: string;
}

export function InventoryDetailView({ cafeId, inventoryId }: InventoryDetailViewProps) {
  const { data, isLoading, isError, refetch } = useInventoryDetail(cafeId, inventoryId);

  if (isLoading) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-8 w-48" />
        <Skeleton className="h-64 w-full rounded-xl" />
      </div>
    );
  }

  if (isError || !data) {
    return (
      <Card>
        <CardContent className="py-10 text-center text-sm text-rose-600">
          Không thể tải chi tiết kho game.{' '}
          <button type="button" className="underline" onClick={() => refetch()}>
            Thử lại
          </button>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-4 md:space-y-6">
      <div className="flex flex-wrap items-center gap-3">
        <Button variant="outline" size="sm" asChild>
          <Link href={ROUTES.STAFF.INVENTORY}>
            <ArrowLeft className="mr-2 h-4 w-4" />
            Quay lại kho
          </Link>
        </Button>
        <InventoryStatusBadge status={data.status} />
        {data.gameTemplate && (
          <Badge variant="secondary">
            {data.gameTemplate.minPlayers}–{data.gameTemplate.maxPlayers} người
          </Badge>
        )}
      </div>

      <div className="grid gap-4 lg:grid-cols-[280px_minmax(0,1fr)]">
        <Card className="overflow-hidden">
          <div className="relative aspect-[4/3] bg-muted">
            {data.gameTemplate.imageUrl ? (
              <Image
                src={data.gameTemplate.imageUrl}
                alt={data.gameTemplate.title}
                fill
                className="object-cover"
                sizes="280px"
                priority
              />
            ) : (
              <div className="flex size-full items-center justify-center">
                <Package className="h-16 w-16 text-muted-foreground/40" />
              </div>
            )}
          </div>
          <CardContent className="space-y-3 pt-4">
            <div>
              <h2 className="text-xl font-bold">{data.gameTemplate.title}</h2>
              <p className="text-sm text-muted-foreground">{data.barcode ?? 'Không có barcode'}</p>
            </div>
            {data.condition && (
              <p className="text-sm">
                <span className="text-muted-foreground">Tình trạng hộp: </span>
                {INVENTORY_CONDITION_LABELS[data.condition] ?? data.condition}
              </p>
            )}
          </CardContent>
        </Card>

        <div className="space-y-4">
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-base">Thông tin hộp game</CardTitle>
            </CardHeader>
            <CardContent className="grid gap-3 sm:grid-cols-2">
              <InfoItem label="Mã kho" value={data.inventoryId} mono />
              <InfoItem label="Mã quán" value={data.cafeId} mono />
              <InfoItem label="Ngày mua" value={formatInventoryDate(data.purchaseDate)} />
              <InfoItem
                label="Thời gian chơi"
                value={`${data.gameTemplate.playingTime} phút`}
                icon={Timer}
              />
              <InfoItem
                label="Số người chơi"
                value={`${data.gameTemplate.minPlayers} – ${data.gameTemplate.maxPlayers}`}
                icon={Users}
              />
              {data.notes && (
                <div className="sm:col-span-2">
                  <InfoItem label="Ghi chú" value={data.notes} />
                </div>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-base">Mô tả game</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-sm leading-relaxed text-muted-foreground">
                {data.gameTemplate.description ?? 'Chưa có mô tả.'}
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-base">Linh kiện & mức phạt</CardTitle>
            </CardHeader>
            <CardContent>
              {data.componentPenalties.length === 0 ? (
                <p className="text-sm text-muted-foreground">Chưa có dữ liệu linh kiện.</p>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full min-w-[520px] text-sm">
                    <thead>
                      <tr className="border-b text-left text-muted-foreground">
                        <th className="pb-2 font-medium">Linh kiện</th>
                        <th className="pb-2 font-medium">Loại</th>
                        <th className="pb-2 font-medium">SL/hộp</th>
                        <th className="pb-2 font-medium">Phạt/đv</th>
                      </tr>
                    </thead>
                    <tbody>
                      {data.componentPenalties.map((component) => (
                        <tr key={component.componentId} className="border-b border-border/60">
                          <td className="py-3 font-medium">{component.componentName}</td>
                          <td className="py-3 text-muted-foreground">{component.type || '—'}</td>
                          <td className="py-3">{component.quantityInBox}</td>
                          <td className="py-3">{formatCurrencyVnd(component.penaltyFeePerUnit)}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}

function InfoItem({
  label,
  value,
  mono = false,
  icon: Icon,
}: {
  label: string;
  value: string;
  mono?: boolean;
  icon?: React.ComponentType<{ className?: string }>;
}) {
  return (
    <div className="space-y-1">
      <p className="text-xs text-muted-foreground">{label}</p>
      <div className="flex items-center gap-1.5 text-sm font-medium">
        {Icon && <Icon className="h-4 w-4 text-muted-foreground" />}
        <span className={mono ? 'font-mono text-xs break-all' : undefined}>{value}</span>
      </div>
    </div>
  );
}
