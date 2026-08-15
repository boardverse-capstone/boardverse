'use client';

import { useMemo, useState, type ReactNode } from 'react';
import { ColumnDef } from '@tanstack/react-table';
import { RotateCcw, Search } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { CommonPagination } from '@/components/common/pagination';
import { PartnerDataTable } from '@/features/partner/components/partner-data-table';
import { useAdminCafePerformance } from '../hooks/useAdminCafePerformance';
import { useAdminDepositsReport } from '../hooks/useAdminDepositsReport';
import { useAdminLobbyFailures } from '../hooks/useAdminLobbyFailures';
import { useAdminReportsOverview } from '../hooks/useAdminReportsOverview';
import type {
  CafePerformanceItem,
  CafePerformanceSortBy,
  DepositReportItem,
  DepositReportStatus,
  LobbyFailureItem,
  LobbyFailureType,
  SortOrder,
} from '../types/admin-reports.interface';

const DEFAULT_PAGE_SIZE = 20;

const FAILURE_TYPE_OPTIONS: { value: LobbyFailureType | 'all'; label: string }[] = [
  { value: 'all', label: 'Tất cả' },
  { value: 'TimeoutFailed', label: 'TimeoutFailed' },
  { value: 'HostCancelled', label: 'HostCancelled' },
  { value: 'RejectedByCafe', label: 'RejectedByCafe' },
  { value: 'ExpiredByCafe', label: 'ExpiredByCafe' },
];

const DEPOSIT_STATUS_OPTIONS: { value: DepositReportStatus | 'all'; label: string }[] = [
  { value: 'all', label: 'Tất cả' },
  { value: 'Pending', label: 'Pending' },
  { value: 'Paid', label: 'Paid' },
  { value: 'Refunded', label: 'Refunded' },
  { value: 'Forfeited', label: 'Forfeited' },
];

function toUtcIso(localValue: string): string | undefined {
  if (!localValue.trim()) return undefined;
  const date = new Date(localValue);
  if (Number.isNaN(date.getTime())) return undefined;
  return date.toISOString();
}

function formatNumber(value: number) {
  return value.toLocaleString('vi-VN');
}

function formatMoney(value: number) {
  return `${formatNumber(value)} ₫`;
}

function formatDateTime(value: string | null | undefined) {
  if (!value) return '—';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return date.toLocaleString('vi-VN');
}

function KpiCard({ label, value }: { label: string; value: string }) {
  return (
    <Card size="sm">
      <CardHeader className="pb-1">
        <CardTitle className="text-xs font-medium text-muted-foreground">{label}</CardTitle>
      </CardHeader>
      <CardContent>
        <p className="text-xl font-semibold tabular-nums">{value}</p>
      </CardContent>
    </Card>
  );
}

function DateRangeFilters({
  fromLocal,
  toLocal,
  onFromChange,
  onToChange,
  onApply,
  onReset,
  extra,
  error,
}: {
  fromLocal: string;
  toLocal: string;
  onFromChange: (value: string) => void;
  onToChange: (value: string) => void;
  onApply: () => void;
  onReset: () => void;
  extra?: ReactNode;
  error?: string | null;
}) {
  return (
    <div className="space-y-3 rounded-lg border p-4">
      <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
        <div className="space-y-1.5">
          <Label>Từ (fromUtc)</Label>
          <Input
            type="datetime-local"
            value={fromLocal}
            onChange={(e) => onFromChange(e.target.value)}
          />
        </div>
        <div className="space-y-1.5">
          <Label>Đến (toUtc)</Label>
          <Input type="datetime-local" value={toLocal} onChange={(e) => onToChange(e.target.value)} />
        </div>
        {extra}
      </div>
      <div className="flex flex-wrap items-center gap-2">
        <Button type="button" onClick={onApply}>
          <Search className="mr-2 h-4 w-4" />
          Áp dụng
        </Button>
        <Button type="button" variant="outline" onClick={onReset}>
          <RotateCcw className="mr-2 h-4 w-4" />
          Xóa lọc
        </Button>
        {error ? <p className="text-sm text-rose-600">{error}</p> : null}
      </div>
    </div>
  );
}

function OverviewTab() {
  const { data, isLoading, isError, refetch } = useAdminReportsOverview();

  if (isLoading) {
    return <div className="p-4 text-sm text-muted-foreground">Đang tải tổng quan...</div>;
  }

  if (isError || !data) {
    return (
      <div className="p-4 text-sm text-rose-600">
        Không thể tải tổng quan.{' '}
        <button type="button" className="underline" onClick={() => void refetch()}>
          Thử lại
        </button>
      </div>
    );
  }

  const kpis = [
    { label: 'Tổng users', value: formatNumber(data.totalUsers) },
    { label: 'Tổng cafes', value: formatNumber(data.totalCafes) },
    { label: 'Cafes active', value: formatNumber(data.activeCafes) },
    { label: 'Tournaments', value: formatNumber(data.totalTournaments) },
    { label: 'Đang mở ĐK', value: formatNumber(data.registrationOpenTournaments) },
    { label: 'Tournaments active', value: formatNumber(data.activeTournaments) },
    { label: 'Bookings', value: formatNumber(data.totalBookings) },
    { label: 'Bookings pending', value: formatNumber(data.pendingBookings) },
    { label: 'Lobby failures', value: formatNumber(data.totalLobbyFailures) },
    { label: 'Timeout failures', value: formatNumber(data.timeoutFailures) },
    { label: 'Host cancelled', value: formatNumber(data.hostCancelledFailures) },
    { label: 'Deposits', value: formatNumber(data.totalDeposits) },
    { label: 'Deposits pending', value: formatNumber(data.pendingDeposits) },
    { label: 'Doanh thu', value: formatMoney(data.totalRevenue) },
  ];

  return (
    <div className="space-y-6">
      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        {kpis.map((item) => (
          <KpiCard key={item.label} label={item.label} value={item.value} />
        ))}
      </div>

      <div className="space-y-3">
        <h3 className="text-sm font-medium">Hoạt động gần đây</h3>
        {(data.recentActivity ?? []).length === 0 ? (
          <p className="text-sm text-muted-foreground">Chưa có hoạt động gần đây.</p>
        ) : (
          <ul className="divide-y rounded-lg border">
            {data.recentActivity.map((item, index) => (
              <li key={`${item.type}-${item.timestamp}-${index}`} className="px-4 py-3">
                <div className="flex flex-wrap items-center gap-2">
                  <Badge variant="outline">{item.type}</Badge>
                  <span className="text-xs text-muted-foreground">
                    {formatDateTime(item.timestamp)}
                  </span>
                </div>
                <p className="mt-1 text-sm">{item.details}</p>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}

function LobbyFailuresTab() {
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(DEFAULT_PAGE_SIZE);
  const [fromLocal, setFromLocal] = useState('');
  const [toLocal, setToLocal] = useState('');
  const [failureType, setFailureType] = useState<LobbyFailureType | 'all'>('all');
  const [appliedFrom, setAppliedFrom] = useState<string | undefined>();
  const [appliedTo, setAppliedTo] = useState<string | undefined>();
  const [appliedType, setAppliedType] = useState<LobbyFailureType | 'all'>('all');
  const [filterError, setFilterError] = useState<string | null>(null);

  const { data, isLoading, isError, refetch } = useAdminLobbyFailures({
    page,
    pageSize,
    fromUtc: appliedFrom,
    toUtc: appliedTo,
    failureType: appliedType,
  });

  const columns = useMemo<ColumnDef<LobbyFailureItem>[]>(
    () => [
      {
        accessorKey: 'lobbyName',
        header: 'Lobby',
        cell: ({ row }) => (
          <div>
            <div className="font-medium">{row.original.lobbyName || '—'}</div>
            <div className="font-mono text-[11px] text-muted-foreground">
              {row.original.lobbyId?.slice(0, 8)}…
            </div>
          </div>
        ),
      },
      {
        accessorKey: 'cafeName',
        header: 'Game / Cafe',
        cell: ({ row }) => row.original.cafeName || '—',
      },
      { accessorKey: 'hostUsername', header: 'Host' },
      {
        accessorKey: 'failureType',
        header: 'Loại lỗi',
        cell: ({ row }) => <Badge variant="outline">{row.original.failureType}</Badge>,
      },
      {
        accessorKey: 'currentPlayers',
        header: 'Members',
        cell: ({ row }) => formatNumber(row.original.currentPlayers),
      },
      {
        accessorKey: 'createdAt',
        header: 'Tạo lúc',
        cell: ({ row }) => formatDateTime(row.original.createdAt),
      },
      {
        accessorKey: 'failedAt',
        header: 'Đóng lúc',
        cell: ({ row }) => formatDateTime(row.original.failedAt),
      },
    ],
    [],
  );

  const applyFilters = () => {
    const fromUtc = toUtcIso(fromLocal);
    const toUtc = toUtcIso(toLocal);
    if (fromUtc && toUtc && new Date(fromUtc).getTime() > new Date(toUtc).getTime()) {
      setFilterError('fromUtc không được lớn hơn toUtc.');
      return;
    }
    setFilterError(null);
    setAppliedFrom(fromUtc);
    setAppliedTo(toUtc);
    setAppliedType(failureType);
    setPage(1);
  };

  const resetFilters = () => {
    setFromLocal('');
    setToLocal('');
    setFailureType('all');
    setAppliedFrom(undefined);
    setAppliedTo(undefined);
    setAppliedType('all');
    setFilterError(null);
    setPage(1);
  };

  if (isLoading) {
    return <div className="p-4 text-sm text-muted-foreground">Đang tải lobby failures...</div>;
  }

  if (isError) {
    return (
      <div className="p-4 text-sm text-rose-600">
        Không thể tải lobby failures.{' '}
        <button type="button" className="underline" onClick={() => void refetch()}>
          Thử lại
        </button>
      </div>
    );
  }

  const summary = data?.summary;

  return (
    <div className="space-y-4">
      <DateRangeFilters
        fromLocal={fromLocal}
        toLocal={toLocal}
        onFromChange={setFromLocal}
        onToChange={setToLocal}
        onApply={applyFilters}
        onReset={resetFilters}
        error={filterError}
        extra={
          <div className="space-y-1.5">
            <Label>Loại lỗi</Label>
            <Select
              value={failureType}
              onValueChange={(value) => setFailureType(value as LobbyFailureType | 'all')}
            >
              <SelectTrigger className="w-full">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {FAILURE_TYPE_OPTIONS.map((item) => (
                  <SelectItem key={item.value} value={item.value}>
                    {item.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        }
      />

      {summary && (
        <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
          <KpiCard label="Tổng failures" value={formatNumber(summary.totalFailures)} />
          <KpiCard label="Timeout" value={formatNumber(summary.timeoutFailures)} />
          <KpiCard label="Host cancelled" value={formatNumber(summary.hostCancelled)} />
          <KpiCard label="Rejected by cafe" value={formatNumber(summary.rejectedByCafe)} />
          <KpiCard label="Expired by cafe" value={formatNumber(summary.expiredByCafe)} />
          <KpiCard label="BVC forfeited" value={formatNumber(summary.totalBvcForfeited)} />
          <KpiCard label="BVC refunded" value={formatNumber(summary.totalBvcRefunded)} />
        </div>
      )}

      <PartnerDataTable
        columns={columns}
        data={data?.data ?? []}
        emptyMessage="Không có lobby failure phù hợp."
      />

      {data?.meta && (
        <CommonPagination
          meta={data.meta}
          pageSize={pageSize}
          pageSizeOptions={[10, 20, 50, 100]}
          onPageChange={setPage}
          onLimitChange={(value) => {
            setPageSize(value);
            setPage(1);
          }}
        />
      )}
    </div>
  );
}

function DepositsTab() {
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(DEFAULT_PAGE_SIZE);
  const [fromLocal, setFromLocal] = useState('');
  const [toLocal, setToLocal] = useState('');
  const [status, setStatus] = useState<DepositReportStatus | 'all'>('all');
  const [appliedFrom, setAppliedFrom] = useState<string | undefined>();
  const [appliedTo, setAppliedTo] = useState<string | undefined>();
  const [appliedStatus, setAppliedStatus] = useState<DepositReportStatus | 'all'>('all');
  const [filterError, setFilterError] = useState<string | null>(null);

  const { data, isLoading, isError, refetch } = useAdminDepositsReport({
    page,
    pageSize,
    fromUtc: appliedFrom,
    toUtc: appliedTo,
    status: appliedStatus,
  });

  const columns = useMemo<ColumnDef<DepositReportItem>[]>(
    () => [
      {
        accessorKey: 'username',
        header: 'Người dùng',
        cell: ({ row }) => (
          <div>
            <div className="font-medium">{row.original.username || '—'}</div>
            <div className="font-mono text-[11px] text-muted-foreground">
              {row.original.userId?.slice(0, 8)}…
            </div>
          </div>
        ),
      },
      { accessorKey: 'cafeName', header: 'Cafe' },
      {
        accessorKey: 'amountBvc',
        header: 'BVC',
        cell: ({ row }) => formatNumber(row.original.amountBvc),
      },
      {
        accessorKey: 'amountVnd',
        header: 'VND',
        cell: ({ row }) => formatMoney(row.original.amountVnd),
      },
      {
        accessorKey: 'status',
        header: 'Trạng thái',
        cell: ({ row }) => <Badge variant="outline">{row.original.status}</Badge>,
      },
      {
        accessorKey: 'createdAt',
        header: 'Tạo lúc',
        cell: ({ row }) => formatDateTime(row.original.createdAt),
      },
      {
        accessorKey: 'paidAt',
        header: 'Paid lúc',
        cell: ({ row }) => formatDateTime(row.original.paidAt),
      },
    ],
    [],
  );

  const applyFilters = () => {
    const fromUtc = toUtcIso(fromLocal);
    const toUtc = toUtcIso(toLocal);
    if (fromUtc && toUtc && new Date(fromUtc).getTime() > new Date(toUtc).getTime()) {
      setFilterError('fromUtc không được lớn hơn toUtc.');
      return;
    }
    setFilterError(null);
    setAppliedFrom(fromUtc);
    setAppliedTo(toUtc);
    setAppliedStatus(status);
    setPage(1);
  };

  const resetFilters = () => {
    setFromLocal('');
    setToLocal('');
    setStatus('all');
    setAppliedFrom(undefined);
    setAppliedTo(undefined);
    setAppliedStatus('all');
    setFilterError(null);
    setPage(1);
  };

  if (isLoading) {
    return <div className="p-4 text-sm text-muted-foreground">Đang tải deposits...</div>;
  }

  if (isError) {
    return (
      <div className="p-4 text-sm text-rose-600">
        Không thể tải deposits.{' '}
        <button type="button" className="underline" onClick={() => void refetch()}>
          Thử lại
        </button>
      </div>
    );
  }

  const summary = data?.summary;

  return (
    <div className="space-y-4">
      <DateRangeFilters
        fromLocal={fromLocal}
        toLocal={toLocal}
        onFromChange={setFromLocal}
        onToChange={setToLocal}
        onApply={applyFilters}
        onReset={resetFilters}
        error={filterError}
        extra={
          <div className="space-y-1.5">
            <Label>Trạng thái</Label>
            <Select
              value={status}
              onValueChange={(value) => setStatus(value as DepositReportStatus | 'all')}
            >
              <SelectTrigger className="w-full">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {DEPOSIT_STATUS_OPTIONS.map((item) => (
                  <SelectItem key={item.value} value={item.value}>
                    {item.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        }
      />

      {summary && (
        <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
          <KpiCard label="Tổng deposits" value={formatNumber(summary.totalDeposits)} />
          <KpiCard label="Pending" value={formatNumber(summary.pendingDeposits)} />
          <KpiCard label="Paid" value={formatNumber(summary.paidDeposits)} />
          <KpiCard label="Refunded" value={formatNumber(summary.refundedDeposits)} />
          <KpiCard label="Forfeited" value={formatNumber(summary.forfeitedDeposits)} />
          <KpiCard label="Số tiền pending" value={formatMoney(summary.totalAmountPending)} />
          <KpiCard label="Số tiền paid" value={formatMoney(summary.totalAmountPaid)} />
          <KpiCard label="Số tiền forfeited" value={formatMoney(summary.totalAmountForfeited)} />
        </div>
      )}

      <PartnerDataTable
        columns={columns}
        data={data?.data ?? []}
        emptyMessage="Không có deposit phù hợp."
      />

      {data?.meta && (
        <CommonPagination
          meta={data.meta}
          pageSize={pageSize}
          pageSizeOptions={[10, 20, 50, 100]}
          onPageChange={setPage}
          onLimitChange={(value) => {
            setPageSize(value);
            setPage(1);
          }}
        />
      )}
    </div>
  );
}

function CafePerformanceTab() {
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(DEFAULT_PAGE_SIZE);
  const [fromLocal, setFromLocal] = useState('');
  const [toLocal, setToLocal] = useState('');
  const [sortBy, setSortBy] = useState<CafePerformanceSortBy>('revenue');
  const [sortOrder, setSortOrder] = useState<SortOrder>('desc');
  const [appliedFrom, setAppliedFrom] = useState<string | undefined>();
  const [appliedTo, setAppliedTo] = useState<string | undefined>();
  const [appliedSortBy, setAppliedSortBy] = useState<CafePerformanceSortBy>('revenue');
  const [appliedSortOrder, setAppliedSortOrder] = useState<SortOrder>('desc');
  const [filterError, setFilterError] = useState<string | null>(null);

  const { data, isLoading, isError, refetch } = useAdminCafePerformance({
    page,
    pageSize,
    fromUtc: appliedFrom,
    toUtc: appliedTo,
    sortBy: appliedSortBy,
    sortOrder: appliedSortOrder,
  });

  const columns = useMemo<ColumnDef<CafePerformanceItem>[]>(
    () => [
      {
        accessorKey: 'cafeName',
        header: 'Cafe',
        cell: ({ row }) => (
          <div>
            <div className="font-medium">{row.original.cafeName || '—'}</div>
            <div className="text-xs text-muted-foreground">{row.original.address || '—'}</div>
          </div>
        ),
      },
      {
        accessorKey: 'operationalStatus',
        header: 'Trạng thái',
        cell: ({ row }) => <Badge variant="outline">{row.original.operationalStatus}</Badge>,
      },
      {
        accessorKey: 'totalRevenue',
        header: 'Doanh thu',
        cell: ({ row }) => formatMoney(row.original.totalRevenue),
      },
      {
        accessorKey: 'totalSessions',
        header: 'Bookings',
        cell: ({ row }) => formatNumber(row.original.totalSessions),
      },
      {
        accessorKey: 'activeLobbies',
        header: 'Lobbies',
        cell: ({ row }) => formatNumber(row.original.activeLobbies),
      },
      {
        accessorKey: 'lobbySuccessRate',
        header: 'Completion',
        cell: ({ row }) => {
          const rate = row.original.lobbySuccessRate;
          const pct = rate <= 1 ? rate * 100 : rate;
          return `${Math.round(pct)}%`;
        },
      },
      {
        accessorKey: 'averageRating',
        header: 'Failure rate',
        cell: ({ row }) => {
          const rate = row.original.averageRating;
          const pct = rate <= 1 ? rate * 100 : rate;
          return `${Math.round(pct)}%`;
        },
      },
    ],
    [],
  );

  const applyFilters = () => {
    const fromUtc = toUtcIso(fromLocal);
    const toUtc = toUtcIso(toLocal);
    if (fromUtc && toUtc && new Date(fromUtc).getTime() > new Date(toUtc).getTime()) {
      setFilterError('fromUtc không được lớn hơn toUtc.');
      return;
    }
    setFilterError(null);
    setAppliedFrom(fromUtc);
    setAppliedTo(toUtc);
    setAppliedSortBy(sortBy);
    setAppliedSortOrder(sortOrder);
    setPage(1);
  };

  const resetFilters = () => {
    setFromLocal('');
    setToLocal('');
    setSortBy('revenue');
    setSortOrder('desc');
    setAppliedFrom(undefined);
    setAppliedTo(undefined);
    setAppliedSortBy('revenue');
    setAppliedSortOrder('desc');
    setFilterError(null);
    setPage(1);
  };

  if (isLoading) {
    return <div className="p-4 text-sm text-muted-foreground">Đang tải cafe performance...</div>;
  }

  if (isError) {
    return (
      <div className="p-4 text-sm text-rose-600">
        Không thể tải cafe performance.{' '}
        <button type="button" className="underline" onClick={() => void refetch()}>
          Thử lại
        </button>
      </div>
    );
  }

  const summary = data?.summary;

  return (
    <div className="space-y-4">
      <DateRangeFilters
        fromLocal={fromLocal}
        toLocal={toLocal}
        onFromChange={setFromLocal}
        onToChange={setToLocal}
        onApply={applyFilters}
        onReset={resetFilters}
        error={filterError}
        extra={
          <>
            <div className="space-y-1.5">
              <Label>Sắp xếp theo</Label>
              <Select
                value={sortBy}
                onValueChange={(value) => setSortBy(value as CafePerformanceSortBy)}
              >
                <SelectTrigger className="w-full">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="revenue">Doanh thu</SelectItem>
                  <SelectItem value="sessions">Sessions</SelectItem>
                  <SelectItem value="rating">Rating</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label>Thứ tự</Label>
              <Select
                value={sortOrder}
                onValueChange={(value) => setSortOrder(value as SortOrder)}
              >
                <SelectTrigger className="w-full">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="desc">Giảm dần</SelectItem>
                  <SelectItem value="asc">Tăng dần</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </>
        }
      />

      {summary && (
        <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
          <KpiCard label="Tổng cafes" value={formatNumber(summary.totalCafes)} />
          <KpiCard label="Cafes active" value={formatNumber(summary.activeCafes)} />
          <KpiCard label="Tổng doanh thu" value={formatMoney(summary.totalRevenue)} />
          <KpiCard label="Tổng bookings" value={formatNumber(summary.totalSessions)} />
          <KpiCard
            label="Completion TB"
            value={`${Math.round((summary.averageSessionRevenue <= 1 ? summary.averageSessionRevenue * 100 : summary.averageSessionRevenue))}%`}
          />
          <KpiCard
            label="Failure TB"
            value={`${Math.round((summary.averageRating <= 1 ? summary.averageRating * 100 : summary.averageRating))}%`}
          />
        </div>
      )}

      <PartnerDataTable
        columns={columns}
        data={data?.data ?? []}
        emptyMessage="Không có dữ liệu cafe performance."
      />

      {data?.meta && (
        <CommonPagination
          meta={data.meta}
          pageSize={pageSize}
          pageSizeOptions={[10, 20, 50, 100]}
          onPageChange={setPage}
          onLimitChange={(value) => {
            setPageSize(value);
            setPage(1);
          }}
        />
      )}
    </div>
  );
}

export function AdminReportsPortal() {
  const [tab, setTab] = useState('overview');

  return (
    <Tabs value={tab} onValueChange={setTab} className="w-full">
      <TabsList variant="line" className="w-full justify-start overflow-x-auto">
        <TabsTrigger value="overview">Tổng quan</TabsTrigger>
        <TabsTrigger value="lobby-failures">Lobby failures</TabsTrigger>
        <TabsTrigger value="deposits">Deposits</TabsTrigger>
        <TabsTrigger value="cafe-performance">Cafe performance</TabsTrigger>
      </TabsList>

      <TabsContent value="overview" className="mt-4">
        {tab === 'overview' ? <OverviewTab /> : null}
      </TabsContent>
      <TabsContent value="lobby-failures" className="mt-4">
        {tab === 'lobby-failures' ? <LobbyFailuresTab /> : null}
      </TabsContent>
      <TabsContent value="deposits" className="mt-4">
        {tab === 'deposits' ? <DepositsTab /> : null}
      </TabsContent>
      <TabsContent value="cafe-performance" className="mt-4">
        {tab === 'cafe-performance' ? <CafePerformanceTab /> : null}
      </TabsContent>
    </Tabs>
  );
}
