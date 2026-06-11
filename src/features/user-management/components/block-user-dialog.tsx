'use client';

import { useEffect } from 'react';
import { useForm } from 'react-hook-form';
import {
  AlertDialog,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Spinner } from '@/components/ui/spinner';
import { MANAGED_ROLE_LABELS } from '@/core/constants/user-management';
import type { UserActionTarget } from '../types/user.interface';

interface BlockUserDialogProps {
  user: UserActionTarget | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onConfirm: (reason: string) => void;
  isPending: boolean;
}

interface BlockFormValues {
  reason: string;
}

export function BlockUserDialog({
  user,
  open,
  onOpenChange,
  onConfirm,
  isPending,
}: BlockUserDialogProps) {
  const {
    register,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm<BlockFormValues>({
    defaultValues: { reason: '' },
  });

  useEffect(() => {
    if (!open) reset({ reason: '' });
  }, [open, reset]);

  if (!user) return null;

  const roleLabel = MANAGED_ROLE_LABELS[user.role] ?? user.role;

  return (
    <AlertDialog open={open} onOpenChange={onOpenChange}>
      <AlertDialogContent>
        <form
          onSubmit={handleSubmit((values) => onConfirm(values.reason.trim()))}
          className="space-y-4"
        >
          <AlertDialogHeader>
            <AlertDialogTitle>Khóa tài khoản</AlertDialogTitle>
            <AlertDialogDescription>
              Bạn sắp khóa tài khoản <strong>{user.username}</strong> ({roleLabel}). Người dùng
              sẽ không thể đăng nhập cho đến khi được mở khóa.
            </AlertDialogDescription>
          </AlertDialogHeader>

          <div className="space-y-2">
            <Label htmlFor="block-reason">Lý do khóa</Label>
            <Textarea
              id="block-reason"
              placeholder="Nhập lý do khóa tài khoản..."
              rows={4}
              disabled={isPending}
              {...register('reason', {
                required: 'Vui lòng nhập lý do khóa tài khoản.',
                maxLength: { value: 500, message: 'Tối đa 500 ký tự.' },
              })}
            />
            {errors.reason && (
              <p className="text-xs text-destructive">{errors.reason.message}</p>
            )}
          </div>

          <AlertDialogFooter>
            <AlertDialogCancel type="button" disabled={isPending}>
              Hủy
            </AlertDialogCancel>
            <Button type="submit" variant="destructive" disabled={isPending}>
              {isPending ? (
                <>
                  <Spinner className="mr-2" />
                  Đang xử lý...
                </>
              ) : (
                'Xác nhận khóa'
              )}
            </Button>
          </AlertDialogFooter>
        </form>
      </AlertDialogContent>
    </AlertDialog>
  );
}
