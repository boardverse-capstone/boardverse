"use client";

// src/features/lobby-merge/components/lobby-merge-pending-list.tsx

import { useCallback, useEffect, useState } from "react";
import {
  Check,
  X,
  Clock,
  RefreshCw,
  Table2,
  ArrowRight,
  UsersRound,
} from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Spinner } from "@/components/ui/spinner";
import {
  usePendingMergeRequests,
} from "../hooks/useMergeRequests";
import { useLobbyMergeRealtime } from "../hooks/useLobbyMergeRealtime";
import { useCancelMergeRequest } from "../hooks/useMergeRequestMutations";
import {
  LOBBY_MERGE_STATUS_LABELS,
  type LobbyMergeRequestDto,
  type LobbyMergeRequestStatus,
} from "../types/lobby-merge.interface";
import { LobbyMergeReviewDialog } from "./lobby-merge-review-dialog";

const STATUS_TONE: Record<LobbyMergeRequestStatus, string> = {
  Pending: "border-amber-300 bg-amber-50 text-amber-900",
  Approved: "border-emerald-300 bg-emerald-50 text-emerald-900",
  Rejected: "border-rose-300 bg-rose-50 text-rose-900",
  Expired: "border-neutral-300 bg-neutral-100 text-neutral-700",
  Cancelled: "border-neutral-300 bg-neutral-100 text-neutral-700",
};

export interface LobbyMergePendingListProps {
  cafeId: string | null;
  /** Lobby đang active trên POS — dùng để resolve BE lobbyId → tên bàn + tên lobby. */
  mergeLobbies?: MergeLobbyEntry[];
  /**
   * Resolve BE lobbyId → sessionId (POS key) bằng cách gọi session detail.
   * Dùng để lookup tên bàn từ mergeLobbies[].name.
   * Nếu không truyền → chỉ hiện lobby name (không có tên bàn).
   */
  resolveLobbyId?: (sessionId: string) => Promise<string | null>;
  /** Khi duyệt/từ chối xong, có thể cần refresh dữ liệu bên ngoài (vd: sessions). */
  onChanged?: () => void;
  /**
   * [FIX #auto-refresh-ppl] Sau khi duyệt ghép thành công, refresh POS data
   * (sessions + members + tables) để số lượng ppl cập nhật ngay trên bàn.
   * Phân biệt với `onChanged` (fire cho cả approve VÀ reject):
   *   - `onChanged` chỉ đóng dialog pending.
   *   - `onApproved` chỉ fire khi approve succeed → trigger fetchAllData.
   */
  onApproved?: () => void;
}

/** Entry đơn giản của lobby để resolve tên bàn trong pending list */
export interface MergeLobbyEntry {
  id: string; // = sessionId (POS key)
  name: string; // = "Phiên · Bàn X"
}

/** Kết quả resolve: BE lobbyId → entry có tên bàn */
type LobbyEntryMap = Map<string, MergeLobbyEntry>;

/**
 * Danh sách yêu cầu ghép lobby đang chờ duyệt.
 * Tách ra từ LobbyMergePanel để dùng được ở nhiều chỗ (header Phiên chơi, dialog, …).
 *
 * Realtime hook vẫn chạy khi mount → auto invalidate khi BE push event.
 */
export function LobbyMergePendingList({
  cafeId,
  mergeLobbies = [],
  resolveLobbyId,
  onChanged,
  onApproved,
}: LobbyMergePendingListProps) {
  useLobbyMergeRealtime(cafeId ?? undefined, { showToast: true });

  // Build BE_lobbyId → MergeLobbyEntry map
  // 1. Gọi resolveLobbyId(sessionId) → BE_lobbyId cho mỗi lobby (batch)
  // 2. Map BE_lobbyId → entry (name = "Phiên · Bàn X")
  const [lobbyEntryMap, setLobbyEntryMap] = useState<LobbyEntryMap>(new Map());

  useEffect(() => {
    if (!mergeLobbies.length || !resolveLobbyId) {
      requestAnimationFrame(() => setLobbyEntryMap(new Map()));
      return;
    }

    let cancelled = false;

    // Batch resolve: gọi resolveLobbyId cho mỗi lobby
    Promise.all(
      mergeLobbies.map(async (lobby): Promise<[string, MergeLobbyEntry] | null> => {
        const beLobbyId = await resolveLobbyId(lobby.id);
        if (cancelled || !beLobbyId) return null;
        return [beLobbyId, lobby];
      }),
    ).then((results) => {
      if (cancelled) return;
      const map = new Map<string, MergeLobbyEntry>();
      for (const r of results) {
        if (r) map.set(r[0], r[1]);
      }
      requestAnimationFrame(() => setLobbyEntryMap(map));
    });

    return () => {
      cancelled = true;
    };
  }, [mergeLobbies, resolveLobbyId]);

  const [reviewState, setReviewState] = useState<{
    request: LobbyMergeRequestDto;
    mode: "approve" | "reject";
  } | null>(null);

  const {
    data: pending = [],
    isLoading: pendingLoading,
    isError: pendingError,
    refetch: refetchPending,
  } = usePendingMergeRequests(cafeId ?? undefined, {
    refetchInterval: 15_000,
    pauseWhenHidden: true,
  });

  const cancel = useCancelMergeRequest();

  const handleCancel = useCallback(
    (requestId: string) => {
      if (!cafeId) return;
      cancel.mutate({ cafeId, requestId });
    },
    [cafeId, cancel],
  );

  const handleApprove = useCallback((req: LobbyMergeRequestDto) => {
    setReviewState({ request: req, mode: "approve" });
  }, []);

  const handleReject = useCallback((req: LobbyMergeRequestDto) => {
    setReviewState({ request: req, mode: "reject" });
  }, []);

  const handleRefresh = useCallback(() => {
    void refetchPending();
    onChanged?.();
  }, [refetchPending, onChanged]);

  if (!cafeId) {
    return (
      <div className="rounded-md border border-dashed p-6 text-center text-sm text-neutral-600">
        Chọn quán để xem yêu cầu ghép lobby.
      </div>
    );
  }

  if (pendingLoading && pending.length === 0) {
    return (
      <div className="flex items-center justify-center gap-2 py-10 text-sm text-neutral-600">
        <Spinner className="size-4" />
        Đang tải…
      </div>
    );
  }

  if (pendingError) {
    return (
      <div className="rounded-md border border-amber-300 bg-amber-50 p-3 text-sm text-amber-900">
        Không thể tải danh sách yêu cầu.{" "}
        <button type="button" className="underline" onClick={handleRefresh}>
          Thử lại
        </button>
      </div>
    );
  }

  if (pending.length === 0) {
    return (
      <div className="rounded-md border border-dashed py-10 text-center text-sm text-neutral-600">
        Không có yêu cầu ghép nhóm đang chờ duyệt.
      </div>
    );
  }

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between gap-2">
        <p className="font-mono text-xs font-bold uppercase tracking-widest text-neutral-700">
          {pending.length} yêu cầu đang chờ
        </p>
        <Button
          type="button"
          variant="ghost"
          size="sm"
          onClick={handleRefresh}
          className="gap-1.5"
        >
          <RefreshCw className={`size-3.5 ${pendingLoading ? "animate-spin" : ""}`} />
          Làm mới
        </Button>
      </div>

      <ul className="space-y-2">
        {pending.map((req) => (
          <li
            key={req.id}
            className="rounded-md border border-amber-200 bg-amber-50/40 p-3"
          >
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div className="min-w-0 flex-1 space-y-2">
                {/* Dòng chính: Tên bàn + lobby (Nguồn → Đích) */}
                <div className="flex flex-wrap items-center gap-1.5 text-sm font-semibold">
                  {/* Nguồn */}
                  <span className="flex items-center gap-1 rounded border border-amber-300 bg-amber-100 px-2 py-0.5 text-amber-900">
                    <Table2 className="size-3 shrink-0" aria-hidden="true" />
                    <span>
                      {(() => {
                        const src = lobbyEntryMap.get(req.sourceLobbyId);
                        return src?.name ?? req.sourceLobbyName ?? req.sourceLobbyId.slice(0, 8);
                      })()}
                    </span>
                  </span>
                  <span className="text-neutral-400">
                    <ArrowRight className="size-3" aria-hidden="true" />
                  </span>
                  {/* Đích */}
                  <span className="flex items-center gap-1 rounded border border-emerald-300 bg-emerald-100 px-2 py-0.5 text-emerald-900">
                    <Table2 className="size-3 shrink-0" aria-hidden="true" />
                    <span>
                      {(() => {
                        const tgt = lobbyEntryMap.get(req.targetLobbyId);
                        return tgt?.name ?? req.targetLobbyName ?? req.targetLobbyId.slice(0, 8);
                      })()}
                    </span>
                  </span>
                  {/* Trạng thái */}
                  <Badge
                    variant="outline"
                    className={`border ${STATUS_TONE[req.status]}`}
                  >
                    {LOBBY_MERGE_STATUS_LABELS[req.status]}
                  </Badge>
                </div>

                {/* Dòng phụ: Ai tạo + lý do */}
                <p className="text-xs text-neutral-700">
                  <UsersRound className="mr-0.5 inline size-3 shrink-0" aria-hidden="true" />
                  {req.requestedByUserName || req.requestedByUserId.slice(0, 8)}
                  {req.reason ? (
                    <span className="ml-1 text-neutral-500">· Lý do: {req.reason}</span>
                  ) : null}
                </p>

                {/* Badges: members + capacity */}
                <div className="flex flex-wrap gap-1.5 text-xs">
                  <Badge variant="outline" className="font-normal">
                    Nguồn {req.sourceActiveMembersAtRequest}/{req.sourceMembersCount} active
                  </Badge>
                  {req.combinedCount != null ? (
                    <Badge variant="outline" className="font-normal">
                      Tổng sau ghép {req.combinedCount}
                    </Badge>
                  ) : null}
                  {req.seatCapacity != null ? (
                    <Badge variant="outline" className="font-normal">
                      Chỗ ngồi {req.seatCapacity}
                    </Badge>
                  ) : null}
                  {req.fitsCapacity === false ? (
                    <Badge variant="outline" className="border-rose-300 bg-rose-50 text-rose-800">
                      Không đủ ghế
                    </Badge>
                  ) : req.fitsCapacity === true ? (
                    <Badge variant="outline" className="border-emerald-300 bg-emerald-50 text-emerald-800">
                      Đủ ghế
                    </Badge>
                  ) : null}
                </div>

                <p className="text-xs text-neutral-500">
                  Hết hạn: {new Date(req.expiresAt).toLocaleString("vi-VN")}
                </p>
              </div>

              <div className="flex shrink-0 flex-col gap-2">
                <Button
                  type="button"
                  size="sm"
                  onClick={() => handleApprove(req)}
                  className="gap-1.5"
                >
                  <Check className="size-3.5" />
                  Duyệt
                </Button>
                <Button
                  type="button"
                  size="sm"
                  variant="outline"
                  onClick={() => handleReject(req)}
                  className="gap-1.5 border-rose-300 text-rose-800 hover:bg-rose-50"
                >
                  <X className="size-3.5" />
                  Từ chối
                </Button>
                <Button
                  type="button"
                  size="sm"
                  variant="ghost"
                  onClick={() => handleCancel(req.id)}
                  disabled={cancel.isPending}
                  className="gap-1.5 text-neutral-600"
                >
                  Hủy yêu cầu
                </Button>
              </div>
            </div>
          </li>
        ))}
      </ul>

      {reviewState && cafeId ? (
        <LobbyMergeReviewDialog
          cafeId={cafeId}
          request={reviewState.request}
          mode={reviewState.mode}
          isOpen={Boolean(reviewState)}
          // [FIX #auto-refresh-ppl] Fire chỉ khi approve succeed → trigger fetchAllData.
          onApproved={onApproved}
          onClose={() => {
            setReviewState(null);
            void refetchPending();
            onChanged?.();
          }}
        />
      ) : null}

      {/* Icon giữ import Clock cho future use (đã có trong panel cũ) */}
      <span className="hidden">
        <Clock className="size-3.5" />
      </span>
    </div>
  );
}