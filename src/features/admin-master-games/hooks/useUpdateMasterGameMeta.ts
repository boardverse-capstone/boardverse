'use client';

import { useMutation, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import {
  AdminMasterGameService,
  ADMIN_MASTER_GAME_QUERY_KEYS,
} from '../services/admin-master-game.service';
import type {
  UpdateMasterGameMetadataRequest,
  UpdateMasterGameThumbnailRequest,
} from '../types/master-game.interface';

export function useUpdateMasterGameMetadata(gameTemplateId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (payload: UpdateMasterGameMetadataRequest) =>
      AdminMasterGameService.updateMetadata(gameTemplateId, payload),
    onSuccess: () => {
      toast.success('Đã cập nhật metadata game.');
      queryClient.invalidateQueries({
        queryKey: [ADMIN_MASTER_GAME_QUERY_KEYS.catalog],
      });
    },
    onError: (error: Error) => toast.error(error.message ?? 'Cập nhật metadata thất bại.'),
  });
}

export function useUpdateMasterGameThumbnail(gameTemplateId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (payload: UpdateMasterGameThumbnailRequest) =>
      AdminMasterGameService.updateThumbnail(gameTemplateId, payload),
    onSuccess: () => {
      toast.success('Đã cập nhật ảnh thumbnail.');
      queryClient.invalidateQueries({
        queryKey: [ADMIN_MASTER_GAME_QUERY_KEYS.catalog],
      });
    },
    onError: (error: Error) => toast.error(error.message ?? 'Cập nhật ảnh thất bại.'),
  });
}
