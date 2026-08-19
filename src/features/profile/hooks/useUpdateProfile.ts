'use client';

import { useMutation, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { ProfileService } from '../services/profile.service';
import type { ProfileUpdateRequest } from '../types/profile.interface';
import { PROFILE_QUERY_KEY } from './useMyProfile';

function getUpdateProfileErrorMessage(error: Error): string {
  const message = error.message.toLowerCase();

  if (message.includes('400') || message.includes('invalid')) {
    return 'Dữ liệu hồ sơ không hợp lệ. Vui lòng kiểm tra lại.';
  }
  if (message.includes('404')) {
    return 'Không tìm thấy hồ sơ để cập nhật.';
  }

  return error.message || 'Cập nhật hồ sơ thất bại.';
}

export function useUpdateProfile() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (payload: ProfileUpdateRequest) => ProfileService.updateProfile(payload),
    onSuccess: (data) => {
      queryClient.setQueryData(PROFILE_QUERY_KEY, data);
      toast.success('Đã cập nhật hồ sơ thành công.');
    },
    onError: (error: Error) => {
      toast.error(getUpdateProfileErrorMessage(error));
    },
  });
}
