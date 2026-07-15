'use client';

import { useEffect, useState } from 'react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Spinner } from '@/components/ui/spinner';
import {
  CAFE_OPERATIONAL_STATUS_OPTIONS,
  type CafeOperationalStatusValue,
} from '@/core/constants/admin-cafe';
import type { OperationalStatus } from '@/features/partner/types/partner.interface';

interface UpdateOperationalStatusDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  cafeId: string;
  cafeName: string;
  currentStatus?: OperationalStatus | null;
  onConfirm: (payload: { status: CafeOperationalStatusValue; reason?: string }) => void;
  isPending: boolean;
}

export function UpdateOperationalStatusDialog({
  open,
  onOpenChange,
  cafeId,
  cafeName,
  currentStatus,
  onConfirm,
  isPending,
}: UpdateOperationalStatusDialogProps) {
  const [status, setStatus] = useState<CafeOperationalStatusValue>('ACTIVE');
  const [reason, setReason] = useState('');
  const [error, setError] = useState('');

  useEffect(() => {
    if (!open) return;
    const normalized =
      currentStatus === 'SUSPENDED'
        ? 'INACTIVE'
        : (currentStatus as CafeOperationalStatusValue | null);
    setStatus(normalized && CAFE_OPERATIONAL_STATUS_OPTIONS.some((o) => o.value === normalized)
      ? normalized
      : 'ACTIVE');
    setReason('');
    setError('');
  }, [open, currentStatus]);

  const handleSubmit = () => {
    if (status === 'BANNED' && !reason.trim()) {
      setError('Vui lòng nhập lý do khi cấm quán.');
      return;
    }
    setError('');
    onConfirm({ status, reason: reason.trim() || undefined });
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Cập nhật trạng thái vận hành</DialogTitle>
          <DialogDescription>
            Quán: <span className="font-medium text-foreground">{cafeName}</span>
            <br />
            Mã quán: <span className="font-mono text-xs">{cafeId}</span>
          </DialogDescription>
        </DialogHeader>

        <div className="grid gap-4">
          <div className="grid gap-2">
            <Label>Trạng thái vận hành</Label>
            <Select value={status} onValueChange={(value) => setStatus(value as CafeOperationalStatusValue)}>
              <SelectTrigger>
                <SelectValue placeholder="Chọn trạng thái" />
              </SelectTrigger>
              <SelectContent>
                {CAFE_OPERATIONAL_STATUS_OPTIONS.map((option) => (
                  <SelectItem key={option.value} value={option.value}>
                    {option.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {status === 'BANNED' && (
            <div className="grid gap-2">
              <Label htmlFor="ban-reason">Lý do cấm quán</Label>
              <Textarea
                id="ban-reason"
                value={reason}
                onChange={(event) => setReason(event.target.value)}
                placeholder="Nhập lý do cấm quán..."
                rows={3}
                maxLength={500}
              />
            </div>
          )}

          {error && <p className="text-sm text-destructive">{error}</p>}
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={isPending}>
            Hủy
          </Button>
          <Button onClick={handleSubmit} disabled={isPending}>
            {isPending ? (
              <>
                <Spinner className="mr-2" />
                Đang lưu...
              </>
            ) : (
              'Cập nhật'
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
