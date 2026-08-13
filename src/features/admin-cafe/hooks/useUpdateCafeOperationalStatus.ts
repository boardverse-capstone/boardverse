'use client';

import { useMutation, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { OPERATIONAL_STATUS_LABELS } from '@/core/constants/partner-registration';
import { PARTNER_QUERY_KEYS } from '@/features/partner/services/partner.service';
import type { OperationalStatus } from '@/features/partner/types/partner.interface';
import { ADMIN_CAFE_QUERY_KEYS, AdminCafeService } from '../services/admin-cafe.service';
import type { UpdateOperationalStatusRequest } from '../types/admin-cafe.interface';

export function useUpdateCafeOperationalStatus() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({
      cafeId,
      payload,
    }: {
      cafeId: string;
      payload: UpdateOperationalStatusRequest;
    }) => AdminCafeService.updateOperationalStatus(cafeId, payload),
    onSuccess: (data) => {
      const label =
        OPERATIONAL_STATUS_LABELS[data.status as OperationalStatus] ?? data.status;
      toast.success(`Trạng thái quán → ${label}`);
      queryClient.invalidateQueries({ queryKey: [ADMIN_CAFE_QUERY_KEYS.list] });
      queryClient.invalidateQueries({ queryKey: [ADMIN_CAFE_QUERY_KEYS.detail, data.cafeId] });
      queryClient.invalidateQueries({ queryKey: [PARTNER_QUERY_KEYS.pending] });
      queryClient.invalidateQueries({ queryKey: [PARTNER_QUERY_KEYS.detail] });
    },
    onError: (error: Error) => {
      toast.error(error.message ?? 'Cập nhật trạng thái quán thất bại.');
    },
  });
}
