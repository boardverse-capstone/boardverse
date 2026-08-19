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

interface ProfileDeleteDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onConfirm: () => void;
  isPending: boolean;
  username?: string;
}

export function ProfileDeleteDialog({
  open,
  onOpenChange,
  onConfirm,
  isPending,
  username,
}: ProfileDeleteDialogProps) {
  return (
    <AlertDialog open={open} onOpenChange={onOpenChange}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>Vô hiệu hóa hồ sơ</AlertDialogTitle>
          <AlertDialogDescription>
            {username ? (
              <>
                Bạn sắp vô hiệu hóa hồ sơ của <strong>{username}</strong>. Dữ liệu hồ sơ gamer sẽ
                không còn hiển thị và bạn có thể tạo lại hồ sơ mới sau này.
              </>
            ) : (
              <>
                Bạn sắp vô hiệu hóa hồ sơ của mình. Dữ liệu hồ sơ gamer sẽ không còn hiển thị và
                bạn có thể tạo lại hồ sơ mới sau này.
              </>
            )}
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
