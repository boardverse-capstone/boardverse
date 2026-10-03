/* eslint-disable @typescript-eslint/no-explicit-any */
"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import { toast } from "sonner";
import { apiClient } from "@/core/api/client";

/** Inline error surfaced to the container so it can render a recoverable state. */
export interface InventoryError {
  /** Human-readable Vietnamese message safe to render directly. */
  message: string;
  /** True for transient failures where a retry is likely to help. */
  retryable: boolean;
}

export type InventoryViewMode = "active" | "trash";

/**
 * Normalise any thrown value into a stable `InventoryError` shape so the
 * container can render one of three states (loading / data / error)
 * without leaking axios internals to the UI.
 *
 * axios rejects with `Error(message)` after the response interceptor
 * unwraps the envelope (see `src/core/api/client.ts`); AxiosError still
 * carries the original status on `error.response?.status` for the rare
 * cases where the rejection propagates with `.response` intact.
 */
function classifyError(err: unknown, fallback: string): InventoryError {
  const raw =
    err instanceof Error
      ? err.message
      : typeof err === "string"
        ? err
        : fallback;
  // Strip the leading "Yêu cầu hết thời gian chờ." / network-prefix noise
  // the interceptor appends — the Vietnamese message we author here is
  // already user-facing.
  const message = raw?.trim() || fallback;
  const retryable = /mạng|kết nối|timeout|thời gian/i.test(message);
  return { message, retryable };
}

/**
 * Detect an axios `AxiosError` rejection and surface a status-aware
 * Vietnamese message. The response interceptor unwraps the upstream
 * envelope into `Error(message)`, so we can't read `error.response`
 * reliably — but the error string itself often encodes the status
 * (e.g. "Mã lỗi: 403 — Không có quyền…"). We classify common
 * statuses by string match so the right copy reaches the user.
 */
function classifyStatus(err: unknown): "forbidden" | "rate-limit" | "server" | "network" | "unknown" {
  if (typeof err !== "object" || err === null) return "unknown";
  const message =
    "message" in err && typeof (err as { message: unknown }).message === "string"
      ? (err as { message: string }).message
      : "";
  if (/403|forbidden|quyền/i.test(message)) return "forbidden";
  if (/429|too many|giới hạn/i.test(message)) return "rate-limit";
  if (/5\d\d|server/i.test(message)) return "server";
  if (/network|timeout|kết nối|thời gian|mạng/i.test(message)) return "network";
  return "unknown";
}

const NETWORK_FALLBACK_VI =
  "Không thể tải kho game lúc này. Vui lòng kiểm tra mạng và thử lại.";

/**
 * Find the total item count in a heterogeneous upstream envelope.
 * Different .NET endpoints expose it under different keys — probe the
 * usual ones and return `null` if none match, so the UI knows to fall
 * back to "is this the last page?" heuristics.
 */
function pickTotalCount(envelope: any): number | null {
  const candidates = [
    envelope?.totalCount,
    envelope?.total,
    envelope?.totalItems,
    envelope?.count,
    envelope?.data?.totalCount,
    envelope?.data?.total,
    envelope?.data?.totalItems,
    envelope?.data?.count,
  ];
  for (const c of candidates) {
    if (typeof c === "number" && Number.isFinite(c) && c >= 0) return c;
  }
  return null;
}

export function useInventory() {
  const [viewMode, setViewMode] = useState<InventoryViewMode>("active");
  const [isAddOpen, setIsAddOpen] = useState(false);
  const [isEditOpen, setIsEditOpen] = useState(false);
  const [selectedInventoryId, setSelectedInventoryId] = useState<string | null>(
    null,
  );

  const [cafeId, setCafeId] = useState<string | null>(null);
  const [inventoryList, setInventoryList] = useState<any[]>([]);
  // Total count of items in the current view (active vs trash), taken
  // from the upstream envelope when present. Used to drive the tab count
  // and the "next page" button — without it we can only guess from the
  // current page length, which is wrong on the last full page.
  const [totalCount, setTotalCount] = useState<number | null>(null);
  const [loading, setLoading] = useState(true);
  // Distinct from `loading` so the container can show a retry CTA without
  // also flashing the skeleton on every retry.
  const [error, setError] = useState<InventoryError | null>(null);

  // Filter & pagination state. `status === "All"` means "no status
  // filter" — the BE accepts a concrete enum value or the absence of
  // the param, so we omit the query param when "All" is selected.
  const [searchTerm, setSearchTerm] = useState("");
  const [status, setStatus] = useState<string>("All");
  const [sortBy, setSortBy] = useState<string>("UpdatedAt");
  const [sortDescending, setSortDescending] = useState<boolean>(true);
  const [pageNumber, setPageNumber] = useState<number>(1);
  const [pageSize, setPageSize] = useState<number>(10);

  // Hold the latest in-flight request so we can cancel it on unmount or
  // when the filters flip before the previous response lands. Without
  // this, a slow upstream can resolve *after* the user has changed
  // filters, briefly showing stale data.
  const inflightRef = useRef<AbortController | null>(null);

  // The id of the row currently in the inline delete confirmation.
  // When set, the inventory-feature-container renders an AlertDialog
  // asking the user to confirm; on confirm, the actual DELETE goes
  // through. Tracking it in hook state (not local component state) so
  // the dialog can stay open across container re-renders.
  const [pendingDeleteId, setPendingDeleteId] = useState<string | null>(null);
  // Per-card busy state for delete / restore so the user can see
  // which row is currently being mutated (and we can prevent
  // double-clicks on the same row).
  const [mutatingId, setMutatingId] = useState<string | null>(null);

  /**
   * Cancel any in-flight request. Safe to call repeatedly.
   */
  const cancelInflight = useCallback(() => {
    inflightRef.current?.abort();
    inflightRef.current = null;
  }, []);

  // Load the inventory list for the active view, forwarding the full
  // set of filter / sort / pagination query params.
  const loadInventory = useCallback(
    async (currentCafeId: string, searchKey: string) => {
      cancelInflight();
      const controller = new AbortController();
      inflightRef.current = controller;

      setLoading(true);
      setError(null);

      try {
        let endpoint = "";

        if (viewMode === "active") {
          const encodedSearch = encodeURIComponent(searchKey.trim());
          let queryParams = `searchTerm=${encodedSearch}&sortBy=${sortBy}&sortDescending=${sortDescending}&pageNumber=${pageNumber}&pageSize=${pageSize}`;

          if (status !== "All") {
            queryParams += `&status=${status}`;
          }

          endpoint = `/api/cafes/${currentCafeId}/inventory?${queryParams}`;
        } else {
          // Thay thế dấu "}" : "{" thành "}" else "{" ở đây
          endpoint = `/api/cafes/${currentCafeId}/inventory/deleted`;
        }

        const response: any = await apiClient.get(endpoint, {
          signal: controller.signal,
        });
        // Guard against late responses racing newer ones.
        if (controller.signal.aborted) return;
        const data = response?.data || response || [];
        setInventoryList(Array.isArray(data) ? data : []);

        // Pull the upstream's total from the envelope when the BE
        // exposes it. We probe the most common pagination fields so
        // the hook stays robust across minor shape changes upstream.
        const envelope: any = response ?? {};
        const total = pickTotalCount(envelope);
        setTotalCount(total);
        // If the upstream didn't expose a total, drop any stale value
        // from a previous page so the UI doesn't show two different
        // numbers at once during the loading flash.
        if (total === null) setTotalCount(null);
      } catch (err) {
        // AbortError is expected during cleanup — never surface it.
        if ((err as { name?: string })?.name === "CanceledError") return;
        console.error("Lỗi lấy dữ liệu kho game:", err);
        setInventoryList([]);
        setError(classifyError(err, NETWORK_FALLBACK_VI));
      } finally {
        if (inflightRef.current === controller) {
          inflightRef.current = null;
        }
        setLoading(false);
      }
    },
    [
      viewMode,
      status,
      sortBy,
      sortDescending,
      pageNumber,
      pageSize,
      cancelInflight,
    ],
  );

  const refreshInventory = useCallback(async () => {
    if (cafeId) {
      await loadInventory(cafeId, searchTerm);
    }
  }, [cafeId, searchTerm, loadInventory]);

  // Re-fetch on any filter or pagination change. The 400ms debounce
  // keeps the search input snappy; other filters don't trigger a
  // debounce because they fire less often and we want the result to
  // land immediately.
  useEffect(() => {
    // Local controller for the init my-cafes fetch (separate from
    // `inflightRef` because that one is owned by `loadInventory`).
    // Without this, navigating away during the first-paint cafe
    // resolve would fire `setCafeId` on a stale component tree.
    const initController = new AbortController();
    const initializePageData = async () => {
      try {
        let currentCafeId = cafeId;
        if (!currentCafeId) {
          const response: any = await apiClient.get("/api/manager/my-cafes", {
            signal: initController.signal,
          });
          if (initController.signal.aborted) return;
          const cafes = response?.data || response || [];
          if (cafes.length > 0) {
            currentCafeId = cafes[0].id;
            setCafeId(currentCafeId);
          } else {
            setLoading(false);
            return;
          }
        }
        if (currentCafeId) {
          await loadInventory(currentCafeId, searchTerm);
        }
      } catch (err) {
        // 401 refresh flow already redirects — don't double-toast.
        if ((err as { name?: string })?.name === "CanceledError") return;
        if (initController.signal.aborted) return;
        console.error(err);
        setError(classifyError(err, NETWORK_FALLBACK_VI));
        setLoading(false);
      }
    };

    const delayDebounce = setTimeout(() => {
      initializePageData();
    }, 400);

    return () => {
      clearTimeout(delayDebounce);
      initController.abort();
    };
  }, [
    viewMode,
    searchTerm,
    status,
    sortBy,
    sortDescending,
    pageNumber,
    pageSize,
    cafeId,
    loadInventory,
  ]);

  // Cancel any pending request when the hook unmounts (e.g. user navigates
  // away from the inventory page).
  useEffect(() => cancelInflight, [cancelInflight]);

  // Stage a delete by id — opens the inline confirmation dialog in
  // the container. The container calls `confirmDelete(id)` after the
  // user confirms. This two-step pattern lets the user change their
  // mind without an immediate network call.
  const requestDelete = useCallback((id: string) => {
    if (!cafeId) return;
    if (mutatingId) return; // another row is in flight — drop the new request
    setPendingDeleteId(id);
  }, [cafeId, mutatingId]);

  // Cancel a staged delete (e.g. user dismissed the confirmation).
  const cancelDelete = useCallback(() => {
    setPendingDeleteId(null);
  }, []);

  // Actually perform the DELETE after the user confirmed.
  const confirmDelete = useCallback(async () => {
    const id = pendingDeleteId;
    if (!id || !cafeId) return;
    if (mutatingId) return; // double-submit lock
    setPendingDeleteId(null);
    setMutatingId(id);
    try {
      await apiClient.delete(`/api/cafes/${cafeId}/inventory/${id}`);
      await loadInventory(cafeId, searchTerm);
      toast.success("Đã chuyển tựa game vào thùng rác.");
    } catch (err) {
      const kind = classifyStatus(err);
      const message =
        kind === "forbidden"
          ? "Bạn không có quyền xóa tựa game này."
          : kind === "rate-limit"
            ? "Quá nhiều yêu cầu — vui lòng thử lại sau ít giây."
            : kind === "server"
              ? "Máy chủ đang gặp sự cố. Vui lòng thử lại sau."
              : err instanceof Error
                ? err.message
                : "Xóa thất bại. Vui lòng thử lại.";
      toast.error(message);
    } finally {
      setMutatingId(null);
    }
  }, [pendingDeleteId, cafeId, mutatingId, loadInventory, searchTerm]);

  const handleRestore = async (id: string) => {
    if (!cafeId) return;
    if (mutatingId) return; // already mutating another row
    setMutatingId(id);
    try {
      await apiClient.post(`/api/cafes/${cafeId}/inventory/${id}/restore`);
      await loadInventory(cafeId, searchTerm);
      toast.success("Đã khôi phục tựa game về kho hoạt động.");
    } catch (err) {
      const kind = classifyStatus(err);
      const message =
        kind === "forbidden"
          ? "Bạn không có quyền khôi phục tựa game này."
          : kind === "rate-limit"
            ? "Quá nhiều yêu cầu — vui lòng thử lại sau ít giây."
            : kind === "server"
              ? "Máy chủ đang gặp sự cố. Vui lòng thử lại sau."
              : err instanceof Error
                ? err.message
                : "Khôi phục thất bại. Vui lòng thử lại.";
      toast.error(message);
    } finally {
      setMutatingId(null);
    }
  };

  return {
    viewMode,
    setViewMode,
    isAddOpen,
    setIsAddOpen,
    isEditOpen,
    setIsEditOpen,
    selectedInventoryId,
    setSelectedInventoryId,
    cafeId,
    inventoryList,
    totalCount,
    loading,
    error,
    searchTerm,
    setSearchTerm,
    status,
    setStatus,
    sortBy,
    setSortBy,
    sortDescending,
    setSortDescending,
    pageNumber,
    setPageNumber,
    pageSize,
    setPageSize,
    refreshInventory,
    requestDelete,
    confirmDelete,
    cancelDelete,
    pendingDeleteId,
    mutatingId,
    handleRestore,
  };
}