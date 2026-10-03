'use client';

import { Badge } from '@/components/ui/badge';
import { INVENTORY_STATUS_COLORS, INVENTORY_STATUS_LABELS } from '@/core/constants/inventory';
import { cn } from '@/lib/utils';

interface InventoryStatusBadgeProps {
  status: string;
  className?: string;
}

// LED mÃ u theo status Ä‘á»ƒ arcade style
const STATUS_LED: Record<string, string> = {
  AVAILABLE: 'bg-orange-500',
  Available: 'bg-orange-500',
  INUSE: 'bg-amber-500',
  InUse: 'bg-amber-500',
  RENTED: 'bg-orange-500',
  Rented: 'bg-orange-500',
  MAINTENANCE: 'bg-amber-500',
  Maintenance: 'bg-amber-500',
  DAMAGED: 'bg-amber-500',
  Damaged: 'bg-amber-500',
};

export function InventoryStatusBadge({ status, className }: InventoryStatusBadgeProps) {
  const normalized = status.toUpperCase();
  const label = INVENTORY_STATUS_LABELS[status] ?? INVENTORY_STATUS_LABELS[normalized] ?? status;
  const colorClass =
    INVENTORY_STATUS_COLORS[status] ??
    INVENTORY_STATUS_COLORS[normalized] ??
    'bg-muted text-muted-foreground border-border';
  const ledClass = STATUS_LED[status] ?? STATUS_LED[normalized] ?? 'bg-neutral-500';

  return (
    <Badge
      variant="outline"
      className={cn(
        'relative inline-flex items-center gap-1.5 border-2 font-mono text-[10px] font-extrabold uppercase tracking-widest shadow-[inset_0_-1px_0_rgba(0,0,0,0.08)]',
        colorClass,
        className,
      )}
    >
      <span
        className={cn(
          'inline-block size-1.5 animate-pulse rounded-full shadow-[0_0_6px_currentColor]',
          ledClass,
        )}
      />
      {label}
    </Badge>
  );
}
