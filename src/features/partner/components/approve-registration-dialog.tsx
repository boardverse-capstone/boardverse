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
import { APPLICATION_ACTION_LABELS } from '@/core/constants/partner-registration';
import type { ApplicationPrimaryAction, PartnerActionTarget } from '../types/partner.interface';
import { getApplicationPrimaryAction } from '../utils/application-workflow';

interface ApproveRegistrationDialogProps {
  partner: PartnerActionTarget | null;
  action?: ApplicationPrimaryAction | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onConfirm: () => void;
  isPending: boolean;
}

const ACTION_DESCRIPTIONS: Record<ApplicationPrimaryAction, string> = {
  APPROVE: 'Xác nhận duyệt đơn đăng ký và tạo tài khoản quản lý quán.',
  ACTIVATE: 'Kích hoạt quán để hiển thị trên ứng dụng Mobile.',
};

export function ApproveRegistrationDialog({
  partner,
  action: actionOverride,
  open,
  onOpenChange,
  onConfirm,
  isPending,
}: ApproveRegistrationDialogProps) {
  if (!partner) return null;

  const action = actionOverride ?? getApplicationPrimaryAction(partner);
  if (!action) return null;

  const title = APPLICATION_ACTION_LABELS[action];

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
