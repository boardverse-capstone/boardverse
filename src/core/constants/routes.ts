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
    REFUND_REQUESTS: '/admin/refund-requests',
    FRIEND_REPORTS: '/admin/friend-reports',
    KARMA_LOGS: '/admin/karma-logs',
    BEHAVIOR_WARNINGS: '/admin/behavior-warnings',
    TOURNAMENTS: '/admin/tournaments',
    TOURNAMENT_DETAIL: (id: string) => `/admin/tournaments/${id}`,
    REPORTS: '/admin/reports',
    SETTLEMENTS: '/admin/settlements',
    OPERATIONS: '/admin/operations',
    SEPAY_ACCOUNTS: '/admin/sepay-accounts',
    SETTINGS: '/admin/settings',
    SECURITY: '/admin/security',
  },
  MANAGER: {
    POS: '/manager/pos',
    TOURNAMENT: '/manager/tournaments',
    INVENTORY: '/manager/inventory',
    OPERATIONAL_PROFILE: '/manager/operational-profile',
    REPORTS: '/manager/reports',
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
    REPORTS: '/staff/reports',
  },
} as const;
