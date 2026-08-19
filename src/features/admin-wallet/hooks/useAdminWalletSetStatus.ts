'use client';

import { useMutation, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { AdminWalletService, ADMIN_WALLET_QUERY_KEYS } from '../services/admin-wallet.service';
import type { AdminSetWalletStatusRequest } from '../types/wallet.interface';

function getSetStatusErrorMessage(error: Error) {
  const message = error.message.toLowerCase();

  if (message.includes('401') || message.includes('unauthorized')) {
    return 'Phiên đăng nhập hết hạn. Vui lòng đăng nhập lại.';
  }

  // Backend đã trả message chi tiết (vd: validation error cho field Reason) => ưu tiên hiển thị trực tiếp.
  return error.message || 'Không thể cập nhật trạng thái.';
}

export function useAdminWalletSetStatus() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (payload: AdminSetWalletStatusRequest) => AdminWalletService.setWalletStatus(payload),
    onSuccess: (result, variables) => {
      toast.success(
        `Đã cập nhật trạng thái tài khoản của user '${result.targetUserId}' thành '${result.newStatus}'.`,
      );

      queryClient.invalidateQueries({
        queryKey: [ADMIN_WALLET_QUERY_KEYS.detail, variables.targetUserId],
      });
      queryClient.invalidateQueries({
        queryKey: [ADMIN_WALLET_QUERY_KEYS.list],
      });
    },
    onError: (error: Error) => {
      toast.error(getSetStatusErrorMessage(error));
    },
  });
}

