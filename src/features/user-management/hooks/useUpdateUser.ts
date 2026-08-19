'use client';

import { useMutation, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { UserManagementService, USER_QUERY_KEYS } from '../services/user-management.service';
import type { UpdateUserRequest } from '../types/user.interface';

export function useUpdateUser(id: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (payload: UpdateUserRequest) => UserManagementService.updateUser(id, payload),
    onSuccess: (data) => {
      toast.success(`Đã cập nhật tài khoản "${data.username}" thành công.`);
      queryClient.setQueryData([USER_QUERY_KEYS.detail, id], data);
      queryClient.invalidateQueries({ queryKey: [USER_QUERY_KEYS.list] });
    },
    onError: (error: Error) => {
      toast.error(error.message ?? 'Cập nhật tài khoản thất bại.');
    },
  });
}
