'use client';

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { REGISTRATION_WORKFLOW_ORDER } from '@/core/constants/partner-registration';
import { RegistrationStatusBadge } from './registration-status-badge';
import type { Registration, RegistrationStatus } from '../types/partner.interface';

interface RegistrationStatusTimelineProps {
  registration: Registration;
}

export function RegistrationStatusTimeline({ registration }: RegistrationStatusTimelineProps) {
  const reachedStatuses = new Set(registration.statusHistory.map((entry) => entry.status));
  const isTerminal = ['REJECTED', 'CANCELLED', 'EXPIRED_CANCELLED'].includes(registration.status);

  const steps = isTerminal
    ? registration.statusHistory
    : REGISTRATION_WORKFLOW_ORDER.filter(
        (status) => reachedStatuses.has(status) || status === registration.status,
      );

  return (
    <Card className="border-violet-200 bg-violet-50/30">
      <CardHeader>
        <CardTitle className="text-base text-violet-900">Vòng đời đơn đăng ký</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {steps.map((status, index) => {
          const history = registration.statusHistory.find((entry) => entry.status === status);
          const isCurrent = registration.status === status;

          return (
            <div key={`${status}-${index}`} className="flex items-start gap-3">
              <div
                className={`mt-2 size-3 shrink-0 rounded-full ring-4 ring-background ${
                  isCurrent ? 'bg-violet-500' : 'bg-violet-300'
                }`}
              />
              <div className="space-y-1 pb-1">
                <div className="flex flex-wrap items-center gap-2">
                  <RegistrationStatusBadge status={status as RegistrationStatus} />
                  {history && (
                    <span className="text-xs text-muted-foreground">
                      {new Date(history.changedAt).toLocaleString('vi-VN')}
                      {history.changedBy ? ` · ${history.changedBy}` : ''}
                    </span>
                  )}
                </div>
                {history?.note && (
                  <p className="text-sm text-muted-foreground">{history.note}</p>
                )}
              </div>
            </div>
          );
        })}
      </CardContent>
    </Card>
  );
}
