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
import { UserManagementMockService } from './user-management.mock';

const USE_MOCK = process.env.NEXT_PUBLIC_USE_MOCK_USER_API === 'true';

export const USER_QUERY_KEYS = {
  list: 'user-management-list',
  detail: 'user-management-detail',
} as const;

export const UserManagementService = {
  getUsers: async (params: UserListParams): Promise<PaginatedResponse<ManagedUser>> => {
    if (USE_MOCK) return UserManagementMockService.getUsers(params);

    const raw = await apiClient.get<
      never,
      RawUserRecord[] | PaginatedResponse<ManagedUser> | { Items: RawUserRecord[]; TotalCount: number; Page: number; PageSize: number }
    >('/api/UserManagement', {
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
    if (USE_MOCK) return UserManagementMockService.getUserById(id);
    const raw = await apiClient.get<never, RawUserRecord | ManagedUser>(`/api/UserManagement/${id}`);
    return mapApiUser(raw);
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

  createUser: async (payload: CreateUserRequest): Promise<ManagedUser> => {
    if (USE_MOCK) return UserManagementMockService.createUser(payload);

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
    if (USE_MOCK) return UserManagementMockService.updateUser(id, payload);

    const body: UpdateUserRequest = {};
    if (payload.username != null) body.username = payload.username.trim();
    if (payload.email != null) body.email = payload.email.trim();
    if (payload.password) body.password = payload.password;
    if (payload.role != null) body.role = payload.role;
    if (payload.isActive != null) body.isActive = payload.isActive;
    if (payload.isBlocked != null) body.isBlocked = payload.isBlocked;

    const raw = await apiClient.put<never, RawUserRecord | ManagedUser>(
      `/api/UserManagement/${id}`,
      body,
    );

    return mapApiUser(raw);
  },

  disableUser: async (id: string): Promise<void> => {
    if (USE_MOCK) return UserManagementMockService.disableUser(id);
    await apiClient.delete(`/api/UserManagement/${id}`);
  },
} as const;
