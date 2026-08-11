'use client';

import { useQuery } from '@tanstack/react-query';
import { ADMIN_WALLET_QUERY_KEYS, AdminWalletService } from '../services/admin-wallet.service';
import type { AdminWalletListParams } from '../types/wallet.interface';

export function useAdminWallets(params: AdminWalletListParams) {
  return useQuery({
    queryKey: [
      ADMIN_WALLET_QUERY_KEYS.list,
      params.page,
      params.limit,
      params.search,
      params.statusFilter,
      params.riskLevelFilter,
    ],
    queryFn: () => AdminWalletService.getWallets(params),
    placeholderData: (previous) => previous,
    staleTime: 10_000,
  });
}
