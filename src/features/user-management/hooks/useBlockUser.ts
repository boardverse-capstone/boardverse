'use client';

import { useMutation, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { UserManagementService, USER_QUERY_KEYS } from '../services/user-management.service';
import type { BlockUserRequest } from '../types/user.interface';

interface BlockVariables {
  id: string;
  payload: BlockUserRequest;
}

export function useBlockUser() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ id, payload }: BlockVariables) =>
      UserManagementService.blockUser(id, payload),
    onSuccess: (data) => {
      toast.success(`Đã khóa tài khoản "${data.username}".`);
      queryClient.setQueryData([USER_QUERY_KEYS.detail, data.id], data);
      queryClient.invalidateQueries({ queryKey: [USER_QUERY_KEYS.list] });
    },
    onError: (error: Error) => {
      toast.error(error.message ?? 'Khóa tài khoản thất bại.');
    },
  });
}
