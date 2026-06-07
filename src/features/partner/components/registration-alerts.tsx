'use client';

import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { IconAlertTriangle } from '@tabler/icons-react';
import type { Registration } from '../types/partner.interface';

interface RegistrationAlertsProps {
  registration: Registration;
}

export function RegistrationAlerts({ registration }: RegistrationAlertsProps) {
  if (!registration.alerts.length) return null;

  return (
    <div className="grid gap-3">
      {registration.alerts.map((alert) => (
        <Alert key={alert.id} variant="destructive">
          <IconAlertTriangle className="size-4" />
          <AlertTitle>Cảnh báo Ops</AlertTitle>
          <AlertDescription>{alert.message}</AlertDescription>
        </Alert>
      ))}
    </div>
  );
}
