'use client';

import { useQuery } from '@tanstack/react-query';
import {
  ADMIN_REPORTS_QUERY_KEYS,
  AdminReportsService,
} from '../services/admin-reports.service';
import type { LobbyFailuresParams } from '../types/admin-reports.interface';

export function useAdminLobbyFailures(params: LobbyFailuresParams, enabled = true) {
  return useQuery({
    queryKey: [
      ADMIN_REPORTS_QUERY_KEYS.lobbyFailures,
      params.page,
      params.pageSize,
      params.fromUtc,
      params.toUtc,
      params.failureType,
    ],
    queryFn: () => AdminReportsService.getLobbyFailures(params),
    enabled,
    placeholderData: (previous) => previous,
    staleTime: 10_000,
  });
}
