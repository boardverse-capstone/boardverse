'use client';

import { useQuery } from '@tanstack/react-query';
import { ADMIN_WALLET_QUERY_KEYS, AdminWalletService } from '../services/admin-wallet.service';

export function useAdminWalletTransactions(params: {
  userId?: string;
  page: number;
  limit: number;
}) {
  const userId = params.userId;

  return useQuery({
    queryKey: [ADMIN_WALLET_QUERY_KEYS.transactions, userId, params.page, params.limit],
    queryFn: () =>
      AdminWalletService.getWalletTransactions({
        userId: userId!,
        page: params.page,
        limit: params.limit,
      }),
    enabled: Boolean(userId),
    placeholderData: (previous) => previous,
    staleTime: 10_000,
  });
}
