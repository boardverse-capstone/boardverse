'use client';

import { useCallback, useMemo, useState } from 'react';
import Link from 'next/link';
import { ColumnDef } from '@tanstack/react-table';
import { ArrowUpDown, Eye, Lock, MoreHorizontal, Plus, Unlock } from 'lucide-react';
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
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { CommonPagination } from '@/components/common/pagination';
import { MANAGED_ROLE_FILTERS } from '@/core/constants/user-management';
import { ROUTES } from '@/core/constants/routes';
import { useListQueryState } from '@/shared/hooks/useListQueryState';
import { PartnerDataTable } from '@/features/partner/components/partner-data-table';
import { useUsers } from '../hooks/useUsers';
import { useBlockUser } from '../hooks/useBlockUser';
import { useUnblockUser } from '../hooks/useUnblockUser';
import { BlockUserDialog } from './block-user-dialog';
import { UserEmailBadge } from './user-email-badge';
import { UserRoleBadge } from './user-role-badge';
import { UserStatusBadge } from './user-status-badge';
import type { ManagedUser, UserActionTarget } from '../types/user.interface';
import { toUserActionTarget } from '../utils/user.mapper';

const DEFAULT_PAGE_SIZE = 5;
const PAGE_SIZE_OPTIONS = [5, 10, 20];

interface UserListTableHandlers {
  onBlock: (user: UserActionTarget) => void;
  onUnblock: (user: UserActionTarget) => void;
  getDetailHref: (id: string) => string;
}

function createColumns({
  onBlock,
  onUnblock,
  getDetailHref,
}: UserListTableHandlers): ColumnDef<ManagedUser>[] {
  return [
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
      accessorKey: 'phoneNumber',
      header: 'Số điện thoại',
      cell: ({ row }) => row.original.phoneNumber ?? '—',
    },
    {
      accessorKey: 'role',
      header: 'Vai trò',
      cell: ({ row }) => <UserRoleBadge role={row.original.role} />,
    },
    {
      accessorKey: 'isEmailVerified',
      header: 'Email',
      cell: ({ row }) => <UserEmailBadge verified={row.original.isEmailVerified} />,
    },
    {
      accessorKey: 'status',
      header: 'Trạng thái',
      cell: ({ row }) => (
        <UserStatusBadge
          isActive={row.original.isActive}
          isBlocked={row.original.isBlocked}
        />
      ),
    },
    {
      accessorKey: 'createdAt',
      header: 'Ngày tạo',
      cell: ({ row }) => new Date(row.original.createdAt).toLocaleDateString('vi-VN'),
    },
    {
      id: 'actions',
      cell: ({ row }) => {
        const user = row.original;

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
                <Link href={getDetailHref(user.id)}>
                  <Eye className="mr-2 h-4 w-4" />
                  Xem chi tiết
                </Link>
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => navigator.clipboard.writeText(user.id)}>
                Sao chép mã tài khoản
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              {user.isBlocked ? (
                <DropdownMenuItem
                  className="text-emerald-600"
                  onClick={() => onUnblock(toUserActionTarget(user))}
                >
                  <Unlock className="mr-2 h-4 w-4" />
                  Mở khóa
                </DropdownMenuItem>
              ) : (
                <DropdownMenuItem
                  className="text-rose-600"
                  onClick={() => onBlock(toUserActionTarget(user))}
                >
                  <Lock className="mr-2 h-4 w-4" />
                  Khóa tài khoản
                </DropdownMenuItem>
              )}
            </DropdownMenuContent>
          </DropdownMenu>
        );
      },
    },
  ];
}

export function UserListTable() {
  const {
    page,
    limit,
    search,
    role: roleFilter,
    setPage,
    setLimit,
    setSearch,
    setRole: setRoleFilter,
    detailHref,
  } = useListQueryState({ defaultLimit: DEFAULT_PAGE_SIZE });
  const [blockTarget, setBlockTarget] = useState<UserActionTarget | null>(null);
  const [blockOpen, setBlockOpen] = useState(false);

  const { data, isLoading, isError, refetch } = useUsers({
    page,
    limit,
    search,
    role: roleFilter,
  });
  const blockMutation = useBlockUser();
  const unblockMutation = useUnblockUser();

  const handleBlock = useCallback((user: UserActionTarget) => {
    setBlockTarget(user);
    setBlockOpen(true);
  }, []);

  const handleUnblock = useCallback(
    (user: UserActionTarget) => {
      unblockMutation.mutate(user.id);
    },
    [unblockMutation.mutate],
  );

  const getDetailHref = useCallback(
    (id: string) => detailHref(ROUTES.ADMIN.USER_DETAIL(id), ROUTES.ADMIN.USERS),
    [detailHref],
  );

  const columns = useMemo(
    () =>
      createColumns({
        onBlock: handleBlock,
        onUnblock: handleUnblock,
        getDetailHref,
      }),
    [handleBlock, handleUnblock, getDetailHref],
  );

  const handleBlockConfirm = (reason: string) => {
    if (!blockTarget) return;
    blockMutation.mutate(
      { id: blockTarget.id, payload: { reason } },
      {
        onSuccess: () => {
          setBlockOpen(false);
          setBlockTarget(null);
        },
      },
    );
  };

  if (isLoading) {
    return <div className="p-4 text-sm text-muted-foreground">Đang tải danh sách tài khoản...</div>;
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

  const total = data?.meta.totalItems ?? 0;

  return (
    <div className="space-y-5">
      <div className="flex justify-end">
        <Button asChild className="bg-indigo-600 hover:bg-indigo-700">
          <Link href={ROUTES.ADMIN.USER_CREATE}>
            <Plus className="mr-2 h-4 w-4" />
            Tạo tài khoản
          </Link>
        </Button>
      </div>

      <div className="grid gap-3 sm:grid-cols-2">
        <div className="rounded-xl border border-indigo-200 bg-indigo-50 px-4 py-3">
          <p className="text-xs font-medium uppercase tracking-wide text-indigo-700">Tổng tài khoản</p>
          <p className="mt-1 text-2xl font-bold text-indigo-900">{total}</p>
        </div>
        <div className="rounded-xl border border-violet-200 bg-violet-50 px-4 py-3">
          <p className="text-xs font-medium uppercase tracking-wide text-violet-700">Trang hiện tại</p>
          <p className="mt-1 text-2xl font-bold text-violet-900">
            {data?.meta.currentPage ?? 1}
            <span className="text-base font-medium text-violet-600">
              {' '}
              / {data?.meta.totalPages ?? 1}
            </span>
          </p>
        </div>
      </div>

      <Tabs
        value={roleFilter}
        onValueChange={setRoleFilter}
      >
        <TabsList className="grid h-auto w-full grid-cols-2 gap-1 bg-indigo-50/80 sm:grid-cols-3 lg:grid-cols-5">
          {MANAGED_ROLE_FILTERS.map((filter) => (
            <TabsTrigger
              key={filter.value}
              value={filter.value}
              className="data-[state=active]:bg-indigo-600 data-[state=active]:text-white"
            >
              {filter.label}
            </TabsTrigger>
          ))}
        </TabsList>
      </Tabs>

      <Input
        type="text"
        placeholder="Tìm theo username, email hoặc số điện thoại..."
        value={search}
        onChange={(event) => setSearch(event.target.value)}
        className="max-w-sm border-indigo-200 bg-indigo-50/40 focus-visible:ring-indigo-400"
      />

      <PartnerDataTable
        columns={columns}
        data={data?.data ?? []}
        emptyMessage="Không tìm thấy tài khoản phù hợp."
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

      <BlockUserDialog
        user={blockTarget}
        open={blockOpen}
        onOpenChange={setBlockOpen}
        onConfirm={handleBlockConfirm}
        isPending={blockMutation.isPending}
      />
    </div>
  );
}
