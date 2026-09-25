'use client';

import { useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { apiClient } from '@/core/api/client';

interface InventoryCoverItem {
  inventoryId: string;
  gameTemplateId: string | null;
  gameName: string;
  thumbnailUrl: string | null;
}

/**
 * Tra cứu ảnh bìa từ endpoint `/api/cafes/{cafeId}/inventory` (list).
 *
 * API này trả `{ thumbnailUrl, gameTemplateId, gameName, ... }` ở top-level cho
 * mỗi item — đây là nguồn ảnh chính thức từ backend, dùng làm fallback cho:
 *   - Hộp game (`/pos/boxes`) — backend không nhúng ảnh vào từng box
 *   - Game alternative (`useAlternativeGames`) — endpoint này cũng flat nên đã có sẵn
 *
 * Fetch 1 lần với pageSize=100 (mỗi cafe hiếm khi > 100 game trong kho).
 */
export function useInventoryCoverFallback(cafeId: string | null | undefined) {
  const query = useQuery({
    queryKey: ['pos', 'inventory-cover-fallback', cafeId],
    enabled: Boolean(cafeId),
    queryFn: async (): Promise<InventoryCoverItem[]> => {
      if (!cafeId) return [];
      try {
        const raw = await apiClient.get<never, unknown>(
          `/api/cafes/${cafeId}/inventory`,
          {
            params: {
              pageNumber: 1,
              page: 1,
              pageSize: 100,
              sortDescending: true,
            },
          },
        );

        // Trích list từ nhiều cấu trúc response phổ biến
        const root = raw as Record<string, unknown> | unknown[] | null;
        const rObj = root && !Array.isArray(root) && typeof root === 'object' ? root : null;
        const dataObj =
          rObj && rObj.data && typeof rObj.data === 'object' && !Array.isArray(rObj.data)
            ? (rObj.data as Record<string, unknown>)
            : null;
        const nested = rObj
          ? (rObj.data ?? rObj.items ?? rObj.Items ?? (dataObj?.items as unknown))
          : null;
        const list: unknown[] = Array.isArray(raw)
          ? raw
          : Array.isArray(nested)
            ? nested
            : nested && typeof nested === 'object'
              ? (((nested as Record<string, unknown>).data as unknown[]) ??
                ((nested as Record<string, unknown>).items as unknown[]) ??
                [])
              : [];

        return list
          .map((item) => {
            const row = item as Record<string, unknown>;
            const inventoryId = String(
              row.id ?? row.Id ?? '',
            );
            const gameTemplateId = String(
              row.gameTemplateId ?? row.GameTemplateId ?? '',
            ).trim();
            const gameName = String(
              row.gameName ??
                row.GameName ??
                row.name ??
                row.Name ??
                '',
            ).trim();
            const thumbnailUrl = String(
              row.thumbnailUrl ??
                row.ThumbnailUrl ??
                row.imageUrl ??
                row.ImageUrl ??
                row.coverUrl ??
                row.CoverUrl ??
                '',
            ).trim();
            if (!inventoryId || !gameName) return null;
            return {
              inventoryId,
              gameTemplateId: gameTemplateId || null,
              gameName,
              thumbnailUrl: thumbnailUrl || null,
            };
          })
          .filter((item): item is InventoryCoverItem => Boolean(item));
      } catch {
        return [];
      }
    },
    staleTime: 5 * 60 * 1000,
    refetchOnWindowFocus: false,
  });

  const byTemplateId = useMemo(() => {
    const m = new Map<string, string>();
    for (const i of query.data ?? []) {
      if (!i.thumbnailUrl || !i.gameTemplateId) continue;
      m.set(i.gameTemplateId, i.thumbnailUrl);
    }
    return m;
  }, [query.data]);

  const byName = useMemo(() => {
    const m = new Map<string, string>();
    for (const i of query.data ?? []) {
      if (!i.thumbnailUrl) continue;
      m.set(i.gameName.toLowerCase(), i.thumbnailUrl);
    }
    return m;
  }, [query.data]);

  return {
    lookupByTemplateId: (id?: string | null): string | null => {
      if (!id) return null;
      return byTemplateId.get(id) ?? null;
    },
    lookupByName: (name?: string | null): string | null => {
      if (!name) return null;
      return byName.get(name.trim().toLowerCase()) ?? null;
    },
    isLoading: query.isLoading,
    count: query.data?.length ?? 0,
  };
}
