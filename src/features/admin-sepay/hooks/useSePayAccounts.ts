'use client';

import { useQuery } from '@tanstack/react-query';
import { ADMIN_SEPAY_QUERY_KEYS, AdminSePayService } from '../services/admin-sepay.service';
import type { SePayAccountListParams } from '../types/sepay-account.interface';

export function useSePayAccounts(params: SePayAccountListParams = {}) {
  return useQuery({
    queryKey: [
      ADMIN_SEPAY_QUERY_KEYS.list,
      params.accountType,
      params.cafeId,
      params.isActive,
    ],
    queryFn: () => AdminSePayService.getAccounts(params),
    staleTime: 10_000,
  });
}
