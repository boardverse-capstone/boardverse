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
import { useTransitionRegistration } from '@/features/partner/hooks/useTransitionRegistration';
import type { RegistrationAction } from '@/features/partner/types/partner.interface';
import { toPartnerApplication } from '@/features/partner/utils/partner.mapper';
import { getPrimaryAction } from '@/features/partner/utils/registration-workflow';

interface RegistrationDetailPageProps {
  params: Promise<{ id: string }>;
}

export default function RegistrationDetailPage({ params }: RegistrationDetailPageProps) {
  const { id } = use(params);
  const { data, isLoading, isError } = useRegistrationDetail(id);
  const approveMutation = useApproveRegistration();
  const rejectMutation = useRejectRegistration();
  const transitionMutation = useTransitionRegistration();

  const [confirmOpen, setConfirmOpen] = useState(false);
  const [rejectOpen, setRejectOpen] = useState(false);
  const [rejectMode, setRejectMode] = useState<'reject' | 'cancel'>('reject');

  const partnerTarget = useMemo(
    () => (data ? toPartnerApplication(data) : null),
    [data],
  );

  const isActionPending =
    approveMutation.isPending || rejectMutation.isPending || transitionMutation.isPending;

  const handleAction = (action: RegistrationAction) => {
    if (action === 'REJECT') {
      setRejectMode('reject');
      setRejectOpen(true);
      return;
    }
    if (action === 'CANCEL_NEGOTIATION') {
      setRejectMode('cancel');
      setRejectOpen(true);
      return;
    }

    const primary = data ? getPrimaryAction(data.status) : null;
    if (action === primary) {
      setConfirmOpen(true);
      return;
    }

    transitionMutation.mutate({ id, payload: { action } });
  };

  const handleConfirmPrimary = () => {
    approveMutation.mutate(id, { onSuccess: () => setConfirmOpen(false) });
  };

  const handleRejectConfirm = (reason: string) => {
    if (rejectMode === 'cancel') {
      transitionMutation.mutate(
        { id, payload: { action: 'CANCEL_NEGOTIATION', reason } },
        { onSuccess: () => setRejectOpen(false) },
      );
      return;
    }

    rejectMutation.mutate(
      { id, payload: { reason } },
      { onSuccess: () => setRejectOpen(false) },
    );
  };

  return (
    <div className="space-y-6">
      <ListBackButton fallbackPath={ROUTES.ADMIN.REGISTRATIONS} />

      <RegistrationDetail
        registration={data}
        isLoading={isLoading}
        isError={isError}
        onAction={handleAction}
        isActionPending={isActionPending}
      />

      <ApproveRegistrationDialog
        partner={partnerTarget}
        open={confirmOpen}
        onOpenChange={setConfirmOpen}
        onConfirm={handleConfirmPrimary}
        isPending={isActionPending}
      />

      <RejectRegistrationDialog
        partner={partnerTarget}
        mode={rejectMode}
        open={rejectOpen}
        onOpenChange={setRejectOpen}
        onConfirm={handleRejectConfirm}
        isPending={isActionPending}
      />
    </div>
  );
}
