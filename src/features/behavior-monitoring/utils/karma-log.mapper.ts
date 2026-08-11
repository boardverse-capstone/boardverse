import type {
  PaginatedResponse,
  PaginationMeta,
} from '@/shared/types/pagination.interface';
import type {
  KarmaLogEntry,
  KarmaLogParams,
  RawKarmaLogRecord,
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
    pickNumber(meta?.currentPage, meta?.CurrentPage, raw.Page, raw.page, raw.currentPage, params.page) ??
    params.page;
  const limit =
    pickNumber(meta?.limit, meta?.Limit, raw.PageSize, raw.pageSize, raw.limit, params.limit) ??
    params.limit;
  const totalItems =
    pickNumber(meta?.totalItems, meta?.TotalItems, raw.TotalCount, raw.totalCount, raw.totalItems, itemCount) ??
    itemCount;
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
    (userId ? `karma-${userId}-${pickString(source.recordedAt, source.RecordedAt, source.createdAt, source.CreatedAt)}` : '');

  const currentKarma =
    pickNumber(
      source.currentKarma,
      source.CurrentKarma,
      source.karmaPoints,
      source.KarmaPoints,
      source.karmaAfter,
      source.KarmaAfter,
      source.newKarma,
      source.NewKarma,
      source.balanceAfter,
      source.BalanceAfter,
    ) ?? 0;

  const delta =
    pickNumber(
      source.delta,
      source.Delta,
      source.karmaDelta,
      source.KarmaDelta,
      source.pointsChange,
      source.PointsChange,
    ) ?? 0;

  return {
    id,
    userId,
    displayName:
      pickString(
        source.displayName,
        source.DisplayName,
        source.username,
        source.Username,
        source.gamerTag,
        source.GamerTag,
      ) || userId,
    currentKarma,
    behaviorType: pickString(source.behaviorType, source.BehaviorType, source.type, source.Type) || 'SYSTEM',
    delta,
    recordedAt: parseApiDate(
      source.recordedAt ?? source.RecordedAt ?? source.createdAt ?? source.CreatedAt ?? source.timestamp ?? source.Timestamp,
    ),
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
