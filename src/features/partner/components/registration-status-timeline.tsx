'use client';

import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import {
  REGISTRATION_STATUS_LABELS,
  REGISTRATION_STATUS_VARIANT,
  REGISTRATION_WORKFLOW_ORDER,
} from '@/core/constants/partner-registration';
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
    <Card>
      <CardHeader>
        <CardTitle className="text-base">Vòng đời đơn đăng ký</CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        {steps.map((status, index) => {
          const history = registration.statusHistory.find((entry) => entry.status === status);
          const isCurrent = registration.status === status;

          return (
            <div key={`${status}-${index}`} className="flex items-start gap-3">
              <div
                className={`mt-1.5 size-2.5 shrink-0 rounded-full ${
                  isCurrent ? 'bg-primary' : 'bg-muted-foreground/40'
                }`}
              />
              <div className="space-y-1">
                <div className="flex flex-wrap items-center gap-2">
                  <Badge variant={REGISTRATION_STATUS_VARIANT[status as RegistrationStatus]}>
                    {REGISTRATION_STATUS_LABELS[status as RegistrationStatus]}
                  </Badge>
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
