'use client';

import { useQuery } from '@tanstack/react-query';
import { STAFF_CAFE_QUERY_KEYS, StaffCafeService } from '../services/staff-cafe.service';

export function useStaffWorkingCafe() {
  return useQuery({
    queryKey: [STAFF_CAFE_QUERY_KEYS.workingCafe],
    queryFn: () => StaffCafeService.getStaffWorkingCafe(),
    staleTime: 60_000,
  });
}

export function useNearbyCafes(params?: {
  gameTemplateId?: string;
  latitude?: number | null;
  longitude?: number | null;
  radiusKm?: number;
  enabled?: boolean;
}) {
  const gameTemplateId = params?.gameTemplateId;
  const latitude = params?.latitude ?? undefined;
  const longitude = params?.longitude ?? undefined;
  const radiusKm = params?.radiusKm ?? 15;
  const enabled = params?.enabled ?? true;

  return useQuery({
    queryKey: [
      STAFF_CAFE_QUERY_KEYS.nearbyCafes,
      gameTemplateId,
      latitude,
      longitude,
      radiusKm,
    ],
    queryFn: () =>
      StaffCafeService.getNearbyCafes({
        gameTemplateId: gameTemplateId!,
        latitude: latitude ?? undefined,
        longitude: longitude ?? undefined,
        radiusKm,
      }),
    enabled: enabled && Boolean(gameTemplateId),
    staleTime: 30_000,
    retry: 1,
  });
}
