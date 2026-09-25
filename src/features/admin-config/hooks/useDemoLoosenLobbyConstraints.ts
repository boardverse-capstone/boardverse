'use client';

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import {
  ADMIN_CONFIG_QUERY_KEY,
  AdminConfigService,
} from '../services/admin-config.service';

const DEMO_QUERY_KEY = [
  ADMIN_CONFIG_QUERY_KEY,
  'demo-loosen-lobby-constraints',
] as const;

export function useDemoLoosenLobbyConstraints() {
  return useQuery({
    queryKey: DEMO_QUERY_KEY,
    queryFn: () => AdminConfigService.getDemoLoosenLobbyConstraints(),
    staleTime: 10_000,
  });
}

export function useSetDemoLoosenLobbyConstraints() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (enabled: boolean) =>
      AdminConfigService.setDemoLoosenLobbyConstraints(enabled),
    onSuccess: (result) => {
      queryClient.setQueryData(DEMO_QUERY_KEY, result);
      toast.success(
        result.demoEnabled
          ? 'Đã bật chế độ demo. Áp dụng trong tối đa 10 giây.'
          : 'Đã tắt chế độ demo.',
      );
    },
    onError: (error: Error) => {
      toast.error(error.message || 'Không thể cập nhật chế độ demo.');
    },
  });
}

export function useInvalidateConfigCache() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: () => AdminConfigService.invalidateCache(),
    onSuccess: () => {
      void queryClient.invalidateQueries({
        queryKey: [ADMIN_CONFIG_QUERY_KEY],
      });
      toast.success('Đã làm mới cache cấu hình.');
    },
    onError: (error: Error) => {
      toast.error(error.message || 'Không thể làm mới cache cấu hình.');
    },
  });
}
