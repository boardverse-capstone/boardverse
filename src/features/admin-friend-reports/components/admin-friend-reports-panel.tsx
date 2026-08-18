'use client';

import { useMemo, useState } from 'react';
import type { ColumnDef } from '@tanstack/react-table';
import { IconFlag, IconMessageReport } from '@tabler/icons-react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Skeleton } from '@/components/ui/skeleton';
import { Textarea } from '@/components/ui/textarea';
import { CommonPagination } from '@/components/common/pagination';
import { PartnerDataTable } from '@/features/partner/components/partner-data-table';
import {
  useAdminFriendReports,
  useResolveFriendReport,
} from '../hooks/useAdminFriendReports';
import type {
  AdminFriendReport,
  FriendReportStatus,
} from '../types/admin-friend-report.interface';

const STATUS_OPTIONS: Array<{ value: FriendReportStatus | 'all'; label: string }> = [
  { value: 'Pending', label: 'Chờ xử lý' },
  { value: 'Reviewed', label: 'Đã xử lý' },
  { value: 'Dismissed', label: 'Đã bỏ qua' },
  { value: 'all', label: 'Tất cả' },
];

const CATEGORY_LABELS: Record<string, string> = {
  Spam: 'Spam',
  Harassment: 'Quấy rối',
  FakeAccount: 'Tài khoản giả',
  InappropriateContent: 'Nội dung không phù hợp',
  Other: 'Khác',
};

function statusBadge(status: string) {
  const classes =
    status === 'Pending'
      ? 'border-amber-200 bg-amber-50 text-amber-800'
      : status === 'Reviewed'
        ? 'border-emerald-200 bg-emerald-50 text-emerald-800'
        : 'border-slate-200 bg-slate-50 text-slate-700';
  const label =
    status === 'Pending' ? 'Chờ xử lý' : status === 'Reviewed' ? 'Đã xử lý' : 'Đã bỏ qua';
  return <Badge className={classes}>{label}</Badge>;
}

export function AdminFriendReportsPanel() {
  const [page, setPage] = useState(1);
  const [limit, setLimit] = useState(20);
  const [status, setStatus] = useState<FriendReportStatus | 'all'>('Pending');
  const [selected, setSelected] = useState<AdminFriendReport | null>(null);
  const [decision, setDecision] = useState<'Reviewed' | 'Dismissed'>('Reviewed');
  const [adminNote, setAdminNote] = useState('');
  const offset = (page - 1) * limit;
  const query = useAdminFriendReports({ status, offset, limit });
  const resolveMutation = useResolveFriendReport();

  const columns = useMemo<ColumnDef<AdminFriendReport>[]>(
    () => [
      {
        accessorKey: 'reporterUsername',
        header: 'Người báo cáo',
        cell: ({ row }) => (
          <div>
            <p className="font-medium">{row.original.reporterUsername || '—'}</p>
            <p className="font-mono text-xs text-muted-foreground">
              {row.original.reporterUserId.slice(0, 8) || '—'}
            </p>
          </div>
        ),
      },
      {
        accessorKey: 'targetUsername',
        header: 'Người bị báo cáo',
        cell: ({ row }) => (
          <div>
            <p className="font-medium">{row.original.targetUsername || '—'}</p>
            <p className="font-mono text-xs text-muted-foreground">
              {row.original.targetUserId.slice(0, 8) || '—'}
            </p>
          </div>
        ),
      },
      {
        accessorKey: 'category',
        header: 'Loại vi phạm',
        cell: ({ row }) => CATEGORY_LABELS[row.original.category] ?? row.original.category,
      },
      {
        accessorKey: 'reason',
        header: 'Nội dung',
        cell: ({ row }) => (
          <p className="line-clamp-2 max-w-sm text-sm" title={row.original.reason}>
            {row.original.reason || '—'}
          </p>
        ),
      },
      {
        accessorKey: 'status',
        header: 'Trạng thái',
        cell: ({ row }) => statusBadge(row.original.status),
      },
      {
        accessorKey: 'createdAt',
        header: 'Thời gian',
        cell: ({ row }) =>
          row.original.createdAt
            ? new Date(row.original.createdAt).toLocaleString('vi-VN')
            : '—',
      },
      {
        id: 'actions',
        header: '',
        cell: ({ row }) => (
          <Button
            size="sm"
            variant="outline"
            disabled={row.original.status !== 'Pending'}
            onClick={() => {
              setSelected(row.original);
              setDecision('Reviewed');
              setAdminNote('');
            }}
          >
            Xử lý
          </Button>
        ),
      },
    ],
    [],
  );

  const meta = query.data
    ? {
        currentPage: page,
        limit,
        totalItems: query.data.totalItems,
        totalPages: query.data.totalPages,
        hasPrevious: page > 1,
        hasNext: page < query.data.totalPages,
      }
    : null;

  return (
    <div className="space-y-6">
      <div className="grid gap-4 sm:grid-cols-2">
        <Card className="border-amber-200 bg-gradient-to-br from-amber-50 to-background">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Đang chờ xử lý</CardTitle>
            <IconFlag className="size-5 text-amber-600" />
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold tabular-nums">
              {status === 'Pending' ? (query.data?.totalItems ?? 0) : '—'}
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Quy trình xử lý</CardTitle>
            <IconMessageReport className="size-5 text-sky-600" />
          </CardHeader>
          <CardContent>
            <p className="text-sm text-muted-foreground">
              Kiểm tra nội dung, chọn đã xử lý hoặc bỏ qua và ghi chú để lưu audit.
            </p>
          </CardContent>
        </Card>
      </div>

      <div className="flex items-end gap-3">
        <div className="space-y-1.5">
          <Label>Trạng thái</Label>
          <Select
            value={status}
            onValueChange={(value) => {
              setStatus(value as FriendReportStatus | 'all');
              setPage(1);
            }}
          >
            <SelectTrigger className="w-[190px]">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {STATUS_OPTIONS.map((option) => (
                <SelectItem key={option.value} value={option.value}>
                  {option.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      {query.isLoading ? (
        <div className="space-y-3">
          {Array.from({ length: 5 }).map((_, index) => (
            <Skeleton key={index} className="h-14 w-full" />
          ))}
        </div>
      ) : query.isError ? (
        <Card>
          <CardContent className="flex flex-col items-center gap-3 py-10 text-center">
            <p className="text-sm text-rose-600">Không tải được danh sách báo cáo.</p>
            <Button variant="outline" onClick={() => query.refetch()}>
              Thử lại
            </Button>
          </CardContent>
        </Card>
      ) : (
        <PartnerDataTable
          columns={columns}
          data={query.data?.items ?? []}
          emptyMessage="Không có báo cáo phù hợp."
        />
      )}

      {meta ? (
        <CommonPagination
          meta={meta}
          pageSize={limit}
          pageSizeOptions={[10, 20, 50]}
          onPageChange={setPage}
          onLimitChange={(value) => {
            setLimit(value);
            setPage(1);
          }}
        />
      ) : null}

      <Dialog open={Boolean(selected)} onOpenChange={(open) => !open && setSelected(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Xử lý báo cáo bạn bè</DialogTitle>
            <DialogDescription>
              {selected?.targetUsername || 'Người dùng'} —{' '}
              {selected ? CATEGORY_LABELS[selected.category] ?? selected.category : ''}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="rounded-lg border bg-muted/40 p-3 text-sm">
              {selected?.reason || 'Không có nội dung.'}
            </div>
            <div className="space-y-1.5">
              <Label>Quyết định</Label>
              <Select
                value={decision}
                onValueChange={(value) => setDecision(value as 'Reviewed' | 'Dismissed')}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="Reviewed">Đã xem xét và xử lý</SelectItem>
                  <SelectItem value="Dismissed">Bỏ qua báo cáo</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="friend-report-note">Ghi chú admin</Label>
              <Textarea
                id="friend-report-note"
                rows={4}
                value={adminNote}
                onChange={(event) => setAdminNote(event.target.value)}
                placeholder="Ghi rõ kết quả kiểm tra để lưu audit..."
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setSelected(null)}>
              Hủy
            </Button>
            <Button
              disabled={resolveMutation.isPending || adminNote.trim().length < 5}
              onClick={() => {
                if (!selected) return;
                resolveMutation.mutate(
                  {
                    reportId: selected.id,
                    payload: { status: decision, adminNote: adminNote.trim() },
                  },
                  { onSuccess: () => setSelected(null) },
                );
              }}
            >
              {resolveMutation.isPending ? 'Đang xử lý...' : 'Xác nhận'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
