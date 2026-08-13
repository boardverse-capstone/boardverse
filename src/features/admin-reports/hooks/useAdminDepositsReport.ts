'use client';

import { useQuery } from '@tanstack/react-query';
import {
  ADMIN_REPORTS_QUERY_KEYS,
  AdminReportsService,
} from '../services/admin-reports.service';
import type { DepositsReportParams } from '../types/admin-reports.interface';

export function useAdminDepositsReport(params: DepositsReportParams, enabled = true) {
  return useQuery({
    queryKey: [
      ADMIN_REPORTS_QUERY_KEYS.deposits,
      params.page,
      params.pageSize,
      params.fromUtc,
      params.toUtc,
      params.status,
    ],
    queryFn: () => AdminReportsService.getDeposits(params),
    enabled,
    placeholderData: (previous) => previous,
    staleTime: 10_000,
  });
}
