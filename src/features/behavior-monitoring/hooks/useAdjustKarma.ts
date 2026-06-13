'use client';

import { useMutation, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { UserManagementService, USER_QUERY_KEYS } from '@/features/user-management/services/user-management.service';
import { KarmaAdjustmentService } from '../services/karma-adjustment.service';
import { KARMA_LOG_QUERY_KEY } from '../services/karma-log.service';
import { LOW_KARMA_QUERY_KEY } from './useLowKarmaUsers';
import type { AdjustKarmaRequest } from '../types/behavior.interface';

export function useAdjustKarma(userId: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (payload: AdjustKarmaRequest) => KarmaAdjustmentService.adjustKarma(payload),
    onSuccess: (data, variables) => {
      toast.success(
        `Đã điều chỉnh Karma: ${variables.currentKarma} → ${data.karmaPoints ?? variables.currentKarma + variables.delta}`,
      );
      queryClient.setQueryData([USER_QUERY_KEYS.detail, userId], data);
      queryClient.invalidateQueries({ queryKey: [USER_QUERY_KEYS.list] });
      queryClient.invalidateQueries({ queryKey: [KARMA_LOG_QUERY_KEY] });
      queryClient.invalidateQueries({ queryKey: [LOW_KARMA_QUERY_KEY] });
    },
    onError: (error: Error) => {
      toast.error(error.message ?? 'Điều chỉnh Karma thất bại.');
    },
  });
}
