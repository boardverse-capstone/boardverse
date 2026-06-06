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
} as const;
