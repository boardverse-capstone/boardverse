'use client';

import { useMemo, useState } from 'react';
import Link from 'next/link';
import { ColumnDef } from '@tanstack/react-table';
import { ArrowUpDown, Eye } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { CommonPagination } from '@/components/common/pagination';
import { ASSIGNABLE_ROLES } from '@/core/constants/user-management';
import { ROUTES } from '@/core/constants/routes';
import { useListQueryState } from '@/shared/hooks/useListQueryState';
import { PartnerDataTable } from '@/features/partner/components/partner-data-table';
import { useUsers } from '../hooks/useUsers';
import { useUpdateUserRole } from '../hooks/useUpdateUserRole';
import { UpdateRoleDialog } from './update-role-dialog';
import { UserRoleBadge } from './user-role-badge';
import type { ManagedUser } from '../types/user.interface';

const DEFAULT_PAGE_SIZE = 5;
const PAGE_SIZE_OPTIONS = [5, 10, 20];

export function UserRoleTable() {
  const {
    page,
    limit,
    search,
    setPage,
    setLimit,
    setSearch,
    detailHref,
  } = useListQueryState({ defaultLimit: DEFAULT_PAGE_SIZE });
  const [draftRoles, setDraftRoles] = useState<Record<string, string>>({});
  const [confirmUser, setConfirmUser] = useState<ManagedUser | null>(null);
  const [confirmRole, setConfirmRole] = useState('');
  const [confirmOpen, setConfirmOpen] = useState(false);

  const { data, isLoading, isError, refetch } = useUsers({
    page,
    limit,
    search,
    role: 'all',
  });
  const updateRoleMutation = useUpdateUserRole();

  const columns = useMemo<ColumnDef<ManagedUser>[]>(
    () => [
      {
        accessorKey: 'username',
        header: ({ column }) => (
          <Button
            variant="ghost"
            onClick={() => column.toggleSorting(column.getIsSorted() === 'asc')}
          >
            Username
            <ArrowUpDown className="ml-2 h-4 w-4" />
          </Button>
        ),
        cell: ({ row }) => (
          <div>
            <div className="font-semibold">{row.original.username}</div>
            <div className="text-xs text-muted-foreground">{row.original.email}</div>
          </div>
        ),
      },
      {
        accessorKey: 'role',
        header: 'Vai trò hiện tại',
        cell: ({ row }) => <UserRoleBadge role={row.original.role} />,
      },
      {
        id: 'newRole',
        header: 'Vai trò mới',
        cell: ({ row }) => {
          const user = row.original;
          const draftRole = draftRoles[user.id] ?? user.role;

          return (
            <Select
              value={draftRole}
              onValueChange={(value) =>
                setDraftRoles((prev) => ({ ...prev, [user.id]: value }))
              }
            >
              <SelectTrigger className="w-[180px] bg-background">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {ASSIGNABLE_ROLES.map((role) => (
                  <SelectItem key={role.value} value={role.value}>
                    {role.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          );
        },
      },
      {
        id: 'actions',
        header: 'Thao tác',
        cell: ({ row }) => {
          const user = row.original;
          const draftRole = draftRoles[user.id] ?? user.role;
          const hasChange = draftRole !== user.role;

          return (
            <div className="flex items-center gap-2">
              <Button
                size="sm"
                disabled={!hasChange || updateRoleMutation.isPending}
                onClick={() => {
                  setConfirmUser(user);
                  setConfirmRole(draftRole);
                  setConfirmOpen(true);
                }}
              >
                Cập nhật
              </Button>
              <Button variant="ghost" size="sm" asChild>
                <Link
                  href={detailHref(
                    ROUTES.ADMIN.USER_DETAIL(user.id),
                    ROUTES.ADMIN.USER_ROLES,
                  )}
                >
                  <Eye className="mr-2 h-4 w-4" />
                  Chi tiết
                </Link>
              </Button>
            </div>
          );
        },
      },
    ],
    [draftRoles, updateRoleMutation.isPending],
  );

  const handleConfirmRole = () => {
    if (!confirmUser) return;

    updateRoleMutation.mutate(
      { id: confirmUser.id, payload: { role: confirmRole } },
      {
        onSuccess: (updatedUser) => {
          setDraftRoles((prev) => {
            const next = { ...prev };
            delete next[updatedUser.id];
            return next;
          });
          setConfirmOpen(false);
          setConfirmUser(null);
        },
      },
    );
  };

  if (isLoading) {
    return <div className="p-4 text-sm text-muted-foreground">Đang tải danh sách phân quyền...</div>;
  }

  if (isError) {
    return (
      <div className="p-4 text-sm text-rose-600">
        Không thể tải danh sách người dùng.{' '}
        <button type="button" className="underline" onClick={() => refetch()}>
          Thử lại
        </button>
      </div>
    );
  }

  return (
    <div className="space-y-5">
      <div className="rounded-xl border border-violet-200 bg-violet-50 px-4 py-3 text-sm text-violet-800">
        Chọn vai trò mới cho từng tài khoản và bấm <strong>Cập nhật</strong> để lưu thay đổi.
        Player chỉ dùng app Mobile; Manager và Staff truy cập Web Portal tương ứng.
      </div>

      <Input
        type="text"
        placeholder="Tìm theo username hoặc email..."
        value={search}
        onChange={(event) => setSearch(event.target.value)}
        className="max-w-sm border-violet-200 bg-violet-50/40 focus-visible:ring-violet-400"
      />

      <PartnerDataTable
        columns={columns}
        data={data?.data ?? []}
        emptyMessage="Không có tài khoản để phân quyền."
      />

      {data?.meta && (
        <CommonPagination
          meta={data.meta}
          pageSizeOptions={PAGE_SIZE_OPTIONS}
          onPageChange={(targetPage) => setPage(targetPage)}
          onLimitChange={(nextLimit) => {
            setLimit(nextLimit);
            setPage(1);
          }}
        />
      )}

      <UpdateRoleDialog
        user={confirmUser}
        newRole={confirmRole}
        open={confirmOpen}
        onOpenChange={setConfirmOpen}
        onConfirm={handleConfirmRole}
        isPending={updateRoleMutation.isPending}
      />
    </div>
  );
}
