'use client';

import { useMutation, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { UserManagementService, USER_QUERY_KEYS } from '../services/user-management.service';

export function useChangeUserRole(userId: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (role: string) => UserManagementService.changeUserRole(userId, role),
    onSuccess: (data) => {
      toast.success(`Đã đổi role của "${data.username}" thành ${data.role}.`);
      queryClient.setQueryData([USER_QUERY_KEYS.detail, userId], data);
      queryClient.invalidateQueries({ queryKey: [USER_QUERY_KEYS.list] });
    },
    onError: (error: Error) => {
      toast.error(error.message ?? 'Đổi role thất bại.');
    },
  });
}
