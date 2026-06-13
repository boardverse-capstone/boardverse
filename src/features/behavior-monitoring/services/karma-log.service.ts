import apiClient from '@/core/api/client';
import type { PaginatedResponse } from '@/shared/types/pagination.interface';
import { UserManagementService } from '@/features/user-management/services/user-management.service';
import type { KarmaLogEntry, KarmaLogParams } from '../types/behavior.interface';
import { KarmaLogMockService } from './karma-log.mock';

const USE_MOCK = process.env.NEXT_PUBLIC_USE_MOCK_BEHAVIOR_API !== 'false';

export const KARMA_LOG_QUERY_KEY = 'karma-logs';

function buildSnapshotLogs(
  users: { id: string; username: string; karmaPoints?: number }[],
): KarmaLogEntry[] {
  return users.map((user) => ({
    id: `snapshot-${user.id}`,
    userId: user.id,
    displayName: user.username,
    currentKarma: user.karmaPoints ?? 100,
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

export const KarmaLogService = {
  getLogs: async (params: KarmaLogParams): Promise<PaginatedResponse<KarmaLogEntry>> => {
    if (USE_MOCK) return KarmaLogMockService.getLogs(params);

    try {
      const raw = await apiClient.get<
        never,
        PaginatedResponse<KarmaLogEntry> | KarmaLogEntry[]
      >('/api/UserManagement/karma-logs', {
        params: {
          Search: params.search || undefined,
          BehaviorType: params.behaviorType && params.behaviorType !== 'all' ? params.behaviorType : undefined,
          Page: params.page,
          PageSize: params.limit,
        },
      });

      if (Array.isArray(raw)) {
        return paginateLogs(raw, params);
      }

      if (raw?.data && raw?.meta) {
        return raw;
      }

      return paginateLogs((raw as unknown as KarmaLogEntry[]) ?? [], params);
    } catch {
      const users = await UserManagementService.getUsers({
        page: params.page,
        limit: params.limit,
        search: params.search,
        role: 'User',
      });

      return paginateLogs(buildSnapshotLogs(users.data), params);
    }
  },
};
