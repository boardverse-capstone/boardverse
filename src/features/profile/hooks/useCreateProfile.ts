'use client';

import { useMutation, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { ProfileService } from '../services/profile.service';
import type { ProfileCreateRequest } from '../types/profile.interface';
import { PROFILE_QUERY_KEY } from './useMyProfile';

function getCreateProfileErrorMessage(error: Error): string {
  const message = error.message.toLowerCase();

  if (message.includes('409') || message.includes('already') || message.includes('đã có')) {
    return 'Bạn đã có hồ sơ hoạt động.';
  }
  if (message.includes('400') || message.includes('invalid')) {
    return 'Dữ liệu hồ sơ không hợp lệ. Vui lòng kiểm tra lại.';
  }

  return error.message || 'Tạo hồ sơ thất bại.';
}

export function useCreateProfile() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (payload: ProfileCreateRequest) => ProfileService.createProfile(payload),
    onSuccess: (data) => {
      queryClient.setQueryData(PROFILE_QUERY_KEY, data);
      toast.success('Đã tạo hồ sơ thành công.');
    },
    onError: (error: Error) => {
      toast.error(getCreateProfileErrorMessage(error));
    },
  });
}
