'use client';

import { useMutation, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { ADMIN_CAFE_QUERY_KEYS, AdminCafeService } from '../services/admin-cafe.service';
import type { UpdateAdminCafeRequest } from '../types/admin-cafe.interface';

export function useUpdateAdminCafe() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({
      cafeId,
      payload,
    }: {
      cafeId: string;
      payload: UpdateAdminCafeRequest;
    }) => AdminCafeService.updateCafe(cafeId, payload),
    onSuccess: (data) => {
      toast.success(`Đã cập nhật quán "${data.name}"`);
      queryClient.invalidateQueries({ queryKey: [ADMIN_CAFE_QUERY_KEYS.list] });
      queryClient.invalidateQueries({ queryKey: [ADMIN_CAFE_QUERY_KEYS.detail, data.id] });
    },
    onError: (error: Error) => {
      toast.error(error.message ?? 'Cập nhật quán thất bại.');
    },
  });
}
