'use client';

import { useMutation, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { ProfileService } from '../services/profile.service';
import type { ProfileAvatarUpdateRequest, UserProfile } from '../types/profile.interface';
import { PROFILE_QUERY_KEY } from './useMyProfile';

function getUpdateAvatarErrorMessage(error: Error): string {
  const message = error.message.toLowerCase();

  if (message.includes('400') || message.includes('invalid') || message.includes('url')) {
    return 'URL avatar không hợp lệ. Vui lòng kiểm tra lại.';
  }
  if (message.includes('404')) {
    return 'Không tìm thấy hồ sơ để cập nhật avatar.';
  }
  if (message.includes('403')) {
    return 'Tài khoản bị chặn hoặc vô hiệu hóa.';
  }

  return error.message || 'Cập nhật avatar thất bại.';
}

export function useUpdateProfileAvatar() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (payload: ProfileAvatarUpdateRequest) => ProfileService.updateAvatar(payload),
    onSuccess: (data, variables) => {
      if (data) {
        queryClient.setQueryData(PROFILE_QUERY_KEY, data);
      } else {
        queryClient.setQueryData<UserProfile | undefined>(PROFILE_QUERY_KEY, (current) =>
          current ? { ...current, avatarUrl: variables.avatarUrl } : current,
        );
      }
      toast.success('Đã cập nhật avatar thành công.');
    },
    onError: (error: Error) => {
      toast.error(getUpdateAvatarErrorMessage(error));
    },
  });
}
