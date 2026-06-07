'use client';

import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { REGISTRATION_ACTION_LABELS } from '@/core/constants/partner-registration';
import type { Registration, RegistrationAction } from '../types/partner.interface';
import {
  canPerformAction,
  getAvailableActions,
  getPrimaryAction,
} from '../utils/registration-workflow';

interface RegistrationActionsPanelProps {
  registration: Registration;
  onAction: (action: RegistrationAction) => void;
  isPending?: boolean;
}

export function RegistrationActionsPanel({
  registration,
  onAction,
  isPending,
}: RegistrationActionsPanelProps) {
  const primaryAction = getPrimaryAction(registration.status);
  const allActions = getAvailableActions(registration.status);
  const secondaryActions = allActions.filter(
    (action) => action !== primaryAction && action !== 'REJECT',
  );
  const canReject = canPerformAction(registration.status, 'REJECT');

  if (!primaryAction && !canReject) return null;

  return (
    <div className="flex flex-wrap gap-2">
      {canReject && (
        <Button
          variant="outline"
          className="text-destructive hover:text-destructive"
          onClick={() => onAction('REJECT')}
          disabled={isPending}
        >
          Từ chối
        </Button>
      )}

      {secondaryActions.length > 0 && (
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="outline" disabled={isPending}>
              Thao tác khác
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            {secondaryActions.map((action) => (
              <DropdownMenuItem key={action} onClick={() => onAction(action)}>
                {REGISTRATION_ACTION_LABELS[action]}
              </DropdownMenuItem>
            ))}
          </DropdownMenuContent>
        </DropdownMenu>
      )}

      {primaryAction && (
        <Button onClick={() => onAction(primaryAction)} disabled={isPending}>
          {REGISTRATION_ACTION_LABELS[primaryAction]}
        </Button>
      )}
    </div>
  );
}
