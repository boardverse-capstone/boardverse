'use client';

import { useQuery } from '@tanstack/react-query';
import {
  ADMIN_SETTLEMENT_QUERY_KEYS,
  AdminSettlementService,
} from '../services/admin-settlement.service';
import type { AdminSettlementListParams } from '../types/admin-settlement.interface';

export function useAdminSettlements(
  params: AdminSettlementListParams,
  failedOnly = false,
) {
  return useQuery({
    queryKey: [
      failedOnly
        ? ADMIN_SETTLEMENT_QUERY_KEYS.failed
        : ADMIN_SETTLEMENT_QUERY_KEYS.list,
      params,
    ],
    queryFn: () =>
      failedOnly
        ? AdminSettlementService.getFailedSettlements(params)
        : AdminSettlementService.getSettlements(params),
    placeholderData: (previous) => previous,
    staleTime: 5000,
  });
}
