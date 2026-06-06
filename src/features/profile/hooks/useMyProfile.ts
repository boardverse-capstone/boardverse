'use client';

// src/features/profile/hooks/useMyProfile.ts
import { useQuery } from '@tanstack/react-query';
import { ProfileService } from '../services/profile.service';
import { useAuthStore } from '@/features/auth/store/auth.store';

export const PROFILE_QUERY_KEY = ['my-profile'] as const;

/**
 * Lấy hồ sơ của user đang đăng nhập.
 * Chỉ fetch khi đã có token (đã đăng nhập).
 */
export function useMyProfile() {
  const token = useAuthStore((state) => state.token);

  return useQuery({
    queryKey: PROFILE_QUERY_KEY,
    queryFn: () => ProfileService.getMyProfile(),
    enabled: !!token,
    staleTime: 5 * 60 * 1000, // 5 phút
    retry: 1,
  });
}
