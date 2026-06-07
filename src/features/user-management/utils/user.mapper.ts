import type { PaginatedResponse } from '@/shared/types/pagination.interface';
import type { ManagedUser, UserListParams } from '../types/user.interface';

interface RawPagedUsers {
  items?: ManagedUser[];
  data?: ManagedUser[];
  totalCount?: number;
  totalItems?: number;
  page?: number;
  currentPage?: number;
  pageSize?: number;
  limit?: number;
  totalPages?: number;
  hasPrevious?: boolean;
  hasNext?: boolean;
}

function buildMeta(
  totalItems: number,
  page: number,
  limit: number,
  hasNextOverride?: boolean,
): PaginatedResponse<ManagedUser>['meta'] {
  const totalPages = Math.max(1, Math.ceil(totalItems / limit));
  const hasNext =
    hasNextOverride ?? page < totalPages;

  return {
    currentPage: page,
    limit,
    totalItems,
    totalPages,
    hasPrevious: page > 1,
    hasNext,
  };
}

export function normalizeUserListResponse(
  raw: RawPagedUsers | ManagedUser[] | null | undefined,
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
      data: raw.map(normalizeManagedUser),
      meta: buildMeta(Math.max(totalItems, raw.length), params.page, params.limit, hasNext),
    };
  }

  const items = raw.items ?? raw.data ?? [];
  const totalItems = raw.totalCount ?? raw.totalItems ?? items.length;
  const page = raw.page ?? raw.currentPage ?? params.page;
  const limit = raw.pageSize ?? raw.limit ?? params.limit;

  return {
    data: items.map(normalizeManagedUser),
    meta: {
      currentPage: page,
      limit,
      totalItems,
      totalPages: raw.totalPages ?? Math.max(1, Math.ceil(totalItems / limit)),
      hasPrevious: raw.hasPrevious ?? page > 1,
      hasNext:
        raw.hasNext ??
        page < Math.max(1, Math.ceil(totalItems / limit)),
    },
  };
}

export function normalizeManagedUser(user: ManagedUser): ManagedUser {
  return {
    ...user,
    isBlocked: Boolean(user.isBlocked),
    isActive: user.isActive !== false,
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
