'use client';

import { useMemo, useState } from 'react';
import Link from 'next/link';
import { ColumnDef } from '@tanstack/react-table';
import { ArrowUpDown, Eye } from 'lucide-react';
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
import { CommonPagination } from '@/components/common/pagination';
import {
  WALLET_ACCOUNT_STATUS_FILTERS,
  WALLET_RISK_LEVEL_FILTERS,
} from '@/core/constants/admin-wallet';
import { ROUTES } from '@/core/constants/routes';
import { PartnerDataTable } from '@/features/partner/components/partner-data-table';
import { useAdminWallets } from '../hooks/useAdminWallets';
import type { AdminWallet } from '../types/wallet.interface';
import { formatWalletBalance, formatWalletDate } from '../utils/wallet.mapper';

const DEFAULT_LIMIT = 20;

function statusBadgeClass(status: string) {
  switch (status) {
    case 'Active':
      return 'border-emerald-200 bg-emerald-50 text-emerald-800';
    case 'Warning':
      return 'border-amber-200 bg-amber-50 text-amber-800';
    case 'Restricted':
      return 'border-violet-200 bg-violet-50 text-violet-800';
    case 'Suspended':
      return 'border-amber-200 bg-amber-50 text-amber-800';
    case 'Banned':
      return 'border-rose-200 bg-rose-50 text-rose-800';
    default:
      return 'border-border bg-muted text-foreground';
  }
}

function riskBadgeClass(level: string) {
  switch (level) {
    case 'Low':
      return 'border-emerald-200 bg-emerald-50 text-emerald-800';
    case 'Medium':
      return 'border-amber-200 bg-amber-50 text-amber-800';
    case 'High':
      return 'border-orange-200 bg-orange-50 text-orange-800';
    case 'Critical':
      return 'border-rose-200 bg-rose-50 text-rose-800';
    default:
      return 'border-border bg-muted text-foreground';
  }
}

const columns: ColumnDef<AdminWallet>[] = [
  {
    accessorKey: 'userEmail',
    header: ({ column }) => (
      <Button variant="ghost" onClick={() => column.toggleSorting(column.getIsSorted() === 'asc')}>
        Người dùng
        <ArrowUpDown className="ml-2 h-4 w-4" />
      </Button>
    ),
    cell: ({ row }) => (
      <div className="min-w-[180px]">
        <div className="font-medium">{row.original.userEmail || '—'}</div>
        <div className="font-mono text-[11px] text-muted-foreground">
          {row.original.userId.slice(0, 8)}…
        </div>
      </div>
    ),
  },
  {
    accessorKey: 'availableBalance',
    header: 'Số dư khả dụng',
    cell: ({ row }) => (
      <span className="font-semibold tabular-nums">
        {formatWalletBalance(row.original.availableBalance)}
      </span>
    ),
  },
  {
    accessorKey: 'heldBalance',
    header: 'Đang giữ',
    cell: ({ row }) => (
      <span className="tabular-nums text-muted-foreground">
        {formatWalletBalance(row.original.heldBalance)}
      </span>
    ),
  },
  {
    accessorKey: 'totalActiveDeposit',
    header: 'Deposit active',
    cell: ({ row }) => (
      <span className="tabular-nums">
        {formatWalletBalance(row.original.totalActiveDeposit)}
      </span>
    ),
  },
  {
    accessorKey: 'riskLevel',
    header: 'Rủi ro',
    cell: ({ row }) => (
      <div className="space-y-1">
        <Badge variant="outline" className={riskBadgeClass(row.original.riskLevel)}>
          {row.original.riskLevel}
        </Badge>
        <div className="text-[11px] text-muted-foreground">
          ×{row.original.riskMultiplier}
        </div>
      </div>
    ),
  },
  {
    accessorKey: 'accountStatus',
    header: 'Trạng thái',
    cell: ({ row }) => (
      <div className="space-y-1">
        <Badge variant="outline" className={statusBadgeClass(row.original.accountStatus)}>
          {row.original.accountStatus}
        </Badge>
        {row.original.isCoolingOff && (
          <Badge variant="secondary" className="text-[10px]">
            Cooling off
          </Badge>
        )}
      </div>
    ),
  },
  {
    accessorKey: 'createdAt',
    header: 'Tạo lúc',
    cell: ({ row }) => (
      <span className="text-sm text-muted-foreground">
        {formatWalletDate(row.original.createdAt)}
      </span>
    ),
  },
  {
    id: 'actions',
    header: '',
    cell: ({ row }) => (
      <div className="flex justify-end">
        <Button variant="outline" size="sm" asChild>
          <Link href={ROUTES.ADMIN.WALLET_DETAIL(row.original.userId)}>
            <Eye className="mr-1 h-4 w-4" />
            Chi tiết
          </Link>
        </Button>
      </div>
    ),
  },
];

export function AdminWalletListTable() {
  const [page, setPage] = useState(1);
  const [limit, setLimit] = useState(DEFAULT_LIMIT);
  const [search, setSearch] = useState('');
  const [searchInput, setSearchInput] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [riskLevelFilter, setRiskLevelFilter] = useState('all');

  const { data, isLoading, isError, refetch } = useAdminWallets({
    page,
    limit,
    search,
    statusFilter,
    riskLevelFilter,
  });

  const tableColumns = useMemo(() => columns, []);

  const handleSearch = () => {
    setSearch(searchInput);
    setPage(1);
  };

  if (isLoading) {
    return <div className="p-4 text-sm text-muted-foreground">Đang tải danh sách wallets...</div>;
  }

  if (isError) {
    return (
      <div className="p-4 text-sm text-rose-600">
        Không thể tải danh sách wallets.{' '}
        <button type="button" className="underline" onClick={() => void refetch()}>
          Thử lại
        </button>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-col gap-3 md:flex-row md:flex-wrap md:items-end">
        <div className="flex min-w-0 flex-1 flex-col gap-2 sm:flex-row">
          <Input
            placeholder="Tìm theo email, full name hoặc userId..."
            value={searchInput}
            onChange={(e) => setSearchInput(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
            className="min-w-0 flex-1"
          />
          <Button variant="outline" onClick={handleSearch} className="shrink-0">
            Tìm kiếm
          </Button>
        </div>
        <Select
          value={statusFilter}
          onValueChange={(value) => {
            setStatusFilter(value);
            setPage(1);
          }}
        >
          <SelectTrigger className="w-full md:w-[200px]">
            <SelectValue placeholder="AccountStatus" />
          </SelectTrigger>
          <SelectContent>
            {WALLET_ACCOUNT_STATUS_FILTERS.map((item) => (
              <SelectItem key={item.value} value={item.value}>
                {item.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Select
          value={riskLevelFilter}
          onValueChange={(value) => {
            setRiskLevelFilter(value);
            setPage(1);
          }}
        >
          <SelectTrigger className="w-full md:w-[200px]">
            <SelectValue placeholder="RiskLevel" />
          </SelectTrigger>
          <SelectContent>
            {WALLET_RISK_LEVEL_FILTERS.map((item) => (
              <SelectItem key={item.value} value={item.value}>
                {item.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <PartnerDataTable
        columns={tableColumns}
        data={data?.data ?? []}
        emptyMessage="Không có wallet phù hợp."
      />

      {data?.meta && (
        <CommonPagination
          meta={data.meta}
          pageSize={limit}
          pageSizeOptions={[10, 20, 50, 100]}
          onPageChange={setPage}
          onLimitChange={(value) => {
            setLimit(value);
            setPage(1);
          }}
        />
      )}
    </div>
  );
}
