'use client';

import { useState } from 'react';
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
import { Spinner } from '@/components/ui/spinner';
import type { PartnerActionTarget } from '../types/partner.interface';

type RejectMode = 'reject' | 'cancel';

interface RejectRegistrationDialogProps {
  partner: PartnerActionTarget | null;
  mode?: RejectMode;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onConfirm: (reason: string) => void;
  isPending: boolean;
}

const MODE_COPY: Record<RejectMode, { title: string; description: string; label: string; submit: string }> = {
  reject: {
    title: 'Từ chối đơn đăng ký',
    description: 'Nhập lý do từ chối. Hệ thống sẽ gửi email thông báo tới quán cafe.',
    label: 'Lý do từ chối',
    submit: 'Từ chối',
  },
  cancel: {
    title: 'Hủy đàm phán',
    description: 'Nhập lý do hủy đàm phán hợp đồng với quán cafe.',
    label: 'Lý do hủy',
    submit: 'Hủy đàm phán',
  },
};

export function RejectRegistrationDialog({
  partner,
  mode = 'reject',
  open,
  onOpenChange,
  onConfirm,
  isPending,
}: RejectRegistrationDialogProps) {
  const [reason, setReason] = useState('');
  const [error, setError] = useState('');
  const copy = MODE_COPY[mode];

  const handleOpenChange = (nextOpen: boolean) => {
    if (!nextOpen) {
      setReason('');
      setError('');
    }
    onOpenChange(nextOpen);
  };

  const handleSubmit = () => {
    const trimmed = reason.trim();
    if (!trimmed) {
      setError(`Vui lòng nhập ${copy.label.toLowerCase()}.`);
      return;
    }
    if (trimmed.length > 500) {
      setError('Nội dung tối đa 500 ký tự.');
      return;
    }
    setError('');
    onConfirm(trimmed);
  };

  if (!partner) return null;

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{copy.title}</DialogTitle>
          <DialogDescription>
            {copy.description} Đối tác:{' '}
            <span className="font-medium text-foreground">{partner.cafeName}</span>
          </DialogDescription>
        </DialogHeader>

        <div className="grid gap-2">
          <Label htmlFor="reject-reason">{copy.label}</Label>
          <Textarea
            id="reject-reason"
            value={reason}
            onChange={(event) => setReason(event.target.value)}
            placeholder="Nhập nội dung chi tiết..."
            rows={4}
            maxLength={500}
          />
          {error && <p className="text-sm text-destructive">{error}</p>}
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => handleOpenChange(false)} disabled={isPending}>
            Đóng
          </Button>
          <Button variant="destructive" onClick={handleSubmit} disabled={isPending}>
            {isPending ? (
              <>
                <Spinner className="mr-2" />
                Đang xử lý...
              </>
            ) : (
              copy.submit
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
