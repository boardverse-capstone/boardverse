'use client';

import { useQuery } from '@tanstack/react-query';
import {
  ADMIN_TOURNAMENT_QUERY_KEYS,
  AdminTournamentService,
} from '../services/admin-tournament.service';
import type { AdminTournamentListParams } from '../types/tournament.interface';

export function useAdminTournaments(params: AdminTournamentListParams) {
  return useQuery({
    queryKey: [
      ADMIN_TOURNAMENT_QUERY_KEYS.list,
      params.page,
      params.limit,
      params.status,
      params.cafeId,
      params.search,
    ],
    queryFn: () => AdminTournamentService.getTournaments(params),
    placeholderData: (previous) => previous,
    staleTime: 10_000,
  });
}
