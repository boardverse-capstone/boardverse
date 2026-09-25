'use client';

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import {
  AdminMasterGameService,
  ADMIN_MASTER_GAME_QUERY_KEYS,
} from '../services/admin-master-game.service';
import type { ImportBggGameRequest } from '../types/master-game.interface';

export function useBggComponentCatalog(enabled = true) {
  return useQuery({
    queryKey: [ADMIN_MASTER_GAME_QUERY_KEYS.bggComponentCatalog],
    queryFn: () => AdminMasterGameService.listComponentCatalog(),
    enabled,
    staleTime: 5 * 60_000,
  });
}

export function useBggSearch(query: string, enabled: boolean) {
  return useQuery({
    queryKey: [ADMIN_MASTER_GAME_QUERY_KEYS.bggSearch, query],
    queryFn: () => AdminMasterGameService.searchBgg(query),
    enabled: enabled && query.trim().length >= 2,
    staleTime: 60_000,
  });
}

export function useBggPreview(
  bggId: number | null,
  curatedComponentsOnly: boolean,
) {
  return useQuery({
    queryKey: [ADMIN_MASTER_GAME_QUERY_KEYS.bggPreview, bggId, curatedComponentsOnly],
    queryFn: () => AdminMasterGameService.previewBggGame(bggId!, curatedComponentsOnly),
    enabled: Boolean(bggId && bggId > 0),
    staleTime: 60_000,
  });
}

export function useImportBggGame() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (payload: ImportBggGameRequest) =>
      AdminMasterGameService.importBggGame(payload),
    onSuccess: (data) => {
      toast.success(
        data.created
          ? `Đã thêm "${data.name}" vào catalog.`
          : `Đã cập nhật "${data.name}" trong catalog.`,
      );
      queryClient.invalidateQueries({
        queryKey: [ADMIN_MASTER_GAME_QUERY_KEYS.catalog],
      });
    },
    onError: (error: Error) => {
      const raw = error.message ?? '';
      const alreadyExists = /đã tồn tại|already exists|overwriteExisting/i.test(
        raw,
      );
      toast.error(
        alreadyExists
          ? 'Game này đã có trong catalog. Nếu muốn làm mới dữ liệu từ BGG, tick ô “cập nhật lại” rồi thêm lại.'
          : raw || 'Import board game thất bại.',
      );
    },
  });
}
