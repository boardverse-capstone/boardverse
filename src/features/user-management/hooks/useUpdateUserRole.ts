'use client';

import { useMutation, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { MANAGED_ROLE_LABELS } from '@/core/constants/user-management';
import { UserManagementService, USER_QUERY_KEYS } from '../services/user-management.service';
import type { UpdateUserRoleRequest } from '../types/user.interface';

interface UpdateRoleVariables {
  id: string;
  payload: UpdateUserRoleRequest;
}

export function useUpdateUserRole() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ id, payload }: UpdateRoleVariables) =>
      UserManagementService.updateUserRole(id, payload),
    onSuccess: (data, variables) => {
      const roleLabel = MANAGED_ROLE_LABELS[variables.payload.role] ?? variables.payload.role;
      toast.success(`Đã cập nhật vai trò "${data.username}" thành ${roleLabel}.`);
      queryClient.setQueryData([USER_QUERY_KEYS.detail, data.id], data);
      queryClient.invalidateQueries({ queryKey: [USER_QUERY_KEYS.list] });
    },
    onError: (error: Error) => {
      toast.error(error.message ?? 'Cập nhật vai trò thất bại.');
    },
  });
}
