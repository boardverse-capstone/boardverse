'use client';

import { useMutation, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { UserManagementService, USER_QUERY_KEYS } from '../services/user-management.service';

export function useUnblockUser() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (id: string) => UserManagementService.unblockUser(id),
    onSuccess: (data) => {
      toast.success(`Đã mở khóa tài khoản "${data.username}".`);
      queryClient.setQueryData([USER_QUERY_KEYS.detail, data.id], data);
      queryClient.invalidateQueries({ queryKey: [USER_QUERY_KEYS.list] });
    },
    onError: (error: Error) => {
      toast.error(error.message ?? 'Mở khóa tài khoản thất bại.');
    },
  });
}
