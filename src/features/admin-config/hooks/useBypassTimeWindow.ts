'use client';

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import {
  ADMIN_CONFIG_QUERY_KEY,
  AdminConfigService,
} from '../services/admin-config.service';

const BYPASS_QUERY_KEY = [ADMIN_CONFIG_QUERY_KEY, 'bypass-time-window'] as const;

export function useBypassTimeWindow() {
  return useQuery({
    queryKey: BYPASS_QUERY_KEY,
    queryFn: () => AdminConfigService.getBypassTimeWindow(),
    staleTime: 10_000,
  });
}

export function useSetBypassTimeWindow() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (enabled: boolean) =>
      AdminConfigService.setBypassTimeWindow(enabled),
    onSuccess: (result) => {
      queryClient.setQueryData(BYPASS_QUERY_KEY, result);
      toast.success(
        result.bypassEnabled
          ? 'Đã bật bypass time-window. Áp dụng trong tối đa 10 giây.'
          : 'Đã tắt bypass time-window.',
      );
    },
    onError: (error: Error) => {
      toast.error(error.message || 'Không thể cập nhật bypass time-window.');
    },
  });
}
