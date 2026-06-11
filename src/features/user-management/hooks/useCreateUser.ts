'use client';

import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useRouter } from 'next/navigation';
import { toast } from 'sonner';
import { ROUTES } from '@/core/constants/routes';
import { UserManagementService, USER_QUERY_KEYS } from '../services/user-management.service';
import type { CreateUserRequest } from '../types/user.interface';

export function useCreateUser() {
  const queryClient = useQueryClient();
  const router = useRouter();

  return useMutation({
    mutationFn: (payload: CreateUserRequest) => UserManagementService.createUser(payload),
    onSuccess: (data) => {
      toast.success(`Đã tạo tài khoản "${data.username}" thành công.`);
      queryClient.invalidateQueries({ queryKey: [USER_QUERY_KEYS.list] });
      router.push(ROUTES.ADMIN.USER_DETAIL(data.id));
    },
    onError: (error: Error) => {
      toast.error(error.message ?? 'Tạo tài khoản thất bại.');
    },
  });
}
