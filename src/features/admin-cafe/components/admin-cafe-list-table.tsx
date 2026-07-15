'use client';

import { useMemo, useState } from 'react';
import Link from 'next/link';
import { ColumnDef } from '@tanstack/react-table';
import { Settings2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { CommonPagination } from '@/components/common/pagination';
import { PageHeader } from '@/components/common/page-header';
import { ROUTES } from '@/core/constants/routes';
import { PartnerDataTable } from '@/features/partner/components/partner-data-table';
import { PartnerStatusBadges } from '@/features/partner/components/partner-status-badges';
import { usePendingPartners } from '@/features/partner/hooks/usePendingPartners';
import { useListQueryState } from '@/shared/hooks/useListQueryState';
import type { PartnerApplication } from '@/features/partner/types/partner.interface';
import type { CafeOperationalStatusValue } from '@/core/constants/admin-cafe';
import { useUpdateCafeOperationalStatus } from '../hooks/useUpdateCafeOperationalStatus';
import { UpdateOperationalStatusDialog } from './update-operational-status-dialog';

const DEFAULT_PAGE_SIZE = 10;

export function AdminCafeListTable() {
  const { page, limit, search, setPage, setLimit, setSearch } = useListQueryState({
    defaultLimit: DEFAULT_PAGE_SIZE,
  });
  const { data, isLoading, isError } = usePendingPartners({
    page,
    limit,
    search,
    status: 'APPROVED',
  });
  const updateMutation = useUpdateCafeOperationalStatus();

  const [statusDialogOpen, setStatusDialogOpen] = useState(false);
  const [selectedCafe, setSelectedCafe] = useState<PartnerApplication | null>(null);

  const columns = useMemo<ColumnDef<PartnerApplication>[]>(
    () => [
      {
        accessorKey: 'cafeName',
        header: 'Tên quán',
        cell: ({ row }) => (
          <div>
            <div className="font-semibold">{row.original.cafeName}</div>
            <div className="text-xs text-muted-foreground">{row.original.address}</div>
          </div>
        ),
      },
      {
        accessorKey: 'createdCafeId',
        header: 'Mã quán',
        cell: ({ row }) =>
          row.original.createdCafeId ? (
            <span className="font-mono text-xs">{row.original.createdCafeId}</span>
          ) : (
            <span className="text-muted-foreground">—</span>
          ),
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
      {
        id: 'actions',
        header: '',
        cell: ({ row }) => {
          const cafeId = row.original.createdCafeId;
          if (!cafeId) return null;

          return (
            <div className="flex justify-end gap-2">
              <Button variant="outline" size="sm" asChild>
                <Link href={ROUTES.ADMIN.REGISTRATION_DETAIL(row.original.id)}>Chi tiết đơn</Link>
              </Button>
              <Button
                variant="secondary"
                size="sm"
                onClick={() => {
                  setSelectedCafe(row.original);
                  setStatusDialogOpen(true);
                }}
              >
                <Settings2 className="mr-1 h-4 w-4" />
                Trạng thái
              </Button>
            </div>
          );
        },
      },
    ],
    [],
  );

  const handleStatusConfirm = (payload: {
    status: CafeOperationalStatusValue;
    reason?: string;
  }) => {
    if (!selectedCafe?.createdCafeId) return;
    updateMutation.mutate(
      { cafeId: selectedCafe.createdCafeId, payload },
      { onSuccess: () => setStatusDialogOpen(false) },
    );
  };

  return (
    <div className="space-y-6">
      <PageHeader
        title="Quản lý quán đối tác"
        description="Danh sách quán đã duyệt và cập nhật trạng thái vận hành (PUT /api/v1/admin/cafes/{cafeId}/operational-status)."
      />

      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <Input
          placeholder="Tìm theo tên quán, địa chỉ..."
          value={search}
          onChange={(event) => setSearch(event.target.value)}
          className="max-w-sm"
        />
      </div>

      {isLoading ? (
        <div className="p-4 text-sm text-muted-foreground">Đang tải danh sách quán...</div>
      ) : isError ? (
        <div className="text-sm text-rose-600">Không thể tải danh sách quán.</div>
      ) : (
        <>
          <PartnerDataTable columns={columns} data={data?.data ?? []} emptyMessage="Chưa có quán đối tác." />
          {data?.meta && (
            <CommonPagination
              meta={data.meta}
              pageSize={limit}
              pageSizeOptions={[10, 20, 50]}
              onPageChange={setPage}
              onLimitChange={setLimit}
            />
          )}
        </>
      )}

      {selectedCafe?.createdCafeId && (
        <UpdateOperationalStatusDialog
          open={statusDialogOpen}
          onOpenChange={setStatusDialogOpen}
          cafeId={selectedCafe.createdCafeId}
          cafeName={selectedCafe.cafeName}
          currentStatus={selectedCafe.operationalStatus}
          onConfirm={handleStatusConfirm}
          isPending={updateMutation.isPending}
        />
      )}
    </div>
  );
}
