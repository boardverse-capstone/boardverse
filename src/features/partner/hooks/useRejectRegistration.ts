'use client';

import { useMutation, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { PartnerService, PARTNER_QUERY_KEYS } from '../services/partner.service';
import type { PaginatedResponse } from '@/shared/types/pagination.interface';
import type { Registration, RejectRegistrationRequest } from '../types/partner.interface';

interface RejectVariables {
  id: string;
  payload: RejectRegistrationRequest;
}

export function useRejectRegistration() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ id, payload }: RejectVariables) =>
      PartnerService.rejectRegistration(id, payload),
    onMutate: async ({ id, payload }) => {
      await queryClient.cancelQueries({ queryKey: [PARTNER_QUERY_KEYS.pending] });

      const previousQueries = queryClient.getQueriesData<PaginatedResponse<Registration>>({
        queryKey: [PARTNER_QUERY_KEYS.pending],
      });

      previousQueries.forEach(([queryKey, data]) => {
        if (!data) return;
        queryClient.setQueryData<PaginatedResponse<Registration>>(queryKey, {
          ...data,
          data: data.data.filter((item) => item.id !== id),
          meta: {
            ...data.meta,
            totalItems: Math.max(0, data.meta.totalItems - 1),
          },
        });
      });

      const previousDetail = queryClient.getQueryData<Registration>([
        PARTNER_QUERY_KEYS.detail,
        id,
      ]);
      if (previousDetail) {
        queryClient.setQueryData([PARTNER_QUERY_KEYS.detail, id], {
          ...previousDetail,
          status: 'REJECTED',
          rejectionReason: payload.reason,
        });
      }

      return { previousQueries, previousDetail };
    },
    onSuccess: (data) => {
      toast.success(`Đã từ chối đơn "${data.basicInfo.cafeName}".`);
      queryClient.setQueryData([PARTNER_QUERY_KEYS.detail, data.id], data);
    },
    onError: (error: Error, { id }, context) => {
      context?.previousQueries.forEach(([queryKey, data]) => {
        if (data) {
          queryClient.setQueryData(queryKey, data);
        }
      });
      if (context?.previousDetail) {
        queryClient.setQueryData([PARTNER_QUERY_KEYS.detail, id], context.previousDetail);
      }
      toast.error(error.message ?? 'Từ chối đơn thất bại.');
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: [PARTNER_QUERY_KEYS.pending] });
    },
  });
}
