'use client';

import { useMutation, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { ADMIN_SEPAY_QUERY_KEYS, AdminSePayService } from '../services/admin-sepay.service';

export function useDeleteSePayAccount() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (id: string) => AdminSePayService.deleteAccount(id),
    onSuccess: () => {
      toast.success('Đã xóa SePay account.');
      queryClient.invalidateQueries({ queryKey: [ADMIN_SEPAY_QUERY_KEYS.list] });
      queryClient.invalidateQueries({ queryKey: [ADMIN_SEPAY_QUERY_KEYS.master] });
    },
    onError: (error: Error) => {
      toast.error(error.message || 'Xóa SePay account thất bại.');
    },
  });
}
