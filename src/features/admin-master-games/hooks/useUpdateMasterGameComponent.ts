'use client';

import { useMutation, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import {
  AdminMasterGameService,
  ADMIN_MASTER_GAME_QUERY_KEYS,
} from '../services/admin-master-game.service';
import type { UpdateMasterGameComponentRequest } from '../types/master-game.interface';

export function useUpdateMasterGameComponent(gameTemplateId: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({
      componentId,
      payload,
    }: {
      componentId: string;
      payload: UpdateMasterGameComponentRequest;
    }) => AdminMasterGameService.updateComponent(gameTemplateId, componentId, payload),
    onSuccess: (data) => {
      toast.success(`Đã cập nhật "${data.name}"`);
      queryClient.invalidateQueries({
        queryKey: [ADMIN_MASTER_GAME_QUERY_KEYS.components, gameTemplateId],
      });
    },
    onError: (error: Error) => toast.error(error.message ?? 'Cập nhật linh kiện thất bại.'),
  });
}
