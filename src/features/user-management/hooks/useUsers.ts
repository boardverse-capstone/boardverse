'use client';

import { useQuery } from '@tanstack/react-query';
import { UserManagementService, USER_QUERY_KEYS } from '../services/user-management.service';
import type { UserListParams } from '../types/user.interface';

export function useUsers(params: UserListParams) {
  return useQuery({
    queryKey: [
      USER_QUERY_KEYS.list,
      params.page,
      params.limit,
      params.search,
      params.role,
      params.isActive,
      params.isBlocked,
    ],
    queryFn: () => UserManagementService.getUsers(params),
    placeholderData: (previousData, previousQuery) => {
      if (!previousQuery) return undefined;
      const [, prevPage, prevLimit] = previousQuery.queryKey as [
        string,
        number,
        number,
        ...unknown[],
      ];
      if (prevPage === params.page && prevLimit === params.limit) {
        return previousData;
      }
      return undefined;
    },
    staleTime: 5000,
  });
}
