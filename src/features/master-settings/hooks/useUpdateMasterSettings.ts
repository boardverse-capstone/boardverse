'use client';

import { useMutation, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import {
  MasterSettingsService,
  MASTER_SETTINGS_QUERY_KEY,
} from '../services/master-settings.service';
import type { MasterSettings } from '../types/master-settings.interface';

export function useUpdateMasterSettings() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (payload: MasterSettings) => MasterSettingsService.updateSettings(payload),
    onSuccess: (data) => {
      toast.success('Cấu hình hệ thống đã được cập nhật và áp dụng.');
      queryClient.setQueryData([MASTER_SETTINGS_QUERY_KEY], data);
    },
    onError: (error: Error) => {
      toast.error(error.message ?? 'Lưu cấu hình thất bại.');
    },
  });
}
