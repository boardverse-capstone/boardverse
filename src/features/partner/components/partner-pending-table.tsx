'use client';

import { useMemo, useState } from 'react';
import { ColumnDef } from '@tanstack/react-table';
import { ArrowUpDown } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { CommonPagination } from '@/components/common/pagination';
import { PARTNER_APPLICATION_STATUS_FILTERS } from '@/core/constants/partner-registration';
import { useListQueryState } from '@/shared/hooks/useListQueryState';
import { usePendingPartners } from '../hooks/usePendingPartners';
import { RegistrationDetailDialog } from './registration-detail-dialog';
import { PartnerDataTable } from './partner-data-table';
import { PartnerStatusBadges } from './partner-status-badges';
import type { PartnerApplication } from '../types/partner.interface';
import { formatWorkingHours } from '../utils/partner.mapper';

function createColumns(): ColumnDef<PartnerApplication>[] {
  return [
    {
      accessorKey: 'cafeName',
      header: ({ column }) => (
        <Button
          variant="ghost"
          onClick={() => column.toggleSorting(column.getIsSorted() === 'asc')}
        >
          Tên quán
          <ArrowUpDown className="ml-2 h-4 w-4" />
        </Button>
      ),
      cell: ({ row }) => (
        <div>
          <div className="font-semibold text-foreground">{row.original.cafeName}</div>
          {row.original.requiresCsSupport && (
            <span className="text-xs font-medium text-orange-600">Cần hỗ trợ CS</span>
          )}
        </div>
      ),
    },
    {
      accessorKey: 'address',
      header: 'Địa chỉ',
      cell: ({ row }) => (
        <span className="line-clamp-2 max-w-xs text-muted-foreground">{row.original.address}</span>
      ),
    },
    {
      accessorKey: 'hotline',
      header: 'Số điện thoại',
      cell: ({ row }) => {
        const hotline = row.original.hotline?.trim();
        return hotline ? hotline : <span className="text-muted-foreground">Chưa nhập</span>;
      },
    },
    {
      accessorKey: 'representativeEmail',
      header: 'Email đại diện',
      cell: ({ row }) => (
        <span className="text-muted-foreground">{row.original.representativeEmail || '—'}</span>
      ),
    },
    {
      id: 'workingHours',
      header: 'Giờ mở cửa',
      cell: ({ row }) => (
        <span className="line-clamp-2 max-w-xs text-sm text-muted-foreground">
          {formatWorkingHours(row.original.workingHours)}
        </span>
      ),
    },
    {
      accessorKey: 'submittedAt',
      header: 'Ngày nộp',
      cell: ({ row }) =>
        row.original.submittedAt
          ? new Date(row.original.submittedAt).toLocaleDateString('vi-VN')
          : '—',
    },
    {
      id: 'status',
      header: 'Trạng thái',
      cell: ({ row }) => (
        <PartnerStatusBadges
          applicationStatus={row.original.applicationStatus}
          operationalStatus={row.original.operationalStatus}
        />
      ),
    },
  ];
}

const DEFAULT_PAGE_SIZE = 10;
const PAGE_SIZE_OPTIONS = [5, 10, 20];

export function PartnerPendingTable() {
  const {
    page,
    limit,
    search,
    role: statusFilter,
    setPage,
    setLimit,
    setSearch,
    setRole: setStatusFilter,
  } = useListQueryState({ defaultLimit: DEFAULT_PAGE_SIZE, defaultRole: 'all' });
  const [detailId, setDetailId] = useState<string | null>(null);

  const { data, isLoading, isError, refetch } = usePendingPartners({
    page,
    limit,
    search,
    status: statusFilter,
  });
  const { data: pendingCountData } = usePendingPartners({
    page: 1,
    limit: 1,
    status: 'PENDING',
  });
  const pendingCount = pendingCountData?.meta.totalItems;
  const columns = useMemo(() => createColumns(), []);

  if (isLoading) {
    return <div className="text-sm p-4 text-muted-foreground">Đang tải danh sách dữ liệu...</div>;
  }

  if (isError) {
    return (
      <div className="text-sm text-rose-600 p-4">
        Lỗi hệ thống khi tải danh sách đối tác.{' '}
        <button type="button" className="underline" onClick={() => refetch()}>
          Thử lại
        </button>
      </div>
    );
  }

  const total = data?.meta.totalItems ?? 0;

  return (
    <div className="space-y-5">
      <div className="grid gap-3 sm:grid-cols-2">
        <div className="rounded-xl border border-amber-200 bg-amber-50 px-4 py-3">
          <p className="text-xs font-medium uppercase tracking-wide text-amber-700">Tổng đơn</p>
          <p className="mt-1 text-2xl font-bold text-amber-900">{total}</p>
        </div>
        <div className="rounded-xl border border-sky-200 bg-sky-50 px-4 py-3">
          <p className="text-xs font-medium uppercase tracking-wide text-sky-700">Trang hiện tại</p>
          <p className="mt-1 text-2xl font-bold text-sky-900">
            {data?.meta.currentPage ?? 1}
            <span className="text-base font-medium text-sky-600">
              {' '}
              / {data?.meta.totalPages ?? 1}
            </span>
          </p>
        </div>
      </div>

      <Input
        type="text"
        placeholder="Tìm theo tên quán, địa chỉ, SĐT hoặc email..."
        value={search}
        onChange={(event) => setSearch(event.target.value)}
        className="max-w-sm border-amber-200 bg-amber-50/50 focus-visible:ring-amber-400"
      />

      <Tabs value={statusFilter} onValueChange={setStatusFilter}>
        <TabsList className="grid h-auto w-full grid-cols-2 gap-1 bg-amber-50/80 sm:grid-cols-4">
          {PARTNER_APPLICATION_STATUS_FILTERS.map((filter) => (
            <TabsTrigger
              key={filter.value}
              value={filter.value}
              className="group gap-1.5 data-[state=active]:bg-amber-600 data-[state=active]:text-white"
            >
              {filter.label}
              {filter.value === 'PENDING' && pendingCount != null ? (
                <span className="inline-flex min-w-5 items-center justify-center rounded-full bg-amber-200 px-1.5 text-[11px] font-semibold text-amber-900 group-data-[state=active]:bg-white/25 group-data-[state=active]:text-white">
                  {pendingCount}
                </span>
              ) : null}
            </TabsTrigger>
          ))}
        </TabsList>
      </Tabs>

      <PartnerDataTable
        columns={columns}
        data={data?.data ?? []}
        onRowClick={(row) => setDetailId(row.id)}
      />

      {data?.meta && (
        <CommonPagination
          meta={data.meta}
          pageSize={limit}
          pageSizeOptions={PAGE_SIZE_OPTIONS}
          onPageChange={setPage}
          onLimitChange={setLimit}
        />
      )}

      <RegistrationDetailDialog
        applicationId={detailId}
        open={!!detailId}
        onOpenChange={(open) => {
          if (!open) setDetailId(null);
        }}
      />
    </div>
  );
}
