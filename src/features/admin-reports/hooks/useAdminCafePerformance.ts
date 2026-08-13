'use client';

import { useQuery } from '@tanstack/react-query';
import {
  ADMIN_REPORTS_QUERY_KEYS,
  AdminReportsService,
} from '../services/admin-reports.service';
import type { CafePerformanceParams } from '../types/admin-reports.interface';

export function useAdminCafePerformance(params: CafePerformanceParams, enabled = true) {
  return useQuery({
    queryKey: [
      ADMIN_REPORTS_QUERY_KEYS.cafePerformance,
      params.page,
      params.pageSize,
      params.fromUtc,
      params.toUtc,
      params.sortBy,
      params.sortOrder,
    ],
    queryFn: () => AdminReportsService.getCafePerformance(params),
    enabled,
    placeholderData: (previous) => previous,
    staleTime: 10_000,
  });
}
