'use client';

import { useMutation } from '@tanstack/react-query';
import { toast } from 'sonner';
import { AdminConfigService } from '../services/admin-config.service';

export function useSystemConfigLookup() {
  return useMutation({
    mutationFn: (key: string) => AdminConfigService.getConfigByKey(key),
    onError: (error: Error) => {
      toast.error(error.message || 'Không thể tra cứu config.');
    },
  });
}
