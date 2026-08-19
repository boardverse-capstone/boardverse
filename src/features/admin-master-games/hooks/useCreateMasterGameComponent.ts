'use client';

import { useMutation, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import {
  AdminMasterGameService,
  ADMIN_MASTER_GAME_QUERY_KEYS,
} from '../services/admin-master-game.service';
import type { CreateMasterGameComponentRequest } from '../types/master-game.interface';

export function useCreateMasterGameComponent(gameTemplateId: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (payload: CreateMasterGameComponentRequest) =>
      AdminMasterGameService.createComponent(gameTemplateId, payload),
    onSuccess: (data) => {
      toast.success(`Đã thêm linh kiện "${data.name}"`);
      queryClient.invalidateQueries({
        queryKey: [ADMIN_MASTER_GAME_QUERY_KEYS.components, gameTemplateId],
      });
    },
    onError: (error: Error) => toast.error(error.message ?? 'Thêm linh kiện thất bại.'),
  });
}
