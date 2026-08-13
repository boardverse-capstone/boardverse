import type {
  PaginatedResponse,
  PaginationMeta,
} from '@/shared/types/pagination.interface';
import type {
  AdjustKarmaResponse,
  KarmaLogEntry,
  KarmaLogParams,
  LowKarmaUser,
  RawKarmaLogRecord,
  RawUserAlertRecord,
} from '../types/behavior.interface';

interface RawKarmaLogListResponse {
  data?: RawKarmaLogRecord[] | RawKarmaLogListResponse;
  items?: RawKarmaLogRecord[];
  Items?: RawKarmaLogRecord[];
  Data?: RawKarmaLogRecord[];
  TotalCount?: number;
  totalCount?: number;
  totalItems?: number;
  Page?: number;
  page?: number;
  pageNumber?: number;
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
    pageSize?: number;
    HasPrevious?: boolean;
    HasNext?: boolean;
  };
}

function pickString(...values: (string | null | undefined)[]): string {
  for (const value of values) {
    if (value != null && value !== '') return value;
  }
  return '';
}

function pickNumber(...values: (number | null | undefined)[]): number | undefined {
  for (const value of values) {
    if (value != null && !Number.isNaN(value)) return value;
  }
  return undefined;
}

function parseApiDate(value?: string | null): string {
  if (!value) return new Date(0).toISOString();
  const normalized = value.includes('T') ? value : value.replace(' ', 'T');
  const date = new Date(normalized);
  return Number.isNaN(date.getTime()) ? value : date.toISOString();
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null;
}

function extractItems(raw: RawKarmaLogListResponse): RawKarmaLogRecord[] {
  const nestedData = raw.data;
  if (isRecord(nestedData) && !Array.isArray(nestedData)) {
    return extractItems(nestedData as RawKarmaLogListResponse);
  }

  return (
    raw.Items ??
    raw.items ??
    raw.Data ??
    (Array.isArray(raw.data) ? raw.data : []) ??
    []
  );
}

function extractMeta(
  raw: RawKarmaLogListResponse,
  params: KarmaLogParams,
  itemCount: number,
): PaginationMeta {
  const meta = raw.meta;
  const page =
    pickNumber(
      meta?.currentPage,
      meta?.CurrentPage,
      raw.Page,
      raw.page,
      raw.pageNumber,
      raw.currentPage,
      params.page,
    ) ?? params.page;
  const limit =
    pickNumber(
      meta?.limit,
      meta?.Limit,
      meta?.pageSize,
      raw.PageSize,
      raw.pageSize,
      raw.limit,
      params.limit,
    ) ?? params.limit;
  const totalItems =
    pickNumber(
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
      meta?.hasNext ?? meta?.HasNext ?? raw.HasNext ?? raw.hasNext ?? page < totalPages,
  };
}

export function mapApiKarmaLog(raw: RawKarmaLogRecord | KarmaLogEntry): KarmaLogEntry {
  const source = raw as RawKarmaLogRecord;
  const userId = pickString(source.userId, source.UserId);
  const id =
    pickString(source.id, source.Id, source.logId, source.LogId) ||
    (userId
      ? `karma-${userId}-${pickString(source.recordedAt, source.RecordedAt, source.createdAt, source.CreatedAt)}`
      : '');

  const currentKarma =
    pickNumber(
      source.karmaAfter,
      source.KarmaAfter,
      source.currentKarma,
      source.CurrentKarma,
      source.karmaPoints,
      source.KarmaPoints,
      source.newKarma,
      source.NewKarma,
      source.balanceAfter,
      source.BalanceAfter,
    ) ?? 0;

  const delta =
    pickNumber(
      source.karmaPointsChange,
      source.KarmaPointsChange,
      source.deltaAmount,
      source.DeltaAmount,
      source.delta,
      source.Delta,
      source.karmaDelta,
      source.KarmaDelta,
      source.pointsChange,
      source.PointsChange,
    ) ?? 0;

  const performedByUserId = pickString(
    source.performedByUserId,
    source.PerformedByUserId,
    source.actorUserId,
    source.ActorUserId,
  );

  return {
    id,
    userId,
    displayName:
      pickString(
        source.username,
        source.Username,
        source.displayName,
        source.DisplayName,
        source.gamerTag,
        source.GamerTag,
      ) || userId,
    currentKarma,
    behaviorType:
      pickString(
        source.violationCategory,
        source.ViolationCategory,
        source.behaviorType,
        source.BehaviorType,
        source.type,
        source.Type,
      ) || 'SYSTEM',
    delta,
    recordedAt: parseApiDate(
      source.createdAt ??
        source.CreatedAt ??
        source.recordedAt ??
        source.RecordedAt ??
        source.timestamp ??
        source.Timestamp,
    ),
    reason: pickString(source.reason, source.Reason) || undefined,
    source: pickString(source.source, source.Source) || undefined,
    karmaBefore: pickNumber(source.karmaBefore, source.KarmaBefore),
    performedByUserId: performedByUserId || undefined,
    isAdminAdjustment: source.isAdminAdjustment ?? source.IsAdminAdjustment,
  };
}

export function normalizeKarmaLogListResponse(
  raw:
    | RawKarmaLogListResponse
    | PaginatedResponse<RawKarmaLogRecord | KarmaLogEntry>
    | RawKarmaLogRecord[]
    | KarmaLogEntry[]
    | null
    | undefined,
  params: KarmaLogParams,
): PaginatedResponse<KarmaLogEntry> {
  if (!raw) {
    return {
      data: [],
      meta: {
        currentPage: params.page,
        limit: params.limit,
        totalItems: 0,
        totalPages: 1,
        hasPrevious: false,
        hasNext: false,
      },
    };
  }

  if (Array.isArray(raw)) {
    const data = raw.map((item) => mapApiKarmaLog(item));
    const totalPages = Math.max(1, Math.ceil(data.length / params.limit));

    return {
      data,
      meta: {
        currentPage: params.page,
        limit: params.limit,
        totalItems: data.length,
        totalPages,
        hasPrevious: params.page > 1,
        hasNext: params.page < totalPages,
      },
    };
  }

  if (Array.isArray(raw.data) && isRecord(raw.meta)) {
    const items = raw.data as RawKarmaLogRecord[];
    return {
      data: items.map((item) => mapApiKarmaLog(item)),
      meta: extractMeta(raw as RawKarmaLogListResponse, params, items.length),
    };
  }

  const items = extractItems(raw as RawKarmaLogListResponse);
  return {
    data: items.map((item) => mapApiKarmaLog(item)),
    meta: extractMeta(raw as RawKarmaLogListResponse, params, items.length),
  };
}

export function mapApiUserAlert(raw: RawUserAlertRecord): LowKarmaUser {
  const id = pickString(raw.id, raw.Id, raw.userId, raw.UserId);
  const accountStatus = pickString(raw.accountStatus, raw.AccountStatus).toLowerCase();
  const isBlocked =
    raw.isBlocked ??
    raw.IsBlocked ??
    (accountStatus === 'banned' ||
      accountStatus === 'suspended' ||
      accountStatus === 'blocked');

  return {
    id,
    username: pickString(raw.username, raw.Username) || id,
    email: pickString(raw.email, raw.Email),
    karmaPoints: pickNumber(raw.karmaPoints, raw.KarmaPoints) ?? 0,
    role: pickString(raw.role, raw.Role) || 'Player',
    isBlocked,
    gamerTier: pickString(raw.gamerTier, raw.GamerTier) || undefined,
  };
}

export function normalizeUserAlertsResponse(raw: unknown): LowKarmaUser[] {
  if (!raw) return [];

  if (Array.isArray(raw)) {
    return raw.map((item) => mapApiUserAlert(item as RawUserAlertRecord));
  }

  if (!isRecord(raw)) return [];

  const nested = raw.data;
  if (Array.isArray(nested)) {
    return nested.map((item) => mapApiUserAlert(item as RawUserAlertRecord));
  }

  if (isRecord(nested) && Array.isArray(nested.data)) {
    return (nested.data as RawUserAlertRecord[]).map(mapApiUserAlert);
  }

  if (isRecord(nested) && Array.isArray(nested.items)) {
    return (nested.items as RawUserAlertRecord[]).map(mapApiUserAlert);
  }

  if (Array.isArray(raw.items)) {
    return (raw.items as RawUserAlertRecord[]).map(mapApiUserAlert);
  }

  return [];
}

export function mapAdjustKarmaResponse(raw: unknown, fallbackKarma: number): AdjustKarmaResponse {
  if (!isRecord(raw)) {
    return { karmaPoints: fallbackKarma };
  }

  const nested = isRecord(raw.data) ? raw.data : raw;

  return {
    userId: pickString(
      nested.userId as string | undefined,
      nested.UserId as string | undefined,
    ) || undefined,
    karmaPoints:
      pickNumber(
        nested.karmaPoints as number | undefined,
        nested.KarmaPoints as number | undefined,
        nested.newKarma as number | undefined,
        nested.NewKarma as number | undefined,
        nested.karmaAfter as number | undefined,
        nested.KarmaAfter as number | undefined,
      ) ?? fallbackKarma,
    gamerTier:
      pickString(nested.gamerTier as string | undefined, nested.GamerTier as string | undefined) ||
      undefined,
    logId:
      pickString(
        nested.logId as string | undefined,
        nested.LogId as string | undefined,
        nested.id as string | undefined,
      ) || undefined,
  };
}
