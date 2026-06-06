// src/core/constants/roles.ts
export enum UserRole {
  Admin = 'Admin',
  Manager = 'Manager',
  Staff = 'Staff',
}

export const ALLOWED_ROLES = [UserRole.Admin, UserRole.Manager, UserRole.Staff] as const;
export type AllowedRole = (typeof ALLOWED_ROLES)[number];
