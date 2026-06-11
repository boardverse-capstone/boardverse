'use client';

import { useMutation, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { REGISTRATION_STATUS_LABELS } from '@/core/constants/partner-registration';
import { PartnerService, PARTNER_QUERY_KEYS } from '../services/partner.service';
import type { Registration } from '../types/partner.interface';
import { toPartnerApplication } from '../utils/partner.mapper';
import { syncPartnerInPendingCaches } from '../utils/partner-cache.util';

export function useApproveRegistration() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (id: string) => PartnerService.approveRegistration(id),
    onMutate: async (id) => {
      await queryClient.cancelQueries({ queryKey: [PARTNER_QUERY_KEYS.pending] });
      const previousQueries = queryClient.getQueriesData({
        queryKey: [PARTNER_QUERY_KEYS.pending],
      });
      return { previousQueries };
    },
    onSuccess: (data) => {
      toast.success(
        `${data.registration.basicInfo.cafeName} → ${REGISTRATION_STATUS_LABELS[data.registration.status]}`,
      );

      if (data.managerAccount) {
        toast.message('Đã cấp tài khoản CAFE_MANAGER', {
          description: `Email đăng nhập: ${data.managerAccount.email}`,
        });
      }

      queryClient.setQueryData(
        [PARTNER_QUERY_KEYS.detail, data.registration.id],
        data.registration,
      );

      syncPartnerInPendingCaches(queryClient, toPartnerApplication(data.registration));
    },
    onError: (error: Error, _id, context) => {
      context?.previousQueries.forEach(([queryKey, data]) => {
        if (data) queryClient.setQueryData(queryKey, data);
      });
      toast.error(error.message ?? 'Xử lý đơn thất bại.');
    },
  });
}
