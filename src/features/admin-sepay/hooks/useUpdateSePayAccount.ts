'use client';

import { useMutation, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { ADMIN_SEPAY_QUERY_KEYS, AdminSePayService } from '../services/admin-sepay.service';
import type { UpdateSePayAccountRequest } from '../types/sepay-account.interface';

export function useUpdateSePayAccount() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ id, payload }: { id: string; payload: UpdateSePayAccountRequest }) =>
      AdminSePayService.updateAccount(id, payload),
    onSuccess: () => {
      toast.success('Đã cập nhật SePay account.');
      queryClient.invalidateQueries({ queryKey: [ADMIN_SEPAY_QUERY_KEYS.list] });
      queryClient.invalidateQueries({ queryKey: [ADMIN_SEPAY_QUERY_KEYS.master] });
    },
    onError: (error: Error) => {
      toast.error(error.message || 'Cập nhật SePay account thất bại.');
    },
  });
}
