import { UserRole, normalizePortalRole } from '@/core/constants/roles';
import { ROUTES } from '@/core/constants/routes';

const RETURN_URL_KEY = 'boardverse-return-url';

const ROLE_DASHBOARD_MAP: Record<string, string> = {
  [UserRole.Admin]: ROUTES.DASHBOARD.ADMIN,
  [UserRole.Manager]: ROUTES.DASHBOARD.MANAGER,
  [UserRole.Staff]: ROUTES.DASHBOARD.STAFF,
};

const PROTECTED_PREFIXES = ['/admin', '/manager', '/staff'] as const;
const AUTH_PATHS = ['/login', '/register', '/forgot-password'] as const;

export function isProtectedPath(pathname: string): boolean {
  return PROTECTED_PREFIXES.some((prefix) => pathname.startsWith(prefix));
}

export function isAuthPath(pathname: string): boolean {
  return AUTH_PATHS.some((path) => pathname === path || pathname.startsWith(`${path}/`));
}

export function canAccessRoute(role: string, pathname: string): boolean {
  const normalized = normalizePortalRole(role);
  if (!normalized) return false;
  if (pathname.startsWith('/admin')) return normalized === UserRole.Admin;
  if (pathname.startsWith('/manager')) return normalized === UserRole.Manager;
  if (pathname.startsWith('/staff')) return normalized === UserRole.Staff;
  return false;
}

export function getDefaultDashboard(role: string): string {
  const normalized = normalizePortalRole(role);
  return (normalized && ROLE_DASHBOARD_MAP[normalized]) ?? ROUTES.AUTH.LOGIN;
}

export function isValidReturnUrl(url: string): boolean {
  if (!url.startsWith('/')) return false;
  if (url.startsWith('//')) return false;
  if (isAuthPath(url.split('?')[0])) return false;
  return isProtectedPath(url.split('?')[0]);
}

export function saveReturnUrl(url: string): void {
  if (typeof window === 'undefined' || !isValidReturnUrl(url)) return;
  sessionStorage.setItem(RETURN_URL_KEY, url);
}

export function getReturnUrl(): string | null {
  if (typeof window === 'undefined') return null;
  const stored = sessionStorage.getItem(RETURN_URL_KEY);
  return stored && isValidReturnUrl(stored) ? stored : null;
}

export function clearReturnUrl(): void {
  if (typeof window === 'undefined') return;
  sessionStorage.removeItem(RETURN_URL_KEY);
}

export function buildLoginUrl(returnUrl?: string | null): string {
  const target = returnUrl ?? getReturnUrl();
  if (!target || !isValidReturnUrl(target)) {
    return ROUTES.AUTH.LOGIN;
  }
  return `${ROUTES.AUTH.LOGIN}?returnUrl=${encodeURIComponent(target)}`;
}

export function resolvePostLoginRedirect(role: string, returnUrl?: string | null): string {
  const candidate = returnUrl ?? getReturnUrl();
  if (candidate && canAccessRoute(role, candidate.split('?')[0])) {
    return candidate;
  }
  return getDefaultDashboard(role);
}
