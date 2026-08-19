'use client';

import { Banknote } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent } from '@/components/ui/card';
import { Spinner } from '@/components/ui/spinner';
import { usePendingSettlements } from '../hooks/usePosCheckIn';

interface PosSettlementsPanelProps {
  cafeId?: string;
}

function formatCurrency(amount: number) {
  return new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(amount);
}

function formatTime(iso: string) {
  return new Intl.DateTimeFormat('vi-VN', {
    hour: '2-digit',
    minute: '2-digit',
    day: '2-digit',
    month: '2-digit',
  }).format(new Date(iso));
}

export function PosSettlementsPanel({ cafeId }: PosSettlementsPanelProps) {
  const { data: items = [], isLoading, isError, refetch } = usePendingSettlements(cafeId);

  if (isLoading) {
    return (
      <div className="flex justify-center py-8">
        <Spinner className="h-5 w-5" />
      </div>
    );
  }

  if (isError) {
    return (
      <p className="text-sm text-rose-600">
        Không tải được settlements.{' '}
        <button type="button" className="underline" onClick={() => void refetch()}>
          Thử lại
        </button>
      </p>
    );
  }

  if (items.length === 0) {
    return (
      <Card className="border-dashed">
        <CardContent className="py-8 text-center text-sm text-muted-foreground">
          Không có giải ngân đang chờ.
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-2">
      {items.map((item) => (
        <div
          key={item.id}
          className="flex flex-wrap items-center justify-between gap-2 rounded-lg border px-3 py-2.5 text-sm"
        >
          <div className="min-w-0">
            <p className="flex items-center gap-1.5 font-medium">
              <Banknote className="h-3.5 w-3.5 shrink-0" />
              {formatCurrency(item.netTransferAmount || item.depositAmount)}
            </p>
            <p className="text-xs text-muted-foreground">{formatTime(item.createdAt)}</p>
          </div>
          <Badge variant="secondary">{item.status}</Badge>
        </div>
      ))}
    </div>
  );
}
