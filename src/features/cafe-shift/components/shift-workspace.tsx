'use client';

import { useState } from 'react';
import { PageHeader } from '@/components/common/page-header';
import { CommonPagination } from '@/components/common/pagination';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
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
import { formatCurrencyVnd } from '@/features/staff-cafe/utils/inventory.mapper';
import type { CafeShift } from '../types/cafe-shift.interface';
import {
  useCloseShift,
  useCurrentShift,
  useOpenShift,
  useOperatingCafe,
  useShiftHistory,
} from '../hooks/useCafeShift';

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

function ShiftStatusBadge({ status }: { status: CafeShift['status'] }) {
  if (status === 'Open') {
    return <Badge>Đang mở</Badge>;
  }
  return <Badge variant="secondary">Đã đóng</Badge>;
}

export function ShiftWorkspace() {
  const { data: cafe, isLoading: cafeLoading, isError: cafeError } = useOperatingCafe();
  const cafeId = cafe?.id;
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);
  const [openingCash, setOpeningCash] = useState('0');
  const [closingCash, setClosingCash] = useState('');

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
        <p className="text-sm text-muted-foreground">Đang tải quán...</p>
      ) : cafeError || !cafeId ? (
        <p className="text-sm text-destructive">Không lấy được quán đang làm việc.</p>
      ) : (
        <>
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0">
              <CardTitle className="text-base">Ca hiện tại</CardTitle>
              {open ? <ShiftStatusBadge status={open.status} /> : <Badge variant="outline">Chưa mở ca</Badge>}
            </CardHeader>
            <CardContent className="space-y-4">
              {current.isLoading ? (
                <p className="text-sm text-muted-foreground">Đang tải ca...</p>
              ) : current.isError ? (
                <p className="text-sm text-destructive">Không tải được ca hiện tại.</p>
              ) : open ? (
                <>
                  <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4 text-sm">
                    <div>
                      <p className="text-muted-foreground">Mở lúc</p>
                      <p className="font-medium">{formatDateTime(open.openedAt)}</p>
                    </div>
                    <div>
                      <p className="text-muted-foreground">Người mở</p>
                      <p className="font-medium">{open.openedByUsername || '—'}</p>
                    </div>
                    <div>
                      <p className="text-muted-foreground">Tiền đầu ca</p>
                      <p className="font-medium">{formatCurrencyVnd(open.openingCashBalance ?? 0)}</p>
                    </div>
                    <div>
                      <p className="text-muted-foreground">Doanh thu / phiên</p>
                      <p className="font-medium">
                        {formatCurrencyVnd(open.totalRevenue ?? 0)} · {open.totalSessions ?? 0} phiên
                      </p>
                    </div>
                  </div>
                  <div className="flex flex-col gap-2 sm:flex-row sm:items-end">
                    <div className="space-y-1.5 sm:max-w-xs flex-1">
                      <Label htmlFor="closing-cash">Tiền mặt cuối ca (đ)</Label>
                      <Input
                        id="closing-cash"
                        inputMode="numeric"
                        value={closingCash}
                        onChange={(e) => setClosingCash(e.target.value)}
                        placeholder="850000"
                      />
                    </div>
                    <Button
                      onClick={handleClose}
                      disabled={closeShift.isPending || parseCash(closingCash) == null}
                    >
                      {closeShift.isPending ? 'Đang đóng...' : 'Đóng ca'}
                    </Button>
                  </div>
                </>
              ) : (
                <div className="flex flex-col gap-2 sm:flex-row sm:items-end">
                  <div className="space-y-1.5 sm:max-w-xs flex-1">
                    <Label htmlFor="opening-cash">Tiền mặt đầu ca (đ)</Label>
                    <Input
                      id="opening-cash"
                      inputMode="numeric"
                      value={openingCash}
                      onChange={(e) => setOpeningCash(e.target.value)}
                      placeholder="500000"
                    />
                  </div>
                  <Button
                    onClick={handleOpen}
                    disabled={openShift.isPending || parseCash(openingCash) == null}
                  >
                    {openShift.isPending ? 'Đang mở...' : 'Mở ca'}
                  </Button>
                </div>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="text-base">Lịch sử ca</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {history.isLoading ? (
                <p className="text-sm text-muted-foreground">Đang tải lịch sử...</p>
              ) : history.isError ? (
                <p className="text-sm text-destructive">Không tải được lịch sử ca.</p>
              ) : (
                <>
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Mở ca</TableHead>
                        <TableHead>Đóng ca</TableHead>
                        <TableHead>Người mở</TableHead>
                        <TableHead>Người đóng</TableHead>
                        <TableHead className="text-right">Đầu ca</TableHead>
                        <TableHead className="text-right">Cuối ca</TableHead>
                        <TableHead className="text-right">Doanh thu</TableHead>
                        <TableHead className="text-right">Phiên</TableHead>
                        <TableHead>Trạng thái</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {(history.data?.items ?? []).length === 0 ? (
                        <TableRow>
                          <TableCell colSpan={9} className="text-muted-foreground">
                            Chưa có ca nào.
                          </TableCell>
                        </TableRow>
                      ) : (
                        (history.data?.items ?? []).map((shift) => (
                          <TableRow key={shift.id}>
                            <TableCell>{formatDateTime(shift.openedAt)}</TableCell>
                            <TableCell>{formatDateTime(shift.closedAt)}</TableCell>
                            <TableCell>{shift.openedByUsername || '—'}</TableCell>
                            <TableCell>{shift.closedByUsername || '—'}</TableCell>
                            <TableCell className="text-right">
                              {formatCurrencyVnd(shift.openingCashBalance ?? 0)}
                            </TableCell>
                            <TableCell className="text-right">
                              {shift.closingCashBalance == null
                                ? '—'
                                : formatCurrencyVnd(shift.closingCashBalance)}
                            </TableCell>
                            <TableCell className="text-right">
                              {formatCurrencyVnd(shift.totalRevenue ?? 0)}
                            </TableCell>
                            <TableCell className="text-right">{shift.totalSessions ?? 0}</TableCell>
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
            </CardContent>
          </Card>
        </>
      )}
    </div>
  );
}
