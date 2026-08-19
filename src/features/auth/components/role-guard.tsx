'use client';

import { useEffect, useRef, useState, type ReactNode } from 'react';
import { usePathname, useRouter } from 'next/navigation';
import { useAuthStore } from '../store/auth.store';
import { UserRole, normalizePortalRole } from '@/core/constants/roles';
import {
  buildLoginUrl,
  getDefaultDashboard,
  saveReturnUrl,
} from '../utils/redirect.util';
import { AuthLoading } from './auth-loading';

interface RoleGuardProps {
  allowedRole: UserRole;
  children: ReactNode;
}

export function RoleGuard({ allowedRole, children }: RoleGuardProps) {
  const router = useRouter();
  const pathname = usePathname();
  const hasHydrated = useAuthStore((state) => state._hasHydrated);
  const token = useAuthStore((state) => state.token);
  const user = useAuthStore((state) => state.user);
  const hasRedirected = useRef(false);
  const [fullPath, setFullPath] = useState(pathname);

  useEffect(() => {
    setFullPath(window.location.pathname + window.location.search);
  }, [pathname]);

  const userRole = user?.role ? normalizePortalRole(user.role) : null;
  const isAuthorized = !!token && !!userRole && userRole === allowedRole;

  useEffect(() => {
    if (!hasHydrated || hasRedirected.current) return;

    if (!token || !user) {
      hasRedirected.current = true;
      saveReturnUrl(fullPath);
      router.replace(buildLoginUrl(fullPath));
      return;
    }

    if (userRole !== allowedRole) {
      hasRedirected.current = true;
      router.replace(getDefaultDashboard(user.role));
    }
  }, [hasHydrated, token, user, userRole, allowedRole, fullPath, router]);

  if (!hasHydrated || !isAuthorized) {
    return <AuthLoading message="Đang xác minh quyền truy cập..." />;
  }

  return children;
}
