'use client';

import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useRouter } from 'next/navigation';
import { toast } from 'sonner';
import { ROUTES } from '@/core/constants/routes';
import { UserManagementService, USER_QUERY_KEYS } from '../services/user-management.service';

interface DisableUserVariables {
  id: string;
  username: string;
}

export function useDisableUser() {
  const queryClient = useQueryClient();
  const router = useRouter();

  return useMutation({
    mutationFn: ({ id }: DisableUserVariables) => UserManagementService.disableUser(id),
    onSuccess: (_data, variables) => {
      toast.success(`Đã xóa tài khoản "${variables.username}".`);
      queryClient.removeQueries({ queryKey: [USER_QUERY_KEYS.detail, variables.id] });
      queryClient.invalidateQueries({ queryKey: [USER_QUERY_KEYS.list] });
      router.push(ROUTES.ADMIN.USERS);
    },
    onError: (error: Error) => {
      toast.error(error.message ?? 'Xóa tài khoản thất bại.');
    },
  });
}
