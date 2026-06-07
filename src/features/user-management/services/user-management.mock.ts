import type { PaginatedResponse } from '@/shared/types/pagination.interface';
import type {
  BlockUserRequest,
  ManagedUser,
  UpdateUserRoleRequest,
  UserListParams,
} from '../types/user.interface';

const delay = (ms = 350) => new Promise((resolve) => setTimeout(resolve, ms));

const ROLES = ['User', 'Manager', 'Staff', 'User', 'Manager', 'Staff'] as const;

const NAMES = [
  'alice_player',
  'bob_manager',
  'carol_staff',
  'david_player',
  'emma_manager',
  'frank_staff',
  'grace_player',
  'henry_manager',
  'ivy_staff',
  'jack_player',
  'kate_manager',
  'leo_staff',
  'mia_player',
  'noah_manager',
  'olivia_staff',
  'paul_player',
];

let users: ManagedUser[] = NAMES.map((username, index) => {
  const role = ROLES[index % ROLES.length];
  const blocked = index === 3 || index === 9;

  return {
    id: `00000000-0000-4000-8000-${String(index + 1).padStart(12, '0')}`,
    username,
    email: `${username}@boardverse.test`,
    role,
    isActive: index !== 7,
    isBlocked: blocked,
    blockReason: blocked ? 'Vi phạm điều khoản sử dụng nền tảng.' : null,
    createdAt: new Date(2026, 0, 5 + index).toISOString(),
    updatedAt: new Date(2026, 2, 1 + index).toISOString(),
  };
});

function buildMeta(totalItems: number, page: number, limit: number) {
  const totalPages = Math.max(1, Math.ceil(totalItems / limit));
  return {
    currentPage: page,
    limit,
    totalItems,
    totalPages,
    hasPrevious: page > 1,
    hasNext: page < totalPages,
  };
}

function filterUsers(params: UserListParams): PaginatedResponse<ManagedUser> {
  const search = params.search?.trim().toLowerCase() ?? '';
  const roleFilter = params.role && params.role !== 'all' ? params.role : undefined;

  const filtered = users.filter((user) => {
    if (roleFilter && user.role !== roleFilter) return false;
    if (params.isActive !== undefined && user.isActive !== params.isActive) return false;
    if (params.isBlocked !== undefined && user.isBlocked !== params.isBlocked) return false;
    if (!search) return true;

    return (
      user.username.toLowerCase().includes(search) ||
      user.email.toLowerCase().includes(search) ||
      user.id.toLowerCase().includes(search)
    );
  });

  const start = (params.page - 1) * params.limit;
  return {
    data: filtered.slice(start, start + params.limit),
    meta: buildMeta(filtered.length, params.page, params.limit),
  };
}

function findUser(id: string) {
  return users.find((user) => user.id === id);
}

export const UserManagementMockService = {
  getUsers: async (params: UserListParams): Promise<PaginatedResponse<ManagedUser>> => {
    await delay();
    return filterUsers(params);
  },

  getUserById: async (id: string): Promise<ManagedUser> => {
    await delay();
    const user = findUser(id);
    if (!user) throw new Error('Không tìm thấy người dùng.');
    return user;
  },

  blockUser: async (id: string, payload: BlockUserRequest): Promise<ManagedUser> => {
    await delay(500);
    const index = users.findIndex((user) => user.id === id);
    if (index === -1) throw new Error('Không tìm thấy người dùng.');
    if (!payload.reason.trim()) throw new Error('Vui lòng nhập lý do khóa tài khoản.');

    users[index] = {
      ...users[index],
      isBlocked: true,
      blockReason: payload.reason.trim(),
      updatedAt: new Date().toISOString(),
    };
    return users[index];
  },

  unblockUser: async (id: string): Promise<ManagedUser> => {
    await delay(500);
    const index = users.findIndex((user) => user.id === id);
    if (index === -1) throw new Error('Không tìm thấy người dùng.');

    users[index] = {
      ...users[index],
      isBlocked: false,
      blockReason: null,
      updatedAt: new Date().toISOString(),
    };
    return users[index];
  },

  updateUserRole: async (id: string, payload: UpdateUserRoleRequest): Promise<ManagedUser> => {
    await delay(500);
    const index = users.findIndex((user) => user.id === id);
    if (index === -1) throw new Error('Không tìm thấy người dùng.');
    if (!payload.role.trim()) throw new Error('Vui lòng chọn vai trò.');

    users[index] = {
      ...users[index],
      role: payload.role,
      updatedAt: new Date().toISOString(),
    };
    return users[index];
  },
} as const;
