'use client';

import { useQuery } from '@tanstack/react-query';
import { ADMIN_WALLET_QUERY_KEYS, AdminWalletService } from '../services/admin-wallet.service';

export function useAdminWalletDetail(userId?: string) {
  return useQuery({
    queryKey: [ADMIN_WALLET_QUERY_KEYS.detail, userId],
    queryFn: () => AdminWalletService.getWalletByUserId(userId!),
    enabled: Boolean(userId),
    staleTime: 10_000,
  });
}
