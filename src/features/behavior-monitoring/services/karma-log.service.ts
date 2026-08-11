import apiClient from '@/core/api/client';
import type { PaginatedResponse } from '@/shared/types/pagination.interface';
import { isPlayerRole } from '@/core/constants/user-management';
import { UserManagementService } from '@/features/user-management/services/user-management.service';
import type { KarmaLogEntry, KarmaLogParams, RawKarmaLogRecord } from '../types/behavior.interface';
import { normalizeKarmaLogListResponse } from '../utils/karma-log.mapper';
import { KarmaLogMockService } from './karma-log.mock';

const USE_MOCK = process.env.NEXT_PUBLIC_USE_MOCK_BEHAVIOR_API === 'true';

export const KARMA_LOG_QUERY_KEY = 'karma-logs';

async function enrichUsersWithKarma(
  users: { id: string; username: string; karmaPoints?: number }[],
) {
  const missingKarma = users.filter((user) => user.karmaPoints == null);
  if (missingKarma.length === 0) return users;

  const enriched = await Promise.all(
    missingKarma.map(async (user) => {
      try {
        return await UserManagementService.getUserById(user.id);
      } catch {
        return user;
      }
    }),
  );

  const enrichedById = new Map(enriched.map((user) => [user.id, user]));
  return users.map((user) => enrichedById.get(user.id) ?? user);
}

function buildSnapshotLogs(
  users: { id: string; username: string; karmaPoints?: number }[],
): KarmaLogEntry[] {
  return users
    .filter((user) => user.karmaPoints != null)
    .map((user) => ({
      id: `snapshot-${user.id}`,
      userId: user.id,
      displayName: user.username,
      currentKarma: user.karmaPoints as number,
      behaviorType: 'SYSTEM',
      delta: 0,
      recordedAt: new Date().toISOString(),
    }));
}

function filterLogs(entries: KarmaLogEntry[], params: KarmaLogParams): KarmaLogEntry[] {
  const search = params.search?.trim().toLowerCase() ?? '';
  const behavior =
    params.behaviorType && params.behaviorType !== 'all' ? params.behaviorType : undefined;

  return entries.filter((entry) => {
    if (behavior && entry.behaviorType !== behavior) return false;
    if (!search) return true;
    return (
      entry.userId.toLowerCase().includes(search) ||
      entry.displayName.toLowerCase().includes(search)
    );
  });
}

function paginateLogs(
  entries: KarmaLogEntry[],
  params: KarmaLogParams,
): PaginatedResponse<KarmaLogEntry> {
  const sorted = [...entries].sort(
    (a, b) => new Date(b.recordedAt).getTime() - new Date(a.recordedAt).getTime(),
  );
  const filtered = filterLogs(sorted, params);
  const start = (params.page - 1) * params.limit;
  const data = filtered.slice(start, start + params.limit);
  const totalPages = Math.max(1, Math.ceil(filtered.length / params.limit));

  return {
    data,
    meta: {
      currentPage: params.page,
      limit: params.limit,
      totalItems: filtered.length,
      totalPages,
      hasPrevious: params.page > 1,
      hasNext: params.page < totalPages,
    },
  };
}

async function buildFallbackLogs(params: KarmaLogParams): Promise<PaginatedResponse<KarmaLogEntry>> {
  const response = await UserManagementService.getUsers({
    page: 1,
    limit: 100,
    search: params.search,
  });

  const players = response.data.filter((user) => isPlayerRole(user.role));
  const withKarma = await enrichUsersWithKarma(players);
  return paginateLogs(buildSnapshotLogs(withKarma), params);
}

export const KarmaLogService = {
  getLogs: async (params: KarmaLogParams): Promise<PaginatedResponse<KarmaLogEntry>> => {
    if (USE_MOCK) return KarmaLogMockService.getLogs(params);

    try {
      const raw = await apiClient.get<
        never,
        PaginatedResponse<RawKarmaLogRecord> | RawKarmaLogRecord[] | RawKarmaLogRecord
      >('/api/UserManagement/karma-logs', {
        params: {
          Search: params.search || undefined,
          BehaviorType:
            params.behaviorType && params.behaviorType !== 'all' ? params.behaviorType : undefined,
          Page: params.page,
          PageSize: params.limit,
        },
      });

      const normalized = Array.isArray(raw) || (raw && 'data' in raw)
        ? normalizeKarmaLogListResponse(raw, params)
        : normalizeKarmaLogListResponse(raw ? [raw] : [], params);

      return normalized;
    } catch {
      return buildFallbackLogs(params);
    }
  },
};
