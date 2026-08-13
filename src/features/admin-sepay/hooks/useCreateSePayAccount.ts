'use client';

import { useMutation, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { ADMIN_SEPAY_QUERY_KEYS, AdminSePayService } from '../services/admin-sepay.service';
import type { CreateSePayAccountRequest } from '../types/sepay-account.interface';

export function useCreateSePayAccount() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (payload: CreateSePayAccountRequest) =>
      AdminSePayService.createAccount(payload),
    onSuccess: () => {
      toast.success('Đã tạo SePay account.');
      queryClient.invalidateQueries({ queryKey: [ADMIN_SEPAY_QUERY_KEYS.list] });
      queryClient.invalidateQueries({ queryKey: [ADMIN_SEPAY_QUERY_KEYS.master] });
    },
    onError: (error: Error) => {
      toast.error(error.message || 'Tạo SePay account thất bại.');
    },
  });
}
