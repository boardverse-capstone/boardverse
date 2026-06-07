import type { PaginationParams } from '@/shared/types/pagination.interface';

export interface ManagedUser {
  id: string;
  username: string;
  email: string;
  role: string;
  isActive: boolean;
  isBlocked: boolean;
  blockReason?: string | null;
  createdAt: string;
  updatedAt?: string;
}

export interface UserListParams extends PaginationParams {
  role?: string;
  isActive?: boolean;
  isBlocked?: boolean;
}

export interface BlockUserRequest {
  reason: string;
}

export interface UpdateUserRoleRequest {
  role: string;
}

export interface UserActionTarget {
  id: string;
  username: string;
  email: string;
  role: string;
  isBlocked: boolean;
}
