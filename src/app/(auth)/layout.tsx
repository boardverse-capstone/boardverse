'use client';

import type { ReactNode } from 'react';
import { Suspense } from 'react';
import { GuestGuard } from '@/features/auth/components/guest-guard';
import { AuthLoading } from '@/features/auth/components/auth-loading';

export default function AuthLayout({ children }: { children: ReactNode }) {
  return (
    <Suspense fallback={<AuthLoading />}>
      <GuestGuard>
        <div className="flex min-h-svh flex-col items-center justify-center bg-muted p-6 md:p-10">
          <div className="w-full max-w-sm md:max-w-4xl">{children}</div>
        </div>
      </GuestGuard>
    </Suspense>
  );
}
