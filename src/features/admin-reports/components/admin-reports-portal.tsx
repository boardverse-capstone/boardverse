'use client';

import { useId, useMemo, useState, type ReactNode } from 'react';
import { ColumnDef } from '@tanstack/react-table';
import {
  Activity,
  AlertCircle,
  Banknote,
  Building2,
  CalendarClock,
  CheckCircle2,
  CircleDollarSign,
  Clock3,
  Coffee,
  Filter,
  Gamepad2,
  ReceiptText,
  RotateCcw,
  Search,
  ShieldAlert,
  Star,
  Trophy,
  UserCheck,
  Users,
  WalletCards,
  XCircle,
  type LucideIcon,
} from 'lucide-react';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Skeleton } from '@/components/ui/skeleton';
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
  { value: 'TimeoutFailed', label: 'Hết thời gian' },
  { value: 'HostCancelled', label: 'Host đã hủy' },
  { value: 'RejectedByCafe', label: 'Cafe từ chối' },
  { value: 'ExpiredByCafe', label: 'Cafe quá hạn' },
];

const DEPOSIT_STATUS_OPTIONS: { value: DepositReportStatus | 'all'; label: string }[] = [
  { value: 'all', label: 'Tất cả' },
  { value: 'Pending', label: 'Chờ xử lý' },
  { value: 'Paid', label: 'Đã thanh toán' },
  { value: 'Refunded', label: 'Đã hoàn tiền' },
  { value: 'Forfeited', label: 'Đã tịch thu' },
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

type MetricTone = 'default' | 'success' | 'warning' | 'danger';

const METRIC_TONES: Record<MetricTone, string> = {
  default: 'bg-primary/10 text-primary',
  success: 'bg-emerald-500/10 text-emerald-700 dark:text-emerald-400',
  warning: 'bg-amber-500/10 text-amber-700 dark:text-amber-400',
  danger: 'bg-destructive/10 text-destructive',
};

function KpiCard({
  label,
  value,
  icon: Icon,
  description,
  tone = 'default',
}: {
  label: string;
  value: string;
  icon?: LucideIcon;
  description?: string;
  tone?: MetricTone;
}) {
  return (
    <Card size="sm" className="h-full transition-shadow hover:shadow-md">
      <CardHeader className="grid grid-cols-[1fr_auto] items-start gap-3 pb-0">
        <div className="space-y-1">
          <CardTitle className="text-xs font-semibold tracking-wide text-muted-foreground uppercase">
            {label}
          </CardTitle>
          {description ? <CardDescription className="text-xs">{description}</CardDescription> : null}
        </div>
        {Icon ? (
          <span className={`flex size-9 items-center justify-center rounded-lg ${METRIC_TONES[tone]}`}>
            <Icon className="size-4" aria-hidden="true" />
          </span>
        ) : null}
      </CardHeader>
      <CardContent className="pt-1">
        <p className="text-2xl font-bold tracking-tight tabular-nums">{value}</p>
      </CardContent>
    </Card>
  );
}

function MetricSection({
  title,
  description,
  icon: Icon,
  children,
}: {
  title: string;
  description: string;
  icon: LucideIcon;
  children: ReactNode;
}) {
  const headingId = useId();

  return (
    <section className="space-y-3" aria-labelledby={headingId}>
      <div className="flex items-start gap-3">
        <span className="flex size-9 shrink-0 items-center justify-center rounded-lg bg-muted">
          <Icon className="size-4 text-muted-foreground" aria-hidden="true" />
        </span>
        <div>
          <h3 id={headingId} className="font-semibold">
            {title}
          </h3>
          <p className="text-sm text-muted-foreground">{description}</p>
        </div>
      </div>
      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">{children}</div>
    </section>
  );
}

function ReportLoadingState({ label = 'Đang tải báo cáo' }: { label?: string }) {
  return (
    <div className="space-y-5" role="status" aria-label={label} aria-busy="true">
      <Skeleton className="h-32 w-full rounded-xl" />
      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        {Array.from({ length: 4 }).map((_, index) => (
          <Skeleton key={index} className="h-28 rounded-xl" />
        ))}
      </div>
      <Skeleton className="h-64 w-full rounded-xl" />
      <span className="sr-only">{label}</span>
    </div>
  );
}

function ReportErrorState({
  title,
  onRetry,
}: {
  title: string;
  onRetry: () => void;
}) {
  return (
    <Alert variant="destructive">
      <AlertCircle aria-hidden="true" />
      <AlertTitle>{title}</AlertTitle>
      <AlertDescription className="flex flex-wrap items-center gap-3">
        <span>Dữ liệu có thể chưa được cập nhật. Vui lòng thử lại.</span>
        <Button type="button" variant="outline" size="sm" onClick={onRetry}>
          <RotateCcw className="size-3.5" aria-hidden="true" />
          Thử lại
        </Button>
      </AlertDescription>
    </Alert>
  );
}

function ReportEmptyState({
  title,
  description,
}: {
  title: string;
  description: string;
}) {
  return (
    <Card className="border-dashed py-10 text-center shadow-none">
      <CardContent className="mx-auto flex max-w-md flex-col items-center gap-3">
        <span className="flex size-12 items-center justify-center rounded-full bg-muted">
          <Search className="size-5 text-muted-foreground" aria-hidden="true" />
        </span>
        <div>
          <p className="font-semibold">{title}</p>
          <p className="mt-1 text-sm text-muted-foreground">{description}</p>
        </div>
      </CardContent>
    </Card>
  );
}

function formatRate(value: number) {
  const percentage = value <= 1 ? value * 100 : value;
  return `${percentage.toLocaleString('vi-VN', { maximumFractionDigits: 1 })}%`;
}

function formatRating(value: number) {
  return `${value.toLocaleString('vi-VN', {
    minimumFractionDigits: 1,
    maximumFractionDigits: 1,
  })} / 5`;
}

function StatusBadge({ status, kind }: { status: string; kind: 'deposit' | 'failure' | 'cafe' }) {
  const normalized = status.toLowerCase();
  const labels: Record<string, string> = {
    pending: 'Chờ xử lý',
    paid: 'Đã thanh toán',
    refunded: 'Đã hoàn tiền',
    forfeited: 'Đã tịch thu',
    timeoutfailed: 'Hết thời gian',
    hostcancelled: 'Host đã hủy',
    rejectedbycafe: 'Cafe từ chối',
    expiredbycafe: 'Cafe quá hạn',
    active: 'Đang hoạt động',
    inactive: 'Ngừng hoạt động',
    suspended: 'Tạm ngưng',
  };
  const className =
    normalized === 'paid' || normalized === 'active'
      ? 'border-emerald-200 bg-emerald-50 text-emerald-700 dark:border-emerald-900 dark:bg-emerald-950 dark:text-emerald-300'
      : normalized === 'pending'
        ? 'border-amber-200 bg-amber-50 text-amber-700 dark:border-amber-900 dark:bg-amber-950 dark:text-amber-300'
        : normalized === 'refunded'
          ? 'border-sky-200 bg-sky-50 text-sky-700 dark:border-sky-900 dark:bg-sky-950 dark:text-sky-300'
          : kind === 'failure' || normalized === 'forfeited' || normalized === 'suspended'
            ? 'border-rose-200 bg-rose-50 text-rose-700 dark:border-rose-900 dark:bg-rose-950 dark:text-rose-300'
            : 'bg-muted text-muted-foreground';

  return (
    <Badge variant="outline" className={className}>
      {labels[normalized] ?? status}
    </Badge>
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
  const id = useId();

  return (
    <Card size="sm" className="bg-muted/20 shadow-none">
      <CardHeader className="border-b">
        <div className="flex items-start gap-3">
          <span className="flex size-9 items-center justify-center rounded-lg bg-background ring-1 ring-foreground/10">
            <Filter className="size-4 text-muted-foreground" aria-hidden="true" />
          </span>
          <div>
            <CardTitle>Bộ lọc báo cáo</CardTitle>
            <CardDescription>Chọn khoảng thời gian và điều kiện để thu hẹp dữ liệu.</CardDescription>
          </div>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
          <div className="space-y-1.5">
            <Label htmlFor={`${id}-from`}>Từ ngày</Label>
            <Input
              id={`${id}-from`}
              type="datetime-local"
              value={fromLocal}
              onChange={(e) => onFromChange(e.target.value)}
            />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor={`${id}-to`}>Đến ngày</Label>
            <Input
              id={`${id}-to`}
              type="datetime-local"
              value={toLocal}
              onChange={(e) => onToChange(e.target.value)}
            />
          </div>
          {extra}
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <Button type="button" onClick={onApply}>
            <Search className="size-4" aria-hidden="true" />
            Áp dụng
          </Button>
          <Button type="button" variant="outline" onClick={onReset}>
            <RotateCcw className="size-4" aria-hidden="true" />
            Xóa lọc
          </Button>
          {error ? (
            <p className="text-sm font-medium text-destructive" role="alert">
              {error}
            </p>
          ) : null}
        </div>
      </CardContent>
    </Card>
  );
}

function OverviewTab() {
  const { data, isLoading, isError, refetch } = useAdminReportsOverview();

  if (isLoading) {
    return <ReportLoadingState label="Đang tải tổng quan" />;
  }

  if (isError || !data) {
    return (
      <ReportErrorState title="Không thể tải báo cáo tổng quan" onRetry={() => void refetch()} />
    );
  }

  return (
    <div className="space-y-8">
      <MetricSection
        title="Cộng đồng & đối tác"
        description="Quy mô và mức độ hoạt động của người dùng, cafe trên nền tảng."
        icon={Users}
      >
        <KpiCard label="Tổng người dùng" value={formatNumber(data.totalUsers)} icon={Users} />
        <KpiCard
          label="Người dùng hoạt động"
          value={formatNumber(data.activeUsers)}
          icon={UserCheck}
          tone="success"
        />
        <KpiCard label="Tổng cafe" value={formatNumber(data.totalCafes)} icon={Coffee} />
        <KpiCard
          label="Cafe hoạt động"
          value={formatNumber(data.activeCafes)}
          icon={Building2}
          tone="success"
        />
      </MetricSection>

      <MetricSection
        title="Giải đấu & đặt chỗ"
        description="Tình hình vận hành giải đấu và hành trình đặt chỗ."
        icon={Trophy}
      >
        <KpiCard
          label="Tổng giải đấu"
          value={formatNumber(data.totalTournaments)}
          icon={Trophy}
        />
        <KpiCard
          label="Đang mở đăng ký"
          value={formatNumber(data.registrationOpenTournaments)}
          icon={CalendarClock}
          tone="success"
        />
        <KpiCard
          label="Tổng đặt chỗ"
          value={formatNumber(data.totalBookings)}
          icon={ReceiptText}
        />
        <KpiCard
          label="Đặt chỗ chờ xử lý"
          value={formatNumber(data.pendingBookings)}
          icon={Clock3}
          tone="warning"
        />
      </MetricSection>

      <MetricSection
        title="Sức khỏe lobby"
        description="Theo dõi lobby đang vận hành và các nguyên nhân gián đoạn."
        icon={Gamepad2}
      >
        <KpiCard label="Tổng lobby" value={formatNumber(data.totalLobbies)} icon={Gamepad2} />
        <KpiCard
          label="Lobby hoạt động"
          value={formatNumber(data.activeLobbies)}
          icon={CheckCircle2}
          tone="success"
        />
        <KpiCard
          label="Lobby thất bại"
          value={formatNumber(data.totalLobbyFailures)}
          icon={ShieldAlert}
          tone="danger"
        />
        <KpiCard
          label="Hết thời gian / Host hủy"
          value={`${formatNumber(data.timeoutFailures)} / ${formatNumber(data.hostCancelledFailures)}`}
          icon={XCircle}
          tone="warning"
        />
      </MetricSection>

      <MetricSection
        title="Tài chính"
        description="Tiền cọc và doanh thu ghi nhận trên toàn hệ thống."
        icon={CircleDollarSign}
      >
        <KpiCard
          label="Tổng tiền cọc"
          value={formatNumber(data.totalDeposits)}
          icon={WalletCards}
        />
        <KpiCard
          label="Tiền cọc chờ xử lý"
          value={formatNumber(data.pendingDeposits)}
          icon={Clock3}
          tone="warning"
        />
        <KpiCard
          label="Giá trị tiền cọc"
          value={formatMoney(data.totalDepositsAmountVnd)}
          icon={Banknote}
        />
        <KpiCard
          label="Tổng doanh thu"
          value={formatMoney(data.totalRevenue)}
          icon={CircleDollarSign}
          tone="success"
        />
      </MetricSection>

      <Card>
        <CardHeader className="border-b">
          <div className="flex items-start gap-3">
            <span className="flex size-9 items-center justify-center rounded-lg bg-primary/10 text-primary">
              <Activity className="size-4" aria-hidden="true" />
            </span>
            <div>
              <CardTitle>Hoạt động gần đây</CardTitle>
              <CardDescription>Các thay đổi mới nhất được ghi nhận trên hệ thống.</CardDescription>
            </div>
          </div>
        </CardHeader>
        <CardContent>
        {(data.recentActivity ?? []).length === 0 ? (
          <div className="py-8 text-center">
            <Activity className="mx-auto size-8 text-muted-foreground/50" aria-hidden="true" />
            <p className="mt-3 font-medium">Chưa có hoạt động gần đây</p>
            <p className="text-sm text-muted-foreground">Hoạt động mới sẽ xuất hiện tại đây.</p>
          </div>
        ) : (
          <ul className="relative divide-y">
            {data.recentActivity.map((item, index) => (
              <li
                key={`${item.type}-${item.timestamp}-${index}`}
                className="grid gap-2 py-4 first:pt-0 last:pb-0 sm:grid-cols-[1fr_auto]"
              >
                <div className="flex min-w-0 gap-3">
                  <span className="mt-1.5 size-2 shrink-0 rounded-full bg-primary" aria-hidden="true" />
                  <div className="min-w-0">
                    <Badge variant="secondary">{item.type}</Badge>
                    <p className="mt-2 text-sm leading-relaxed">{item.details}</p>
                  </div>
                </div>
                <time
                  dateTime={item.timestamp}
                  className="pl-5 text-xs whitespace-nowrap text-muted-foreground sm:pl-0"
                >
                  {formatDateTime(item.timestamp)}
                </time>
              </li>
            ))}
          </ul>
        )}
        </CardContent>
      </Card>
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
        cell: ({ row }) => (
          <StatusBadge status={row.original.failureType} kind="failure" />
        ),
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
      setFilterError('Thời điểm bắt đầu không được sau thời điểm kết thúc.');
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
    return <ReportLoadingState label="Đang tải báo cáo lobby thất bại" />;
  }

  if (isError) {
    return (
      <ReportErrorState
        title="Không thể tải báo cáo lobby thất bại"
        onRetry={() => void refetch()}
      />
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
            <Label htmlFor="lobby-failure-type">Loại lỗi</Label>
            <Select
              value={failureType}
              onValueChange={(value) => setFailureType(value as LobbyFailureType | 'all')}
            >
              <SelectTrigger id="lobby-failure-type" className="w-full">
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
          <KpiCard
            label="Tổng thất bại"
            value={formatNumber(summary.totalFailures)}
            icon={ShieldAlert}
            tone="danger"
          />
          <KpiCard
            label="Hết thời gian"
            value={formatNumber(summary.timeoutFailures)}
            icon={Clock3}
            tone="warning"
          />
          <KpiCard
            label="Host đã hủy"
            value={formatNumber(summary.hostCancelled)}
            icon={XCircle}
            tone="danger"
          />
          <KpiCard
            label="Cafe từ chối"
            value={formatNumber(summary.rejectedByCafe)}
            icon={Coffee}
            tone="warning"
          />
          <KpiCard
            label="Cafe quá hạn"
            value={formatNumber(summary.expiredByCafe)}
            icon={CalendarClock}
            tone="warning"
          />
          <KpiCard
            label="BVC bị tịch thu"
            value={formatNumber(summary.totalBvcForfeited)}
            icon={WalletCards}
            tone="danger"
          />
          <KpiCard
            label="BVC đã hoàn"
            value={formatNumber(summary.totalBvcRefunded)}
            icon={RotateCcw}
            tone="success"
          />
        </div>
      )}

      <div className="space-y-3">
        <div>
          <h3 className="font-semibold">Chi tiết lobby thất bại</h3>
          <p className="text-sm text-muted-foreground">
            Danh sách lobby phù hợp với bộ lọc hiện tại.
          </p>
        </div>
        {(data?.data ?? []).length === 0 ? (
          <ReportEmptyState
            title="Không tìm thấy lobby thất bại"
            description="Hãy thay đổi khoảng thời gian, loại lỗi hoặc xóa bộ lọc."
          />
        ) : (
          <PartnerDataTable columns={columns} data={data?.data ?? []} />
        )}
      </div>

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
        cell: ({ row }) => <StatusBadge status={row.original.status} kind="deposit" />,
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
      setFilterError('Thời điểm bắt đầu không được sau thời điểm kết thúc.');
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
    return <ReportLoadingState label="Đang tải báo cáo tiền cọc" />;
  }

  if (isError) {
    return (
      <ReportErrorState title="Không thể tải báo cáo tiền cọc" onRetry={() => void refetch()} />
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
            <Label htmlFor="deposit-status">Trạng thái</Label>
            <Select
              value={status}
              onValueChange={(value) => setStatus(value as DepositReportStatus | 'all')}
            >
              <SelectTrigger id="deposit-status" className="w-full">
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
          <KpiCard label="Tổng tiền cọc" value={formatNumber(summary.totalDeposits)} icon={WalletCards} />
          <KpiCard
            label="Chờ xử lý"
            value={formatNumber(summary.pendingDeposits)}
            icon={Clock3}
            tone="warning"
          />
          <KpiCard
            label="Đã thanh toán"
            value={formatNumber(summary.paidDeposits)}
            icon={CheckCircle2}
            tone="success"
          />
          <KpiCard
            label="Đã hoàn tiền"
            value={formatNumber(summary.refundedDeposits)}
            icon={RotateCcw}
          />
          <KpiCard
            label="Đã tịch thu"
            value={formatNumber(summary.forfeitedDeposits)}
            icon={ShieldAlert}
            tone="danger"
          />
          <KpiCard
            label="Giá trị chờ xử lý"
            value={formatMoney(summary.totalAmountPending)}
            icon={Clock3}
            tone="warning"
          />
          <KpiCard
            label="Giá trị đã thanh toán"
            value={formatMoney(summary.totalAmountPaid)}
            icon={Banknote}
            tone="success"
          />
          <KpiCard
            label="Giá trị đã hoàn"
            value={formatMoney(summary.totalAmountRefunded)}
            icon={RotateCcw}
          />
          <KpiCard
            label="Giá trị bị tịch thu"
            value={formatMoney(summary.totalAmountForfeited)}
            icon={ShieldAlert}
            tone="danger"
          />
        </div>
      )}

      <div className="space-y-3">
        <div>
          <h3 className="font-semibold">Chi tiết tiền cọc</h3>
          <p className="text-sm text-muted-foreground">
            Theo dõi số tiền và trạng thái của từng giao dịch.
          </p>
        </div>
        {(data?.data ?? []).length === 0 ? (
          <ReportEmptyState
            title="Không tìm thấy giao dịch tiền cọc"
            description="Hãy thay đổi khoảng thời gian, trạng thái hoặc xóa bộ lọc."
          />
        ) : (
          <PartnerDataTable columns={columns} data={data?.data ?? []} />
        )}
      </div>

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
        cell: ({ row }) => (
          <StatusBadge status={row.original.operationalStatus} kind="cafe" />
        ),
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
        header: 'Tỷ lệ hoàn thành',
        cell: ({ row }) => (
          <span className="font-medium tabular-nums">{formatRate(row.original.lobbySuccessRate)}</span>
        ),
      },
      {
        accessorKey: 'averageRating',
        header: 'Đánh giá',
        cell: ({ row }) => (
          <span className="inline-flex items-center gap-1 font-medium tabular-nums">
            <Star className="size-3.5 fill-amber-400 text-amber-400" aria-hidden="true" />
            {formatRating(row.original.averageRating)}
          </span>
        ),
      },
    ],
    [],
  );

  const applyFilters = () => {
    const fromUtc = toUtcIso(fromLocal);
    const toUtc = toUtcIso(toLocal);
    if (fromUtc && toUtc && new Date(fromUtc).getTime() > new Date(toUtc).getTime()) {
      setFilterError('Thời điểm bắt đầu không được sau thời điểm kết thúc.');
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
    return <ReportLoadingState label="Đang tải hiệu suất cafe" />;
  }

  if (isError) {
    return (
      <ReportErrorState title="Không thể tải hiệu suất cafe" onRetry={() => void refetch()} />
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
              <Label htmlFor="cafe-sort-by">Sắp xếp theo</Label>
              <Select
                value={sortBy}
                onValueChange={(value) => setSortBy(value as CafePerformanceSortBy)}
              >
                <SelectTrigger id="cafe-sort-by" className="w-full">
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
              <Label htmlFor="cafe-sort-order">Thứ tự</Label>
              <Select
                value={sortOrder}
                onValueChange={(value) => setSortOrder(value as SortOrder)}
              >
                <SelectTrigger id="cafe-sort-order" className="w-full">
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
          <KpiCard label="Tổng cafe" value={formatNumber(summary.totalCafes)} icon={Coffee} />
          <KpiCard
            label="Cafe hoạt động"
            value={formatNumber(summary.activeCafes)}
            icon={Building2}
            tone="success"
          />
          <KpiCard
            label="Tổng doanh thu"
            value={formatMoney(summary.totalRevenue)}
            icon={CircleDollarSign}
            tone="success"
          />
          <KpiCard
            label="Tổng phiên chơi"
            value={formatNumber(summary.totalSessions)}
            icon={Gamepad2}
          />
          <KpiCard
            label="Doanh thu / phiên"
            value={formatMoney(summary.averageSessionRevenue)}
            icon={Banknote}
            description="Doanh thu trung bình mỗi phiên"
          />
          <KpiCard
            label="Đánh giá trung bình"
            value={formatRating(summary.averageRating)}
            icon={Star}
            description="Điểm đánh giá trên thang 5"
            tone="warning"
          />
        </div>
      )}

      <div className="space-y-3">
        <div>
          <h3 className="font-semibold">Xếp hạng hiệu suất cafe</h3>
          <p className="text-sm text-muted-foreground">
            So sánh doanh thu, phiên chơi, tỷ lệ hoàn thành và đánh giá.
          </p>
        </div>
        {(data?.data ?? []).length === 0 ? (
          <ReportEmptyState
            title="Không có dữ liệu hiệu suất cafe"
            description="Hãy thay đổi khoảng thời gian, cách sắp xếp hoặc xóa bộ lọc."
          />
        ) : (
          <PartnerDataTable columns={columns} data={data?.data ?? []} />
        )}
      </div>

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
    <Tabs value={tab} onValueChange={setTab} className="w-full space-y-5">
      <Card className="bg-gradient-to-br from-primary/10 via-background to-background">
        <CardHeader>
          <div className="flex flex-col justify-between gap-4 lg:flex-row lg:items-end">
            <div className="max-w-2xl">
              <Badge variant="secondary" className="mb-3">
                <Activity aria-hidden="true" />
                Trung tâm báo cáo
              </Badge>
              <CardTitle className="text-2xl font-bold tracking-tight sm:text-3xl">
                Hiệu suất BoardVerse
              </CardTitle>
              <CardDescription className="mt-2 text-sm sm:text-base">
                Theo dõi vận hành, giao dịch và sức khỏe hệ thống trong một giao diện thống nhất.
              </CardDescription>
            </div>
            <p className="flex items-center gap-2 text-xs text-muted-foreground">
              <CheckCircle2 className="size-4 text-emerald-600" aria-hidden="true" />
              Dữ liệu cập nhật từ hệ thống báo cáo
            </p>
          </div>
        </CardHeader>
      </Card>

      <TabsList
        variant="line"
        className="h-auto w-full justify-start gap-1 overflow-x-auto rounded-none border-b bg-transparent p-0"
        aria-label="Nhóm báo cáo quản trị"
      >
        <TabsTrigger value="overview" className="min-h-11">
          <Activity aria-hidden="true" />
          Tổng quan
        </TabsTrigger>
        <TabsTrigger value="lobby-failures" className="min-h-11">
          <ShieldAlert aria-hidden="true" />
          Lobby thất bại
        </TabsTrigger>
        <TabsTrigger value="deposits" className="min-h-11">
          <WalletCards aria-hidden="true" />
          Tiền cọc
        </TabsTrigger>
        <TabsTrigger value="cafe-performance" className="min-h-11">
          <Coffee aria-hidden="true" />
          Hiệu suất cafe
        </TabsTrigger>
      </TabsList>

      <TabsContent value="overview">
        {tab === 'overview' ? <OverviewTab /> : null}
      </TabsContent>
      <TabsContent value="lobby-failures">
        {tab === 'lobby-failures' ? <LobbyFailuresTab /> : null}
      </TabsContent>
      <TabsContent value="deposits">
        {tab === 'deposits' ? <DepositsTab /> : null}
      </TabsContent>
      <TabsContent value="cafe-performance">
        {tab === 'cafe-performance' ? <CafePerformanceTab /> : null}
      </TabsContent>
    </Tabs>
  );
}
