import type { PaginatedResponse } from '@/shared/types/pagination.interface';

import type { ManagedUser, RawUserRecord, UserListParams } from '../types/user.interface';



interface RawPagedUsers {

  Items?: RawUserRecord[];

  items?: RawUserRecord[] | ManagedUser[];

  Data?: RawUserRecord[];

  data?: RawUserRecord[] | ManagedUser[];

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

    avatarUrl: source.avatarUrl ?? null,

    bio: source.bio ?? null,

    karmaPoints: pickNumber(source.karmaPoints),

    gamerTier: source.gamerTier ?? null,

    globalElo: pickNumber(source.globalElo),

    level: pickNumber(source.level),

  });

}



function buildMeta(

  totalItems: number,

  page: number,

  limit: number,

  hasNextOverride?: boolean,

): PaginatedResponse<ManagedUser>['meta'] {

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



export function normalizeUserListResponse(

  raw: RawPagedUsers | RawUserRecord[] | ManagedUser[] | null | undefined,

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



  const items = raw.Items ?? raw.items ?? raw.Data ?? raw.data ?? [];

  const totalItems =

    raw.TotalCount ?? raw.totalCount ?? raw.totalItems ?? items.length;

  const page = params.page;

  const limit = params.limit;

  const totalPages = Math.max(1, Math.ceil(totalItems / limit));



  return {

    data: items.map((item) => mapApiUser(item)),

    meta: {

      currentPage: page,

      limit,

      totalItems,

      totalPages: raw.TotalPages ?? raw.totalPages ?? totalPages,

      hasPrevious: page > 1,

      hasNext: raw.HasNext ?? raw.hasNext ?? page < totalPages,

    },

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


