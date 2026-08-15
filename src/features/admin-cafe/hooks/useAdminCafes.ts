'use client';

import { useQuery } from '@tanstack/react-query';
import { ADMIN_CAFE_QUERY_KEYS, AdminCafeService } from '../services/admin-cafe.service';
import type { AdminCafeListParams } from '../types/admin-cafe.interface';

export function useAdminCafes(params: AdminCafeListParams) {
  return useQuery({
    queryKey: [
      ADMIN_CAFE_QUERY_KEYS.list,
      params.page,
      params.limit,
      params.search,
      params.status,
      params.managerId,
    ],
    queryFn: () => AdminCafeService.getCafes(params),
    placeholderData: (previous) => previous,
    staleTime: 10_000,
  });
}
