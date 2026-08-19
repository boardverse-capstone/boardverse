'use client';

import { useEffect, type ReactNode } from 'react';
import { useAuthStore } from '../store/auth.store';
import { decodeToken, normalizeUser } from '@/shared/utils/token.util';
import { AuthLoading } from './auth-loading';

function restoreUserFromToken() {
  const { token, user } = useAuthStore.getState();
  if (!token || user) return;

  const decoded = decodeToken(token);
  if (!decoded) return;

  useAuthStore.setState({ user: normalizeUser(decoded) });
}

interface AuthInitializerProps {
  children: ReactNode;
}

export function AuthInitializer({ children }: AuthInitializerProps) {
  const hasHydrated = useAuthStore((state) => state._hasHydrated);

  useEffect(() => {
    const finishHydration = () => {
      restoreUserFromToken();
      useAuthStore.getState().setHasHydrated(true);
    };

    if (useAuthStore.persist.hasHydrated()) {
      finishHydration();
      return;
    }

    const unsubscribe = useAuthStore.persist.onFinishHydration(() => {
      finishHydration();
    });

    return unsubscribe;
  }, []);

  if (!hasHydrated) {
    return <AuthLoading />;
  }

  return children;
}
