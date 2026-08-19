'use client';

import { useQuery } from '@tanstack/react-query';
import {
  AdminMasterGameService,
  ADMIN_MASTER_GAME_QUERY_KEYS,
} from '../services/admin-master-game.service';

export function useMasterGameComponents(gameTemplateId: string | null) {
  return useQuery({
    queryKey: [ADMIN_MASTER_GAME_QUERY_KEYS.components, gameTemplateId],
    queryFn: () => AdminMasterGameService.getComponents(gameTemplateId!),
    enabled: Boolean(gameTemplateId?.trim()),
    staleTime: 10000,
  });
}
