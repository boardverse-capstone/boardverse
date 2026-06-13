// src/core/constants/routes.ts
export const ROUTES = {
  AUTH: {
    LOGIN: '/login',
    REGISTER: '/register',
    FORGOT_PASSWORD: '/forgot-password',
  },
  DASHBOARD: {
    ADMIN: '/admin/dashboard',
    MANAGER: '/manager/dashboard',
    STAFF: '/staff/dashboard',
  },
  ADMIN: {
    REGISTRATIONS: '/admin/registrations',
    REGISTRATION_DETAIL: (id: string) => `/admin/registrations/${id}`,
    USERS: '/admin/users',
    USER_CREATE: '/admin/users/new',
    USER_DETAIL: (id: string) => `/admin/users/${id}`,
    KARMA_LOGS: '/admin/karma-logs',
    BEHAVIOR_WARNINGS: '/admin/behavior-warnings',
    SETTINGS: '/admin/settings',
    SECURITY: '/admin/security',
  },
  PARTNER: {
    REGISTER: '/partner/register',
  },
  STAFF: {
    POS: '/staff/pos',
    POS_CHECK_IN: (bookingId: string) => `/staff/pos/${bookingId}`,
  },
} as const;
