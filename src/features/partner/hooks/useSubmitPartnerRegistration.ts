'use client';

import { useMutation } from '@tanstack/react-query';
import { toast } from 'sonner';
import { PartnerService } from '../services/partner.service';
import type { PartnerRegistrationRequest } from '../types/partner.interface';

export function useSubmitPartnerRegistration() {
  return useMutation({
    mutationFn: (payload: PartnerRegistrationRequest) =>
      PartnerService.submitRegistration(payload),
    onSuccess: (data) => {
      toast.success(data.message ?? 'Gửi đơn đăng ký thành công.');
    },
    onError: (error: Error) => {
      toast.error(error.message);
    },
  });
}
