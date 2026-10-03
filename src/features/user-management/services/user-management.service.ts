import apiClient from '@/core/api/client';
import type { PaginatedResponse } from '@/shared/types/pagination.interface';
import type {
  BlockUserRequest,
  CreateUserRequest,
  ManagedUser,
  RawUserRecord,
  UpdateUserRequest,
  UserListParams,
} from '../types/user.interface';
import { mapApiUser, normalizeUserListResponse } from '../utils/user.mapper';

export const USER_QUERY_KEYS = {
  list: 'user-management-list',
  detail: 'user-management-detail',
} as const;

export const UserManagementService = {
  getUsers: async (params: UserListParams): Promise<PaginatedResponse<ManagedUser>> => {
    const raw = await apiClient.get<
      never,
      | RawUserRecord[]
      | PaginatedResponse<ManagedUser>
      | { Items: RawUserRecord[]; TotalCount: number; Page: number; PageSize: number }
    >('/api/UserManagement/users', {
      params: {
        Page: params.page,
        PageSize: params.limit,
        Search: params.search || undefined,
        Role: params.role && params.role !== 'all' ? params.role : undefined,
        IsActive: params.isActive,
        IsBlocked: params.isBlocked,
      },
    });

    return normalizeUserListResponse(raw, params);
  },

  getUserById: async (id: string): Promise<ManagedUser> => {
    const raw = await apiClient.get<never, RawUserRecord | ManagedUser>(`/api/UserManagement/${id}`);
    return mapApiUser(raw);
  },

  blockUser: async (id: string, payload: BlockUserRequest): Promise<ManagedUser> => {
    await apiClient.post(`/api/UserManagement/users/${id}/block`, payload);
    return UserManagementService.getUserById(id);
  },

  unblockUser: async (id: string): Promise<ManagedUser> => {
    await apiClient.post(`/api/UserManagement/users/${id}/unblock`);
    return UserManagementService.getUserById(id);
  },

  createUser: async (payload: CreateUserRequest): Promise<ManagedUser> => {
    const raw = await apiClient.post<never, RawUserRecord | ManagedUser>(
      '/api/UserManagement',
      {
        username: payload.username.trim(),
        email: payload.email.trim(),
        password: payload.password,
        role: payload.role,
      },
    );

    return mapApiUser(raw);
  },

  updateUser: async (id: string, payload: UpdateUserRequest): Promise<ManagedUser> => {
    const body: UpdateUserRequest = {};
    if (payload.username != null) body.username = payload.username.trim();
    if (payload.email != null) body.email = payload.email.trim();
    if (payload.password) body.password = payload.password;
    if (payload.role != null) body.role = payload.role;
    if (payload.isActive != null) body.isActive = payload.isActive;
    if (payload.isBlocked != null) body.isBlocked = payload.isBlocked;
    if (payload.karmaPoints != null) body.karmaPoints = payload.karmaPoints;
    if (payload.blockReason != null) body.blockReason = payload.blockReason;

    const raw = await apiClient.put<never, RawUserRecord | ManagedUser>(
      `/api/UserManagement/${id}`,
      body,
    );

    return mapApiUser(raw);
  },

  disableUser: async (id: string): Promise<void> => {
    await apiClient.delete(`/api/UserManagement/${id}`);
  },

  /** PUT /api/UserManagement/users/{id}/role */
  changeUserRole: async (id: string, role: string): Promise<ManagedUser> => {
    await apiClient.put(`/api/UserManagement/users/${id}/role`, { role });
    return UserManagementService.getUserById(id);
  },
} as const;
