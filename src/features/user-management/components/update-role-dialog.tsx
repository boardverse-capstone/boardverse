'use client';

import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { Spinner } from '@/components/ui/spinner';
import { MANAGED_ROLE_LABELS } from '@/core/constants/user-management';
import type { ManagedUser } from '../types/user.interface';

interface UpdateRoleDialogProps {
  user: ManagedUser | null;
  newRole: string;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onConfirm: () => void;
  isPending: boolean;
}

export function UpdateRoleDialog({
  user,
  newRole,
  open,
  onOpenChange,
  onConfirm,
  isPending,
}: UpdateRoleDialogProps) {
  if (!user) return null;

  const currentLabel = MANAGED_ROLE_LABELS[user.role] ?? user.role;
  const nextLabel = MANAGED_ROLE_LABELS[newRole] ?? newRole;

  return (
    <AlertDialog open={open} onOpenChange={onOpenChange}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>Xác nhận thay đổi vai trò</AlertDialogTitle>
          <AlertDialogDescription>
            Bạn sắp đổi vai trò của <strong>{user.username}</strong> từ{' '}
            <strong>{currentLabel}</strong> sang <strong>{nextLabel}</strong>. Hành động này ảnh
            hưởng quyền truy cập hệ thống của người dùng.
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel disabled={isPending}>Hủy</AlertDialogCancel>
          <AlertDialogAction onClick={onConfirm} disabled={isPending}>
            {isPending ? (
              <>
                <Spinner className="mr-2" />
                Đang cập nhật...
              </>
            ) : (
              'Xác nhận'
            )}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
