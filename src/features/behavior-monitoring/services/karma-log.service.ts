import apiClient from '@/core/api/client';
import type { PaginatedResponse } from '@/shared/types/pagination.interface';
import type { KarmaLogEntry, KarmaLogParams, RawKarmaLogRecord } from '../types/behavior.interface';
import { normalizeKarmaLogListResponse } from '../utils/karma-log.mapper';
import { KarmaLogMockService } from './karma-log.mock';

const USE_MOCK = process.env.NEXT_PUBLIC_USE_MOCK_BEHAVIOR_API === 'true';

export const KARMA_LOG_QUERY_KEY = 'karma-logs';

export const KarmaLogService = {
  /** GET /api/v1/admin/karma-logs */
  getLogs: async (params: KarmaLogParams): Promise<PaginatedResponse<KarmaLogEntry>> => {
    if (USE_MOCK) return KarmaLogMockService.getLogs(params);

    const violationCategory =
      params.behaviorType && params.behaviorType !== 'all' ? params.behaviorType : undefined;

    const raw = await apiClient.get<
      never,
      PaginatedResponse<RawKarmaLogRecord> | RawKarmaLogRecord[] | RawKarmaLogRecord
    >('/api/v1/admin/karma-logs', {
      params: {
        userId: params.userId?.trim() || undefined,
        violationCategory,
        fromUtc: params.fromUtc || undefined,
        toUtc: params.toUtc || undefined,
        pageNumber: params.page,
        pageSize: params.limit,
      },
    });

    return Array.isArray(raw) || (raw && 'data' in raw)
      ? normalizeKarmaLogListResponse(raw, params)
      : normalizeKarmaLogListResponse(raw ? [raw] : [], params);
  },
};
