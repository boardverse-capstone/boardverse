'use client';

import { cn } from '@/lib/utils';
import {
  APPLICATION_STATUS_COLORS,
  APPLICATION_STATUS_LABELS,
  OPERATIONAL_STATUS_COLORS,
  OPERATIONAL_STATUS_LABELS,
} from '@/core/constants/partner-registration';
import type { ApplicationStatus, OperationalStatus } from '../types/partner.interface';

interface ApplicationStatusBadgeProps {
  status: ApplicationStatus;
  className?: string;
}

export function ApplicationStatusBadge({ status, className }: ApplicationStatusBadgeProps) {
  return (
    <span
      className={cn(
        'inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-medium',
        APPLICATION_STATUS_COLORS[status],
        className,
      )}
    >
      {APPLICATION_STATUS_LABELS[status]}
    </span>
  );
}

interface OperationalStatusBadgeProps {
  status: OperationalStatus;
  className?: string;
}

export function OperationalStatusBadge({ status, className }: OperationalStatusBadgeProps) {
  return (
    <span
      className={cn(
        'inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-medium',
        OPERATIONAL_STATUS_COLORS[status],
        className,
      )}
    >
      {OPERATIONAL_STATUS_LABELS[status]}
    </span>
  );
}

interface PartnerStatusBadgesProps {
  applicationStatus: ApplicationStatus;
  operationalStatus?: OperationalStatus | null;
  className?: string;
}

export function PartnerStatusBadges({
  applicationStatus,
  operationalStatus,
  className,
}: PartnerStatusBadgesProps) {
  return (
    <div className={cn('flex flex-wrap items-center gap-1.5', className)}>
      <ApplicationStatusBadge status={applicationStatus} />
      {applicationStatus === 'APPROVED' && operationalStatus && (
        <OperationalStatusBadge status={operationalStatus} />
      )}
    </div>
  );
}
