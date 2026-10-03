"use client";

import { useState } from "react";
import {
  Gamepad2,
  Loader2,
  Plus,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { apiClient } from "@/core/api/client";
import { AddGameDialog } from "@/features/cafe-inventory/components/add-game-dialog";

export interface InventoryGamesSectionProps {
  cafeId: string;
}

interface InventoryItem {
  id: string;
  gameName?: string;
  name?: string;
  gameTemplateId?: string;
  boxQuantity?: number;
  status?: string;
}

/**
 * Tóm tắt board game inventory + CTA "Thêm game". Mở AddGameDialog
 * (đã có trong cafe-inventory) với onSuccess để refetch danh sách từ
 * GET /api/cafes/{cafeId}/inventory.
 */
export function InventoryGamesSection({ cafeId }: InventoryGamesSectionProps) {
  const queryClient = useQueryClient();
  const [addOpen, setAddOpen] = useState(false);

  const inventoryQuery = useQuery({
    queryKey: ["manager-cafe", cafeId, "inventory-summary"],
    queryFn: async () => {
      const raw = await apiClient.get<never, unknown>(
        `/api/cafes/${cafeId}/inventory?pageNumber=1&pageSize=20`,
      );
      return extractInventory(raw);
    },
    enabled: !!cafeId,
    staleTime: 30_000,
  });

  const games = inventoryQuery.data ?? [];
  const totalQuantity = games.reduce(
    (acc, g) => acc + (g.boxQuantity ?? 0),
    0,
  );

  function refetch() {
    void queryClient.invalidateQueries({
      queryKey: ["manager-cafe", cafeId, "inventory-summary"],
    });
  }

  return (
    <section
      aria-labelledby="section-board-games"
      className="rounded-2xl border border-neutral-200 bg-white p-5 space-y-3"
    >
      <div className="pb-1 border-b border-neutral-100 flex items-baseline gap-2">
        <Gamepad2 className="h-4 w-4 text-neutral-600 shrink-0" aria-hidden />
        <h2 id="section-board-games" className="text-section-header">
          Board game
        </h2>
        <span className="ml-auto inline-flex items-center gap-2">
          <span className="text-[11px] font-semibold text-neutral-600 tabular-nums">
            {games.length} trò • {totalQuantity} bản
          </span>
          <Button
            type="button"
            variant="ghost"
            size="sm"
            onClick={() => setAddOpen(true)}
            className="h-8 px-2 text-xs font-medium text-neutral-600 hover:text-neutral-900"
          >
            <Plus className="h-3.5 w-3.5 mr-1" aria-hidden />
            Thêm game
          </Button>
        </span>
      </div>

      {inventoryQuery.isLoading ? (
        <div
          role="status"
          aria-live="polite"
          className="flex items-center gap-2 text-helper px-3 py-2 rounded-lg border border-neutral-200 bg-neutral-50"
        >
          <Loader2 className="h-3.5 w-3.5 animate-spin" aria-hidden />
          Đang tải board game…
        </div>
      ) : games.length === 0 ? (
        <p className="text-helper">
          Chưa có board game nào. Thêm Splendor, Catan, hoặc các trò khác để
          khách có thể chọn trong POS.
        </p>
      ) : (
        <ul className="grid grid-cols-1 sm:grid-cols-2 gap-2">
          {games.slice(0, 6).map((g) => (
            <li
              key={g.id}
              className="flex items-baseline justify-between gap-3 py-1.5 px-2 rounded-lg border border-neutral-100 hover:border-neutral-200 transition-colors"
            >
              <span className="text-sm font-medium text-neutral-900 truncate">
                {g.gameName ?? g.name ?? "—"}
              </span>
              <span
                className={cn(
                  "text-xs font-semibold tabular-nums text-neutral-600",
                )}
              >
                {g.boxQuantity !== undefined ? `× ${g.boxQuantity}` : "—"}
              </span>
            </li>
          ))}
        </ul>
      )}

      <AddGameDialog
        isOpen={addOpen}
        onClose={() => setAddOpen(false)}
        cafeId={cafeId}
        onSuccess={refetch}
      />
    </section>
  );
}

/* ─── Helpers ─────────────────────────────────────────────────────── */

function extractInventory(raw: unknown): InventoryItem[] {
  if (Array.isArray(raw)) return raw as InventoryItem[];
  if (raw && typeof raw === "object") {
    const obj = raw as Record<string, unknown>;
    for (const key of ["items", "data", "result", "inventory"]) {
      const v = obj[key];
      if (Array.isArray(v)) return v as InventoryItem[];
    }
    // paged response: { data: [...], total, pageNumber, ... }
    if (obj.data && typeof obj.data === "object") {
      const d = obj.data as Record<string, unknown>;
      for (const key of ["items", "data", "result", "inventory"]) {
        const v = d[key];
        if (Array.isArray(v)) return v as InventoryItem[];
      }
    }
  }
  return [];
}