'use client';

import { useState } from 'react';
import { PageHeader } from '@/components/common/page-header';
import { CommonPagination } from '@/components/common/pagination';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { toast } from 'sonner';
import { useAuthStore } from '@/features/auth/store/auth.store';
import { formatCurrencyVnd } from '@/features/staff-cafe/utils/inventory.mapper';
import type { CafeShift } from '../types/cafe-shift.interface';
import {
  useCloseShift,
  useCurrentShift,
  useOpenShift,
  useOperatingCafe,
  useShiftHistory,
} from '../hooks/useCafeShift';

// ─── SHARED GAME STYLES ─────────────────────────────────────────────────────
// Palette: CAM ĐẬM cho tiêu đề/CTA, VÀNG NHẠT cho nền body, TRUNG TÍNH cho border/chữ
const A = {
  border: 'border-2 border-amber-500',
  headerBg: 'bg-gradient-to-r from-orange-500 via-orange-600 to-amber-600 shadow-[inset_0_-2px_0_rgba(154,52,18,0.5)]',
  cardBg: 'bg-gradient-to-br from-amber-50 via-yellow-50 to-orange-50',
  glow: 'rgba(234,88,12,0.25)',
  textMuted: 'text-orange-600',
  textBody: 'text-stone-900',
  textNeutral: 'text-stone-700',
  scanlines: 'bg-[repeating-linear-gradient(0deg,transparent_0,transparent_3px,rgba(234,88,12,0.05)_3px,rgba(234,88,12,0.05)_4px)]',
} as const;

function Scanlines() {
  return (
    <div className="pointer-events-none absolute inset-0 bg-[repeating-linear-gradient(0deg,transparent_0,transparent_3px,rgba(234,88,12,0.05)_3px,rgba(234,88,12,0.05)_4px)]" />
  );
}

function PulseDot() {
  return (
    <span className="pointer-events-none absolute right-3 top-3 size-2 animate-pulse rounded-full bg-orange-600 shadow-[0_0_8px_currentColor]" />
  );
}

function GameCard({
  title,
  children,
  rightSlot,
}: {
  title: string;
  children: React.ReactNode;
  rightSlot?: React.ReactNode;
}) {
  return (
    <div
      className={`relative overflow-hidden rounded-lg ${A.border} ${A.cardBg} shadow-[3px_3px_0_var(--glow)]`}
      style={{ ['--glow' as string]: A.glow }}
    >
      <Scanlines />
      <PulseDot />
      <div className="m-2 flex items-center justify-between overflow-hidden rounded-md border-2 border-orange-600 bg-gradient-to-r from-orange-500 via-orange-600 to-amber-600 px-4 py-2 shadow-[inset_0_-2px_0_rgba(154,52,18,0.5)]">
        <h3 className="font-mono text-sm font-extrabold uppercase tracking-widest text-white">
          <span className="mr-2 inline-block size-2 animate-pulse rounded-full bg-white/70 shadow-[0_0_6px_rgba(255,255,255,0.6)]" />
          ► {title}
        </h3>
        {rightSlot}
      </div>
      <div className="relative px-4 pb-4">{children}</div>
    </div>
  );
}

function ShiftStatusBadge({ status }: { status: CafeShift['status'] }) {
  if (status === 'Open') {
    return (
      <Badge className="border-2 border-orange-500 bg-orange-100 font-mono text-[10px] font-extrabold uppercase tracking-widest text-orange-800 shadow-[inset_0_-1px_0_rgba(0,0,0,0.08)]">
        <span className="mr-1 size-1.5 animate-pulse rounded-full bg-orange-500 shadow-[0_0_4px_currentColor]" />
        Đang mở
      </Badge>
    );
  }
  return (
    <Badge className="border-2 border-amber-400 bg-amber-50 font-mono text-[10px] font-extrabold uppercase tracking-widest text-amber-800">
      Đã đóng
    </Badge>
  );
}

function formatDateTime(value?: string | null): string {
  if (!value) return '—';
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? value : date.toLocaleString('vi-VN');
}

function parseCash(raw: string): number | null {
  const normalized = raw.replace(/\s/g, '').replace(/\./g, '').replace(',', '.');
  if (!normalized) return null;
  const n = Number(normalized);
  if (!Number.isFinite(n) || n < 0) return null;
  return n;
}

export function ShiftWorkspace() {
  const { data: cafe, isLoading: cafeLoading, isError: cafeError } = useOperatingCafe();
  const cafeId = cafe?.id;
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);
  const [openingCash, setOpeningCash] = useState('0');
  const [closingCash, setClosingCash] = useState('');

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

  const current = useCurrentShift(cafeId);
  const history = useShiftHistory(cafeId, page, pageSize);
  const openShift = useOpenShift(cafeId);
  const closeShift = useCloseShift();

  const open = current.data;

  const handleOpen = () => {
    const amount = parseCash(openingCash);
    if (amount == null) {
      toast.error('Nhập số tiền mặt đầu ca ≥ 0.');
      return;
    }
    openShift.mutate(amount);
  };

  const handleClose = () => {
    if (!open?.id) return;
    const amount = parseCash(closingCash);
    if (amount == null) {
      toast.error('Nhập số tiền mặt cuối ca ≥ 0.');
      return;
    }
    closeShift.mutate({ shiftId: open.id, closingCashBalance: amount });
  };

  return (
    <div className="space-y-4 md:space-y-6">
      <PageHeader
        title="Báo cáo ca"
        description={
          cafe
            ? `${cafe.name}${cafe.address ? ` · ${cafe.address}` : ''} — mở/đóng ca và đối soát tiền mặt.`
            : 'Mở ca, đóng ca và xem lịch sử ca làm việc.'
        }
      />

      {cafeLoading ? (
        <p className="font-mono text-sm font-bold uppercase tracking-widest text-orange-600">► Đang tải quán...</p>
      ) : cafeError || !cafeId ? (
        <p className="font-mono text-sm font-bold uppercase tracking-widest text-stone-600">▸ Không lấy được quán đang làm việc.</p>
      ) : (
        <>
          <GameCard
            title="Ca hiện tại"
            rightSlot={
              open ? (
                <ShiftStatusBadge status={open.status} />
              ) : (
                <Badge className="border-2 border-stone-400 bg-stone-100 font-mono text-[10px] font-extrabold uppercase tracking-widest text-stone-700 shadow-[inset_0_-1px_0_rgba(0,0,0,0.08)]">
                  <span className="mr-1 size-1.5 rounded-full bg-stone-400" />
                  Chưa mở ca
                </Badge>
              )
            }
          >
            <div className="space-y-4 pt-2">
              {current.isLoading ? (
                <p className="font-mono text-xs font-bold uppercase tracking-widest text-orange-600">► Đang tải ca...</p>
              ) : current.isError ? (
                <p className="font-mono text-sm font-bold uppercase tracking-widest text-stone-600">▸ Không tải được ca hiện tại.</p>
              ) : open ? (
                <>
                  <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
                    {[
                      { label: 'Mở lúc', value: formatDateTime(open.openedAt) },
                      { label: 'Người mở', value: open.openedByUsername || '—' },
                      { label: 'Tiền đầu ca', value: formatCurrencyVnd(open.openingCashBalance ?? 0) },
                      { label: 'Doanh thu / phiên', value: `${formatCurrencyVnd(open.totalRevenue ?? 0)} · ${open.totalSessions ?? 0} phiên` },
                    ].map((s) => (
                      <div
                        key={s.label}
                        className="relative overflow-hidden rounded-md border-2 border-amber-400 bg-gradient-to-br from-white via-yellow-50 to-amber-50 p-2.5 shadow-[inset_0_-1px_0_rgba(234,88,12,0.2)]"
                      >
                        <p className="font-mono text-[10px] font-bold uppercase tracking-widest text-orange-600">▸ {s.label}</p>
                        <p className="mt-0.5 truncate font-mono text-sm font-extrabold uppercase tracking-wide text-stone-900 [text-shadow:1px_1px_0_rgba(255,255,255,0.7)]">
                          {s.value}
                        </p>
                      </div>
                    ))}
                  </div>
                  <div className="flex flex-col gap-2 sm:flex-row sm:items-end">
                    <div className="flex-1 space-y-1.5 sm:max-w-xs">
                      <Label htmlFor="closing-cash" className="font-mono text-[10px] font-extrabold uppercase tracking-widest text-orange-600">► Tiền mặt cuối ca (đ)</Label>
                      <Input
                        id="closing-cash"
                        inputMode="numeric"
                        value={closingCash}
                        onChange={(e) => setClosingCash(e.target.value)}
                        placeholder="850000"
                        className="border-2 border-amber-400 bg-white font-mono font-bold text-stone-900 placeholder:text-amber-400 focus-visible:border-orange-600 focus-visible:ring-orange-500/30"
                      />
                    </div>
                    <Button
                      onClick={handleClose}
                      disabled={closeShift.isPending || parseCash(closingCash) == null}
                      className="border-2 border-orange-700 bg-gradient-to-b from-orange-500 to-orange-600 font-mono text-xs font-extrabold uppercase tracking-widest text-white shadow-[2px_2px_0_rgba(154,52,18,0.6)] transition-all hover:from-orange-600 hover:to-orange-700 hover:shadow-[1px_1px_0_rgba(154,52,18,0.6)] active:shadow-none"
                    >
                      {closeShift.isPending ? '► Đang đóng...' : '► Đóng ca'}
                    </Button>
                  </div>
                </>
              ) : (
                <div className="flex flex-col gap-2 sm:flex-row sm:items-end">
                  <div className="flex-1 space-y-1.5 sm:max-w-xs">
                    <Label htmlFor="opening-cash" className="font-mono text-[10px] font-extrabold uppercase tracking-widest text-orange-600">► Tiền mặt đầu ca (đ)</Label>
                    <Input
                      id="opening-cash"
                      inputMode="numeric"
                      value={openingCash}
                      onChange={(e) => setOpeningCash(e.target.value)}
                      placeholder="500000"
                      className="border-2 border-amber-400 bg-white font-mono font-bold text-stone-900 placeholder:text-amber-400 focus-visible:border-orange-600 focus-visible:ring-orange-500/30"
                    />
                  </div>
                  <Button
                    onClick={handleOpen}
                    disabled={openShift.isPending || parseCash(openingCash) == null}
                    className="border-2 border-orange-700 bg-gradient-to-b from-orange-500 to-orange-600 font-mono text-xs font-extrabold uppercase tracking-widest text-white shadow-[2px_2px_0_rgba(154,52,18,0.6)] transition-all hover:from-orange-600 hover:to-orange-700 hover:shadow-[1px_1px_0_rgba(154,52,18,0.6)] active:shadow-none"
                  >
                    {openShift.isPending ? '► Đang mở...' : '► Mở ca'}
                  </Button>
                </div>
              )}
            </div>
          </GameCard>

          <GameCard title={`Lịch sử ca — ${history.data?.totalCount ?? 0} ca`}>
            <div className="space-y-4 pt-2">
              {history.isLoading ? (
                <p className="font-mono text-xs font-bold uppercase tracking-widest text-orange-600">► Đang tải lịch sử...</p>
              ) : history.isError ? (
                <p className="font-mono text-sm font-bold uppercase tracking-widest text-stone-600">▸ Không tải được lịch sử ca.</p>
              ) : (
                <>
                  <Table>
                    <TableHeader>
                      <TableRow className="border-b-2 border-amber-500 bg-gradient-to-r from-orange-600 via-orange-700 to-amber-700 hover:from-orange-600 hover:via-orange-700 hover:to-amber-700">
                        <TableHead className="font-mono text-[11px] font-extrabold uppercase tracking-widest text-white [text-shadow:1px_1px_0_rgba(0,0,0,0.4)]">Mở ca</TableHead>
                        <TableHead className="font-mono text-[11px] font-extrabold uppercase tracking-widest text-white [text-shadow:1px_1px_0_rgba(0,0,0,0.4)]">Đóng ca</TableHead>
                        <TableHead className="font-mono text-[11px] font-extrabold uppercase tracking-widest text-white [text-shadow:1px_1px_0_rgba(0,0,0,0.4)]">Người mở</TableHead>
                        <TableHead className="font-mono text-[11px] font-extrabold uppercase tracking-widest text-white [text-shadow:1px_1px_0_rgba(0,0,0,0.4)]">Người đóng</TableHead>
                        <TableHead className="font-mono text-[11px] font-extrabold uppercase tracking-widest text-white text-right [text-shadow:1px_1px_0_rgba(0,0,0,0.4)]">Đầu ca</TableHead>
                        <TableHead className="font-mono text-[11px] font-extrabold uppercase tracking-widest text-white text-right [text-shadow:1px_1px_0_rgba(0,0,0,0.4)]">Cuối ca</TableHead>
                        <TableHead className="font-mono text-[11px] font-extrabold uppercase tracking-widest text-white text-right [text-shadow:1px_1px_0_rgba(0,0,0,0.4)]">Doanh thu</TableHead>
                        <TableHead className="font-mono text-[11px] font-extrabold uppercase tracking-widest text-white text-right [text-shadow:1px_1px_0_rgba(0,0,0,0.4)]">Phiên</TableHead>
                        <TableHead className="font-mono text-[11px] font-extrabold uppercase tracking-widest text-white [text-shadow:1px_1px_0_rgba(0,0,0,0.4)]">Trạng thái</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {(history.data?.items ?? []).length === 0 ? (
                        <TableRow>
                          <TableCell colSpan={9} className="h-24 text-center font-mono text-xs font-bold uppercase tracking-widest text-orange-600">
                            <span className="inline-flex items-center gap-2">
                              <span className="size-2 animate-pulse rounded-full bg-orange-500" />
                              ▸ Chưa có ca nào.
                            </span>
                          </TableCell>
                        </TableRow>
                      ) : (
                        (history.data?.items ?? []).map((shift) => (
                          <TableRow
                            key={shift.id}
                            className="border-b border-amber-200 bg-gradient-to-r from-white via-yellow-50 to-amber-50 transition-all hover:from-amber-100/70 hover:via-yellow-50/60 hover:to-amber-100/40 hover:shadow-[inset_0_-2px_0_rgba(234,88,12,0.5)]"
                          >
                            <TableCell className="font-mono text-[11px] font-bold uppercase tracking-wide text-stone-900">{formatDateTime(shift.openedAt)}</TableCell>
                            <TableCell className="font-mono text-[11px] font-bold uppercase tracking-wide text-stone-900">{formatDateTime(shift.closedAt)}</TableCell>
                            <TableCell className="font-mono text-[11px] font-bold uppercase tracking-wide text-stone-900">
                              {getUserLabel(shift.openedByUsername, shift.openedByUserId)}
                            </TableCell>
                            <TableCell className="font-mono text-[11px] font-bold uppercase tracking-wide text-stone-900">
                              {getUserLabel(shift.closedByUsername, shift.closedByUserId)}
                            </TableCell>
                            <TableCell className="font-mono text-[11px] font-extrabold tracking-wide text-right text-stone-800 [text-shadow:1px_1px_0_rgba(255,255,255,0.5)]">
                              {formatCurrencyVnd(shift.openingCashBalance ?? 0)}
                            </TableCell>
                            <TableCell className="font-mono text-[11px] font-extrabold tracking-wide text-right text-stone-800 [text-shadow:1px_1px_0_rgba(255,255,255,0.5)]">
                              {shift.closingCashBalance == null
                                ? '—'
                                : formatCurrencyVnd(shift.closingCashBalance)}
                            </TableCell>
                            <TableCell className="font-mono text-[11px] font-extrabold tracking-wide text-right text-amber-700 [text-shadow:1px_1px_0_rgba(255,255,255,0.5)]">
                              {formatCurrencyVnd(shift.totalRevenue ?? 0)}
                            </TableCell>
                            <TableCell className="font-mono text-[11px] font-extrabold tracking-wide text-right text-stone-800">{shift.totalSessions ?? 0}</TableCell>
                            <TableCell>
                              <ShiftStatusBadge status={shift.status} />
                            </TableCell>
                          </TableRow>
                        ))
                      )}
                    </TableBody>
                  </Table>
                  <CommonPagination
                    meta={{
                      currentPage: history.data?.page ?? page,
                      limit: history.data?.pageSize ?? pageSize,
                      totalItems: history.data?.totalCount ?? 0,
                      totalPages: history.data?.totalPages ?? 1,
                      hasPrevious: (history.data?.page ?? page) > 1,
                      hasNext:
                        (history.data?.page ?? page) < (history.data?.totalPages ?? 1),
                    }}
                    pageSize={pageSize}
                    pageSizeOptions={[10, 20, 50]}
                    onPageChange={setPage}
                    onLimitChange={(value) => {
                      setPageSize(value);
                      setPage(1);
                    }}
                  />
                </>
              )}
            </div>
          </GameCard>
        </>
      )}
    </div>
  );
}
