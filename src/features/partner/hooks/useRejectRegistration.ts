'use client';

import { useMutation, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { PartnerService, PARTNER_QUERY_KEYS } from '../services/partner.service';
import type { PaginatedResponse } from '@/shared/types/pagination.interface';
import type { PartnerApplication } from '../types/partner.interface';
import { mapRegistrationToPartnerApplication } from '../utils/partner.mapper';
import { syncPartnerInPendingCaches } from '../utils/partner-cache.util';

interface RejectVariables {
  id: string;
  payload: { reason: string };
}

export function useRejectRegistration() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ id, payload }: RejectVariables) =>
      PartnerService.rejectRegistration(id, payload),
    onMutate: async ({ id, payload }) => {
      await queryClient.cancelQueries({ queryKey: [PARTNER_QUERY_KEYS.pending] });

      const previousQueries = queryClient.getQueriesData({
        queryKey: [PARTNER_QUERY_KEYS.pending],
      });

      queryClient.setQueriesData<PaginatedResponse<PartnerApplication>>(
        { queryKey: [PARTNER_QUERY_KEYS.pending] },
        (old) => {
          if (!old) return old;
          return {
            ...old,
            data: old.data.map((item) =>
              item.id === id
                ? {
                    ...item,
                    applicationStatus: 'REJECTED' as const,
                    operationalStatus: null,
                    rejectionReason: payload.reason,
                  }
                : item,
            ),
          };
        },
      );

      const previousDetail = queryClient.getQueryData<PartnerApplication>([
        PARTNER_QUERY_KEYS.detail,
        id,
      ]);
      if (previousDetail) {
        queryClient.setQueryData([PARTNER_QUERY_KEYS.detail, id], {
          ...previousDetail,
          applicationStatus: 'REJECTED',
          operationalStatus: null,
          rejectionReason: payload.reason,
        });
      }

      return { previousQueries, previousDetail };
    },
    onSuccess: (data) => {
      const application = mapRegistrationToPartnerApplication(data);
      toast.success(`Đã từ chối đơn "${application.cafeName}".`);
      queryClient.setQueryData([PARTNER_QUERY_KEYS.detail, application.id], application);
      syncPartnerInPendingCaches(queryClient, application);
      queryClient.invalidateQueries({ queryKey: [PARTNER_QUERY_KEYS.pending] });
      queryClient.invalidateQueries({ queryKey: [PARTNER_QUERY_KEYS.detail, application.id] });
    },
    onError: (error: Error, { id }, context) => {
      context?.previousQueries.forEach(([queryKey, data]) => {
        if (data) queryClient.setQueryData(queryKey, data);
      });
      if (context?.previousDetail) {
        queryClient.setQueryData([PARTNER_QUERY_KEYS.detail, id], context.previousDetail);
      }
      toast.error(error.message ?? 'Từ chối đơn thất bại.');
    },
  });
}
