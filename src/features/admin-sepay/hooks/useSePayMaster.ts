'use client';

import { useQuery } from '@tanstack/react-query';
import { ADMIN_SEPAY_QUERY_KEYS, AdminSePayService } from '../services/admin-sepay.service';

export function useSePayMaster() {
  return useQuery({
    queryKey: [ADMIN_SEPAY_QUERY_KEYS.master],
    queryFn: () => AdminSePayService.getMasterAccount(),
    retry: false,
    staleTime: 10_000,
  });
}
