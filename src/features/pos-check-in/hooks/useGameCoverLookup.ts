'use client';

import { useMemo } from 'react';
import { useAlternativeGames } from '../hooks/usePosCheckIn';
import { usePosBoxes } from '../hooks/usePosBoxes';
import { useInventoryCoverFallback } from './useInventoryCoverFallback';

/**
 * Tra cứu ảnh bìa game theo `gameTemplateId`, `cafeGameInventoryId` hoặc `name`.
 *
 * - Ưu tiên `imageUrl` trên `boxes` (mới nhất — gắn trực tiếp vào hộp).
 * - Fallback sang `alternativeGames` (template) khi hộp chưa có ảnh.
 * - Trả về function `lookup(box)` + `propsForThumb(box)` để tiện render.
 */
export interface CoverLookupBox {
  gameTemplateId?: string | null;
  cafeGameInventoryId?: string | null;
  gameName?: string | null;
  imageUrl?: string | null;
  barcode?: string | null;
}

export interface GameCoverLookup {
  /** Hàm truy xuất ảnh bìa từ 1 box bất kỳ. */
  lookup: (box: CoverLookupBox | null | undefined) => string | null;
  /** Tiện ích: trả object `{ src, alt }` cho `<GameCoverThumb />`. */
  propsForThumb: (
    box: CoverLookupBox | null | undefined,
    options?: { altFallback?: string },
  ) => { src: string | null; alt: string };
  /** Đếm số box có ảnh — để debug/QA. */
  totalWithCover: number;
}

export function useGameCoverLookup(
  cafeId?: string | null,
  externalBoxes?: ReadonlyArray<CoverLookupBox & { id?: string | null }>,
): GameCoverLookup {
  const { data: queriedBoxes = [] } = usePosBoxes(cafeId ?? undefined);
  const { data: games = [] } = useAlternativeGames(cafeId ?? undefined, 1, Boolean(cafeId));

  // Ưu tiên prop boxes (đã normalize từ parent) — chứa imageUrl chính xác nhất.
  // Fallback sang queriedBoxes (qua usePosBoxes) khi không có prop.
  const boxes = useMemo(() => {
    if (externalBoxes && externalBoxes.length > 0) {
      return [...externalBoxes];
    }
    return [...queriedBoxes];
  }, [externalBoxes, queriedBoxes]);

  const templateById = useMemo(() => {
    const map = new Map<string, { imageUrl: string; name: string }>();
    for (const g of games) {
      if (!g) continue;
      const id = String(g.gameTemplateId ?? '').trim();
      if (!id) continue;
      map.set(id, {
        imageUrl: g.imageUrl ?? '',
        name: g.name ?? '',
      });
    }
    return map;
  }, [games]);

  const templateByName = useMemo(() => {
    const map = new Map<string, { imageUrl: string; gameTemplateId: string }>();
    for (const g of games) {
      if (!g) continue;
      const name = String(g.name ?? '').trim().toLowerCase();
      if (!name || !g.imageUrl) continue;
      map.set(name, {
        imageUrl: g.imageUrl,
        gameTemplateId: String(g.gameTemplateId ?? ''),
      });
    }
    return map;
  }, [games]);

  const inventoryFallback = useInventoryCoverFallback(cafeId);
  const lookup = useMemo(() => {
    return (box: CoverLookupBox | null | undefined): string | null => {
      if (!box) return null;
      // 1. Box trực tiếp có imageUrl
      const direct = box.imageUrl?.trim();
      if (direct) {
        return direct;
      }
      // 2. Box cùng id với boxes có sẵn ảnh
      const matchedBox = boxes.find((b) => {
        if (!b) return false;
        if (
          box.cafeGameInventoryId &&
          b.id === box.cafeGameInventoryId &&
          b.imageUrl
        ) {
          return true;
        }
        if (box.gameTemplateId && b.gameTemplateId === box.gameTemplateId && b.imageUrl) {
          return true;
        }
        if (
          box.gameName &&
          (b.gameName ?? '').trim().toLowerCase() === box.gameName.trim().toLowerCase() &&
          b.imageUrl
        ) {
          return true;
        }
        return false;
      });
      if (matchedBox?.imageUrl) return matchedBox.imageUrl;
      // 3. Template (game metadata — từ /inventory endpoint)
      const tmplId = box.gameTemplateId?.trim();
      if (tmplId) {
        const t = templateById.get(tmplId);
        if (t?.imageUrl) return t.imageUrl;
      }
      const name = box.gameName?.trim().toLowerCase();
      if (name) {
        const t = templateByName.get(name);
        if (t?.imageUrl) return t.imageUrl;
      }
      // 4. Fallback cuối: danh sách inventory của cafe (cùng nguồn với Kho Hộp)
      const fromInvByTmpl = inventoryFallback.lookupByTemplateId(box.gameTemplateId);
      if (fromInvByTmpl) return fromInvByTmpl;
      const fromInvByName = inventoryFallback.lookupByName(box.gameName);
      if (fromInvByName) return fromInvByName;
      return null;
    };
  }, [boxes, games, templateById, templateByName, inventoryFallback]);

  const totalWithCover = useMemo(
    () => boxes.filter((b) => Boolean(b?.imageUrl)).length,
    [boxes],
  );

  const propsForThumb = useMemo(() => {
    return (
      box: CoverLookupBox | null | undefined,
      options?: { altFallback?: string },
    ) => {
      const src = lookup(box);
      const alt =
        box?.gameName?.trim() ||
        options?.altFallback ||
        (box?.barcode ? String(box.barcode) : '') ||
        'Game';
      return { src, alt };
    };
  }, [lookup]);

  return { lookup, propsForThumb, totalWithCover };
}
