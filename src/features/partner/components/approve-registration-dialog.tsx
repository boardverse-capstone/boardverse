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
import { REGISTRATION_ACTION_LABELS } from '@/core/constants/partner-registration';
import type { Registration, RegistrationAction } from '../types/partner.interface';
import { getPrimaryAction } from '../utils/registration-workflow';

interface ApproveRegistrationDialogProps {
  registration: Registration | null;
  action?: RegistrationAction;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onConfirm: () => void;
  isPending: boolean;
}

const ACTION_DESCRIPTIONS: Partial<Record<RegistrationAction, string>> = {
  PASS_OPS_ASSESSMENT:
    'Xác nhận quán đạt tiêu chuẩn thẩm định thực tế. Đơn sẽ chuyển sang trạng thái Chờ đàm phán.',
  CONFIRM_VERIFICATION:
    'Xác nhận thông tin hợp pháp sau khi Ops kiểm tra chéo. Đơn sẽ chuyển sang Chờ đàm phán.',
  RECORD_CONTRACT_SIGNED:
    'Ghi nhận hợp đồng điện tử đã ký. Hệ thống sẽ tự động cấp tài khoản CAFE_MANAGER và chuyển sang Trống dữ liệu.',
  ACTIVATE_PARTNER:
    'Kích hoạt quán hiển thị trên ứng dụng Mobile sau khi đã hoàn tất sơ đồ bàn và danh mục game.',
};

export function ApproveRegistrationDialog({
  registration,
  action,
  open,
  onOpenChange,
  onConfirm,
  isPending,
}: ApproveRegistrationDialogProps) {
  if (!registration) return null;

  const resolvedAction = action ?? getPrimaryAction(registration.status);
  if (!resolvedAction) return null;

  const title = REGISTRATION_ACTION_LABELS[resolvedAction];
  const description =
    ACTION_DESCRIPTIONS[resolvedAction] ??
    `Xác nhận thực hiện "${title}" cho đơn đăng ký này.`;

  return (
    <AlertDialog open={open} onOpenChange={onOpenChange}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>{title}</AlertDialogTitle>
          <AlertDialogDescription>
            {description} Đối tác:{' '}
            <span className="font-medium text-foreground">
              {registration.basicInfo.cafeName}
            </span>
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel disabled={isPending}>Hủy</AlertDialogCancel>
          <AlertDialogAction
            disabled={isPending}
            onClick={(event) => {
              event.preventDefault();
              onConfirm();
            }}
          >
            {isPending ? (
              <>
                <Spinner className="mr-2" />
                Đang xử lý...
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
