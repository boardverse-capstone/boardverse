/** Bản ghi thô từ GET /api/UserProfile */
export interface RawUserProfile {
  userId?: string;
  UserId?: string;
  username?: string;
  Username?: string;
  phoneNumber?: string | null;
  PhoneNumber?: string | null;
  avatarUrl?: string | null;
  AvatarUrl?: string | null;
  bio?: string | null;
  Bio?: string | null;
  karmaPoints?: number;
  KarmaPoints?: number;
  gamerTier?: string | null;
  GamerTier?: string | null;
  globalElo?: number;
  GlobalElo?: number;
  level?: number;
  Level?: number;
  updatedAt?: string;
  UpdatedAt?: string;
  hasProfile?: boolean;
  HasProfile?: boolean;
}

/** Hồ sơ người dùng đang đăng nhập — GET /api/UserProfile */
export interface UserProfile {
  userId: string;
  username: string;
  phoneNumber: string | null;
  avatarUrl: string | null;
  bio: string | null;
  karmaPoints: number;
  gamerTier: string | null;
  globalElo: number;
  level: number;
  updatedAt: string | null;
  hasProfile: boolean;
}

/** Payload tạo hồ sơ — POST /api/UserProfile (ProfileCreateDto) */
export interface ProfileCreateRequest {
  gamerTag: string;
  bio?: string | null;
  firstName?: string | null;
  lastName?: string | null;
  dateOfBirth?: string | null;
  homeAddress?: string | null;
}

/** Payload cập nhật hồ sơ — PUT /api/UserProfile (ProfileUpdateDto) */
export interface ProfileUpdateRequest {
  gamerTag?: string | null;
  bio?: string | null;
  firstName?: string | null;
  lastName?: string | null;
  dateOfBirth?: string | null;
  homeAddress?: string | null;
  globalElo?: number | null;
  level?: number | null;
}

/** Payload cập nhật tiến trình — POST /api/UserProfile/progress (ProfileProgressUpdateDto) */
export interface ProfileProgressUpdateRequest {
  globalElo?: number;
  level?: number;
}

/** Payload cập nhật avatar — PUT /api/UserProfile/me/avatar (UpdateAvatarRequestDto) */
export interface ProfileAvatarUpdateRequest {
  avatarUrl: string;
}
