import type { PaginatedResponse } from '@/shared/types/pagination.interface';
import type { KarmaLogEntry, KarmaLogParams } from '../types/behavior.interface';

const delay = (ms = 300) => new Promise((resolve) => setTimeout(resolve, ms));

const SEED_LOGS: KarmaLogEntry[] = [
  {
    id: 'log-001',
    userId: '092bbcf3-e729-43b5-8913-898961babc99',
    displayName: 'jonny',
    currentKarma: 42,
    behaviorType: 'NoShow',
    delta: -15,
    recordedAt: '2026-06-08T10:15:00.000Z',
  },
  {
    id: 'log-002',
    userId: '092bbcf3-e729-43b5-8913-898961babc99',
    displayName: 'jonny',
    currentKarma: 57,
    behaviorType: 'CrossRating',
    delta: 5,
    recordedAt: '2026-06-07T18:30:00.000Z',
  },
  {
    id: 'log-003',
    userId: '74b0b478-8ca3-4557-8576-fb471c03c562',
    displayName: 'test1',
    currentKarma: 35,
    behaviorType: 'LateDepositCancel',
    delta: -8,
    recordedAt: '2026-06-08T09:00:00.000Z',
  },
  {
    id: 'log-004',
    userId: 'adf04a06-2ba3-47c4-aaef-a081374c125e',
    displayName: 'test2',
    currentKarma: 28,
    behaviorType: 'KickedFromLobby',
    delta: -12,
    recordedAt: '2026-06-08T08:45:00.000Z',
  },
  {
    id: 'log-005',
    userId: '418ef430-1069-43c7-8e35-1df2cf40f1a7',
    displayName: '123',
    currentKarma: 100,
    behaviorType: 'CrossRating',
    delta: 10,
    recordedAt: '2026-06-08T07:20:00.000Z',
  },
  {
    id: 'log-006',
    userId: 'b5d08044-1ca9-4499-a97f-4fefe787ddf1',
    displayName: 'test123',
    currentKarma: 48,
    behaviorType: 'NoShow',
    delta: -15,
    recordedAt: '2026-06-07T22:10:00.000Z',
  },
  {
    id: 'log-007',
    userId: '3702c489-c290-4c48-b169-a42b6699ba7d',
    displayName: '123213123123',
    currentKarma: 62,
    behaviorType: 'AdminManual',
    delta: -5,
    recordedAt: '2026-06-07T16:00:00.000Z',
  },
  {
    id: 'log-008',
    userId: '91df9a8f-6123-476f-b6e7-b0b64b61a64d',
    displayName: 'ara',
    currentKarma: 55,
    behaviorType: 'AdminWarning',
    delta: 0,
    recordedAt: '2026-06-07T12:00:00.000Z',
  },
  {
    id: 'log-009',
    userId: '0181564c-79c8-4488-9cca-a4c11da2ff74',
    displayName: '123123',
    currentKarma: 72,
    behaviorType: 'LateDepositCancel',
    delta: -8,
    recordedAt: '2026-06-06T20:30:00.000Z',
  },
  {
    id: 'log-010',
    userId: 'e83458ea-e8a6-4f63-a973-0b98830e119d',
    displayName: 'cafestaff',
    currentKarma: 88,
    behaviorType: 'AdminManual',
    delta: 3,
    recordedAt: '2026-06-06T15:00:00.000Z',
  },
  {
    id: 'log-011',
    userId: '092bbcf3-e729-43b5-8913-898961babc99',
    displayName: 'jonny',
    currentKarma: 52,
    behaviorType: 'KickedFromLobby',
    delta: -12,
    recordedAt: '2026-06-06T11:00:00.000Z',
  },
  {
    id: 'log-012',
    userId: '74b0b478-8ca3-4557-8576-fb471c03c562',
    displayName: 'test1',
    currentKarma: 43,
    behaviorType: 'AdminManual',
    delta: 8,
    recordedAt: '2026-06-05T14:20:00.000Z',
  },
];

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

export const KarmaLogMockService = {
  getLogs: async (params: KarmaLogParams): Promise<PaginatedResponse<KarmaLogEntry>> => {
    await delay();

    const search = params.search?.trim().toLowerCase() ?? '';
    const userId = params.userId?.trim().toLowerCase();
    const behavior =
      params.behaviorType && params.behaviorType !== 'all' ? params.behaviorType : undefined;
    const fromMs = params.fromUtc ? new Date(params.fromUtc).getTime() : undefined;
    const toMs = params.toUtc ? new Date(params.toUtc).getTime() : undefined;

    let filtered = [...SEED_LOGS];

    if (userId) {
      filtered = filtered.filter((entry) => entry.userId.toLowerCase() === userId);
    }

    if (behavior) {
      filtered = filtered.filter((entry) => entry.behaviorType === behavior);
    }

    if (fromMs != null && !Number.isNaN(fromMs)) {
      filtered = filtered.filter((entry) => new Date(entry.recordedAt).getTime() >= fromMs);
    }

    if (toMs != null && !Number.isNaN(toMs)) {
      filtered = filtered.filter((entry) => new Date(entry.recordedAt).getTime() <= toMs);
    }

    if (search) {
      filtered = filtered.filter(
        (entry) =>
          entry.userId.toLowerCase().includes(search) ||
          entry.displayName.toLowerCase().includes(search),
      );
    }

    filtered.sort((a, b) => new Date(b.recordedAt).getTime() - new Date(a.recordedAt).getTime());

    const start = (params.page - 1) * params.limit;
    const data = filtered.slice(start, start + params.limit);

    return {
      data,
      meta: buildMeta(filtered.length, params.page, params.limit),
    };
  },
};
