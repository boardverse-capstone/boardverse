'use client';

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
import { Spinner } from '@/components/ui/spinner';
import { MANAGED_ROLE_LABELS } from '@/core/constants/user-management';
import type { UserActionTarget } from '../types/user.interface';

interface DisableUserDialogProps {
  user: UserActionTarget | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onConfirm: () => void;
  isPending: boolean;
}

export function DisableUserDialog({
  user,
  open,
  onOpenChange,
  onConfirm,
  isPending,
}: DisableUserDialogProps) {
  if (!user) return null;

  const roleLabel = MANAGED_ROLE_LABELS[user.role] ?? user.role;

  return (
    <AlertDialog open={open} onOpenChange={onOpenChange}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>Vô hiệu hóa tài khoản</AlertDialogTitle>
          <AlertDialogDescription>
            Bạn sắp vô hiệu hóa tài khoản <strong>{user.username}</strong> ({roleLabel}). Tài khoản sẽ
            không còn hoạt động trên hệ thống.
          </AlertDialogDescription>
        </AlertDialogHeader>

        <AlertDialogFooter>
          <AlertDialogCancel disabled={isPending}>Hủy</AlertDialogCancel>
          <Button variant="destructive" disabled={isPending} onClick={onConfirm}>
            {isPending ? (
              <>
                <Spinner className="mr-2" />
                Đang xử lý...
              </>
            ) : (
              'Xác nhận vô hiệu hóa'
            )}
          </Button>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
