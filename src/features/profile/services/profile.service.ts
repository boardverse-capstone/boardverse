// src/features/profile/services/profile.service.ts
import apiClient from '@/core/api/client';
import type {
  UserProfile,
  ProfileCreateRequest,
  ProfileUpdateRequest,
} from '../types/profile.interface';

export const ProfileService = {
  /**
   * Lấy hồ sơ của user đang đăng nhập – GET /api/UserProfile
   * Yêu cầu Bearer token (tự động đính bởi interceptor).
   */
  getMyProfile: async (): Promise<UserProfile> => {
    return apiClient.get<never, UserProfile>('/api/UserProfile');
  },

  /**
   * Tạo hồ sơ mới – POST /api/UserProfile
   */
  createProfile: async (payload: ProfileCreateRequest): Promise<UserProfile> => {
    return apiClient.post<never, UserProfile>('/api/UserProfile', payload);
  },

  /**
   * Cập nhật hồ sơ – PUT /api/UserProfile
   */
  updateProfile: async (payload: ProfileUpdateRequest): Promise<UserProfile> => {
    return apiClient.put<never, UserProfile>('/api/UserProfile', payload);
  },

  /**
   * Cập nhật avatar – PUT /api/UserProfile/me/avatar
   */
  updateAvatar: async (avatarUrl: string): Promise<null> => {
    return apiClient.put<never, null>('/api/UserProfile/me/avatar', { avatarUrl });
  },

  /**
   * Xem lịch sử karma – GET /api/UserProfile/me/karma-history
   */
  getKarmaHistory: async (): Promise<unknown> => {
    return apiClient.get<never, unknown>('/api/UserProfile/me/karma-history');
  },
} as const;
