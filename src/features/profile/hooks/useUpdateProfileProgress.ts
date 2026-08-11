'use client';

import { useMutation, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { ProfileService } from '../services/profile.service';
import type { ProfileProgressUpdateRequest } from '../types/profile.interface';
import { PROFILE_QUERY_KEY } from './useMyProfile';

function getUpdateProgressErrorMessage(error: Error): string {
  const message = error.message.toLowerCase();

  if (message.includes('400') || message.includes('invalid')) {
    return 'Dữ liệu tiến trình không hợp lệ. Vui lòng kiểm tra lại.';
  }
  if (message.includes('404')) {
    return 'Không tìm thấy hồ sơ để cập nhật tiến trình.';
  }
  if (message.includes('403')) {
    return 'Tài khoản bị chặn hoặc vô hiệu hóa.';
  }

  return error.message || 'Cập nhật tiến trình thất bại.';
}

export function useUpdateProfileProgress() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (payload: ProfileProgressUpdateRequest) =>
      ProfileService.updateProgress(payload),
    onSuccess: (data) => {
      queryClient.setQueryData(PROFILE_QUERY_KEY, data);
      toast.success('Đã cập nhật tiến trình thành công.');
    },
    onError: (error: Error) => {
      toast.error(getUpdateProgressErrorMessage(error));
    },
  });
}
