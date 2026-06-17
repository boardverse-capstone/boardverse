'use client';

import { use, useMemo, useState } from 'react';
import { ListBackButton } from '@/components/common/list-back-button';
import { ROUTES } from '@/core/constants/routes';
import { RegistrationDetail } from '@/features/partner/components/registration-detail';
import { ApproveRegistrationDialog } from '@/features/partner/components/approve-registration-dialog';
import { RejectRegistrationDialog } from '@/features/partner/components/reject-registration-dialog';
import { useRegistrationDetail } from '@/features/partner/hooks/useRegistrationDetail';
import { useApproveRegistration } from '@/features/partner/hooks/useApproveRegistration';
import { useRejectRegistration } from '@/features/partner/hooks/useRejectRegistration';
import type { ApplicationPrimaryAction } from '@/features/partner/types/partner.interface';
import { toPartnerActionTarget } from '@/features/partner/utils/partner.mapper';
import {
  canActivateApplication,
  canApproveApplication,
  getApplicationPrimaryAction,
} from '@/features/partner/utils/application-workflow';

interface RegistrationDetailPageProps {
  params: Promise<{ id: string }>;
}

export default function RegistrationDetailPage({ params }: RegistrationDetailPageProps) {
  const { id } = use(params);
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

  const handleConfirmPrimary = () => {
    approveMutation.mutate(id, {
      onSuccess: () => {
        setConfirmOpen(false);
        setConfirmAction(null);
      },
    });
  };

  const handleRejectConfirm = (reason: string) => {
    rejectMutation.mutate(
      { id, payload: { reason } },
      { onSuccess: () => setRejectOpen(false) },
    );
  };

  return (
    <div className="space-y-6">
      <ListBackButton fallbackPath={ROUTES.ADMIN.REGISTRATIONS} />

      <RegistrationDetail
        application={data}
        isLoading={isLoading}
        isError={isError}
        onApprove={
          data && canApproveApplication(data)
            ? () => openConfirm('APPROVE')
            : undefined
        }
        onReject={data && data.applicationStatus === 'PENDING' ? () => setRejectOpen(true) : undefined}
        onActivate={
          data && canActivateApplication(data)
            ? () => openConfirm('ACTIVATE')
            : undefined
        }
        isActionPending={isActionPending}
      />

      <ApproveRegistrationDialog
        partner={partnerTarget}
        action={confirmAction ?? (data ? getApplicationPrimaryAction(data) : null)}
        open={confirmOpen}
        onOpenChange={setConfirmOpen}
        onConfirm={handleConfirmPrimary}
        isPending={isActionPending}
      />

      <RejectRegistrationDialog
        partner={partnerTarget}
        open={rejectOpen}
        onOpenChange={setRejectOpen}
        onConfirm={handleRejectConfirm}
        isPending={isActionPending}
      />
    </div>
  );
}
