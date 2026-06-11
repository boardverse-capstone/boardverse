'use client';

import { useCallback, useMemo, useState } from 'react';
import Link from 'next/link';
import { ColumnDef } from '@tanstack/react-table';
import { ArrowUpDown, Eye, MoreHorizontal } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Input } from '@/components/ui/input';
import { CommonPagination } from '@/components/common/pagination';
import { REGISTRATION_ACTION_LABELS } from '@/core/constants/partner-registration';
import { ROUTES } from '@/core/constants/routes';
import { useListQueryState } from '@/shared/hooks/useListQueryState';
import { usePendingPartners } from '../hooks/usePendingPartners';
import { useApproveRegistration } from '../hooks/useApproveRegistration';
import { useRejectRegistration } from '../hooks/useRejectRegistration';
import { ApproveRegistrationDialog } from './approve-registration-dialog';
import { RejectRegistrationDialog } from './reject-registration-dialog';
import { PartnerDataTable } from './partner-data-table';
import { RegistrationStatusBadge } from './registration-status-badge';
import type { PartnerActionTarget, PartnerApplication } from '../types/partner.interface';
import { canPerformAction, getPrimaryAction } from '../utils/registration-workflow';

interface PartnerPendingTableHandlers {
  onPrimaryAction: (partner: PartnerActionTarget) => void;
  onRejectClick: (partner: PartnerActionTarget) => void;
  getDetailHref: (id: string) => string;
}

function createColumns({
  onPrimaryAction,
  onRejectClick,
  getDetailHref,
}: PartnerPendingTableHandlers): ColumnDef<PartnerApplication>[] {
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
          {row.original.hasAlerts && (
            <span className="text-xs font-medium text-orange-600">Có cảnh báo</span>
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
      accessorKey: 'phone',
      header: 'Số điện thoại',
    },
    {
      accessorKey: 'createdAt',
      header: 'Ngày nộp',
      cell: ({ row }) => new Date(row.original.createdAt).toLocaleDateString('vi-VN'),
    },
    {
      accessorKey: 'status',
      header: 'Trạng thái',
      cell: ({ row }) => <RegistrationStatusBadge status={row.original.status} />,
    },
    {
      id: 'actions',
      cell: ({ row }) => {
        const partner = row.original;
        const primaryAction = getPrimaryAction(partner.status);
        const canReject = canPerformAction(partner.status, 'REJECT');

        return (
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" className="h-8 w-8 p-0">
                <span className="sr-only">Mở menu</span>
                <MoreHorizontal className="h-4 w-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuLabel>Hành động</DropdownMenuLabel>
              <DropdownMenuItem asChild>
                <Link href={getDetailHref(partner.id)}>
                  <Eye className="mr-2 h-4 w-4" />
                  Xem chi tiết
                </Link>
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => navigator.clipboard.writeText(partner.id)}>
                Sao chép mã đơn
              </DropdownMenuItem>
              {primaryAction && (
                <>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem
                    className="text-emerald-600"
                    onClick={() => onPrimaryAction(partner)}
                  >
                    {REGISTRATION_ACTION_LABELS[primaryAction]}
                  </DropdownMenuItem>
                </>
              )}
              {canReject && (
                <DropdownMenuItem
                  className="text-rose-600"
                  onClick={() => onRejectClick(partner)}
                >
                  Từ chối
                </DropdownMenuItem>
              )}
            </DropdownMenuContent>
          </DropdownMenu>
        );
      },
    },
  ];
}

const DEFAULT_PAGE_SIZE = 5;
const PAGE_SIZE_OPTIONS = [5, 10, 20];

export function PartnerPendingTable() {
  const {
    page,
    limit,
    search,
    setPage,
    setLimit,
    setSearch,
    detailHref,
  } = useListQueryState({ defaultLimit: DEFAULT_PAGE_SIZE });
  const [selectedPartner, setSelectedPartner] = useState<PartnerActionTarget | null>(null);
  const [approveOpen, setApproveOpen] = useState(false);
  const [rejectOpen, setRejectOpen] = useState(false);

  const { data, isLoading, isError, refetch } = usePendingPartners({ page, limit, search });
  const approveMutation = useApproveRegistration();
  const rejectMutation = useRejectRegistration();

  const getDetailHref = useCallback(
    (id: string) => detailHref(ROUTES.ADMIN.REGISTRATION_DETAIL(id), ROUTES.ADMIN.REGISTRATIONS),
    [detailHref],
  );

  const columns = useMemo(
    () =>
      createColumns({
        onPrimaryAction: (partner) => {
          setSelectedPartner(partner);
          setApproveOpen(true);
        },
        onRejectClick: (partner) => {
          setSelectedPartner(partner);
          setRejectOpen(true);
        },
        getDetailHref,
      }),
    [getDetailHref],
  );

  const handleApprove = () => {
    if (!selectedPartner) return;
    approveMutation.mutate(selectedPartner.id, {
      onSuccess: () => {
        setApproveOpen(false);
        setSelectedPartner(null);
      },
    });
  };

  const handleReject = (reason: string) => {
    if (!selectedPartner) return;
    rejectMutation.mutate(
      { id: selectedPartner.id, payload: { reason } },
      {
        onSuccess: () => {
          setRejectOpen(false);
          setSelectedPartner(null);
        },
      },
    );
  };

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
        placeholder="Tìm kiếm quán cafe..."
        value={search}
        onChange={(event) => setSearch(event.target.value)}
        className="max-w-sm border-amber-200 bg-amber-50/50 focus-visible:ring-amber-400"
      />

      <PartnerDataTable columns={columns} data={data?.data ?? []} />

      {data?.meta && (
        <CommonPagination
          meta={data.meta}
          pageSize={limit}
          pageSizeOptions={PAGE_SIZE_OPTIONS}
          onPageChange={setPage}
          onLimitChange={setLimit}
        />
      )}

      <ApproveRegistrationDialog
        partner={selectedPartner}
        open={approveOpen}
        onOpenChange={setApproveOpen}
        onConfirm={handleApprove}
        isPending={approveMutation.isPending}
      />

      <RejectRegistrationDialog
        partner={selectedPartner}
        open={rejectOpen}
        onOpenChange={setRejectOpen}
        onConfirm={handleReject}
        isPending={rejectMutation.isPending}
      />
    </div>
  );
}
