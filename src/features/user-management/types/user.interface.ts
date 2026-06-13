import type { PaginationParams } from '@/shared/types/pagination.interface';

/** Hồ sơ game từ GET /api/UserManagement/{id} */
export interface UserProfileFields {
  avatarUrl?: string | null;
  bio?: string | null;
  karmaPoints?: number;
  gamerTier?: string | null;
  globalElo?: number;
  level?: number;
}

/** Dữ liệu user đã chuẩn hóa cho UI */
export interface ManagedUser extends UserProfileFields {
  id: string;
  username: string;
  email: string;
  role: string;
  isActive: boolean;
  isBlocked: boolean;
  isEmailVerified: boolean;
  blockReason?: string | null;
  phoneNumber?: string | null;
  provider: string;
  createdAt: string;
  updatedAt?: string;
  lastLoginAt?: string | null;
  blockedAt?: string | null;
}

/** Raw record từ API BoardVerse (PascalCase list / Users.json) */
export interface ApiUserRecord {
  Id: string;
  Username: string;
  Email: string;
  Role: string;
  IsActive: boolean;
  IsBlocked: boolean;
  IsEmailVerified?: boolean;
  BlockReason?: string | null;
  PhoneNumber?: string | null;
  Provider?: string;
  CreatedAt: string;
  UpdatedAt?: string;
  LastLoginAt?: string | null;
  BlockedAt?: string | null;
}

/** Raw hỗn hợp PascalCase + camelCase từ các endpoint UserManagement */
export type RawUserRecord = ApiUserRecord &
  Partial<ManagedUser> & {
    id?: string;
    username?: string;
    email?: string;
    role?: string;
    isActive?: boolean;
    isBlocked?: boolean;
    isEmailVerified?: boolean;
    blockReason?: string | null;
    phoneNumber?: string | null;
    provider?: string;
    createdAt?: string;
    updatedAt?: string;
    lastLoginAt?: string | null;
    blockedAt?: string | null;
  };

export interface UserListParams extends PaginationParams {
  role?: string;
  isActive?: boolean;
  isBlocked?: boolean;
}

export interface CreateUserRequest {
  username: string;
  email: string;
  password: string;
  role: string;
}

/** Body PUT /api/UserManagement/{id} — AdminUpdateUserDto + mở rộng karma */
export interface UpdateUserRequest {
  username?: string;
  email?: string;
  password?: string;
  role?: string;
  isActive?: boolean;
  isBlocked?: boolean;
  karmaPoints?: number;
  blockReason?: string;
}

export interface BlockUserRequest {
  reason: string;
}

export interface UserActionTarget {
  id: string;
  username: string;
  email: string;
  role: string;
  isBlocked: boolean;
}
