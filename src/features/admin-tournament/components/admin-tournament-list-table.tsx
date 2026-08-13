'use client';

import { useMemo, useState } from 'react';
import Link from 'next/link';
import { ColumnDef } from '@tanstack/react-table';
import { Eye, Pencil, Plus, Trash2 } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
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
import { ROUTES } from '@/core/constants/routes';
import { useAdminCafes } from '@/features/admin-cafe/hooks/useAdminCafes';
import { PartnerDataTable } from '@/features/partner/components/partner-data-table';
import { useAdminTournaments } from '../hooks/useAdminTournaments';
import {
  useCreateAdminTournament,
  useDeleteAdminTournament,
  useUpdateAdminTournament,
} from '../hooks/useTournamentActions';
import type { AdminTournament, TournamentStatus } from '../types/tournament.interface';
import { TOURNAMENT_STATUSES } from '../types/tournament.interface';
import {
  formatTournamentDate,
  tournamentStatusLabel,
} from '../utils/tournament.mapper';
import {
  TournamentFormDialog,
  type TournamentFormSubmitValues,
} from './tournament-form-dialog';

const DEFAULT_LIMIT = 20;

function statusBadgeClass(status: string) {
  switch (status) {
    case 'Draft':
      return 'border-border bg-muted text-foreground';
    case 'RegistrationOpen':
      return 'border-emerald-200 bg-emerald-50 text-emerald-800';
    case 'RegistrationClosed':
      return 'border-amber-200 bg-amber-50 text-amber-800';
    case 'OnGoing':
      return 'border-sky-200 bg-sky-50 text-sky-800';
    case 'Completed':
      return 'border-violet-200 bg-violet-50 text-violet-800';
    case 'Cancelled':
      return 'border-rose-200 bg-rose-50 text-rose-800';
    default:
      return 'border-border bg-muted text-foreground';
  }
}

function canEditOrDelete(status: string) {
  return status === 'Draft' || status === 'Cancelled';
}

export function AdminTournamentListTable() {
  const [page, setPage] = useState(1);
  const [limit, setLimit] = useState(DEFAULT_LIMIT);
  const [statusFilter, setStatusFilter] = useState<TournamentStatus | 'all'>('all');
  const [cafeIdFilter, setCafeIdFilter] = useState('all');
  const [cafeIdInput, setCafeIdInput] = useState('');

  const { data, isLoading, isError, refetch } = useAdminTournaments({
    page,
    limit,
    status: statusFilter,
    cafeId: cafeIdFilter !== 'all' ? cafeIdFilter : undefined,
  });

  const { data: cafesData } = useAdminCafes({ page: 1, limit: 100 });
  const cafes = cafesData?.data ?? [];

  const createMutation = useCreateAdminTournament();
  const updateMutation = useUpdateAdminTournament();
  const deleteMutation = useDeleteAdminTournament();

  const [formOpen, setFormOpen] = useState(false);
  const [editingTournament, setEditingTournament] = useState<AdminTournament | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<AdminTournament | null>(null);

  const columns = useMemo<ColumnDef<AdminTournament>[]>(
    () => [
      {
        accessorKey: 'name',
        header: 'Giải đấu',
        cell: ({ row }) => (
          <div className="min-w-[180px]">
            <div className="font-semibold">{row.original.name}</div>
            <div className="text-xs text-muted-foreground">{row.original.gameName}</div>
          </div>
        ),
      },
      {
        accessorKey: 'cafeName',
        header: 'Quán',
        cell: ({ row }) => (
          <div>
            <div className="text-sm">{row.original.cafeName}</div>
            <div className="font-mono text-[11px] text-muted-foreground">
              {row.original.cafeId ? `${row.original.cafeId.slice(0, 8)}…` : '—'}
            </div>
          </div>
        ),
      },
      {
        accessorKey: 'status',
        header: 'Trạng thái',
        cell: ({ row }) => (
          <Badge variant="outline" className={statusBadgeClass(row.original.status)}>
            {tournamentStatusLabel(row.original.status)}
          </Badge>
        ),
      },
      {
        accessorKey: 'currentParticipants',
        header: 'Người chơi',
        cell: ({ row }) => (
          <span className="tabular-nums">
            {row.original.currentParticipants}/{row.original.maxParticipants}
          </span>
        ),
      },
      {
        accessorKey: 'startTime',
        header: 'Bắt đầu',
        cell: ({ row }) => (
          <span className="text-sm text-muted-foreground">
            {formatTournamentDate(row.original.startTime)}
          </span>
        ),
      },
      {
        accessorKey: 'entryFeeBvc',
        header: 'Phí / Giải',
        cell: ({ row }) => (
          <div className="text-sm tabular-nums">
            <div>{row.original.entryFeeBvc} BVC</div>
            <div className="text-xs text-muted-foreground">
              {row.original.prizePoolBvc} BVC
            </div>
          </div>
        ),
      },
      {
        id: 'actions',
        header: '',
        cell: ({ row }) => {
          const editable = canEditOrDelete(row.original.status);
          return (
            <div className="flex flex-wrap justify-end gap-1.5">
              <Button variant="outline" size="sm" asChild>
                <Link href={ROUTES.ADMIN.TOURNAMENT_DETAIL(row.original.id)}>
                  <Eye className="mr-1 h-4 w-4" />
                  Chi tiết
                </Link>
              </Button>
              {editable && (
                <>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => {
                      setEditingTournament(row.original);
                      setFormOpen(true);
                    }}
                  >
                    <Pencil className="mr-1 h-4 w-4" />
                    Sửa
                  </Button>
                  <Button
                    variant="destructive"
                    size="sm"
                    onClick={() => setDeleteTarget(row.original)}
                  >
                    <Trash2 className="mr-1 h-4 w-4" />
                    Xóa
                  </Button>
                </>
              )}
            </div>
          );
        },
      },
    ],
    [],
  );

  const handleFormSubmit = (values: TournamentFormSubmitValues) => {
    if (values.mode === 'edit') {
      if (!editingTournament) return;
      updateMutation.mutate(
        { id: editingTournament.id, payload: values.payload },
        {
          onSuccess: () => {
            setFormOpen(false);
            setEditingTournament(null);
          },
        },
      );
      return;
    }

    createMutation.mutate(values.payload, {
      onSuccess: () => setFormOpen(false),
    });
  };

  const formPending = createMutation.isPending || updateMutation.isPending;

  return (
    <div className="space-y-6">
      <PageHeader
        title="Quản lý giải đấu"
        description="CRUD và vận hành tournament qua /api/v1/admin/tournaments."
      />

      <div className="flex flex-col gap-3 lg:flex-row lg:items-end lg:justify-between">
        <div className="flex flex-1 flex-col gap-3 sm:flex-row sm:flex-wrap sm:items-center">
          <Select
            value={statusFilter}
            onValueChange={(value) => {
              setStatusFilter(value as TournamentStatus | 'all');
              setPage(1);
            }}
          >
            <SelectTrigger className="w-full sm:w-[200px]">
              <SelectValue placeholder="Lọc trạng thái" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Tất cả trạng thái</SelectItem>
              {TOURNAMENT_STATUSES.map((status) => (
                <SelectItem key={status} value={status}>
                  {tournamentStatusLabel(status)}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          <Select
            value={cafeIdFilter}
            onValueChange={(value) => {
              setCafeIdFilter(value);
              setCafeIdInput('');
              setPage(1);
            }}
          >
            <SelectTrigger className="w-full sm:w-[220px]">
              <SelectValue placeholder="Lọc theo quán" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Tất cả quán</SelectItem>
              {cafes.map((cafe) => (
                <SelectItem key={cafe.id} value={cafe.id}>
                  {cafe.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          <div className="flex min-w-0 flex-1 gap-2">
            <Input
              placeholder="Hoặc nhập cafeId (guid)..."
              value={cafeIdInput}
              onChange={(e) => setCafeIdInput(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter') {
                  const trimmed = cafeIdInput.trim();
                  setCafeIdFilter(trimmed || 'all');
                  setPage(1);
                }
              }}
              className="min-w-0 flex-1"
            />
            <Button
              variant="outline"
              className="shrink-0"
              onClick={() => {
                const trimmed = cafeIdInput.trim();
                setCafeIdFilter(trimmed || 'all');
                setPage(1);
              }}
            >
              Lọc
            </Button>
          </div>
        </div>

        <Button
          onClick={() => {
            setEditingTournament(null);
            setFormOpen(true);
          }}
        >
          <Plus className="mr-2 h-4 w-4" />
          Tạo giải
        </Button>
      </div>

      {isLoading ? (
        <div className="p-4 text-sm text-muted-foreground">Đang tải danh sách giải đấu...</div>
      ) : isError ? (
        <div className="p-4 text-sm text-rose-600">
          Không thể tải danh sách giải đấu.{' '}
          <button type="button" className="underline" onClick={() => void refetch()}>
            Thử lại
          </button>
        </div>
      ) : (
        <>
          <PartnerDataTable
            columns={columns}
            data={data?.data ?? []}
            emptyMessage="Chưa có giải đấu nào."
          />
          {data?.meta && (
            <CommonPagination
              meta={data.meta}
              pageSize={limit}
              pageSizeOptions={[10, 20, 50]}
              onPageChange={setPage}
              onLimitChange={(value) => {
                setLimit(value);
                setPage(1);
              }}
            />
          )}
        </>
      )}

      <TournamentFormDialog
        open={formOpen}
        onOpenChange={(open) => {
          setFormOpen(open);
          if (!open) setEditingTournament(null);
        }}
        tournament={editingTournament}
        onSubmit={handleFormSubmit}
        isPending={formPending}
      />

      <AlertDialog
        open={Boolean(deleteTarget)}
        onOpenChange={(open) => {
          if (!open) setDeleteTarget(null);
        }}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Xóa giải đấu?</AlertDialogTitle>
            <AlertDialogDescription>
              Xóa giải{' '}
              <span className="font-medium text-foreground">{deleteTarget?.name}</span>.
              Chỉ áp dụng với trạng thái Nháp hoặc Đã hủy.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={deleteMutation.isPending}>Hủy</AlertDialogCancel>
            <AlertDialogAction
              disabled={deleteMutation.isPending}
              onClick={(event) => {
                event.preventDefault();
                if (!deleteTarget) return;
                deleteMutation.mutate(deleteTarget.id, {
                  onSuccess: () => setDeleteTarget(null),
                });
              }}
            >
              {deleteMutation.isPending ? 'Đang xóa...' : 'Xóa giải'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
