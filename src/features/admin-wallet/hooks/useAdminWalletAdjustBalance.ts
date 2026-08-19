'use client';

import { useMutation, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { AdminWalletService, ADMIN_WALLET_QUERY_KEYS } from '../services/admin-wallet.service';
import type { AdminAdjustWalletBalanceRequest } from '../types/wallet.interface';

function getAdjustBalanceErrorMessage(error: Error) {
  const message = error.message.toLowerCase();

  if (message.includes('401') || message.includes('unauthorized')) {
    return 'Phiên đăng nhập hết hạn. Vui lòng đăng nhập lại.';
  }

  return error.message || 'Không thể điều chỉnh số dư.';
}

export function useAdminWalletAdjustBalance() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (payload: AdminAdjustWalletBalanceRequest) =>
      AdminWalletService.adjustWalletBalance(payload),
    onSuccess: (result, variables) => {
      toast.success(
        `${variables.isCredit ? 'Đã cộng' : 'Đã trừ'} ${variables.amountBvc.toLocaleString(
          'vi-VN',
        )} BVC.`,
      );

      queryClient.invalidateQueries({
        queryKey: [ADMIN_WALLET_QUERY_KEYS.detail, variables.targetUserId],
      });
      queryClient.invalidateQueries({
        queryKey: [ADMIN_WALLET_QUERY_KEYS.list],
      });
      queryClient.invalidateQueries({
        queryKey: [ADMIN_WALLET_QUERY_KEYS.transactions, variables.targetUserId],
      });

      if (result.wasIdempotentReplay) {
        toast.info('Yeu cau nay da duoc xu ly truoc do.');
      }
    },
    onError: (error: Error) => {
      toast.error(getAdjustBalanceErrorMessage(error));
    },
  });
}

