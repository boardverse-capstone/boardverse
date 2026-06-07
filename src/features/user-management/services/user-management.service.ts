import apiClient from '@/core/api/client';
import type { PaginatedResponse } from '@/shared/types/pagination.interface';
import type {
  BlockUserRequest,
  ManagedUser,
  UpdateUserRoleRequest,
  UserListParams,
} from '../types/user.interface';
import { normalizeUserListResponse } from '../utils/user.mapper';
import { UserManagementMockService } from './user-management.mock';

const USE_MOCK = process.env.NEXT_PUBLIC_USE_MOCK_USER_API === 'true';

export const USER_QUERY_KEYS = {
  list: 'user-management-list',
  detail: 'user-management-detail',
} as const;

export const UserManagementService = {
  getUsers: async (params: UserListParams): Promise<PaginatedResponse<ManagedUser>> => {
    if (USE_MOCK) return UserManagementMockService.getUsers(params);

    const raw = await apiClient.get<never, ManagedUser[] | PaginatedResponse<ManagedUser>>(
      '/api/UserManagement/users',
      {
        params: {
          Page: params.page,
          PageSize: params.limit,
          Search: params.search,
          Role: params.role && params.role !== 'all' ? params.role : undefined,
          IsActive: params.isActive,
          IsBlocked: params.isBlocked,
        },
      },
    );

    return normalizeUserListResponse(raw, params);
  },

  getUserById: async (id: string): Promise<ManagedUser> => {
    if (USE_MOCK) return UserManagementMockService.getUserById(id);
    return apiClient.get<never, ManagedUser>(`/api/UserManagement/${id}`);
  },

  blockUser: async (id: string, payload: BlockUserRequest): Promise<ManagedUser> => {
    if (USE_MOCK) return UserManagementMockService.blockUser(id, payload);
    await apiClient.post(`/api/UserManagement/users/${id}/block`, payload);
    return UserManagementService.getUserById(id);
  },

  unblockUser: async (id: string): Promise<ManagedUser> => {
    if (USE_MOCK) return UserManagementMockService.unblockUser(id);
    await apiClient.post(`/api/UserManagement/users/${id}/unblock`);
    return UserManagementService.getUserById(id);
  },

  updateUserRole: async (id: string, payload: UpdateUserRoleRequest): Promise<ManagedUser> => {
    if (USE_MOCK) return UserManagementMockService.updateUserRole(id, payload);
    await apiClient.put(`/api/UserManagement/users/${id}/role`, payload);
    return UserManagementService.getUserById(id);
  },
} as const;
