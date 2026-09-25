'use client';

import { useMemo, useState } from 'react';
import type { ColumnDef } from '@tanstack/react-table';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { CommonPagination } from '@/components/common/pagination';
import { PartnerDataTable } from '@/features/partner/components/partner-data-table';
import { useAdminSettlements } from '../hooks/useAdminSettlements';
import type {
  AdminSettlement,
  CafeSettlementStatus,
} from '../types/admin-settlement.interface';

const STATUS_LABELS: Record<CafeSettlementStatus, string> = {
  Pending: 'Đang chờ',
  Succeeded: 'Thành công',
  Failed: 'Thất bại',
  Retrying: 'Đang thử lại',
  Overridden: 'Đã ghi đè',
};

const STATUS_CLASSES: Record<CafeSettlementStatus, string> = {
  Pending: 'border-amber-200 bg-amber-50 text-amber-800',
  Succeeded: 'border-emerald-200 bg-emerald-50 text-emerald-800',
  Failed: 'border-rose-200 bg-rose-50 text-rose-800',
  Retrying: 'border-sky-200 bg-sky-50 text-sky-800',
  Overridden: 'border-violet-200 bg-violet-50 text-violet-800',
};

interface AdminSettlementListPanelProps {
  onSelectSettlementId: (settlementId: string) => void;
}

export function AdminSettlementListPanel({
  onSelectSettlementId,
}: AdminSettlementListPanelProps) {
  const [tab, setTab] = useState<'all' | 'failed'>('all');
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(20);
  const query = useAdminSettlements(
    { pageNumber: page, pageSize },
    tab === 'failed',
  );

  const columns = useMemo<ColumnDef<AdminSettlement>[]>(
    () => [
      {
        accessorKey: 'cafeName',
        header: 'Quán',
        cell: ({ row }) => (
          <div>
            <p className="font-medium">{row.original.cafeName || '—'}</p>
            <p className="font-mono text-xs text-muted-foreground" title={row.original.id}>
              {row.original.id.slice(0, 8)}…
            </p>
          </div>
        ),
      },
      {
        accessorKey: 'status',
        header: 'Trạng thái',
        cell: ({ row }) => (
          <Badge className={STATUS_CLASSES[row.original.status]}>
            {STATUS_LABELS[row.original.status]}
          </Badge>
        ),
      },
      {
        id: 'amounts',
        header: 'Số tiền',
        cell: ({ row }) => (
          <div className="space-y-0.5 text-sm tabular-nums">
            <p>Tiền cọc: {row.original.depositAmount.toLocaleString('vi-VN')} ₫</p>
            <p className="text-muted-foreground">
              Phí: {row.original.feeAmount.toLocaleString('vi-VN')} ₫
            </p>
            <p className="font-medium">
              Thực nhận: {row.original.netTransferAmount.toLocaleString('vi-VN')} ₫
            </p>
          </div>
        ),
      },
      {
        accessorKey: 'failureReason',
        header: 'Lý do thất bại',
        cell: ({ row }) => (
          <p
            className="line-clamp-2 max-w-sm text-sm text-muted-foreground"
            title={row.original.failureReason ?? undefined}
          >
            {row.original.failureReason || '—'}
          </p>
        ),
      },
      {
        id: 'actions',
        header: '',
        cell: ({ row }) => (
          <Button
            size="sm"
            variant="outline"
            disabled={row.original.status !== 'Failed'}
            onClick={() => onSelectSettlementId(row.original.id)}
          >
            Dùng để ghi đè
          </Button>
        ),
      },
    ],
    [onSelectSettlementId],
  );

  const paginationMeta = query.data
    ? {
        currentPage: query.data.meta.currentPage,
        limit: query.data.meta.pageSize,
        totalItems: query.data.meta.totalItems,
        totalPages: query.data.meta.totalPages,
        hasPrevious: query.data.meta.hasPrevious,
        hasNext: query.data.meta.hasNext,
      }
    : null;

  return (
    <Card>
      <CardHeader className="space-y-3">
        <div>
          <CardTitle>Danh sách giải ngân</CardTitle>
          <p className="mt-1 text-sm text-muted-foreground">
            Chọn khoản thất bại để điền nhanh mã vào biểu mẫu ghi đè.
          </p>
        </div>
        <Tabs
          value={tab}
          onValueChange={(value) => {
            setTab(value as 'all' | 'failed');
            setPage(1);
          }}
        >
          <TabsList>
            <TabsTrigger value="all">Tất cả</TabsTrigger>
            <TabsTrigger value="failed">Thất bại</TabsTrigger>
          </TabsList>
        </Tabs>
      </CardHeader>
      <CardContent className="space-y-4">
        {query.isLoading ? (
          <div className="space-y-3">
            {Array.from({ length: 5 }).map((_, index) => (
              <Skeleton key={index} className="h-16 w-full" />
            ))}
          </div>
        ) : query.isError ? (
          <div className="flex flex-col items-center gap-3 py-8 text-center">
            <p className="text-sm text-rose-600">Không tải được danh sách giải ngân.</p>
            <Button variant="outline" onClick={() => query.refetch()}>
              Thử lại
            </Button>
          </div>
        ) : (
          <PartnerDataTable
            columns={columns}
            data={query.data?.data ?? []}
            emptyMessage="Không có khoản giải ngân phù hợp."
          />
        )}

        {paginationMeta ? (
          <CommonPagination
            meta={paginationMeta}
            pageSize={pageSize}
            pageSizeOptions={[10, 20, 50, 100]}
            onPageChange={setPage}
            onLimitChange={(value) => {
              setPageSize(value);
              setPage(1);
            }}
          />
        ) : null}
      </CardContent>
    </Card>
  );
}
