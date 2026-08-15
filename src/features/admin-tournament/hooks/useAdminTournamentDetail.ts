'use client';

import { useQuery } from '@tanstack/react-query';
import {
  ADMIN_TOURNAMENT_QUERY_KEYS,
  AdminTournamentService,
} from '../services/admin-tournament.service';

export function useAdminTournamentDetail(id?: string, enabled = true) {
  return useQuery({
    queryKey: [ADMIN_TOURNAMENT_QUERY_KEYS.detail, id],
    queryFn: () => AdminTournamentService.getTournamentById(id!),
    enabled: Boolean(id) && enabled,
    staleTime: 10_000,
  });
}
