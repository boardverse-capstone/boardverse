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

  // Caches the latest dedup IDs so the debounced `refreshFor` callback
  // can stay referentially stable. Without this, every time
  // `setExistingGameIds` ran (after the initial prime fetch) the hook
  // would re-render and return a brand-new `refreshFor` arrow, which
  // the dialog's debounce effect lists as a dep — turning into an
  // infinite re-fetch loop. Storing the IDs in a ref breaks the cycle:
  // the callback identity never changes, but it still reads fresh
  // values via `.current`.
  const dedupRef = useRef<{ active: string[]; trash: string[] }>({
    active: [],
    trash: [],
  });
  useEffect(() => {
    dedupRef.current = { active: existingGameIds, trash: deletedGameIds };
  }, [existingGameIds, deletedGameIds]);

  // Cancel in-flight requests when the Sheet closes, filters change,
  // or the hook unmounts. Without this the user can switch search
  // terms and watch the stale results land on top of fresh ones.
  const inflightRef = useRef<AbortController | null>(null);
  const cancelInflight = useCallback(() => {
    inflightRef.current?.abort();
    inflightRef.current = null;
  }, []);

  /**
   * Run one fetch cycle. `searchTerm` is passed in by the caller
   * rather than stored in hook state so this hook doesn't subscribe
   * to keystrokes and re-render the dialog tree. Dedup IDs are read
   * from `dedupRef` so the callback identity stays stable — the
   * dialog's debounce effect depends on it, and an unstable identity
   * here would loop infinitely.
   */
  const runFetch = useCallback(
    async (searchTerm: string) => {
      cancelInflight();
      const controller = new AbortController();
      inflightRef.current = controller;

      const { active, trash } = dedupRef.current;
      setLoading(true);
      try {
        const endpoint = searchTerm.trim()
          ? `/api/v1/board-games?search=${encodeURIComponent(searchTerm)}&pageNumber=1&pageSize=20`
          : `/api/v1/board-games?pageNumber=1&pageSize=20`;

        const response: any = await apiClient.get(endpoint, {
          signal: controller.signal,
        });
        if (controller.signal.aborted) return;

        // Unwrap the paginated envelope: backend returns
        // `{ data: BoardGame[], meta: {...} }` inside the
        // `ApiResponse.data` field that the axios interceptor already
        // unwrapped one level. Walk through both shapes so the hook
        // keeps working if the backend switches between them.
        const inner = response?.data ?? response;
        const list: MasterGameItem[] = Array.isArray(inner)
          ? inner
          : Array.isArray(inner?.data)
            ? inner.data
            : [];

        // Loại bỏ hoàn toàn các game đã tồn tại hoạt động hoặc đã bị xóa mềm
        const filteredList = list
          .filter(
            (game) => !active.includes(game.id) && !trash.includes(game.id),
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

        // Unwrap the same paginated envelope as the master-games
        // call: `{ data: Inventory[], meta }` inside the
        // `ApiResponse.data` that the axios interceptor already
        // unwrapped one level. Tolerate either the array or the
        // `{ data, meta }` shape.
        const unwrap = (res: any): any[] => {
          const inner = res?.data ?? res;
          if (Array.isArray(inner)) return inner;
          if (Array.isArray(inner?.data)) return inner.data;
          return [];
        };
        const activeList = unwrap(activeRes);
        const deletedList = unwrap(deletedRes);
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

  // `refreshFor` is referentially stable (deps: []) — the dialog's
  // debounce effect depends on it. If this ever became unstable it
  // would loop the dialog into infinite re-fetches, which is the bug
  // this comment is here to prevent regressing.
  const refreshFor = useCallback(
    (searchTerm: string) => {
      void runFetch(searchTerm);
    },
    [runFetch],
  );

  return {
    masterGames,
    loading,
    existingGameIds,
    deletedGameIds,
    refreshFor,
  };
}