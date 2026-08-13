'use client';

import { useQuery } from '@tanstack/react-query';
import {
  ADMIN_REPORTS_QUERY_KEYS,
  AdminReportsService,
} from '../services/admin-reports.service';

export function useAdminReportsOverview(enabled = true) {
  return useQuery({
    queryKey: [ADMIN_REPORTS_QUERY_KEYS.overview],
    queryFn: () => AdminReportsService.getOverview(),
    enabled,
    staleTime: 60_000,
  });
}
