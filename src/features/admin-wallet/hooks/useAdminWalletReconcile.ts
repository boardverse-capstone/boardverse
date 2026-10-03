'use client';

import { useMutation } from '@tanstack/react-query';
import { toast } from 'sonner';
import { AdminWalletService } from '../services/admin-wallet.service';

export function useAdminWalletReconcile() {
  return useMutation({
    mutationFn: (userId: string) => AdminWalletService.reconcileWallet(userId),
    onError: (error: Error) => {
      toast.error(error.message || 'Không thể đối soát sổ cái.');
    },
  });
}
