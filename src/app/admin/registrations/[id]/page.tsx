'use client';

import { use, useState } from 'react';
import Link from 'next/link';
import { IconArrowLeft } from '@tabler/icons-react';
import { Button } from '@/components/ui/button';
import { RegistrationDetail } from '@/features/partner/components/registration-detail';
import { ApproveRegistrationDialog } from '@/features/partner/components/approve-registration-dialog';
import { RejectRegistrationDialog } from '@/features/partner/components/reject-registration-dialog';
import { useRegistrationDetail } from '@/features/partner/hooks/useRegistrationDetail';
import { useApproveRegistration } from '@/features/partner/hooks/useApproveRegistration';
import { useRejectRegistration } from '@/features/partner/hooks/useRejectRegistration';
import { useTransitionRegistration } from '@/features/partner/hooks/useTransitionRegistration';
import type { RegistrationAction } from '@/features/partner/types/partner.interface';
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
  const [pendingAction, setPendingAction] = useState<RegistrationAction | null>(null);
  const [rejectMode, setRejectMode] = useState<'reject' | 'cancel'>('reject');

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
      setPendingAction(action);
      setConfirmOpen(true);
      return;
    }

    transitionMutation.mutate({ id, payload: { action } });
  };

  const handleConfirmPrimary = () => {
    approveMutation.mutate(id, { onSuccess: () => setConfirmOpen(false) });
    setPendingAction(null);
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
      <Button variant="ghost" asChild className="px-0">
        <Link href="/admin/registrations">
          <IconArrowLeft className="mr-2 h-4 w-4" />
          Quay lại danh sách
        </Link>
      </Button>

      <RegistrationDetail
        registration={data}
        isLoading={isLoading}
        isError={isError}
        onAction={handleAction}
        isActionPending={isActionPending}
      />

      <ApproveRegistrationDialog
        registration={data ?? null}
        action={pendingAction ?? (data ? getPrimaryAction(data.status) ?? undefined : undefined)}
        open={confirmOpen}
        onOpenChange={setConfirmOpen}
        onConfirm={handleConfirmPrimary}
        isPending={isActionPending}
      />

      <RejectRegistrationDialog
        registration={data ?? null}
        mode={rejectMode}
        open={rejectOpen}
        onOpenChange={setRejectOpen}
        onConfirm={handleRejectConfirm}
        isPending={isActionPending}
      />
    </div>
  );
}
