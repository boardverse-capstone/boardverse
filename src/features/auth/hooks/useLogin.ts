'use client';

import { useMutation } from '@tanstack/react-query';
import { useRouter, useSearchParams } from 'next/navigation';
import { toast } from 'sonner';
import { normalizePortalRole } from '@/core/constants/roles';
import { ROUTES } from '@/core/constants/routes';
import { decodeToken, isTokenExpired, normalizeUser } from '@/shared/utils/token.util';
import { AuthService } from '../services/auth.service';
import { useAuthStore } from '../store/auth.store';
import {
  clearReturnUrl,
  getReturnUrl,
  resolvePostLoginRedirect,
} from '../utils/redirect.util';
import type { LoginRequest } from '../types/auth.interface';

function getLoginErrorMessage(error: Error): string {
  const message = error.message.toLowerCase();

  if (message.includes('unauthorized') || message.includes('invalid')) {
    return 'Sai tên đăng nhập hoặc mật khẩu.';
  }
  if (message.includes('forbidden') || message.includes('blocked') || message.includes('suspended')) {
    return 'Tài khoản đã bị khóa hoặc không có quyền truy cập.';
  }
  if (message.includes('too many') || message.includes('429')) {
    return 'Quá nhiều lần đăng nhập. Vui lòng thử lại sau.';
  }

  return error.message || 'Đăng nhập thất bại. Vui lòng kiểm tra lại thông tin.';
}

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

      if (isTokenExpired(decoded)) {
        toast.error('Phiên đăng nhập không hợp lệ. Vui lòng thử lại.');
        return;
      }

      const decodedUser = normalizeUser(decoded);
      const portalRole = normalizePortalRole(decodedUser.role);

      if (!portalRole) {
        toast.error('Tài khoản Player không có quyền truy cập hệ thống quản trị.');
        return;
      }

      const user = { ...decodedUser, role: portalRole };
      setAuth(data.token, data.refreshToken, user);

      const returnUrl = searchParams.get('returnUrl') ?? getReturnUrl();
      const redirectTo = resolvePostLoginRedirect(user.role, returnUrl);

      if (!redirectTo || redirectTo === ROUTES.AUTH.LOGIN) {
        toast.error('Vai trò không được cấp quyền truy cập vào hệ thống quản trị.');
        useAuthStore.getState().clearAuth();
        return;
      }

      clearReturnUrl();
      toast.success(`Chào mừng trở lại, ${user.username}!`);
      router.replace(redirectTo);
    },
    onError: (error: Error) => {
      toast.error(getLoginErrorMessage(error));
    },
  });
}
