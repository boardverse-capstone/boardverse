'use client';

import { useQuery } from '@tanstack/react-query';
import {
  AdminMasterGameService,
  ADMIN_MASTER_GAME_QUERY_KEYS,
} from '../services/admin-master-game.service';

export function useMasterGameCatalog(searchTerm?: string) {
  return useQuery({
    queryKey: [ADMIN_MASTER_GAME_QUERY_KEYS.catalog, searchTerm ?? ''],
    queryFn: () => AdminMasterGameService.listCatalog(searchTerm),
    staleTime: 60_000,
  });
}
