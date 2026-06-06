// src/features/profile/types/profile.interface.ts

/** Thông tin hồ sơ người dùng trả về từ GET /api/UserProfile */
export interface UserProfile {
  id?: string;
  userId?: string;
  gamerTag: string;
  bio?: string | null;
  firstName?: string | null;
  lastName?: string | null;
  dateOfBirth?: string | null;
  homeAddress?: string | null;
  globalElo?: number;
  level?: number;
  avatarUrl?: string | null;
  createdAt?: string;
  updatedAt?: string;
}

/** Payload để tạo hồ sơ mới */
export interface ProfileCreateRequest {
  gamerTag: string;
  bio?: string;
  firstName?: string;
  lastName?: string;
  dateOfBirth?: string;
  homeAddress?: string;
}

/** Payload để cập nhật hồ sơ */
export interface ProfileUpdateRequest {
  gamerTag?: string;
  bio?: string;
  firstName?: string;
  lastName?: string;
  dateOfBirth?: string;
  homeAddress?: string;
  globalElo?: number;
  level?: number;
}
