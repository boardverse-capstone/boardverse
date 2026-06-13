'use client';

import { useMutation, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { UserManagementService, USER_QUERY_KEYS } from '@/features/user-management/services/user-management.service';
import { LOW_KARMA_QUERY_KEY } from './useLowKarmaUsers';
import type { ProcessViolationRequest } from '../types/behavior.interface';

export function useProcessViolation() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (payload: ProcessViolationRequest) => {
      if (payload.penaltyType === 'warning') {
        return { type: 'warning' as const, userId: payload.userId };
      }

      const reasonParts = [payload.reason.trim()];
      if (payload.penaltyType === 'timed_block' && payload.blockDays) {
        reasonParts.unshift(`[Khóa ${payload.blockDays} ngày]`);
      }
      if (payload.penaltyType === 'permanent_block') {
        reasonParts.unshift('[Khóa vĩnh viễn]');
      }

      await UserManagementService.blockUser(payload.userId, {
        reason: reasonParts.join(' '),
      });

      return { type: payload.penaltyType, userId: payload.userId };
    },
    onSuccess: (result) => {
      if (result.type === 'warning') {
        toast.success('Đã ghi nhận cảnh báo hành vi.');
      } else {
        toast.success('Đã áp dụng chế tài tài khoản.');
      }
      queryClient.invalidateQueries({ queryKey: [USER_QUERY_KEYS.list] });
      queryClient.invalidateQueries({ queryKey: [LOW_KARMA_QUERY_KEY] });
    },
    onError: (error: Error) => {
      toast.error(error.message ?? 'Xử lý vi phạm thất bại.');
    },
  });
}
