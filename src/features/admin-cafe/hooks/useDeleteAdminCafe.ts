'use client';

import { useMutation, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { ADMIN_CAFE_QUERY_KEYS, AdminCafeService } from '../services/admin-cafe.service';

export function useDeleteAdminCafe() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (cafeId: string) => AdminCafeService.deleteCafe(cafeId),
    onSuccess: () => {
      toast.success('Đã xóa quán.');
      queryClient.invalidateQueries({ queryKey: [ADMIN_CAFE_QUERY_KEYS.list] });
    },
    onError: (error: Error) => {
      toast.error(error.message ?? 'Xóa quán thất bại. Quán có thể đang có session/booking.');
    },
  });
}
