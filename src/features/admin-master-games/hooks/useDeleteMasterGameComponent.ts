'use client';

import { useMutation, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import {
  AdminMasterGameService,
  ADMIN_MASTER_GAME_QUERY_KEYS,
} from '../services/admin-master-game.service';

export function useDeleteMasterGameComponent(gameTemplateId: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (componentId: string) =>
      AdminMasterGameService.deleteComponent(gameTemplateId, componentId),
    onSuccess: () => {
      toast.success('Đã xóa linh kiện.');
      queryClient.invalidateQueries({
        queryKey: [ADMIN_MASTER_GAME_QUERY_KEYS.components, gameTemplateId],
      });
    },
    onError: (error: Error) => {
      toast.error(error.message ?? 'Xóa linh kiện thất bại.');
    },
  });
}
