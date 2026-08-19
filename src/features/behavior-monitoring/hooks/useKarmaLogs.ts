'use client';

import { useQuery } from '@tanstack/react-query';
import { KarmaLogService, KARMA_LOG_QUERY_KEY } from '../services/karma-log.service';
import type { KarmaLogParams } from '../types/behavior.interface';

export function useKarmaLogs(params: KarmaLogParams) {
  return useQuery({
    queryKey: [
      KARMA_LOG_QUERY_KEY,
      params.page,
      params.limit,
      params.userId,
      params.behaviorType,
      params.fromUtc,
      params.toUtc,
      params.search,
    ],
    queryFn: () => KarmaLogService.getLogs(params),
    placeholderData: (previous) => previous,
    staleTime: 5000,
  });
}
