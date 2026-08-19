'use client';

import { useMutation, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { ProfileService } from '../services/profile.service';
import { PROFILE_QUERY_KEY } from './useMyProfile';

function getDeleteProfileErrorMessage(error: Error): string {
  const message = error.message.toLowerCase();

  if (message.includes('401')) {
    return 'Phiên đăng nhập không hợp lệ. Vui lòng đăng nhập lại.';
  }
  if (message.includes('403')) {
    return 'Tài khoản bị chặn hoặc vô hiệu hóa.';
  }

  return error.message || 'Vô hiệu hóa hồ sơ thất bại.';
}

export function useDeleteProfile() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: () => ProfileService.deleteProfile(),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: PROFILE_QUERY_KEY });
      toast.success('Đã vô hiệu hóa hồ sơ thành công.');
    },
    onError: (error: Error) => {
      toast.error(getDeleteProfileErrorMessage(error));
    },
  });
}
