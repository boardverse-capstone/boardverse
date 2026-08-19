'use client';

import { useMutation, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { REGISTRATION_ACTION_LABELS } from '@/core/constants/partner-registration';
import { PartnerService, PARTNER_QUERY_KEYS } from '../services/partner.service';
import type { TransitionRegistrationRequest } from '../types/partner.interface';
import { toPartnerApplication } from '../utils/partner.mapper';
import { syncPartnerInPendingCaches } from '../utils/partner-cache.util';

interface TransitionVariables {
  id: string;
  payload: TransitionRegistrationRequest;
}

export function useTransitionRegistration() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ id, payload }: TransitionVariables) =>
      PartnerService.transitionRegistration(id, payload),
    onSuccess: (data, variables) => {
      toast.success(`${REGISTRATION_ACTION_LABELS[variables.payload.action]} thành công.`);

      if (data.managerAccount) {
        toast.message('Đã cấp tài khoản CAFE_MANAGER', {
          description: `Email: ${data.managerAccount.email}`,
        });
      }

      queryClient.setQueryData(
        [PARTNER_QUERY_KEYS.detail, data.registration.id],
        data.registration,
      );

      syncPartnerInPendingCaches(queryClient, toPartnerApplication(data.registration));
    },
    onError: (error: Error) => {
      toast.error(error.message);
    },
  });
}
