'use client';

import { useMutation, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { APPLICATION_STATUS_LABELS } from '@/core/constants/partner-registration';
import { PartnerService, PARTNER_QUERY_KEYS } from '../services/partner.service';
import { mapRegistrationToPartnerApplication } from '../utils/partner.mapper';
import { syncPartnerInPendingCaches } from '../utils/partner-cache.util';

export function useApproveRegistration() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (id: string) => PartnerService.approveRegistration(id),
    onMutate: async () => {
      await queryClient.cancelQueries({ queryKey: [PARTNER_QUERY_KEYS.pending] });
      const previousQueries = queryClient.getQueriesData({
        queryKey: [PARTNER_QUERY_KEYS.pending],
      });
      return { previousQueries };
    },
    onSuccess: (data) => {
      const application = mapRegistrationToPartnerApplication(data.registration);

      toast.success(
        `${application.cafeName} → ${APPLICATION_STATUS_LABELS[application.applicationStatus]}`,
      );

      if (data.managerAccount) {
        toast.message('Đã cấp tài khoản CAFE_MANAGER', {
          description: `Email đăng nhập: ${data.managerAccount.email}`,
        });
      }

      queryClient.setQueryData([PARTNER_QUERY_KEYS.detail, application.id], application);
      syncPartnerInPendingCaches(queryClient, application);
      queryClient.invalidateQueries({ queryKey: [PARTNER_QUERY_KEYS.pending] });
      queryClient.invalidateQueries({ queryKey: [PARTNER_QUERY_KEYS.detail, application.id] });
    },
    onError: (error: Error, _id, context) => {
      context?.previousQueries.forEach(([queryKey, data]) => {
        if (data) queryClient.setQueryData(queryKey, data);
      });
      toast.error(error.message ?? 'Xử lý đơn thất bại.');
    },
  });
}
