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
    CAFES: '/admin/cafes',
    CATEGORIES: '/admin/categories',
    MASTER_GAMES: '/admin/master-games',
    USERS: '/admin/users',
    USER_CREATE: '/admin/users/new',
    USER_DETAIL: (id: string) => `/admin/users/${id}`,
    WALLETS: '/admin/wallets',
    WALLET_DETAIL: (userId: string) => `/admin/wallets/${userId}`,
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
    /** Legacy path — redirects to inventory boxes tab */
    POS_BOXES: '/staff/inventory?tab=boxes',
    POS_CHECK_IN: (bookingId: string) => `/staff/pos/${bookingId}`,
    INVENTORY: '/staff/inventory',
    INVENTORY_BOXES: '/staff/inventory?tab=boxes',
    INVENTORY_DETAIL: (cafeId: string, inventoryId: string) =>
      `/staff/inventory/${inventoryId}?cafeId=${cafeId}`,
  },
} as const;
