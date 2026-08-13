'use client';

import { useQuery } from '@tanstack/react-query';
import {
  ADMIN_TOURNAMENT_QUERY_KEYS,
  AdminTournamentService,
} from '../services/admin-tournament.service';
import type { TournamentParticipantsParams } from '../types/tournament.interface';

export function useAdminTournamentParticipants(params: TournamentParticipantsParams) {
  return useQuery({
    queryKey: [
      ADMIN_TOURNAMENT_QUERY_KEYS.participants,
      params.tournamentId,
      params.status,
    ],
    queryFn: () => AdminTournamentService.getParticipants(params),
    enabled: Boolean(params.tournamentId),
    staleTime: 10_000,
  });
}
