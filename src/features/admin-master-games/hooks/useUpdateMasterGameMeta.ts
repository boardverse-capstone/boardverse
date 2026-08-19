'use client';

import { useMutation } from '@tanstack/react-query';
import { toast } from 'sonner';
import { AdminMasterGameService } from '../services/admin-master-game.service';
import type {
  UpdateMasterGameMetadataRequest,
  UpdateMasterGameThumbnailRequest,
} from '../types/master-game.interface';

export function useUpdateMasterGameMetadata(gameTemplateId: string) {
  return useMutation({
    mutationFn: (payload: UpdateMasterGameMetadataRequest) =>
      AdminMasterGameService.updateMetadata(gameTemplateId, payload),
    onSuccess: () => toast.success('Đã cập nhật metadata game.'),
    onError: (error: Error) => toast.error(error.message ?? 'Cập nhật metadata thất bại.'),
  });
}

export function useUpdateMasterGameThumbnail(gameTemplateId: string) {
  return useMutation({
    mutationFn: (payload: UpdateMasterGameThumbnailRequest) =>
      AdminMasterGameService.updateThumbnail(gameTemplateId, payload),
    onSuccess: () => toast.success('Đã cập nhật thumbnail.'),
    onError: (error: Error) => toast.error(error.message ?? 'Cập nhật thumbnail thất bại.'),
  });
}
