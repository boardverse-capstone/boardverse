'use client';

import { useQuery } from '@tanstack/react-query';
import {
  MasterSettingsService,
  MASTER_SETTINGS_QUERY_KEY,
} from '../services/master-settings.service';

export function useMasterSettings() {
  return useQuery({
    queryKey: [MASTER_SETTINGS_QUERY_KEY],
    queryFn: () => MasterSettingsService.getSettings(),
    staleTime: 10000,
  });
}
