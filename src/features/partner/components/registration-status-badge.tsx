'use client';

import { cn } from '@/lib/utils';
import {
  REGISTRATION_STATUS_COLORS,
  REGISTRATION_STATUS_LABELS,
} from '@/core/constants/partner-registration';
import type { RegistrationStatus } from '../types/partner.interface';

interface RegistrationStatusBadgeProps {
  status: RegistrationStatus;
  className?: string;
}

export function RegistrationStatusBadge({ status, className }: RegistrationStatusBadgeProps) {
  return (
    <span
      className={cn(
        'inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-medium',
        REGISTRATION_STATUS_COLORS[status],
        className,
      )}
    >
      {REGISTRATION_STATUS_LABELS[status]}
    </span>
  );
}
