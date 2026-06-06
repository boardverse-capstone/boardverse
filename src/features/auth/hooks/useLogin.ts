'use client';

// src/features/auth/hooks/useLogin.ts
import { useMutation } from '@tanstack/react-query';
import { useRouter } from 'next/navigation';
import { toast } from 'sonner';
import { AuthService } from '../services/auth.service';
import { useAuthStore } from '../store/auth.store';
import { decodeToken, normalizeUser } from '@/shared/utils/token.util';
import { UserRole } from '@/core/constants/roles';
import { ROUTES } from '@/core/constants/routes';
import type { LoginRequest } from '../types/auth.interface';

/** Map role về route dashboard tương ứng */
const ROLE_ROUTE_MAP: Record<string, string> = {
  [UserRole.Admin]: ROUTES.DASHBOARD.ADMIN,
  [UserRole.Manager]: ROUTES.DASHBOARD.MANAGER,
  [UserRole.Staff]: ROUTES.DASHBOARD.STAFF,
};

export function useLogin() {
  const router = useRouter();
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

      const redirectTo = ROLE_ROUTE_MAP[user.role];
      if (!redirectTo) {
        toast.error('Vai trò không được cấp quyền truy cập vào hệ thống quản trị.');
        return;
      }

      toast.success(`Chào mừng trở lại, ${user.username}!`);
      router.push(redirectTo);
    },
    onError: (error: Error) => {
      toast.error(error.message ?? 'Đăng nhập thất bại. Vui lòng kiểm tra lại thông tin.');
    },
  });
}
