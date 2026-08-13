'use client';

import { useMemo, useState } from 'react';
import type { ColumnDef } from '@tanstack/react-table';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { PageHeader } from '@/components/common/page-header';
import { CommonPagination } from '@/components/common/pagination';
import { PartnerDataTable } from '@/features/partner/components/partner-data-table';
import {
  useAdminRefundRequests,
  useResolveRefundRequest,
} from '../hooks/useAdminRefundRequests';
import type { AdminRefundRequest } from '../types/refund.interface';

const STATUS_OPTIONS = [
  { value: 'all', label: 'Tất cả' },
  { value: 'Pending', label: 'Pending' },
  { value: 'Approved', label: 'Approved' },
  { value: 'Rejected', label: 'Rejected' },
  { value: 'Cancelled', label: 'Cancelled' },
] as const;

export function AdminRefundRequestsPanel() {
  const [page, setPage] = useState(1);
  const [limit, setLimit] = useState(20);
  const [status, setStatus] = useState('Pending');
  const [userIdDraft, setUserIdDraft] = useState('');
  const [userId, setUserId] = useState('');
  const [selected, setSelected] = useState<AdminRefundRequest | null>(null);
  const [approve, setApprove] = useState(true);
  const [approvedAmount, setApprovedAmount] = useState<number | ''>('');
  const [adminNote, setAdminNote] = useState('');

  const { data, isLoading, isError, refetch } = useAdminRefundRequests({
    page,
    limit,
    status,
    userId: userId || undefined,
  });
  const resolveMutation = useResolveRefundRequest();

  const columns = useMemo<ColumnDef<AdminRefundRequest>[]>(
    () => [
      {
        accessorKey: 'id',
        header: 'Request',
        cell: ({ row }) => (
          <span className="font-mono text-xs" title={row.original.id}>
            {row.original.id.slice(0, 8)}…
          </span>
        ),
      },
      {
        accessorKey: 'userId',
        header: 'User',
        cell: ({ row }) => (
          <span className="font-mono text-xs">{row.original.userId.slice(0, 8)}…</span>
        ),
      },
      {
        accessorKey: 'requestedAmountBvc',
        header: 'Yêu cầu (BVC)',
        cell: ({ row }) => row.original.requestedAmountBvc.toLocaleString('vi-VN'),
      },
      {
        accessorKey: 'status',
        header: 'Status',
        cell: ({ row }) => <Badge variant="outline">{row.original.status}</Badge>,
      },
      {
        accessorKey: 'playerReason',
        header: 'Lý do player',
        cell: ({ row }) => (
          <span className="line-clamp-2 max-w-xs text-sm">{row.original.playerReason}</span>
        ),
      },
      {
        accessorKey: 'createdAt',
        header: 'Tạo lúc',
        cell: ({ row }) =>
          row.original.createdAt
            ? new Date(row.original.createdAt).toLocaleString('vi-VN')
            : '—',
      },
      {
        id: 'actions',
        header: '',
        cell: ({ row }) => (
          <div className="flex justify-end">
            <Button
              size="sm"
              variant="outline"
              disabled={row.original.status !== 'Pending'}
              onClick={() => {
                setSelected(row.original);
                setApprove(true);
                setApprovedAmount(row.original.requestedAmountBvc);
                setAdminNote('');
              }}
            >
              Xử lý
            </Button>
          </div>
        ),
      },
    ],
    [],
  );

  const meta = data
    ? {
        currentPage: data.page,
        limit: data.pageSize,
        totalItems: data.totalItems,
        totalPages: data.totalPages,
        hasPrevious: data.page > 1,
        hasNext: data.page < data.totalPages,
      }
    : null;

  return (
    <div className="space-y-6">
      <PageHeader
        title="Yêu cầu hoàn BVC"
        description="Duyệt / từ chối refund-requests từ player."
      />

      <div className="flex flex-col gap-3 md:flex-row md:flex-wrap md:items-end">
        <div className="space-y-1.5">
          <Label>Status</Label>
          <Select
            value={status}
            onValueChange={(value) => {
              setStatus(value);
              setPage(1);
            }}
          >
            <SelectTrigger className="w-[180px]">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {STATUS_OPTIONS.map((item) => (
                <SelectItem key={item.value} value={item.value}>
                  {item.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div className="min-w-[260px] flex-1 space-y-1.5">
          <Label htmlFor="refund-user">User ID</Label>
          <div className="flex gap-2">
            <Input
              id="refund-user"
              className="font-mono text-xs"
              placeholder="UUID (tuỳ chọn)"
              value={userIdDraft}
              onChange={(e) => setUserIdDraft(e.target.value)}
            />
            <Button
              variant="outline"
              onClick={() => {
                setUserId(userIdDraft.trim());
                setPage(1);
              }}
            >
              Lọc
            </Button>
          </div>
        </div>
      </div>

      {isLoading ? (
        <div className="text-sm text-muted-foreground">Đang tải yêu cầu hoàn...</div>
      ) : isError ? (
        <div className="text-sm text-rose-600">
          Không tải được danh sách.{' '}
          <button type="button" className="underline" onClick={() => refetch()}>
            Thử lại
          </button>
        </div>
      ) : (
        <PartnerDataTable
          columns={columns}
          data={data?.items ?? []}
          emptyMessage="Không có yêu cầu hoàn phù hợp."
        />
      )}

      {meta && (
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
      )}

      <Dialog open={Boolean(selected)} onOpenChange={(open) => !open && setSelected(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Xử lý hoàn BVC</DialogTitle>
            <DialogDescription>
              Request {selected?.id.slice(0, 8)}… — yêu cầu{' '}
              {selected?.requestedAmountBvc.toLocaleString('vi-VN')} BVC
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-3">
            <div className="space-y-1.5">
              <Label>Quyết định</Label>
              <Select
                value={approve ? 'approve' : 'reject'}
                onValueChange={(value) => setApprove(value === 'approve')}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="approve">Duyệt (Approve)</SelectItem>
                  <SelectItem value="reject">Từ chối (Reject)</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {approve && (
              <div className="space-y-1.5">
                <Label htmlFor="approved-amount">Số BVC duyệt</Label>
                <Input
                  id="approved-amount"
                  type="number"
                  min={1}
                  value={approvedAmount}
                  onChange={(e) =>
                    setApprovedAmount(e.target.value === '' ? '' : Number(e.target.value))
                  }
                />
              </div>
            )}

            <div className="space-y-1.5">
              <Label htmlFor="admin-note">Ghi chú admin (≥ 10 ký tự)</Label>
              <Textarea
                id="admin-note"
                rows={4}
                value={adminNote}
                onChange={(e) => setAdminNote(e.target.value)}
                placeholder="Lý do duyệt / từ chối..."
              />
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setSelected(null)}>
              Hủy
            </Button>
            <Button
              disabled={
                resolveMutation.isPending ||
                adminNote.trim().length < 10 ||
                (approve && (!approvedAmount || approvedAmount <= 0))
              }
              onClick={() => {
                if (!selected) return;
                resolveMutation.mutate(
                  {
                    requestId: selected.id,
                    payload: {
                      approve,
                      approvedAmountBvc: approve
                        ? Number(approvedAmount)
                        : undefined,
                      adminNote: adminNote.trim(),
                    },
                  },
                  { onSuccess: () => setSelected(null) },
                );
              }}
            >
              Xác nhận
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
