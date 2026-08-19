// src/core/constants/roles.ts
export enum UserRole {
  Admin = 'Admin',
  Manager = 'Manager',
  Staff = 'Staff',
}

export const ALLOWED_ROLES = [UserRole.Admin, UserRole.Manager, UserRole.Staff] as const;
export type AllowedRole = (typeof ALLOWED_ROLES)[number];

const PORTAL_ROLE_ALIASES: Record<string, UserRole | null> = {
  Admin: UserRole.Admin,
  Manager: UserRole.Manager,
  'Cafe Manager': UserRole.Manager,
  CafeManager: UserRole.Manager,
  Staff: UserRole.Staff,
  CafeStaff: UserRole.Staff,
  cafestaff: UserRole.Staff,
  User: null,
  Player: null,
};

/** Chuẩn hóa role từ JWT — trả về null nếu không có quyền portal */
export function normalizePortalRole(role: string): UserRole | null {
  if (ALLOWED_ROLES.includes(role as AllowedRole)) {
    return role as UserRole;
  }
  return PORTAL_ROLE_ALIASES[role] ?? null;
}

export function isPortalRole(role: string): role is AllowedRole {
  return normalizePortalRole(role) !== null;
}
