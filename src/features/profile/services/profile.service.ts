import apiClient from '@/core/api/client';
import type {
  PlayerLocation,
  ProfileAvatarUpdateRequest,
  ProfileCreateRequest,
  ProfileProgressUpdateRequest,
  ProfileUpdateRequest,
  RawPlayerLocation,
  RawUserProfile,
  UpdatePlayerLocationRequest,
  UserProfile,
} from '../types/profile.interface';
import { mapApiPlayerLocation, mapApiUserProfile } from '../utils/profile.mapper';

export const ProfileService = {
  /** GET /api/UserProfile — hồ sơ user đang đăng nhập */
  getMyProfile: async (): Promise<UserProfile> => {
    const raw = await apiClient.get<never, RawUserProfile>('/api/UserProfile');
    return mapApiUserProfile(raw);
  },

  /** POST /api/UserProfile — tạo hồ sơ mới */
  createProfile: async (payload: ProfileCreateRequest): Promise<UserProfile> => {
    const raw = await apiClient.post<never, RawUserProfile>('/api/UserProfile', payload);
    return mapApiUserProfile(raw);
  },

  /** PUT /api/UserProfile — cập nhật hồ sơ */
  updateProfile: async (payload: ProfileUpdateRequest): Promise<UserProfile> => {
    const raw = await apiClient.put<never, RawUserProfile>('/api/UserProfile', payload);
    return mapApiUserProfile(raw);
  },

  /** DELETE /api/UserProfile — vô hiệu hóa hồ sơ (idempotent) */
  deleteProfile: async (): Promise<void> => {
    await apiClient.delete('/api/UserProfile');
  },

  /** POST /api/UserProfile/progress — cập nhật ELO và level */
  updateProgress: async (payload: ProfileProgressUpdateRequest): Promise<UserProfile> => {
    const raw = await apiClient.post<never, RawUserProfile>(
      '/api/UserProfile/progress',
      payload,
    );
    return mapApiUserProfile(raw);
  },

  /** PUT /api/UserProfile/me/avatar — cập nhật ảnh đại diện */
  updateAvatar: async (payload: ProfileAvatarUpdateRequest): Promise<UserProfile | null> => {
    const raw = await apiClient.put<never, RawUserProfile | null>(
      '/api/UserProfile/me/avatar',
      payload,
    );
    return raw ? mapApiUserProfile(raw) : null;
  },

  /** GET /api/UserProfile/me/location */
  getMyLocation: async (): Promise<PlayerLocation> => {
    const raw = await apiClient.get<never, RawPlayerLocation>('/api/UserProfile/me/location');
    return mapApiPlayerLocation(raw);
  },

  /** PUT /api/UserProfile/me/location */
  updateMyLocation: async (payload: UpdatePlayerLocationRequest): Promise<PlayerLocation> => {
    const raw = await apiClient.put<never, RawPlayerLocation>('/api/UserProfile/me/location', {
      latitude: payload.latitude,
      longitude: payload.longitude,
      source: payload.source ?? 'Gps',
    });
    return mapApiPlayerLocation(raw);
  },

  /** DELETE /api/UserProfile/me/location */
  clearMyLocation: async (): Promise<void> => {
    await apiClient.delete('/api/UserProfile/me/location');
  },

  getKarmaHistory: async (): Promise<unknown> => {
    return apiClient.get<never, unknown>('/api/UserProfile/me/karma-history');
  },
} as const;
