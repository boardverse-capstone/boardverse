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
  },
  PARTNER: {
    REGISTER: '/partner/register',
  },
} as const;
