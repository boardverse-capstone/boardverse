'use client';

import { useMutation } from '@tanstack/react-query';
import { useRouter, useSearchParams } from 'next/navigation';
import { toast } from 'sonner';
import { AuthService } from '../services/auth.service';
import { useAuthStore } from '../store/auth.store';
import { decodeToken, normalizeUser } from '@/shared/utils/token.util';
import { ROUTES } from '@/core/constants/routes';
import {
  clearReturnUrl,
  getReturnUrl,
  resolvePostLoginRedirect,
} from '../utils/redirect.util';
import type { LoginRequest } from '../types/auth.interface';

export function useLogin() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { setAuth } = useAuthStore();

  return useMutation({
    mutationFn: (payload: LoginRequest) => AuthService.login(payload),
    onSuccess: (data) => {
      const decoded = decodeToken(data.token);
      if (!decoded) {
        toast.error('Token không hợp lệ. Vui lòng thử lại.');
        return;
      }

      const user = normalizeUser(decoded);
      setAuth(data.token, data.refreshToken, user);

      const returnUrl = searchParams.get('returnUrl') ?? getReturnUrl();
      const redirectTo = resolvePostLoginRedirect(user.role, returnUrl);

      if (!redirectTo || redirectTo === ROUTES.AUTH.LOGIN) {
        toast.error('Vai trò không được cấp quyền truy cập vào hệ thống quản trị.');
        return;
      }

      clearReturnUrl();
      toast.success(`Chào mừng trở lại, ${user.username}!`);
      router.replace(redirectTo);
    },
    onError: (error: Error) => {
      toast.error(error.message ?? 'Đăng nhập thất bại. Vui lòng kiểm tra lại thông tin.');
    },
  });
}
