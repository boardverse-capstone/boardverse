'use client';

import { useMemo, useState } from 'react';
import { ColumnDef } from '@tanstack/react-table';
import { Eye, Pencil, Plus, Settings2, Trash2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { CommonPagination } from '@/components/common/pagination';
import { PageHeader } from '@/components/common/page-header';
import {
  CAFE_OPERATIONAL_STATUS_OPTIONS,
  type CafeOperationalStatusValue,
} from '@/core/constants/admin-cafe';
import { OperationalStatusBadge } from '@/features/partner/components/partner-status-badges';
import { PartnerDataTable } from '@/features/partner/components/partner-data-table';
import type { OperationalStatus } from '@/features/partner/types/partner.interface';
import { useListQueryState } from '@/shared/hooks/useListQueryState';
import { useAdminCafes } from '../hooks/useAdminCafes';
import { useAdminCafeDetail } from '../hooks/useAdminCafeDetail';
import { useCreateAdminCafe } from '../hooks/useCreateAdminCafe';
import { useUpdateAdminCafe } from '../hooks/useUpdateAdminCafe';
import { useDeleteAdminCafe } from '../hooks/useDeleteAdminCafe';
import { useUpdateCafeOperationalStatus } from '../hooks/useUpdateCafeOperationalStatus';
import type { AdminCafe } from '../types/admin-cafe.interface';
import { formatCafeDate } from '../utils/admin-cafe.mapper';
import { CafeDetailDialog } from './cafe-detail-dialog';
import { CafeFormDialog, type CafeFormValues } from './cafe-form-dialog';
import { UpdateOperationalStatusDialog } from './update-operational-status-dialog';

const DEFAULT_PAGE_SIZE = 20;

export function AdminCafeListTable() {
  const { page, limit, search, setPage, setLimit, setSearch } = useListQueryState({
    defaultLimit: DEFAULT_PAGE_SIZE,
  });
  const [statusFilter, setStatusFilter] = useState<CafeOperationalStatusValue | 'all'>('all');

  // Lọc status trên FE: API `status` đang lệch so với badge trên list (vd. thiếu field → map DATA_BLANK).
  const { data, isLoading, isError } = useAdminCafes({
    page,
    limit,
    search,
  });

  const tableData = useMemo(() => {
    const items = data?.data ?? [];
    if (statusFilter === 'all') return items;
    return items.filter((cafe) => cafe.operationalStatus === statusFilter);
  }, [data?.data, statusFilter]);

  const tableMeta = useMemo(() => {
    if (!data?.meta || statusFilter === 'all') return data?.meta;
    const totalItems = tableData.length;
    return {
      ...data.meta,
      currentPage: 1,
      totalItems,
      totalPages: 1,
      hasPrevious: false,
      hasNext: false,
    };
  }, [data?.meta, statusFilter, tableData.length]);

  const createMutation = useCreateAdminCafe();
  const updateMutation = useUpdateAdminCafe();
  const deleteMutation = useDeleteAdminCafe();
  const updateStatusMutation = useUpdateCafeOperationalStatus();

  const [formOpen, setFormOpen] = useState(false);
  const [editingCafeId, setEditingCafeId] = useState<string | null>(null);
  const { data: editingCafeDetail } = useAdminCafeDetail(editingCafeId, formOpen && Boolean(editingCafeId));
  const editingCafe =
    editingCafeDetail ??
    data?.data.find((cafe) => cafe.id === editingCafeId) ??
    null;
  const [detailCafeId, setDetailCafeId] = useState<string | null>(null);
  const [detailOpen, setDetailOpen] = useState(false);
  const [statusDialogOpen, setStatusDialogOpen] = useState(false);
  const [selectedCafe, setSelectedCafe] = useState<AdminCafe | null>(null);
  const [deleteCafe, setDeleteCafe] = useState<AdminCafe | null>(null);

  const columns = useMemo<ColumnDef<AdminCafe>[]>(
    () => [
      {
        accessorKey: 'name',
        header: 'Tên quán',
        cell: ({ row }) => (
          <div>
            <div className="font-semibold">{row.original.name}</div>
            <div className="text-xs text-muted-foreground">{row.original.address}</div>
          </div>
        ),
      },
      {
        accessorKey: 'phoneNumber',
        header: 'SĐT',
        cell: ({ row }) => (
          <span className="tabular-nums">{row.original.phoneNumber || '—'}</span>
        ),
      },
      {
        accessorKey: 'managerName',
        header: 'Manager',
        cell: ({ row }) => (
          <div>
            <div className="text-sm">{row.original.managerName || '—'}</div>
            <div className="font-mono text-[11px] text-muted-foreground">
              {row.original.managerId ? `${row.original.managerId.slice(0, 8)}…` : '—'}
            </div>
          </div>
        ),
      },
      {
        accessorKey: 'operationalStatus',
        header: 'Trạng thái',
        cell: ({ row }) => (
          <OperationalStatusBadge
            status={row.original.operationalStatus as OperationalStatus}
          />
        ),
      },
      {
        accessorKey: 'createdAt',
        header: 'Ngày tạo',
        cell: ({ row }) => (
          <span className="text-sm text-muted-foreground">
            {formatCafeDate(row.original.createdAt)}
          </span>
        ),
      },
      {
        id: 'actions',
        header: '',
        cell: ({ row }) => (
          <div className="flex flex-wrap justify-end gap-1.5">
            <Button
              variant="outline"
              size="sm"
              onClick={() => {
                setDetailCafeId(row.original.id);
                setDetailOpen(true);
              }}
            >
              <Eye className="mr-1 h-4 w-4" />
              Chi tiết
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => {
                setEditingCafeId(row.original.id);
                setFormOpen(true);
              }}
            >
              <Pencil className="mr-1 h-4 w-4" />
              Sửa
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
              Status
            </Button>
            <Button
              variant="destructive"
              size="sm"
              onClick={() => setDeleteCafe(row.original)}
            >
              <Trash2 className="mr-1 h-4 w-4" />
              Xóa
            </Button>
          </div>
        ),
      },
    ],
    [],
  );

  const handleFormSubmit = (values: CafeFormValues) => {
    if (editingCafeId) {
      updateMutation.mutate(
        {
          cafeId: editingCafeId,
          payload: {
            name: values.name,
            address: values.address,
            latitude: values.latitude,
            longitude: values.longitude,
            phoneNumber: values.phoneNumber,
            description: values.description,
          },
        },
        {
          onSuccess: () => {
            setFormOpen(false);
            setEditingCafeId(null);
          },
        },
      );
      return;
    }

    if (!values.managerId) return;

    createMutation.mutate(
      {
        name: values.name,
        address: values.address,
        latitude: values.latitude,
        longitude: values.longitude,
        phoneNumber: values.phoneNumber,
        managerId: values.managerId,
        description: values.description,
      },
      { onSuccess: () => setFormOpen(false) },
    );
  };

  const handleStatusConfirm = (payload: {
    status: CafeOperationalStatusValue;
    reason?: string;
  }) => {
    if (!selectedCafe) return;
    updateStatusMutation.mutate(
      { cafeId: selectedCafe.id, payload },
      { onSuccess: () => setStatusDialogOpen(false) },
    );
  };

  const formPending = createMutation.isPending || updateMutation.isPending;

  return (
    <div className="space-y-6">
      <PageHeader
        title="Quản lý quán cafe"
        description="CRUD quán đối tác qua /api/v1/admin/cafes — danh sách, tạo, sửa, xóa và đổi trạng thái vận hành."
      />

      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex flex-1 flex-col gap-3 sm:flex-row sm:items-center">
          <Input
            placeholder="Tìm theo tên quán, địa chỉ..."
            value={search}
            onChange={(event) => setSearch(event.target.value)}
            className="max-w-sm"
          />
          <Select
            value={statusFilter}
            onValueChange={(value) => {
              setStatusFilter(value as CafeOperationalStatusValue | 'all');
              setPage(1);
            }}
          >
            <SelectTrigger className="w-[200px]">
              <SelectValue placeholder="Lọc trạng thái" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Tất cả trạng thái</SelectItem>
              {CAFE_OPERATIONAL_STATUS_OPTIONS.map((option) => (
                <SelectItem key={option.value} value={option.value}>
                  {option.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <Button
          onClick={() => {
            setEditingCafeId(null);
            setFormOpen(true);
          }}
        >
          <Plus className="mr-2 h-4 w-4" />
          Tạo quán
        </Button>
      </div>

      {isLoading ? (
        <div className="p-4 text-sm text-muted-foreground">Đang tải danh sách quán...</div>
      ) : isError ? (
        <div className="text-sm text-rose-600">Không thể tải danh sách quán.</div>
      ) : (
        <>
          <PartnerDataTable
            columns={columns}
            data={tableData}
            emptyMessage="Chưa có quán nào."
          />
          {tableMeta && (
            <CommonPagination
              meta={tableMeta}
              pageSize={limit}
              pageSizeOptions={[10, 20, 50]}
              onPageChange={setPage}
              onLimitChange={setLimit}
            />
          )}
        </>
      )}

      <CafeFormDialog
        open={formOpen}
        onOpenChange={(open) => {
          setFormOpen(open);
          if (!open) setEditingCafeId(null);
        }}
        cafe={editingCafe}
        onSubmit={handleFormSubmit}
        isPending={formPending}
      />

      <CafeDetailDialog
        open={detailOpen}
        onOpenChange={(open) => {
          setDetailOpen(open);
          if (!open) setDetailCafeId(null);
        }}
        cafeId={detailCafeId}
      />

      {selectedCafe && (
        <UpdateOperationalStatusDialog
          open={statusDialogOpen}
          onOpenChange={setStatusDialogOpen}
          cafeId={selectedCafe.id}
          cafeName={selectedCafe.name}
          currentStatus={selectedCafe.operationalStatus as OperationalStatus}
          onConfirm={handleStatusConfirm}
          isPending={updateStatusMutation.isPending}
        />
      )}

      <AlertDialog
        open={Boolean(deleteCafe)}
        onOpenChange={(open) => {
          if (!open) setDeleteCafe(null);
        }}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Xóa quán?</AlertDialogTitle>
            <AlertDialogDescription>
              Xóa quán <span className="font-medium text-foreground">{deleteCafe?.name}</span>.
              Chỉ thành công khi quán không còn session/booking đang hoạt động.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={deleteMutation.isPending}>Hủy</AlertDialogCancel>
            <AlertDialogAction
              disabled={deleteMutation.isPending}
              onClick={(event) => {
                event.preventDefault();
                if (!deleteCafe) return;
                deleteMutation.mutate(deleteCafe.id, {
                  onSuccess: () => setDeleteCafe(null),
                });
              }}
            >
              {deleteMutation.isPending ? 'Đang xóa...' : 'Xóa quán'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
