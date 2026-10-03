'use client';

import { useMemo, useState } from 'react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { RegistrationDetail } from './registration-detail';
import { ApproveRegistrationDialog } from './approve-registration-dialog';
import { RejectRegistrationDialog } from './reject-registration-dialog';
import { useRegistrationDetail } from '../hooks/useRegistrationDetail';
import { useApproveRegistration } from '../hooks/useApproveRegistration';
import { useRejectRegistration } from '../hooks/useRejectRegistration';
import type { ApplicationPrimaryAction } from '../types/partner.interface';
import { toPartnerActionTarget } from '../utils/partner.mapper';
import {
  canActivateApplication,
  canApproveApplication,
  getApplicationPrimaryAction,
} from '../utils/application-workflow';

interface RegistrationDetailDialogProps {
  applicationId: string | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function RegistrationDetailDialog({
  applicationId,
  open,
  onOpenChange,
}: RegistrationDetailDialogProps) {
  const id = applicationId ?? '';
  const { data, isLoading, isError } = useRegistrationDetail(id);
  const approveMutation = useApproveRegistration();
  const rejectMutation = useRejectRegistration();

  const [confirmOpen, setConfirmOpen] = useState(false);
  const [confirmAction, setConfirmAction] = useState<ApplicationPrimaryAction | null>(null);
  const [rejectOpen, setRejectOpen] = useState(false);

  const partnerTarget = useMemo(
    () => (data ? toPartnerActionTarget(data) : null),
    [data],
  );

  const isActionPending = approveMutation.isPending || rejectMutation.isPending;

  const openConfirm = (action: ApplicationPrimaryAction) => {
    setConfirmAction(action);
    setConfirmOpen(true);
  };

  return (
    <>
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-6xl">
          <DialogHeader>
            <DialogTitle>{data?.cafeName ?? 'Chi tiết đơn đăng ký'}</DialogTitle>
            <DialogDescription>Thông tin đơn đối tác từ hệ thống.</DialogDescription>
          </DialogHeader>
          <RegistrationDetail
            application={data}
            isLoading={isLoading}
            isError={isError}
            onApprove={
              data && canApproveApplication(data) ? () => openConfirm('APPROVE') : undefined
            }
            onReject={
              data && data.applicationStatus === 'PENDING' ? () => setRejectOpen(true) : undefined
            }
            onActivate={
              data && canActivateApplication(data) ? () => openConfirm('ACTIVATE') : undefined
            }
            isActionPending={isActionPending}
          />
        </DialogContent>
      </Dialog>

      <ApproveRegistrationDialog
        partner={partnerTarget}
        action={confirmAction ?? (data ? getApplicationPrimaryAction(data) : null)}
        open={confirmOpen}
        onOpenChange={setConfirmOpen}
        onConfirm={() => {
          if (!id) return;
          approveMutation.mutate(id, {
            onSuccess: () => {
              setConfirmOpen(false);
              setConfirmAction(null);
            },
          });
        }}
        isPending={isActionPending}
      />

      <RejectRegistrationDialog
        partner={partnerTarget}
        open={rejectOpen}
        onOpenChange={setRejectOpen}
        onConfirm={(reason) => {
          if (!id) return;
          rejectMutation.mutate(
            { id, payload: { reason } },
            { onSuccess: () => setRejectOpen(false) },
          );
        }}
        isPending={isActionPending}
      />
    </>
  );
}
