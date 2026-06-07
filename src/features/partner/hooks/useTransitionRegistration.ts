'use client';

import { useMutation, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { REGISTRATION_ACTION_LABELS } from '@/core/constants/partner-registration';
import { PartnerService, PARTNER_QUERY_KEYS } from '../services/partner.service';
import type { PaginatedResponse } from '@/shared/types/pagination.interface';
import type {
  Registration,
  TransitionRegistrationRequest,
} from '../types/partner.interface';
import { isAdminActionable } from '../utils/registration-workflow';

interface TransitionVariables {
  id: string;
  payload: TransitionRegistrationRequest;
}

export function useTransitionRegistration() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ id, payload }: TransitionVariables) =>
      PartnerService.transitionRegistration(id, payload),
    onMutate: async ({ id, payload }) => {
      await queryClient.cancelQueries({ queryKey: [PARTNER_QUERY_KEYS.pending] });

      const previousQueries = queryClient.getQueriesData<PaginatedResponse<Registration>>({
        queryKey: [PARTNER_QUERY_KEYS.pending],
      });

      previousQueries.forEach(([queryKey, data]) => {
        if (!data) return;

        const shouldRemove =
          payload.action === 'REJECT' ||
          payload.action === 'CANCEL_NEGOTIATION' ||
          payload.action === 'ACTIVATE_PARTNER';

        queryClient.setQueryData<PaginatedResponse<Registration>>(queryKey, {
          ...data,
          data: shouldRemove
            ? data.data.filter((item) => item.id !== id)
            : data.data.map((item) =>
                item.id === id
                  ? {
                      ...item,
                      status:
                        payload.action === 'REJECT'
                          ? 'REJECTED'
                          : payload.action === 'PASS_OPS_ASSESSMENT'
                            ? 'PENDING_NEGOTIATION'
                            : payload.action === 'CONFIRM_VERIFICATION'
                              ? 'PENDING_NEGOTIATION'
                              : payload.action === 'RECORD_CONTRACT_SIGNED'
                                ? 'DATA_BLANK'
                                : item.status,
                    }
                  : item,
              ).filter((item) => isAdminActionable(item.status)),
          meta: shouldRemove
            ? { ...data.meta, totalItems: Math.max(0, data.meta.totalItems - 1) }
            : data.meta,
        });
      });

      return { previousQueries };
    },
    onSuccess: (data, variables) => {
      const label = REGISTRATION_ACTION_LABELS[variables.payload.action];
      toast.success(`${label} thành công.`);

      if (data.managerAccount) {
        toast.message('Đã cấp tài khoản CAFE_MANAGER', {
          description: `Email: ${data.managerAccount.email}`,
        });
      }

      queryClient.setQueryData(
        [PARTNER_QUERY_KEYS.detail, data.registration.id],
        data.registration,
      );
    },
    onError: (error: Error, _vars, context) => {
      context?.previousQueries.forEach(([queryKey, data]) => {
        if (data) queryClient.setQueryData(queryKey, data);
      });
      toast.error(error.message);
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: [PARTNER_QUERY_KEYS.pending] });
      queryClient.invalidateQueries({ queryKey: [PARTNER_QUERY_KEYS.detail] });
    },
  });
}
