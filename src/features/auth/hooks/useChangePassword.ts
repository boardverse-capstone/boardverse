'use client';

import { useMutation } from '@tanstack/react-query';
import { toast } from 'sonner';
import { AuthService } from '../services/auth.service';
import type { ChangePasswordRequest } from '../types/auth.interface';

function getChangePasswordErrorMessage(error: Error): string {
  const message = error.message.toLowerCase();

  if (
    message.includes('current') ||
    message.includes('hiện tại') ||
    message.includes('incorrect') ||
    message.includes('sai')
  ) {
    return 'Mật khẩu hiện tại không đúng.';
  }
  if (message.includes('401') || message.includes('unauthorized')) {
    return 'Phiên đăng nhập hết hạn. Vui lòng đăng nhập lại.';
  }
  if (message.includes('400') || message.includes('invalid')) {
    return 'Dữ liệu mật khẩu không hợp lệ. Vui lòng kiểm tra lại.';
  }

  return error.message || 'Đổi mật khẩu thất bại.';
}

export function useChangePassword() {
  return useMutation({
    mutationFn: (payload: ChangePasswordRequest) => AuthService.changePassword(payload),
    onSuccess: () => {
      toast.success('Đổi mật khẩu thành công.');
    },
    onError: (error: Error) => {
      toast.error(getChangePasswordErrorMessage(error));
    },
  });
}
