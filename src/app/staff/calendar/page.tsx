"use client";

import { useMemo, useState } from 'react';
import {
  CalendarDays,
  CheckCircle2,
  CircleDollarSign,
  Gamepad2,
  Loader2,
  RotateCcw,
  Search,
  TrendingUp,
  Users,
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

// ─── SHARED GAME STYLES ─────────────────────────────────────────────────────
// Palette: CAM ĐẬM cho tiêu đề/CTA, VÀNG NHẠT cho nền body, TRUNG TÍNH cho border/chữ
const A = {
  border: 'border-2 border-amber-500',                                          // viền trung tính (vàng cam đậm vừa)
  headerBg: 'bg-gradient-to-r from-orange-500 via-orange-600 to-amber-600 shadow-[inset_0_-2px_0_rgba(154,52,18,0.5)]', // header card: cam đậm
  cardBg: 'bg-gradient-to-br from-amber-50 via-yellow-50 to-orange-50',         // body card: vàng nhạt
  text: 'text-orange-900',                                                      // chữ tiêu đề đậm cam
  icon: 'bg-orange-600',                                                        // pulse dot cam đậm
  glow: 'rgba(234,88,12,0.25)',                                                 // shadow glow cam
  textMuted: 'text-orange-700',                                                 // label phụ cam trung bình
  textLight: 'text-amber-700',                                                  // chữ phụ vàng
  textNeutral: 'text-stone-700',                                                // trung tính cho nội dung data
  textBody: 'text-stone-900',                                                   // nội dung chính (đen/nâu)
  scanlines: 'bg-[repeating-linear-gradient(0deg,transparent_0,transparent_3px,rgba(234,88,12,0.05)_3px,rgba(234,88,12,0.05)_4px)]',
} as const;

function Scanlines() {
  return (
    <div className="pointer-events-none absolute inset-0 bg-[repeating-linear-gradient(0deg,transparent_0,transparent_3px,rgba(234,88,12,0.04)_3px,rgba(234,88,12,0.04)_4px)]" />
  );
}

function PulseDot({ className }: { className?: string }) {
  return <span className={`pointer-events-none absolute right-3 top-3 size-2 animate-pulse rounded-full ${A.icon} shadow-[0_0_8px_currentColor] ${className ?? ''}`} />;
}

// ─── BADGE ────────────────────────────────────────────────────────────────

function ShiftStatusBadge({ status }: { status: CafeShift['status'] }) {
  if (status === 'Open') {
    return (
      <Badge className="border-2 border-emerald-500 bg-emerald-100 font-mono text-[10px] font-extrabold uppercase tracking-widest text-emerald-800 shadow-[inset_0_-1px_0_rgba(0,0,0,0.08)]">
        <span className="mr-1 size-1.5 animate-pulse rounded-full bg-emerald-500 shadow-[0_0_4px_currentColor]" />
        ► Đang mở
      </Badge>
    );
  }
  return (
    <Badge className="border-2 border-amber-400 bg-amber-50 font-mono text-[10px] font-extrabold uppercase tracking-widest text-amber-800 shadow-[inset_0_-1px_0_rgba(0,0,0,0.08)]">
      <span className="mr-1 size-1.5 rounded-full bg-amber-500" />
      Đã đóng
    </Badge>
  );
}

// ─── STAT CARD (HUD mini-panel) ─────────────────────────────────────────

function HudStatCard({
  label,
  value,
}: {
  label: string;
  value: string;
}) {
  return (
    <div className={`relative overflow-hidden rounded-md border-2 border-amber-400 ${A.cardBg} p-2.5 shadow-[3px_3px_0_var(--glow)]`} style={{ ['--glow' as string]: A.glow }}>
      <div className={A.scanlines} />
      <p className="relative font-mono text-[10px] font-bold uppercase tracking-widest text-orange-600">▸ {label}</p>
      <p className="relative mt-0.5 truncate font-mono text-lg font-extrabold uppercase tracking-wide text-stone-900 [text-shadow:1px_1px_0_rgba(255,255,255,0.7)]">{value}</p>
    </div>
  );
}

// ─── GAME CARD WRAPPER ───────────────────────────────────────────────────

function GameCard({
  title,
  children,
  className = '',
}: {
  title: string;
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <div className={`relative overflow-hidden rounded-lg ${A.border} ${A.cardBg} shadow-[3px_3px_0_var(--glow)] ${className}`} style={{ ['--glow' as string]: A.glow }}>
      <Scanlines />
      <PulseDot />
      <div className="m-2 flex items-center justify-between overflow-hidden rounded-md border-2 border-orange-600 bg-gradient-to-r from-orange-500 via-orange-600 to-amber-600 px-4 py-2 shadow-[inset_0_-2px_0_rgba(154,52,18,0.5)]">
        <h3 className="font-mono text-sm font-extrabold uppercase tracking-widest text-white">
          <span className="mr-2 inline-block size-2 animate-pulse rounded-full bg-white/70 shadow-[0_0_6px_rgba(255,255,255,0.6)]" />
          ► {title}
        </h3>
      </div>
      <div className="relative px-4 pb-4">{children}</div>
    </div>
  );
}

// ─── TABLE ───────────────────────────────────────────────────────────────

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
    if (username && !/^[0-9a-fA-F-]{36}$/.test(username)) return username;
    if (userId && authUser?.id === userId && authUser.username) return authUser.username;
    if (userId) return userId;
    return '—';
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="size-6 animate-spin text-orange-500" />
        <span className="ml-2 font-mono text-xs font-bold uppercase tracking-widest text-orange-600">► Đang tải lịch sử...</span>
      </div>
    );
  }

  if (shifts.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-12 text-center">
        <CalendarDays className="size-12 text-orange-300" />
        <p className="mt-3 font-mono text-sm font-extrabold uppercase tracking-widest text-orange-600">▸ Chưa có ca nào</p>
        <p className="mt-1 font-mono text-xs text-orange-400">Lịch sử ca sẽ hiển thị tại đây khi bạn bắt đầu làm việc.</p>
      </div>
    );
  }

  return (
    <>
      <Table>
        <TableHeader>
          <TableRow className="border-b-2 border-amber-500 bg-gradient-to-r from-orange-600 via-orange-700 to-amber-700 hover:from-orange-600 hover:via-orange-700 hover:to-amber-700">
            <TableHead className="font-mono text-[11px] font-extrabold uppercase tracking-widest text-white [text-shadow:1px_1px_0_rgba(0,0,0,0.4)]">Ngày mở</TableHead>
            <TableHead className="font-mono text-[11px] font-extrabold uppercase tracking-widest text-white [text-shadow:1px_1px_0_rgba(0,0,0,0.4)]">Giờ mở</TableHead>
            <TableHead className="font-mono text-[11px] font-extrabold uppercase tracking-widest text-white [text-shadow:1px_1px_0_rgba(0,0,0,0.4)]">Giờ đóng</TableHead>
            <TableHead className="font-mono text-[11px] font-extrabold uppercase tracking-widest text-white [text-shadow:1px_1px_0_rgba(0,0,0,0.4)]">Người mở</TableHead>
            <TableHead className="font-mono text-[11px] font-extrabold uppercase tracking-widest text-white [text-shadow:1px_1px_0_rgba(0,0,0,0.4)]">Người đóng</TableHead>
            <TableHead className="font-mono text-[11px] font-extrabold uppercase tracking-widest text-white text-right [text-shadow:1px_1px_0_rgba(0,0,0,0.4)]">Đầu ca</TableHead>
            <TableHead className="font-mono text-[11px] font-extrabold uppercase tracking-widest text-white text-right [text-shadow:1px_1px_0_rgba(0,0,0,0.4)]">Cuối ca</TableHead>
            <TableHead className="font-mono text-[11px] font-extrabold uppercase tracking-widest text-white text-right [text-shadow:1px_1px_0_rgba(0,0,0,0.4)]">Doanh thu</TableHead>
            <TableHead className="font-mono text-[11px] font-extrabold uppercase tracking-widest text-white text-center [text-shadow:1px_1px_0_rgba(0,0,0,0.4)]">Phiên</TableHead>
            <TableHead className="font-mono text-[11px] font-extrabold uppercase tracking-widest text-white [text-shadow:1px_1px_0_rgba(0,0,0,0.4)]">Trạng thái</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {shifts.map((shift) => (
            <TableRow
              key={shift.id}
              className="border-b border-amber-200 bg-gradient-to-r from-white via-yellow-50 to-amber-50 transition-all hover:from-amber-100/70 hover:via-yellow-50/60 hover:to-amber-100/40 hover:shadow-[inset_0_-2px_0_rgba(234,88,12,0.5)]"
            >
              <TableCell className="font-mono text-[11px] font-bold uppercase tracking-wide text-stone-900">{formatDate(shift.openedAt)}</TableCell>
              <TableCell className="font-mono text-[11px] font-bold uppercase tracking-wide text-stone-900">{formatTime(shift.openedAt)}</TableCell>
              <TableCell className="font-mono text-[11px] font-bold uppercase tracking-wide text-stone-900">{formatTime(shift.closedAt)}</TableCell>
              <TableCell className="font-mono text-[11px] font-bold uppercase tracking-wide text-stone-900">
                <span className="inline-flex items-center gap-1">
                  <Users className="size-3 text-amber-600" />
                  {getUserLabel(shift.openedByUsername, shift.openedByUserId)}
                </span>
              </TableCell>
              <TableCell className="font-mono text-[11px] font-bold uppercase tracking-wide text-stone-900">
                <span className="inline-flex items-center gap-1">
                  <Users className="size-3 text-amber-600" />
                  {getUserLabel(shift.closedByUsername, shift.closedByUserId)}
                </span>
              </TableCell>
              <TableCell className="font-mono text-[11px] font-extrabold text-right text-stone-800 [text-shadow:1px_1px_0_rgba(255,255,255,0.5)]">
                {formatCurrencyVnd(shift.openingCashBalance ?? 0)}
              </TableCell>
              <TableCell className="font-mono text-[11px] font-extrabold text-right text-stone-800 [text-shadow:1px_1px_0_rgba(255,255,255,0.5)]">
                {shift.closingCashBalance == null ? '—' : formatCurrencyVnd(shift.closingCashBalance)}
              </TableCell>
              <TableCell className="font-mono text-[11px] font-extrabold text-right text-amber-700 [text-shadow:1px_1px_0_rgba(255,255,255,0.5)]">
                {formatCurrencyVnd(shift.totalRevenue ?? 0)}
              </TableCell>
              <TableCell className="text-center">
                <span className="inline-flex items-center gap-1 font-mono text-[11px] font-extrabold text-stone-800">
                  <Gamepad2 className="size-3 text-amber-600" />
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

// ─── MAIN PAGE ───────────────────────────────────────────────────────────

export default function StaffCalendarPage() {
  const { data: cafe, isLoading: cafeLoading, isError: cafeError } = useOperatingCafe();
  const cafeId = cafe?.id;

  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(DEFAULT_PAGE_SIZE);
  const [fromLocal, setFromLocal] = useState('');
  const [toLocal, setToLocal] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [activeTab, setActiveTab] = useState('history');

  const current = useCurrentShift(cafeId);
  const history = useShiftHistory(cafeId, page, pageSize);

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

  const handlePageChange = (newPage: number) => setPage(newPage);
  const handleLimitChange = (newSize: number) => { setPageSize(newSize); setPage(1); };
  const clearFilters = () => { setFromLocal(''); setToLocal(''); setStatusFilter('all'); setPage(1); };
  const hasActiveFilters = fromLocal || toLocal || statusFilter !== 'all';

  if (cafeLoading) {
    return (
      <div className="flex flex-col gap-4 sm:gap-6">
        <PageHeader title="Lịch làm việc" description="Xem lịch sử ca và thống kê làm việc." />
        <div className="flex items-center justify-center py-16">
          <Loader2 className="size-8 animate-spin text-orange-500" />
          <span className="ml-3 font-mono text-sm font-bold uppercase tracking-widest text-orange-600">► Đang tải...</span>
        </div>
      </div>
    );
  }

  if (cafeError || !cafeId) {
    return (
      <div className="flex flex-col gap-4 sm:gap-6">
        <PageHeader title="Lịch làm việc" description="Xem lịch sử ca và thống kê làm việc." />
        <Card className={`relative overflow-hidden ${A.border} ${A.cardBg} border-destructive shadow-[3px_3px_0_rgba(239,68,68,0.3)]`} style={{ ['--glow' as string]: 'rgba(239,68,68,0.3)' }}>
          <Scanlines />
          <CardContent className="relative flex items-center gap-3 py-6">
            <XCircle className="size-6 text-red-500" />
            <div>
              <p className="font-mono text-sm font-extrabold uppercase tracking-widest text-red-600">▸ Không thể tải thông tin quán</p>
              <p className="mt-1 font-mono text-xs text-red-400">Vui lòng kiểm tra kết nối hoặc đăng nhập lại.</p>
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

      {/* Quick Stats — 4 HUD panels */}
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <HudStatCard label="Tổng ca" value={stats.totalShifts.toString()} />
        <HudStatCard label="Ca đã đóng" value={stats.closedShifts.toString()} />
        <HudStatCard label="Tổng doanh thu" value={formatCurrencyVnd(stats.totalRevenue)} />
        <HudStatCard label="Tổng phiên" value={stats.totalSessions.toString()} />
      </div>

      {/* Current Shift Status — full game card */}
      <GameCard title={`Ca hiện tại — ${cafe.name}`}>
        <div className="space-y-4">
          {current.isLoading ? (
            <div className="flex items-center gap-2">
              <Loader2 className="size-4 animate-spin text-orange-500" />
              <span className="font-mono text-xs font-bold uppercase tracking-widest text-orange-600">► Đang tải ca hiện tại...</span>
            </div>
          ) : openShift ? (
            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
              {[
                { label: 'Bắt đầu lúc', value: formatDateTime(openShift.openedAt) },
                { label: 'Người mở ca', value: openShift.openedByUsername || '—' },
                { label: 'Tiền đầu ca', value: formatCurrencyVnd(openShift.openingCashBalance ?? 0) },
                { label: 'Doanh thu tạm', value: formatCurrencyVnd(openShift.totalRevenue ?? 0) },
              ].map((s) => (
                <div key={s.label} className={`relative overflow-hidden rounded-md border-2 ${A.border} ${A.cardBg} p-2.5 shadow-[2px_2px_0_var(--glow)]`} style={{ ['--glow' as string]: A.glow }}>
                  <div className={A.scanlines} />
                  <p className={`relative font-mono text-[10px] font-bold uppercase tracking-widest ${A.textMuted}`}>▸ {s.label}</p>
                  <p className={`relative mt-0.5 truncate font-mono text-sm font-extrabold uppercase tracking-wide ${A.text} [text-shadow:1px_1px_0_rgba(255,255,255,0.6)]`}>{s.value}</p>
                </div>
              ))}
            </div>
          ) : (
            <div className="flex items-center gap-3 rounded-md border-2 border-dashed border-orange-300 bg-orange-50/30 p-4">
              <CalendarDays className="size-8 text-orange-300" />
              <div>
                <p className="font-mono text-sm font-extrabold uppercase tracking-widest text-orange-700">▸ Chưa mở ca hôm nay</p>
                <p className="mt-0.5 font-mono text-xs text-orange-400">Mở ca tại trang Báo cáo ca để bắt đầu.</p>
              </div>
            </div>
          )}
          {/* Status badge always visible */}
          <div className="flex items-center justify-end">
            {openShift ? (
              <ShiftStatusBadge status={openShift.status} />
            ) : (
              <Badge className="border-2 border-stone-400 bg-stone-100 font-mono text-[10px] font-extrabold uppercase tracking-widest text-stone-700 shadow-[inset_0_-1px_0_rgba(0,0,0,0.08)]">
                <span className="mr-1 size-1.5 rounded-full bg-stone-400" />
                Chưa mở ca
              </Badge>
            )}
          </div>
        </div>
      </GameCard>

      {/* Tabs: History & Stats — GAME STYLE */}
      <div className={`relative overflow-hidden rounded-lg border-2 ${A.border} ${A.cardBg} shadow-[3px_3px_0_var(--glow)]`} style={{ ['--glow' as string]: A.glow }}>
        <Scanlines />
        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <div className={`relative border-b-2 border-amber-500 ${A.headerBg}`}>
            <TabsList className="h-auto w-full justify-start gap-0 overflow-x-auto rounded-none bg-transparent p-0 shadow-none sm:w-auto">
              {[
                { value: 'history', label: '► Lịch sử ca', icon: RotateCcw },
                { value: 'stats', label: '► Thống kê', icon: TrendingUp },
              ].map(({ value, label, icon: Icon }) => (
                <TabsTrigger
                  key={value}
                  value={value}
                  className={`
                    relative flex items-center gap-2 px-5 py-3 -mb-1
                    font-mono text-[12px] font-extrabold uppercase tracking-widest
                    transition-all duration-200
                    border-b-4 border-transparent
                    text-white/55 hover:text-white hover:bg-white/10
                    data-[state=active]:text-orange-900
                    data-[state=active]:bg-gradient-to-b data-[state=active]:from-white data-[state=active]:to-amber-50
                    data-[state=active]:border-orange-600
                    data-[state=active]:shadow-[0_-2px_0_rgba(255,255,255,0.6),inset_0_-4px_0_rgba(255,255,255,0.5)]
                    data-[state=active]:-translate-y-0.5
                  `}
                >
                  <Icon className={`size-4 ${activeTab === value ? 'text-orange-700' : ''}`} />
                  {label}
                  {activeTab === value && (
                    <span className="absolute -bottom-2 left-1/2 -translate-x-1/2 text-orange-600 leading-none drop-shadow-[0_-1px_0_rgba(255,255,255,0.8)]">
                      ▲
                    </span>
                  )}
                </TabsTrigger>
              ))}
            </TabsList>
          </div>

          <TabsContent value="history" className="mt-0 p-4 space-y-4">
            {/* Filters */}
            <Card className={`relative overflow-hidden ${A.border} ${A.cardBg} shadow-[2px_2px_0_var(--glow)]`} style={{ ['--glow' as string]: A.glow }}>
              <Scanlines />
              <CardContent className="relative flex flex-wrap items-end gap-3 p-4">
                <div className="space-y-1.5">
                  <Label htmlFor="from-date" className="font-mono text-[10px] font-extrabold uppercase tracking-widest text-orange-600">▸ Từ ngày</Label>
                  <Input
                    id="from-date"
                    type="date"
                    value={fromLocal}
                    onChange={(e) => setFromLocal(e.target.value)}
                    className="w-auto border-2 border-amber-400 bg-white font-mono text-xs font-bold text-stone-900 focus-visible:border-orange-600 focus-visible:ring-orange-500/30"
                  />
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="to-date" className="font-mono text-[10px] font-extrabold uppercase tracking-widest text-orange-600">▸ Đến ngày</Label>
                  <Input
                    id="to-date"
                    type="date"
                    value={toLocal}
                    onChange={(e) => setToLocal(e.target.value)}
                    className="w-auto border-2 border-amber-400 bg-white font-mono text-xs font-bold text-stone-900 focus-visible:border-orange-600 focus-visible:ring-orange-500/30"
                  />
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="status-filter" className="font-mono text-[10px] font-extrabold uppercase tracking-widest text-orange-600">▸ Trạng thái</Label>
                  <Select value={statusFilter} onValueChange={setStatusFilter}>
                    <SelectTrigger id="status-filter" className="w-[140px] border-2 border-amber-400 bg-white font-mono text-xs font-bold text-stone-900 focus-visible:border-orange-600">
                      <SelectValue placeholder="Trạng thái" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all" className="font-mono text-xs font-bold">Tất cả</SelectItem>
                      <SelectItem value="Open" className="font-mono text-xs font-bold">Đang mở</SelectItem>
                      <SelectItem value="Closed" className="font-mono text-xs font-bold">Đã đóng</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="flex items-center gap-2">
                  <Button
                    type="button"
                    variant="outline"
                    onClick={clearFilters}
                    disabled={!hasActiveFilters}
                    className="border-2 border-orange-600 bg-gradient-to-b from-orange-500 to-orange-600 font-mono text-[10px] font-extrabold uppercase tracking-widest text-white shadow-[2px_2px_0_rgba(154,52,18,0.5)] transition-all hover:from-orange-600 hover:to-orange-700 active:shadow-none disabled:opacity-40 disabled:from-stone-300 disabled:to-stone-400 disabled:border-stone-400"
                  >
                    <RotateCcw className="size-3" />
                    ► Xóa lọc
                  </Button>
                </div>
              </CardContent>
            </Card>

            {/* History Table Card */}
            <div className={`relative overflow-hidden rounded-lg ${A.border} ${A.cardBg} shadow-[3px_3px_0_var(--glow)]`} style={{ ['--glow' as string]: A.glow }}>
              <Scanlines />
              <PulseDot />
              <div className="m-2 flex items-center justify-between overflow-hidden rounded-md border-2 border-orange-600 bg-gradient-to-r from-orange-500 via-orange-600 to-amber-600 px-4 py-2 shadow-[inset_0_-2px_0_rgba(154,52,18,0.5)]">
                <h3 className="font-mono text-sm font-extrabold uppercase tracking-widest text-white">
                  <span className="mr-2 inline-block size-2 animate-pulse rounded-full bg-white/70 shadow-[0_0_6px_rgba(255,255,255,0.6)]" />
                  ► Danh sách ca — {history.data?.totalCount ?? 0} ca
                </h3>
              </div>
              <div className="relative px-4 pb-4 p-0">
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
              </div>
            </div>
          </TabsContent>

          <TabsContent value="stats" className="mt-0 p-4 space-y-4">
            {/* Stats Summary */}
            <GameCard title="Thống kê tổng hợp">
              <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                {[
                  { label: 'Ca làm việc', rows: [
                    { k: 'Tổng số ca', v: stats.totalShifts.toString(), c: A.text },
                    { k: 'Ca đã đóng', v: stats.closedShifts.toString(), c: 'text-emerald-700' },
                    { k: 'Ca đang mở', v: stats.openShifts.toString(), c: 'text-amber-700' },
                  ]},
                  { label: 'Doanh thu', rows: [
                    { k: 'Tổng doanh thu', v: formatCurrencyVnd(stats.totalRevenue), c: 'text-amber-700' },
                    { k: 'TB / ca đóng', v: formatCurrencyVnd(stats.averageRevenue), c: A.text },
                  ]},
                  { label: 'Phiên chơi', rows: [
                    { k: 'Tổng phiên', v: stats.totalSessions.toString(), c: A.text },
                    { k: 'TB / ca đóng', v: stats.closedShifts > 0 ? (stats.totalSessions / stats.closedShifts).toFixed(1) : '0', c: A.text },
                  ]},
                ].map(({ label: section, rows }) => (
                  <div key={section} className={`relative overflow-hidden rounded-md border-2 ${A.border} ${A.cardBg} p-3 shadow-[2px_2px_0_var(--glow)]`} style={{ ['--glow' as string]: A.glow }}>
                    <div className={A.scanlines} />
                <p className={`relative font-mono text-[11px] font-extrabold uppercase tracking-widest ${A.text} mb-2`}>▸ {section}</p>
                    {rows.map(({ k, v, c }) => (
                      <div key={k} className="flex items-center justify-between border-b-2 border-dashed border-amber-200 py-1.5 last:border-b-0">
                        <span className="font-mono text-[10px] font-bold uppercase tracking-widest text-amber-600">▸ {k}</span>
                        <span className={`font-mono text-xs font-extrabold uppercase ${c} [text-shadow:1px_1px_0_rgba(255,255,255,0.5)]`}>{v}</span>
                      </div>
                    ))}
                  </div>
                ))}
              </div>
            </GameCard>

            {/* Tips */}
            <Card className={`relative overflow-hidden border-2 border-dashed border-orange-300 ${A.cardBg}`}>
              <Scanlines />
              <CardContent className="relative flex items-start gap-3 p-4">
                <Search className="mt-0.5 size-5 shrink-0 text-orange-500" />
                <div>
                  <p className="font-mono text-xs font-extrabold uppercase tracking-widest text-orange-800">▸ Mẹo sử dụng</p>
                  <ul className="mt-2 space-y-1">
                    {[
                      'Sử dụng bộ lọc ngày để xem ca trong khoảng thời gian cụ thể.',
                      'Lọc theo trạng thái để xem ca đang mở hoặc đã đóng.',
                      'Chuyển sang tab "Lịch sử ca" để xem chi tiết từng ca.',
                    ].map((tip) => (
                      <li key={tip} className="font-mono text-[11px] text-orange-600">
                        ▸ {tip}
                      </li>
                    ))}
                  </ul>
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}
