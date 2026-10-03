/* eslint-disable @typescript-eslint/no-explicit-any */
"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import { toast } from "sonner";
import { apiClient } from "@/core/api/client";

export interface MasterGameItem {
  id: string;
  name: string;
  description: string;
  components: any[];
}

/** Cap how many cards the dialog will render at once. Anything beyond this
 *  is paged locally to keep the Sheet scroll smooth on small cafes that
 *  pull in 200+ master games via the catalogue endpoint. */
const MAX_MASTER_GAMES = 50;

const NETWORK_FALLBACK_VI =
  "Không thể tải danh sách board game hệ thống. Vui lòng kiểm tra mạng và thử lại.";

function isCanceled(err: unknown): boolean {
  return (
    typeof err === "object" &&
    err !== null &&
    "name" in err &&
    (err as { name?: string }).name === "CanceledError"
  );
}

/**
 * Server-orchestration hook for the bulk-add Sheet.
 *
 * Why so little state lives here: the cart, search term, and per-card
 * config are all ephemeral UI state that should reset whenever the
 * dialog closes. Putting them in this hook would force a
 * "reset on isOpen=false" effect, which the project lint forbids as a
 * cascading-render hazard. The dialog owns those — its Sheet remounts
 * on close, which discards them naturally.
 *
 * This hook only owns long-lived server-driven data: the master games
 * list, dedup IDs, and pending inflight requests.
 */
export function useBulkAddInventory(isOpen: boolean, cafeId: string) {
  const [masterGames, setMasterGames] = useState<MasterGameItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [existingGameIds, setExistingGameIds] = useState<string[]>([]);
  const [deletedGameIds, setDeletedGameIds] = useState<string[]>([]);

  // Cancel in-flight requests when the Sheet closes, filters change,
  // or the hook unmounts. Without this the user can switch search
  // terms and watch the stale results land on top of fresh ones.
  const inflightRef = useRef<AbortController | null>(null);
  const cancelInflight = useCallback(() => {
    inflightRef.current?.abort();
    inflightRef.current = null;
  }, []);

  /**
   * Run one fetch cycle. `searchTerm` and the dedup IDs are passed in
   * by the caller rather than stored in hook state so this hook
   * doesn't subscribe to keystrokes and re-render the dialog tree.
   */
  const runFetch = useCallback(
    async (
      searchTerm: string,
      activeIds: string[],
      trashIds: string[],
    ) => {
      cancelInflight();
      const controller = new AbortController();
      inflightRef.current = controller;

      setLoading(true);
      try {
        const endpoint = searchTerm.trim()
          ? `/api/v1/board-games?search=${encodeURIComponent(searchTerm)}&pageNumber=1&pageSize=20`
          : `/api/v1/board-games?pageNumber=1&pageSize=20`;

        const response: any = await apiClient.get(endpoint, {
          signal: controller.signal,
        });
        if (controller.signal.aborted) return;

        const list: MasterGameItem[] = response?.data || response || [];

        // Loại bỏ hoàn toàn các game đã tồn tại hoạt động hoặc đã bị xóa mềm
        const filteredList = list
          .filter(
            (game) => !activeIds.includes(game.id) && !trashIds.includes(game.id),
          )
          .slice(0, MAX_MASTER_GAMES);

        setMasterGames(filteredList);
      } catch (err) {
        if (isCanceled(err)) return;
        console.error("Lỗi tải danh sách game gốc từ hệ thống:", err);
        toast.error(NETWORK_FALLBACK_VI);
        setMasterGames([]);
      } finally {
        if (inflightRef.current === controller) {
          inflightRef.current = null;
        }
        setLoading(false);
      }
    },
    [cancelInflight],
  );

  // Refresh dedup IDs + master games whenever the Sheet opens. The
  // dialog reports the current search term via `refreshFor(searchTerm)`
  // on every keystroke; this effect just primes the dedup.
  useEffect(() => {
    if (!isOpen || !cafeId) return;
    let cancelled = false;
    const controller = new AbortController();
    inflightRef.current = controller;

    (async () => {
      setLoading(true);
      try {
        const [activeRes, deletedRes]: any = await Promise.all([
          apiClient.get(
            `/api/cafes/${cafeId}/inventory?sortDescending=true&pageNumber=1&pageSize=100`,
            { signal: controller.signal },
          ),
          apiClient.get(`/api/cafes/${cafeId}/inventory/deleted`, {
            signal: controller.signal,
          }),
        ]);
        if (cancelled || controller.signal.aborted) return;
        const activeList = activeRes?.data || activeRes || [];
        const deletedList = deletedRes?.data || deletedRes || [];
        const activeIds = activeList.map(
          (item: any) => item.gameTemplateId || item.gameId || item.id,
        );
        const trashIds = deletedList.map(
          (item: any) => item.gameTemplateId || item.gameId || item.id,
        );
        setExistingGameIds(activeIds);
        setDeletedGameIds(trashIds);
      } catch (err) {
        if (isCanceled(err)) return;
        console.error(err);
        toast.error(NETWORK_FALLBACK_VI);
        setLoading(false);
      }
    })();

    return () => {
      cancelled = true;
      controller.abort();
      inflightRef.current = null;
    };
  }, [isOpen, cafeId]);

  // Cancel any pending request on unmount (e.g. user navigates away).
  useEffect(() => cancelInflight, [cancelInflight]);

  return {
    masterGames,
    loading,
    existingGameIds,
    deletedGameIds,
    refreshFor: (searchTerm: string) =>
      runFetch(searchTerm, existingGameIds, deletedGameIds),
  };
}