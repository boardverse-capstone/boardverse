'use client';

import { Button } from '@/components/ui/button';
import { APPLICATION_ACTION_LABELS } from '@/core/constants/partner-registration';
import type { PartnerApplication } from '../types/partner.interface';
import {
  canActivateApplication,
  canApproveApplication,
  canRejectApplication,
} from '../utils/application-workflow';

interface ApplicationActionsPanelProps {
  application: PartnerApplication;
  onApprove?: () => void;
  onReject?: () => void;
  onActivate?: () => void;
  isPending?: boolean;
}

export function ApplicationActionsPanel({
  application,
  onApprove,
  onReject,
  onActivate,
  isPending,
}: ApplicationActionsPanelProps) {
  const showReject = canRejectApplication(application) && onReject;
  const showApprove = canApproveApplication(application) && onApprove;
  const showActivate = canActivateApplication(application) && onActivate;

  if (!showReject && !showApprove && !showActivate) return null;

  return (
    <div className="flex flex-wrap gap-2">
      {showReject && (
        <Button
          variant="outline"
          className="text-destructive hover:text-destructive"
          onClick={onReject}
          disabled={isPending}
        >
          {APPLICATION_ACTION_LABELS.REJECT}
        </Button>
      )}

      {showApprove && (
        <Button onClick={onApprove} disabled={isPending}>
          {APPLICATION_ACTION_LABELS.APPROVE}
        </Button>
      )}

      {showActivate && (
        <Button onClick={onActivate} disabled={isPending}>
          {APPLICATION_ACTION_LABELS.ACTIVATE}
        </Button>
      )}
    </div>
  );
}
