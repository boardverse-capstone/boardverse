import type { PaginatedResponse } from '@/shared/types/pagination.interface';
import type {
  ApiUserRecord,
  BlockUserRequest,
  CreateUserRequest,
  ManagedUser,
  UpdateUserRequest,
  UserListParams,
} from '../types/user.interface';
import { mapApiUser } from '../utils/user.mapper';

const delay = (ms = 350) => new Promise((resolve) => setTimeout(resolve, ms));

/** Dữ liệu mẫu bám theo Users.json từ API thật */
const API_USERS_FIXTURE: ApiUserRecord[] = [
  {
    Id: '0181564c-79c8-4488-9cca-a4c11da2ff74',
    Username: '123123',
    Email: '12321321@gmail.com',
    Provider: 'Local',
    CreatedAt: '2026-05-30 18:40:06.580817+00',
    IsActive: true,
    IsEmailVerified: false,
    LastLoginAt: null,
    PhoneNumber: '0855199924',
    Role: 'User',
    IsBlocked: false,
    BlockReason: null,
    BlockedAt: null,
    UpdatedAt: '2026-06-05 15:35:58.160049+00',
  },
  {
    Id: '092bbcf3-e729-43b5-8913-898961babc99',
    Username: 'jonny',
    Email: 'jonnytran.working@gmail.com',
    Provider: 'Local',
    CreatedAt: '2026-06-06 02:52:28.920457+00',
    IsActive: true,
    IsEmailVerified: false,
    LastLoginAt: '2026-06-08 03:15:25.409789+00',
    PhoneNumber: '086950259',
    Role: 'User',
    IsBlocked: false,
    UpdatedAt: '2026-06-08 03:15:25.40979+00',
  },
  {
    Id: '9e1f4cfa-2b0a-4cb4-b7f9-f1d643827b08',
    Username: 'admin',
    Email: 'admin@gmail.com',
    Provider: 'Local',
    CreatedAt: '2026-06-05 17:59:54.620524+00',
    IsActive: true,
    IsEmailVerified: false,
    LastLoginAt: '2026-06-08 03:25:34.006016+00',
    PhoneNumber: '123456785',
    Role: 'Admin',
    IsBlocked: false,
    UpdatedAt: '2026-06-08 03:25:34.006018+00',
  },
  {
    Id: 'e83458ea-e8a6-4f63-a973-0b98830e119d',
    Username: 'cafestaff',
    Email: 'ooms0152@gmail.com',
    Provider: 'Local',
    CreatedAt: '2026-06-06 04:02:16.13939+00',
    IsActive: true,
    IsEmailVerified: false,
    LastLoginAt: '2026-06-06 04:02:16.206492+00',
    PhoneNumber: '12345678',
    Role: 'cafestaff',
    IsBlocked: false,
    UpdatedAt: '2026-06-06 04:02:16.13939+00',
  },
];

let users: ManagedUser[] = API_USERS_FIXTURE.map(mapApiUser);

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
      (user.phoneNumber?.toLowerCase().includes(search) ?? false) ||
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
      blockedAt: new Date().toISOString(),
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
      blockedAt: null,
      updatedAt: new Date().toISOString(),
    };
    return users[index];
  },

  createUser: async (payload: CreateUserRequest): Promise<ManagedUser> => {
    await delay(600);

    const username = payload.username.trim();
    const email = payload.email.trim().toLowerCase();

    if (users.some((user) => user.username.toLowerCase() === username.toLowerCase())) {
      throw new Error('Username đã tồn tại trong hệ thống.');
    }
    if (users.some((user) => user.email.toLowerCase() === email)) {
      throw new Error('Email đã tồn tại trong hệ thống.');
    }

    const now = new Date().toISOString();
    const record: ApiUserRecord = {
      Id: crypto.randomUUID(),
      Username: username,
      Email: email,
      Provider: 'Local',
      CreatedAt: now,
      UpdatedAt: now,
      IsActive: true,
      IsEmailVerified: false,
      IsBlocked: false,
      BlockReason: null,
      BlockedAt: null,
      LastLoginAt: null,
      PhoneNumber: null,
      Role: payload.role,
    };

    const created = mapApiUser(record);
    users = [created, ...users];
    return created;
  },

  updateUser: async (id: string, payload: UpdateUserRequest): Promise<ManagedUser> => {
    await delay(500);
    const index = users.findIndex((user) => user.id === id);
    if (index === -1) throw new Error('Không tìm thấy người dùng.');

    const username = payload.username?.trim();
    const email = payload.email?.trim().toLowerCase();

    if (
      username &&
      users.some(
        (user, userIndex) =>
          userIndex !== index && user.username.toLowerCase() === username.toLowerCase(),
      )
    ) {
      throw new Error('Username đã tồn tại trong hệ thống.');
    }

    if (
      email &&
      users.some(
        (user, userIndex) => userIndex !== index && user.email.toLowerCase() === email,
      )
    ) {
      throw new Error('Email đã tồn tại trong hệ thống.');
    }

    users[index] = {
      ...users[index],
      ...(username ? { username } : {}),
      ...(email ? { email } : {}),
      ...(payload.role ? { role: payload.role } : {}),
      ...(payload.isActive != null ? { isActive: payload.isActive } : {}),
      ...(payload.karmaPoints != null ? { karmaPoints: payload.karmaPoints } : {}),
      ...(payload.isBlocked != null
        ? {
            isBlocked: payload.isBlocked,
            blockReason: payload.isBlocked ? users[index].blockReason : null,
            blockedAt: payload.isBlocked ? users[index].blockedAt ?? new Date().toISOString() : null,
          }
        : {}),
      updatedAt: new Date().toISOString(),
    };

    return users[index];
  },

  disableUser: async (id: string): Promise<void> => {
    await delay(500);
    const index = users.findIndex((user) => user.id === id);
    if (index === -1) throw new Error('Không tìm thấy người dùng.');

    users[index] = {
      ...users[index],
      isActive: false,
      updatedAt: new Date().toISOString(),
    };
  },
} as const;
