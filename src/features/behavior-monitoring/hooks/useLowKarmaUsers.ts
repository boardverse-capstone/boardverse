'use client';

import { useQuery } from '@tanstack/react-query';
import { BehaviorSanctionService } from '../services/behavior-sanction.service';

export const LOW_KARMA_QUERY_KEY = 'low-karma-users';

export function useLowKarmaUsers(search?: string) {
  return useQuery({
    queryKey: [LOW_KARMA_QUERY_KEY, search],
    queryFn: () => BehaviorSanctionService.getLowKarmaUsers(search),
    staleTime: 5000,
  });
}
