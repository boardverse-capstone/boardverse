'use client';

import { useQuery } from '@tanstack/react-query';
import { ADMIN_CAFE_QUERY_KEYS, AdminCafeService } from '../services/admin-cafe.service';

export function useAdminCafeDetail(cafeId: string | null | undefined, enabled = true) {
  return useQuery({
    queryKey: [ADMIN_CAFE_QUERY_KEYS.detail, cafeId],
    queryFn: () => AdminCafeService.getCafeById(cafeId!),
    enabled: Boolean(cafeId) && enabled,
    staleTime: 10_000,
  });
}
