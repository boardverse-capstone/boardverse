'use client';

// src/features/auth/hooks/useLogout.ts
import { useMutation } from '@tanstack/react-query';
import { useRouter } from 'next/navigation';
import { toast } from 'sonner';
import { AuthService } from '../services/auth.service';
import { useAuthStore } from '../store/auth.store';
import { ROUTES } from '@/core/constants/routes';

export function useLogout() {
  const router = useRouter();
  const { refreshToken, clearAuth } = useAuthStore();

  return useMutation({
    mutationFn: async () => {
      if (refreshToken) {
        // Best-effort: logout API không cần thành công để clear local state
        await AuthService.logout({ refreshToken }).catch(() => {});
      }
    },
    onSettled: () => {
      clearAuth();
      router.replace(ROUTES.AUTH.LOGIN);
    },
    onError: () => {
      // Luôn clear auth kể cả khi API lỗi
      toast.info('Đã đăng xuất.');
    },
  });
}
