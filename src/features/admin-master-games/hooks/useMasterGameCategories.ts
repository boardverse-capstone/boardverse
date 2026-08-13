'use client';

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import {
  AdminMasterGameService,
  ADMIN_MASTER_GAME_QUERY_KEYS,
} from '../services/admin-master-game.service';
import type { SetMasterGameCategoriesRequest } from '../types/master-game.interface';

export function useMasterGameCategories(gameTemplateId: string | null) {
  return useQuery({
    queryKey: [ADMIN_MASTER_GAME_QUERY_KEYS.categories, gameTemplateId],
    queryFn: () => AdminMasterGameService.getCategories(gameTemplateId!),
    enabled: Boolean(gameTemplateId?.trim()),
    staleTime: 10000,
  });
}

export function useSetMasterGameCategories(gameTemplateId: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (payload: SetMasterGameCategoriesRequest) =>
      AdminMasterGameService.setCategories(gameTemplateId, payload),
    onSuccess: () => {
      toast.success('Đã cập nhật thể loại cho game.');
      queryClient.invalidateQueries({
        queryKey: [ADMIN_MASTER_GAME_QUERY_KEYS.categories, gameTemplateId],
      });
    },
    onError: (error: Error) => {
      toast.error(error.message ?? 'Gán thể loại thất bại.');
    },
  });
}
