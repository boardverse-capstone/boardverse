'use client';

import { useMutation, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { USER_QUERY_KEYS } from '@/features/user-management/services/user-management.service';
import { BehaviorSanctionService } from '../services/behavior-sanction.service';
import { KARMA_LOG_QUERY_KEY } from '../services/karma-log.service';
import type { ProcessViolationRequest, PunishActionType } from '../types/behavior.interface';
import { LOW_KARMA_QUERY_KEY } from './useLowKarmaUsers';

function toActionType(penaltyType: ProcessViolationRequest['penaltyType']): PunishActionType {
  if (penaltyType === 'timed_block') return 'Suspend';
  if (penaltyType === 'permanent_block') return 'Ban';
  return 'Warning';
}

export function useProcessViolation() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (payload: ProcessViolationRequest) => {
      const actionType = toActionType(payload.penaltyType);

      return BehaviorSanctionService.punishUser(payload.userId, {
        actionType,
        durationDays: actionType === 'Suspend' ? payload.blockDays : undefined,
        reason: payload.reason.trim(),
      });
    },
    onSuccess: (result) => {
      if (result.actionType === 'Warning') {
        toast.success('Đã gửi cảnh báo (Warning) cho người dùng.');
      } else if (result.actionType === 'Suspend') {
        toast.success('Đã tạm khóa tài khoản (Suspend).');
      } else {
        toast.success('Đã cấm tài khoản (Ban).');
      }
      queryClient.invalidateQueries({ queryKey: [USER_QUERY_KEYS.list] });
      queryClient.invalidateQueries({ queryKey: [USER_QUERY_KEYS.detail, result.userId] });
      queryClient.invalidateQueries({ queryKey: [LOW_KARMA_QUERY_KEY] });
      queryClient.invalidateQueries({ queryKey: [KARMA_LOG_QUERY_KEY] });
    },
    onError: (error: Error) => {
      toast.error(error.message ?? 'Xử lý vi phạm thất bại.');
    },
  });
}
