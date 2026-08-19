'use client';

import { useMutation, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { ADMIN_SEPAY_QUERY_KEYS, AdminSePayService } from '../services/admin-sepay.service';
import type { SePayEnvironment } from '../types/sepay-account.interface';

export function useUpdateSePayEnvironment() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ id, environment }: { id: string; environment: SePayEnvironment }) =>
      AdminSePayService.updateEnvironment(id, { environment }),
    onSuccess: (result) => {
      toast.success(`Đã chuyển môi trường sang ${result.environment}.`);
      queryClient.invalidateQueries({ queryKey: [ADMIN_SEPAY_QUERY_KEYS.list] });
      queryClient.invalidateQueries({ queryKey: [ADMIN_SEPAY_QUERY_KEYS.master] });
    },
    onError: (error: Error) => {
      toast.error(error.message || 'Đổi môi trường thất bại.');
    },
  });
}
