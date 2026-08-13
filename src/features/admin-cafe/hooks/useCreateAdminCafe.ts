'use client';

import { useMutation, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { ADMIN_CAFE_QUERY_KEYS, AdminCafeService } from '../services/admin-cafe.service';
import type { CreateAdminCafeRequest } from '../types/admin-cafe.interface';

export function useCreateAdminCafe() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (payload: CreateAdminCafeRequest) => AdminCafeService.createCafe(payload),
    onSuccess: (data) => {
      toast.success(`Đã tạo quán "${data.name}"`);
      queryClient.invalidateQueries({ queryKey: [ADMIN_CAFE_QUERY_KEYS.list] });
    },
    onError: (error: Error) => {
      toast.error(error.message ?? 'Tạo quán thất bại.');
    },
  });
}
