"use client";

import { useMemo, useState } from 'react';
import {
  CalendarClock,
  CircleDollarSign,
  Gamepad2,
  Loader2,
  RotateCcw,
  Search,
  TrendingUp,
  Users,
  CalendarDays,
  CheckCircle2,
  XCircle,
} from 'lucide-react';
import { PageHeader } from '@/components/common/page-header';
import { CommonPagination } from '@/components/common/pagination';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useAuthStore } from '@/features/auth/store/auth.store';
import { formatCurrencyVnd } from '@/features/staff-cafe/utils/inventory.mapper';
import type { CafeShift } from '@/features/cafe-shift/types/cafe-shift.interface';
import {
  useCurrentShift,
  useOperatingCafe,
  useShiftHistory,
} from '@/features/cafe-shift/hooks/useCafeShift';

const DEFAULT_PAGE_SIZE = 10;

function formatDateTime(value?: string | null): string {
  if (!value) return '—';
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? value : date.toLocaleString('vi-VN');
}

function formatDate(value?: string | null): string {
  if (!value) return '—';
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? value : date.toLocaleDateString('vi-VN', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
  });
}

function formatTime(value?: string | null): string {
  if (!value) return '—';
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? value : date.toLocaleTimeString('vi-VN', {
    hour: '2-digit',
    minute: '2-digit',
  });
}

function ShiftStatusBadge({ status }: { status: CafeShift['status'] }) {
  if (status === 'Open') {
    return (
      <Badge className="gap-1 bg-emerald-500/20 text-emerald-700 hover:bg-emerald-500/30">
        <CheckCircle2 className="size-3" />
        Đang mở
      </Badge>
    );
  }
  return (
    <Badge variant="secondary" className="gap-1">
      <XCircle className="size-3" />
      Đã đóng
    </Badge>
  );
}

function StatCard({
  label,
  value,
  icon: Icon,
  tone = 'default',
}: {
  label: string;
  value: string;
  icon: typeof CalendarDays;
  tone?: 'default' | 'success' | 'warning';
}) {
  const toneClasses = {
    default: 'bg-violet-500/10 text-violet-700',
    success: 'bg-emerald-500/10 text-emerald-700',
    warning: 'bg-amber-500/10 text-amber-700',
  };

  return (
    <Card className="overflow-hidden">
      <CardContent className="flex items-center gap-3 p-4">
        <div className={`flex size-10 shrink-0 items-center justify-center rounded-lg ${toneClasses[tone]}`}>
          <Icon className="size-5" />
        </div>
        <div className="min-w-0 flex-1">
          <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
            {label}
          </p>
          <p className="truncate font-mono text-lg font-bold">{value}</p>
        </div>
      </CardContent>
    </Card>
  );
}

function ShiftHistoryTable({
  shifts,
  isLoading,
  page,
  pageSize,
  totalCount,
  totalPages,
  onPageChange,
  onLimitChange,
}: {
  shifts: CafeShift[];
  isLoading: boolean;
  page: number;
  pageSize: number;
  totalCount: number;
  totalPages: number;
  onPageChange: (page: number) => void;
  onLimitChange: (size: number) => void;
}) {
  const authUser = useAuthStore((s) => s.user);

  const getUserLabel = (username?: string, userId?: string) => {
    if (username && !/^[0-9a-fA-F-]{36}$/.test(username)) {
      return username;
    }
    if (userId && authUser?.id === userId && authUser.username) {
      return authUser.username;
    }
    if (userId) {
      return userId;
    }
    return '—';
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="size-6 animate-spin text-muted-foreground" />
        <span className="ml-2 text-muted-foreground">Đang tải lịch sử ca...</span>
      </div>
    );
  }

  if (shifts.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-12 text-center">
        <CalendarDays className="size-12 text-muted-foreground/50" />
        <p className="mt-3 font-medium">Chưa có ca nào</p>
        <p className="text-sm text-muted-foreground">
          Lịch sử ca sẽ hiển thị tại đây khi bạn bắt đầu làm việc.
        </p>
      </div>
    );
  }

  return (
    <>
      <Table>
        <TableHeader>
          <TableRow className="hover:bg-transparent">
            <TableHead className="w-[120px]">Ngày mở</TableHead>
            <TableHead>Giờ mở</TableHead>
            <TableHead>Giờ đóng</TableHead>
            <TableHead>Người mở</TableHead>
            <TableHead>Người đóng</TableHead>
            <TableHead className="text-right">Đầu ca</TableHead>
            <TableHead className="text-right">Cuối ca</TableHead>
            <TableHead className="text-right">Doanh thu</TableHead>
            <TableHead className="text-center">Phiên</TableHead>
            <TableHead>Trạng thái</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {shifts.map((shift) => (
            <TableRow key={shift.id}>
              <TableCell className="font-medium">{formatDate(shift.openedAt)}</TableCell>
              <TableCell className="font-mono text-sm">{formatTime(shift.openedAt)}</TableCell>
              <TableCell className="font-mono text-sm">{formatTime(shift.closedAt)}</TableCell>
              <TableCell>
                <span className="inline-flex items-center gap-1">
                  <Users className="size-3 text-muted-foreground" />
                  {getUserLabel(shift.openedByUsername, shift.openedByUserId)}
                </span>
              </TableCell>
              <TableCell>
                <span className="inline-flex items-center gap-1">
                  <Users className="size-3 text-muted-foreground" />
                  {getUserLabel(shift.closedByUsername, shift.closedByUserId)}
                </span>
              </TableCell>
              <TableCell className="text-right font-mono">
                {formatCurrencyVnd(shift.openingCashBalance ?? 0)}
              </TableCell>
              <TableCell className="text-right font-mono">
                {shift.closingCashBalance == null
                  ? '—'
                  : formatCurrencyVnd(shift.closingCashBalance)}
              </TableCell>
              <TableCell className="text-right font-mono font-medium text-emerald-600">
                {formatCurrencyVnd(shift.totalRevenue ?? 0)}
              </TableCell>
              <TableCell className="text-center">
                <span className="inline-flex items-center gap-1 font-mono">
                  <Gamepad2 className="size-3 text-muted-foreground" />
                  {shift.totalSessions ?? 0}
                </span>
              </TableCell>
              <TableCell>
                <ShiftStatusBadge status={shift.status} />
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
      {totalCount > 0 && (
        <div className="mt-4">
          <CommonPagination
            meta={{
              currentPage: page,
              limit: pageSize,
              totalItems: totalCount,
              totalPages: totalPages,
              hasPrevious: page > 1,
              hasNext: page < totalPages,
            }}
            pageSize={pageSize}
            pageSizeOptions={[10, 20, 50]}
            onPageChange={onPageChange}
            onLimitChange={onLimitChange}
          />
        </div>
      )}
    </>
  );
}

function toLocalDateInput(value?: string | null): string {
  if (!value) return '';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return '';
  const offset = date.getTimezoneOffset();
  const local = new Date(date.getTime() - offset * 60 * 1000);
  return local.toISOString().slice(0, 10);
}

export default function StaffCalendarPage() {
  const { data: cafe, isLoading: cafeLoading, isError: cafeError } = useOperatingCafe();
  const cafeId = cafe?.id;

  // Filter states
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(DEFAULT_PAGE_SIZE);
  const [fromLocal, setFromLocal] = useState('');
  const [toLocal, setToLocal] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [activeTab, setActiveTab] = useState('history');

  // API queries
  const current = useCurrentShift(cafeId);
  const history = useShiftHistory(cafeId, page, pageSize);

  // Calculate stats from history
  const stats = useMemo(() => {
    const shifts = history.data?.items ?? [];
    const closedShifts = shifts.filter((s) => s.status === 'Closed');

    const totalRevenue = closedShifts.reduce((sum, s) => sum + (s.totalRevenue ?? 0), 0);
    const totalSessions = closedShifts.reduce((sum, s) => sum + (s.totalSessions ?? 0), 0);
    const openShifts = shifts.filter((s) => s.status === 'Open').length;

    return {
      totalShifts: shifts.length,
      closedShifts: closedShifts.length,
      openShifts,
      totalRevenue,
      totalSessions,
      averageRevenue: closedShifts.length > 0 ? totalRevenue / closedShifts.length : 0,
    };
  }, [history.data?.items]);

  const handlePageChange = (newPage: number) => {
    setPage(newPage);
  };

  const handleLimitChange = (newSize: number) => {
    setPageSize(newSize);
    setPage(1);
  };

  const clearFilters = () => {
    setFromLocal('');
    setToLocal('');
    setStatusFilter('all');
    setPage(1);
  };

  const hasActiveFilters = fromLocal || toLocal || statusFilter !== 'all';

  if (cafeLoading) {
    return (
      <div className="flex flex-col gap-4 sm:gap-6">
        <PageHeader
          title="Lịch làm việc"
          description="Xem lịch sử ca và thống kê làm việc."
        />
        <div className="flex items-center justify-center py-16">
          <Loader2 className="size-8 animate-spin text-muted-foreground" />
        </div>
      </div>
    );
  }

  if (cafeError || !cafeId) {
    return (
      <div className="flex flex-col gap-4 sm:gap-6">
        <PageHeader
          title="Lịch làm việc"
          description="Xem lịch sử ca và thống kê làm việc."
        />
        <Card className="border-destructive/50 bg-destructive/5">
          <CardContent className="flex items-center gap-3 py-6">
            <XCircle className="size-6 text-destructive" />
            <div>
              <p className="font-medium text-destructive">Không thể tải thông tin quán</p>
              <p className="text-sm text-muted-foreground">
                Vui lòng kiểm tra kết nối hoặc đăng nhập lại.
              </p>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  const openShift = current.data;

  return (
    <div className="flex flex-col gap-4 sm:gap-6">
      <PageHeader
        title="Lịch làm việc"
        description={
          cafe
            ? `${cafe.name}${cafe.address ? ` · ${cafe.address}` : ''} — xem lịch sử ca và thống kê.`
            : 'Xem lịch sử ca và thống kê làm việc.'
        }
      />

      {/* Quick Stats */}
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard
          label="Tổng ca"
          value={stats.totalShifts.toString()}
          icon={CalendarDays}
        />
        <StatCard
          label="Ca đã đóng"
          value={stats.closedShifts.toString()}
          icon={CheckCircle2}
          tone="success"
        />
        <StatCard
          label="Tổng doanh thu"
          value={formatCurrencyVnd(stats.totalRevenue)}
          icon={CircleDollarSign}
          tone="success"
        />
        <StatCard
          label="Tổng phiên"
          value={stats.totalSessions.toString()}
          icon={Gamepad2}
        />
      </div>

      {/* Current Shift Status */}
      <Card className="overflow-hidden border-2 border-violet-200 bg-gradient-to-br from-violet-50/50 to-purple-50/50">
        <CardHeader className="border-b border-violet-100 bg-violet-100/30 pb-3">
          <div className="flex items-center justify-between">
            <CardTitle className="flex items-center gap-2 text-base font-bold uppercase tracking-wide">
              <CalendarClock className="size-5 text-violet-600" />
              Ca hiện tại
            </CardTitle>
            {current.isLoading ? (
              <Loader2 className="size-4 animate-spin text-muted-foreground" />
            ) : (
              openShift ? (
                <ShiftStatusBadge status={openShift.status} />
              ) : (
                <Badge variant="outline" className="gap-1">
                  <XCircle className="size-3" />
                  Chưa mở ca
                </Badge>
              )
            )}
          </div>
        </CardHeader>
        <CardContent className="p-4">
          {current.isLoading ? (
            <div className="flex items-center gap-2 text-muted-foreground">
              <Loader2 className="size-4 animate-spin" />
              Đang tải...
            </div>
          ) : openShift ? (
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
              <div>
                <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
                  Bắt đầu lúc
                </p>
                <p className="mt-1 font-mono text-lg font-bold">
                  {formatDateTime(openShift.openedAt)}
                </p>
              </div>
              <div>
                <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
                  Người mở ca
                </p>
                <p className="mt-1 font-medium">{openShift.openedByUsername || '—'}</p>
              </div>
              <div>
                <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
                  Tiền đầu ca
                </p>
                <p className="mt-1 font-mono text-lg font-bold">
                  {formatCurrencyVnd(openShift.openingCashBalance ?? 0)}
                </p>
              </div>
              <div>
                <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
                  Doanh thu tạm tính
                </p>
                <p className="mt-1 font-mono text-lg font-bold text-emerald-600">
                  {formatCurrencyVnd(openShift.totalRevenue ?? 0)}
                </p>
              </div>
            </div>
          ) : (
            <div className="flex items-center gap-3 text-muted-foreground">
              <CalendarDays className="size-8 text-violet-300" />
              <div>
                <p className="font-medium">Chưa mở ca hôm nay</p>
                <p className="text-sm">Mở ca tại trang Báo cáo ca để bắt đầu.</p>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Tabs: History & Stats */}
      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="grid w-full grid-cols-2 sm:w-[300px]">
          <TabsTrigger value="history" className="gap-2">
            <RotateCcw className="size-4" />
            Lịch sử ca
          </TabsTrigger>
          <TabsTrigger value="stats" className="gap-2">
            <TrendingUp className="size-4" />
            Thống kê
          </TabsTrigger>
        </TabsList>

        <TabsContent value="history" className="mt-4 space-y-4">
          {/* Filters */}
          <Card className="overflow-hidden">
            <CardContent className="flex flex-wrap items-end gap-3 p-4">
              <div className="space-y-1.5">
                <Label htmlFor="from-date">Từ ngày</Label>
                <Input
                  id="from-date"
                  type="date"
                  value={fromLocal}
                  onChange={(e) => setFromLocal(e.target.value)}
                  className="w-auto"
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="to-date">Đến ngày</Label>
                <Input
                  id="to-date"
                  type="date"
                  value={toLocal}
                  onChange={(e) => setToLocal(e.target.value)}
                  className="w-auto"
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="status-filter">Trạng thái</Label>
                <Select value={statusFilter} onValueChange={setStatusFilter}>
                  <SelectTrigger id="status-filter" className="w-[140px]">
                    <SelectValue placeholder="Trạng thái" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Tất cả</SelectItem>
                    <SelectItem value="Open">Đang mở</SelectItem>
                    <SelectItem value="Closed">Đã đóng</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="flex items-center gap-2">
                <Button
                  type="button"
                  variant="outline"
                  onClick={clearFilters}
                  disabled={!hasActiveFilters}
                  className="gap-1.5"
                >
                  <RotateCcw className="size-4" />
                  Xóa lọc
                </Button>
              </div>
            </CardContent>
          </Card>

          {/* History Table */}
          <Card>
            <CardHeader className="border-b py-3">
              <CardTitle className="text-sm font-medium">
                Danh sách ca — {history.data?.totalCount ?? 0} ca
              </CardTitle>
            </CardHeader>
            <CardContent className="p-0">
              <ShiftHistoryTable
                shifts={history.data?.items ?? []}
                isLoading={history.isLoading}
                page={page}
                pageSize={pageSize}
                totalCount={history.data?.totalCount ?? 0}
                totalPages={history.data?.totalPages ?? 1}
                onPageChange={handlePageChange}
                onLimitChange={handleLimitChange}
              />
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="stats" className="mt-4 space-y-4">
          {/* Stats Summary Card */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-base">
                <TrendingUp className="size-5 text-violet-600" />
                Thống kê tổng hợp
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
                <div className="space-y-4 rounded-lg border p-4">
                  <h4 className="font-medium uppercase tracking-wide text-muted-foreground">
                    Ca làm việc
                  </h4>
                  <div className="space-y-3">
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Tổng số ca</span>
                      <span className="font-bold">{stats.totalShifts}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Ca đã đóng</span>
                      <span className="font-bold text-emerald-600">{stats.closedShifts}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Ca đang mở</span>
                      <span className="font-bold text-amber-600">{stats.openShifts}</span>
                    </div>
                  </div>
                </div>

                <div className="space-y-4 rounded-lg border p-4">
                  <h4 className="font-medium uppercase tracking-wide text-muted-foreground">
                    Doanh thu
                  </h4>
                  <div className="space-y-3">
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Tổng doanh thu</span>
                      <span className="font-bold text-emerald-600">
                        {formatCurrencyVnd(stats.totalRevenue)}
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">TB / ca đóng</span>
                      <span className="font-bold">
                        {formatCurrencyVnd(stats.averageRevenue)}
                      </span>
                    </div>
                  </div>
                </div>

                <div className="space-y-4 rounded-lg border p-4">
                  <h4 className="font-medium uppercase tracking-wide text-muted-foreground">
                    Phiên chơi
                  </h4>
                  <div className="space-y-3">
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Tổng phiên</span>
                      <span className="font-bold">{stats.totalSessions}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">TB / ca đóng</span>
                      <span className="font-bold">
                        {stats.closedShifts > 0
                          ? (stats.totalSessions / stats.closedShifts).toFixed(1)
                          : '0'}
                      </span>
                    </div>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Tips Card */}
          <Card className="border-dashed">
            <CardContent className="flex items-start gap-3 p-4">
              <Search className="mt-0.5 size-5 shrink-0 text-violet-500" />
              <div>
                <p className="font-medium">Mẹo sử dụng</p>
                <ul className="mt-2 space-y-1 text-sm text-muted-foreground">
                  <li>• Sử dụng bộ lọc ngày để xem ca trong khoảng thời gian cụ thể.</li>
                  <li>• Lọc theo trạng thái để xem ca đang mở hoặc đã đóng.</li>
                  <li>• Chuyển sang tab &quot;Lịch sử ca&quot; để xem chi tiết từng ca.</li>
                </ul>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
