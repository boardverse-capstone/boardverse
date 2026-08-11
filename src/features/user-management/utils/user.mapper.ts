import type {
  PaginatedResponse,
  PaginationMeta,
} from '@/shared/types/pagination.interface';
import type { ManagedUser, RawUserRecord, UserListParams } from '../types/user.interface';

interface RawPagedUsers {
  Items?: RawUserRecord[];
  items?: RawUserRecord[] | ManagedUser[];
  Data?: RawUserRecord[];
  data?: RawUserRecord[] | ManagedUser[] | RawPagedUsers;
  users?: RawUserRecord[] | ManagedUser[];
  Users?: RawUserRecord[];
  TotalCount?: number;
  totalCount?: number;
  totalItems?: number;
  Page?: number;
  page?: number;
  currentPage?: number;
  PageSize?: number;
  pageSize?: number;
  limit?: number;
  TotalPages?: number;
  totalPages?: number;
  HasPrevious?: boolean;
  hasPrevious?: boolean;
  HasNext?: boolean;
  hasNext?: boolean;
  meta?: Partial<PaginationMeta> & {
    TotalItems?: number;
    TotalPages?: number;
    CurrentPage?: number;
    Limit?: number;
    HasPrevious?: boolean;
    HasNext?: boolean;
  };
}

function parseApiDate(value?: string | null): string | undefined {
  if (!value) return undefined;
  const normalized = value.includes('T') ? value : value.replace(' ', 'T');
  const date = new Date(normalized);
  return Number.isNaN(date.getTime()) ? value : date.toISOString();
}

function pickString(...values: (string | null | undefined)[]): string | undefined {
  for (const value of values) {
    if (value != null && value !== '') return value;
  }
  return undefined;
}

function pickNumber(...values: (number | null | undefined)[]): number | undefined {
  for (const value of values) {
    if (value != null && !Number.isNaN(value)) return value;
  }
  return undefined;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null;
}

function isUserArray(value: unknown): value is (RawUserRecord | ManagedUser)[] {
  return Array.isArray(value);
}

function extractItems(raw: RawPagedUsers): (RawUserRecord | ManagedUser)[] {
  const nestedData = raw.data;
  if (isRecord(nestedData) && !Array.isArray(nestedData)) {
    return extractItems(nestedData as RawPagedUsers);
  }

  return (
    raw.Items ??
    raw.items ??
    raw.Users ??
    raw.users ??
    raw.Data ??
    (Array.isArray(raw.data) ? raw.data : []) ??
    []
  );
}

function extractMeta(
  raw: RawPagedUsers,
  params: UserListParams,
  itemCount: number,
): PaginationMeta {
  const meta = raw.meta;
  const page = pickNumber(
    meta?.currentPage,
    meta?.CurrentPage,
    raw.Page,
    raw.page,
    raw.currentPage,
    params.page,
  ) ?? params.page;
  const limit = pickNumber(
    meta?.limit,
    meta?.Limit,
    raw.PageSize,
    raw.pageSize,
    raw.limit,
    params.limit,
  ) ?? params.limit;
  const totalItems = pickNumber(
    meta?.totalItems,
    meta?.TotalItems,
    raw.TotalCount,
    raw.totalCount,
    raw.totalItems,
    itemCount,
  ) ?? itemCount;
  const totalPages = Math.max(
    1,
    pickNumber(meta?.totalPages, meta?.TotalPages, raw.TotalPages, raw.totalPages) ??
      Math.ceil(totalItems / limit),
  );

  return {
    currentPage: page,
    limit,
    totalItems,
    totalPages,
    hasPrevious:
      meta?.hasPrevious ??
      meta?.HasPrevious ??
      raw.HasPrevious ??
      raw.hasPrevious ??
      page > 1,
    hasNext:
      meta?.hasNext ??
      meta?.HasNext ??
      raw.HasNext ??
      raw.hasNext ??
      page < totalPages,
  };
}

function buildMeta(
  totalItems: number,
  page: number,
  limit: number,
  hasNextOverride?: boolean,
): PaginationMeta {
  const totalPages = Math.max(1, Math.ceil(totalItems / limit));
  const hasNext = hasNextOverride ?? page < totalPages;

  return {
    currentPage: page,
    limit,
    totalItems,
    totalPages,
    hasPrevious: page > 1,
    hasNext,
  };
}

export function mapApiUser(raw: RawUserRecord | ManagedUser): ManagedUser {
  const source = raw as RawUserRecord;

  return normalizeManagedUser({
    id: pickString(source.Id, source.id) ?? '',
    username: pickString(source.Username, source.username) ?? '',
    email: pickString(source.Email, source.email) ?? '',
    role: pickString(source.Role, source.role) ?? 'User',
    isActive: (source.IsActive ?? source.isActive) !== false,
    isBlocked: Boolean(source.IsBlocked ?? source.isBlocked),
    isEmailVerified: Boolean(source.IsEmailVerified ?? source.isEmailVerified),
    blockReason: source.BlockReason ?? source.blockReason ?? null,
    phoneNumber: source.PhoneNumber ?? source.phoneNumber ?? null,
    provider: pickString(source.Provider, source.provider) ?? 'Local',
    createdAt:
      parseApiDate(source.CreatedAt ?? source.createdAt) ??
      source.CreatedAt ??
      source.createdAt ??
      '',
    updatedAt: parseApiDate(source.UpdatedAt ?? source.updatedAt),
    lastLoginAt:
      parseApiDate(source.LastLoginAt ?? source.lastLoginAt) ??
      source.LastLoginAt ??
      source.lastLoginAt ??
      null,
    blockedAt:
      parseApiDate(source.BlockedAt ?? source.blockedAt) ??
      source.BlockedAt ??
      source.blockedAt ??
      null,
    avatarUrl: source.avatarUrl ?? source.AvatarUrl ?? null,
    bio: source.bio ?? source.Bio ?? null,
    karmaPoints: pickNumber(source.karmaPoints, source.KarmaPoints),
    gamerTier: source.gamerTier ?? source.GamerTier ?? null,
    globalElo: pickNumber(source.globalElo, source.GlobalElo),
    level: pickNumber(source.level, source.Level),
  });
}

export function normalizeUserListResponse(
  raw: RawPagedUsers | PaginatedResponse<RawUserRecord | ManagedUser> | RawUserRecord[] | ManagedUser[] | null | undefined,
  params: UserListParams,
): PaginatedResponse<ManagedUser> {
  if (!raw) {
    return { data: [], meta: buildMeta(0, params.page, params.limit, false) };
  }

  if (Array.isArray(raw)) {
    const hasNext = raw.length === params.limit;
    const totalItems = hasNext
      ? params.page * params.limit + raw.length
      : (params.page - 1) * params.limit + raw.length;

    return {
      data: raw.map((item) => mapApiUser(item)),
      meta: buildMeta(Math.max(totalItems, raw.length), params.page, params.limit, hasNext),
    };
  }

  // GET /api/UserManagement/users → { data: User[], meta: PaginationMeta }
  if (isUserArray(raw.data) && isRecord(raw.meta)) {
    const meta = extractMeta(raw as RawPagedUsers, params, raw.data.length);
    return {
      data: raw.data.map((item) => mapApiUser(item)),
      meta,
    };
  }

  const items = extractItems(raw as RawPagedUsers);
  return {
    data: items.map((item) => mapApiUser(item)),
    meta: extractMeta(raw as RawPagedUsers, params, items.length),
  };
}

export function normalizeManagedUser(user: ManagedUser): ManagedUser {
  return {
    ...user,
    isBlocked: Boolean(user.isBlocked),
    isActive: user.isActive !== false,
    isEmailVerified: Boolean(user.isEmailVerified),
    provider: user.provider ?? 'Local',
  };
}

export function toUserActionTarget(user: ManagedUser) {
  return {
    id: user.id,
    username: user.username,
    email: user.email,
    role: user.role,
    isBlocked: user.isBlocked,
  };
}
