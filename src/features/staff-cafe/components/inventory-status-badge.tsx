'use client';

import { Badge } from '@/components/ui/badge';
import { INVENTORY_STATUS_COLORS, INVENTORY_STATUS_LABELS } from '@/core/constants/inventory';
import { cn } from '@/lib/utils';

interface InventoryStatusBadgeProps {
  status: string;
  className?: string;
}

export function InventoryStatusBadge({ status, className }: InventoryStatusBadgeProps) {
  const normalized = status.toUpperCase();
  const label = INVENTORY_STATUS_LABELS[status] ?? INVENTORY_STATUS_LABELS[normalized] ?? status;
  const colorClass =
    INVENTORY_STATUS_COLORS[status] ??
    INVENTORY_STATUS_COLORS[normalized] ??
    'bg-muted text-muted-foreground border-border';

  return (
    <Badge variant="outline" className={cn('text-xs', colorClass, className)}>
      {label}
    </Badge>
  );
}
