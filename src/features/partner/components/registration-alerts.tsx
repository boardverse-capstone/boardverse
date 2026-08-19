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
        <Alert key={alert.id} variant="destructive" className="border-orange-300 bg-orange-50">
          <IconAlertTriangle className="size-4 text-orange-600" />
          <AlertTitle className="text-orange-800">Cảnh báo</AlertTitle>
          <AlertDescription className="text-orange-700">{alert.message}</AlertDescription>
        </Alert>
      ))}
    </div>
  );
}
