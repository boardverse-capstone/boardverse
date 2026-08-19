'use client';

import { useQuery } from '@tanstack/react-query';
import { UserManagementService, USER_QUERY_KEYS } from '../services/user-management.service';

export function useUserDetail(id?: string) {
  return useQuery({
    queryKey: [USER_QUERY_KEYS.detail, id],
    queryFn: () => UserManagementService.getUserById(id!),
    enabled: Boolean(id),
  });
}
