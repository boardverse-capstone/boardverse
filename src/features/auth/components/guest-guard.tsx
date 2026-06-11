'use client';

import { useEffect, useRef, type ReactNode } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { useAuthStore } from '../store/auth.store';
import { resolvePostLoginRedirect } from '../utils/redirect.util';
import { AuthLoading } from './auth-loading';

interface GuestGuardProps {
  children: ReactNode;
}

export function GuestGuard({ children }: GuestGuardProps) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const hasHydrated = useAuthStore((state) => state._hasHydrated);
  const token = useAuthStore((state) => state.token);
  const user = useAuthStore((state) => state.user);
  const hasRedirected = useRef(false);

  const returnUrl = searchParams.get('returnUrl');

  useEffect(() => {
    if (!hasHydrated || hasRedirected.current) return;
    if (!token || !user) return;

    hasRedirected.current = true;
    const destination = resolvePostLoginRedirect(user.role, returnUrl);
    router.replace(destination);
  }, [hasHydrated, token, user, returnUrl, router]);

  if (!hasHydrated) {
    return <AuthLoading />;
  }

  if (token && user) {
    return <AuthLoading message="Đang chuyển hướng..." />;
  }

  return children;
}
