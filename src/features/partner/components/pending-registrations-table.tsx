'use client';

import { useMemo, useState } from 'react';
import Link from 'next/link';
import { ColumnDef } from '@tanstack/react-table';
import { ArrowUpDown, Eye, MoreHorizontal } from 'lucide-react';
import { RegistrationTable } from '@/app/admin/registrations/components/registration-table';
import { Badge } from '@/components/ui/badge';
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
import { Skeleton } from '@/components/ui/skeleton';
import { CommonPagination } from '@/components/common/pagination';
import {
  REGISTRATION_ACTION_LABELS,
  REGISTRATION_STATUS_LABELS,
  REGISTRATION_STATUS_VARIANT,
} from '@/core/constants/partner-registration';
import { usePendingRegistrations } from '../hooks/usePendingRegistrations';
import { useApproveRegistration } from '../hooks/useApproveRegistration';
import { useRejectRegistration } from '../hooks/useRejectRegistration';
import { ApproveRegistrationDialog } from './approve-registration-dialog';
import { RejectRegistrationDialog } from './reject-registration-dialog';
import type { Registration } from '../types/partner.interface';
import {
  canPerformAction,
  getPrimaryAction,
} from '../utils/registration-workflow';

interface PendingRegistrationsTableProps {
  onPrimaryAction: (registration: Registration) => void;
  onRejectClick: (registration: Registration) => void;
}

function createColumns({
  onPrimaryAction,
  onRejectClick,
}: PendingRegistrationsTableProps): ColumnDef<Registration>[] {
  return [
    {
      accessorKey: 'basicInfo.cafeName',
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
          <div className="font-medium">{row.original.basicInfo.cafeName}</div>
          {row.original.alerts.length > 0 && (
            <span className="text-xs text-destructive">Có cảnh báo Ops</span>
          )}
        </div>
      ),
    },
    {
      accessorKey: 'basicInfo.address',
      header: 'Địa chỉ',
      cell: ({ row }) => (
        <span className="line-clamp-2 max-w-xs">{row.original.basicInfo.address}</span>
      ),
    },
    {
      accessorKey: 'basicInfo.hotline',
      header: 'Hotline',
    },
    {
      accessorKey: 'createdAt',
      header: 'Ngày nộp',
      cell: ({ row }) => new Date(row.original.createdAt).toLocaleDateString('vi-VN'),
    },
    {
      accessorKey: 'status',
      header: 'Trạng thái',
      cell: ({ row }) => {
        const status = row.original.status;
        return (
          <Badge variant={REGISTRATION_STATUS_VARIANT[status]}>
            {REGISTRATION_STATUS_LABELS[status]}
          </Badge>
        );
      },
    },
    {
      id: 'actions',
      cell: ({ row }) => {
        const registration = row.original;
        const primaryAction = getPrimaryAction(registration.status);
        const canReject = canPerformAction(registration.status, 'REJECT');

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
                <Link href={`/admin/registrations/${registration.id}`}>
                  <Eye className="mr-2 h-4 w-4" />
                  Xem chi tiết
                </Link>
              </DropdownMenuItem>
              <DropdownMenuItem
                onClick={() => navigator.clipboard.writeText(registration.id)}
              >
                Sao chép mã đơn
              </DropdownMenuItem>
              {primaryAction && (
                <>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem
                    className="text-green-600"
                    onClick={() => onPrimaryAction(registration)}
                  >
                    {REGISTRATION_ACTION_LABELS[primaryAction]}
                  </DropdownMenuItem>
                </>
              )}
              {canReject && (
                <DropdownMenuItem
                  className="text-red-600"
                  onClick={() => onRejectClick(registration)}
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

export function PendingRegistrationsTable() {
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState('');
  const [searchInput, setSearchInput] = useState('');
  const [selectedRegistration, setSelectedRegistration] = useState<Registration | null>(null);
  const [approveOpen, setApproveOpen] = useState(false);
  const [rejectOpen, setRejectOpen] = useState(false);

  const limit = 10;
  const { data, isLoading, isError, refetch } = usePendingRegistrations({
    page,
    limit,
    search,
  });
  const approveMutation = useApproveRegistration();
  const rejectMutation = useRejectRegistration();

  const columns = useMemo(
    () =>
      createColumns({
        onPrimaryAction: (registration) => {
          setSelectedRegistration(registration);
          setApproveOpen(true);
        },
        onRejectClick: (registration) => {
          setSelectedRegistration(registration);
          setRejectOpen(true);
        },
      }),
    [],
  );

  const handleSearch = () => {
    setPage(1);
    setSearch(searchInput.trim());
  };

  const handleApprove = () => {
    if (!selectedRegistration) return;
    approveMutation.mutate(selectedRegistration.id, {
      onSuccess: () => {
        setApproveOpen(false);
        setSelectedRegistration(null);
      },
    });
  };

  const handleReject = (reason: string) => {
    if (!selectedRegistration) return;
    rejectMutation.mutate(
      { id: selectedRegistration.id, payload: { reason } },
      {
        onSuccess: () => {
          setRejectOpen(false);
          setSelectedRegistration(null);
        },
      },
    );
  };

  if (isLoading) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-10 w-full max-w-sm" />
        <Skeleton className="h-64 w-full" />
      </div>
    );
  }

  if (isError) {
    return (
      <div className="rounded-md border p-8 text-center">
        <p className="text-sm text-muted-foreground mb-4">
          Không thể tải danh sách đơn đăng ký.
        </p>
        <Button variant="outline" onClick={() => refetch()}>
          Thử lại
        </Button>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
        <Input
          placeholder="Tìm theo tên quán, địa chỉ hoặc mã đơn..."
          value={searchInput}
          onChange={(event) => setSearchInput(event.target.value)}
          onKeyDown={(event) => {
            if (event.key === 'Enter') handleSearch();
          }}
          className="max-w-sm"
        />
        <Button variant="outline" onClick={handleSearch}>
          Tìm kiếm
        </Button>
      </div>

      <RegistrationTable columns={columns} data={data?.data ?? []} />

      {data?.meta && <CommonPagination meta={data.meta} onPageChange={setPage} />}

      <ApproveRegistrationDialog
        registration={selectedRegistration}
        open={approveOpen}
        onOpenChange={setApproveOpen}
        onConfirm={handleApprove}
        isPending={approveMutation.isPending}
      />

      <RejectRegistrationDialog
        registration={selectedRegistration}
        open={rejectOpen}
        onOpenChange={setRejectOpen}
        onConfirm={handleReject}
        isPending={rejectMutation.isPending}
      />
    </div>
  );
}
