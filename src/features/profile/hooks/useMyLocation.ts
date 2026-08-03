'use client';

import { useQuery } from '@tanstack/react-query';
import { useAuthStore } from '@/features/auth/store/auth.store';
import { ProfileService } from '../services/profile.service';

export const MY_LOCATION_QUERY_KEY = ['my-location'] as const;

/** GET /api/UserProfile/me/location */
export function useMyLocation() {
  const token = useAuthStore((state) => state.token);

  return useQuery({
    queryKey: MY_LOCATION_QUERY_KEY,
    queryFn: () => ProfileService.getMyLocation(),
    enabled: Boolean(token),
    staleTime: 60_000,
    retry: 1,
  });
}
