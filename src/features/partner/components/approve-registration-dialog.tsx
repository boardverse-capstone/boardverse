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
import type { PartnerActionTarget } from '../types/partner.interface';
import { getPrimaryAction } from '../utils/registration-workflow';

interface ApproveRegistrationDialogProps {
  partner: PartnerActionTarget | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onConfirm: () => void;
  isPending: boolean;
}

const ACTION_DESCRIPTIONS: Partial<Record<string, string>> = {
  PASS_OPS_ASSESSMENT: 'Xác nhận quán đạt tiêu chuẩn thẩm định thực tế.',
  CONFIRM_VERIFICATION: 'Xác nhận thông tin hợp pháp sau khi kiểm tra chéo.',
  RECORD_CONTRACT_SIGNED:
    'Ghi nhận hợp đồng điện tử đã ký và tự động cấp tài khoản CAFE_MANAGER.',
  ACTIVATE_PARTNER: 'Kích hoạt quán hiển thị trên ứng dụng Mobile.',
};

export function ApproveRegistrationDialog({
  partner,
  open,
  onOpenChange,
  onConfirm,
  isPending,
}: ApproveRegistrationDialogProps) {
  if (!partner) return null;

  const action = getPrimaryAction(partner.status);
  if (!action) return null;

  const title = REGISTRATION_ACTION_LABELS[action];

  return (
    <AlertDialog open={open} onOpenChange={onOpenChange}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>{title}</AlertDialogTitle>
          <AlertDialogDescription>
            {ACTION_DESCRIPTIONS[action]} Đối tác:{' '}
            <span className="font-medium text-foreground">{partner.cafeName}</span>
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
