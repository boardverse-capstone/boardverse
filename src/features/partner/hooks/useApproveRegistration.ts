'use client';

import { useMutation, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { REGISTRATION_STATUS_LABELS } from '@/core/constants/partner-registration';
import { PartnerService, PARTNER_QUERY_KEYS } from '../services/partner.service';
import type { PaginatedResponse } from '@/shared/types/pagination.interface';
import type { Registration } from '../types/partner.interface';
import { getPrimaryAction, isAdminActionable } from '../utils/registration-workflow';

export function useApproveRegistration() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (id: string) => PartnerService.approveRegistration(id),
    onMutate: async (id) => {
      await queryClient.cancelQueries({ queryKey: [PARTNER_QUERY_KEYS.pending] });

      const previousQueries = queryClient.getQueriesData<PaginatedResponse<Registration>>({
        queryKey: [PARTNER_QUERY_KEYS.pending],
      });

      const detail = queryClient.getQueryData<Registration>([PARTNER_QUERY_KEYS.detail, id]);
      const action = detail ? getPrimaryAction(detail.status) : null;

      previousQueries.forEach(([queryKey, data]) => {
        if (!data) return;

        queryClient.setQueryData<PaginatedResponse<Registration>>(queryKey, {
          ...data,
          data: data.data
            .map((item) => {
              if (item.id !== id || !action) return item;
              const nextStatus =
                action === 'RECORD_CONTRACT_SIGNED'
                  ? 'DATA_BLANK'
                  : action === 'ACTIVATE_PARTNER'
                    ? 'ACTIVE'
                    : 'PENDING_NEGOTIATION';
              return { ...item, status: nextStatus };
            })
            .filter((item) => isAdminActionable(item.status)),
        });
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
    },
    onError: (error: Error, id, context) => {
      context?.previousQueries.forEach(([queryKey, data]) => {
        if (data) queryClient.setQueryData(queryKey, data);
      });
      toast.error(error.message ?? 'Xử lý đơn thất bại.');
    },
    onSettled: (_data, _err, id) => {
      queryClient.invalidateQueries({ queryKey: [PARTNER_QUERY_KEYS.pending] });
      queryClient.invalidateQueries({ queryKey: [PARTNER_QUERY_KEYS.detail, id] });
    },
  });
}
