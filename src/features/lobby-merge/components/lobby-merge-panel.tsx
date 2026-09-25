"use client";

// src/features/lobby-merge/components/lobby-merge-panel.tsx

import { useCallback, useMemo, useState } from "react";
import { Plus, RefreshCw, Check, X, Clock, History, UsersRound } from "lucide-react";
import { toast } from "sonner";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardAction,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Spinner } from "@/components/ui/spinner";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { usePendingMergeRequests, useLobbyMergeHistory } from "../hooks/useMergeRequests";
import { useLobbyMergeRealtime } from "../hooks/useLobbyMergeRealtime";
import { useCancelMergeRequest } from "../hooks/useMergeRequestMutations";
import {
  LOBBY_MERGE_STATUS_LABELS,
  type LobbyMergeRequestDto,
  type LobbyMergeRequestStatus,
} from "../types/lobby-merge.interface";
import { LobbyMergeCreateDialog, type LobbyOption, type LobbyMergeMember } from "./lobby-merge-create-dialog";
import { LobbyMergeReviewDialog } from "./lobby-merge-review-dialog";

export interface LobbyMergePanelProps {
  cafeId: string | null;
  /** Lobby đang active — staff có thể chọn khi tạo yêu cầu. */
  activeLobbies?: LobbyOption[];
  /** Member thuộc lobby nguồn (mặc định nếu có lobby nguồn được chọn trước). */
  membersByLobby?: Record<string, LobbyMergeMember[]>;
  /** Lobby đang focus khi mount (filter history). */
  focusLobbyId?: string;
  /**
   * Tra `sessionId → lobbyId` qua session detail.
   * UI POS truyền sẵn `id` từ session — service BE LobbyMergeController cần lobbyId.
   * Trả về null nếu session chưa có lobbyId (vd session mới tạo).
   */
  fetchSessionLobbyId?: (sessionId: string) => Promise<string | null>;
  /**
   * Map `memberId → lobbyId` — để dialog lọc đúng member khi staff đổi source.
   */
  memberLobbyIds?: Record<string, string>;
}

const STATUS_TONE: Record<LobbyMergeRequestStatus, string> = {
  Pending: "border-amber-300 bg-amber-50 text-amber-900",
  Approved: "border-emerald-300 bg-emerald-50 text-emerald-900",
  Rejected: "border-rose-300 bg-rose-50 text-rose-900",
  Expired: "border-neutral-300 bg-neutral-100 text-neutral-700",
  Cancelled: "border-neutral-300 bg-neutral-100 text-neutral-700",
};

const HISTORY_STATUSES: LobbyMergeRequestStatus[] = [
  "Approved",
  "Rejected",
  "Expired",
  "Cancelled",
];

export function LobbyMergePanel({
  cafeId,
  activeLobbies = [],
  membersByLobby = {},
  focusLobbyId,
  fetchSessionLobbyId,
  memberLobbyIds,
}: LobbyMergePanelProps) {
  // Realtime — auto invalidate pending & history khi BE push event.
  useLobbyMergeRealtime(cafeId ?? undefined, { showToast: true });

  const [reviewState, setReviewState] = useState<{
    request: LobbyMergeRequestDto;
    mode: "approve" | "reject";
  } | null>(null);
  const [createOpen, setCreateOpen] = useState(false);
  const [historyLobbyId, setHistoryLobbyId] = useState<string>(focusLobbyId ?? "");
  const [resolvingLobbyIds, setResolvingLobbyIds] = useState(false);

  const {
    data: pending = [],
    isLoading: pendingLoading,
    isError: pendingError,
    refetch: refetchPending,
  } = usePendingMergeRequests(cafeId ?? undefined, {
    refetchInterval: 30_000,
  });

  const {
    data: history = [],
    isLoading: historyLoading,
    refetch: refetchHistory,
  } = useLobbyMergeHistory(
    cafeId ?? undefined,
    historyLobbyId || focusLobbyId || undefined,
  );

  const cancel = useCancelMergeRequest();

  const handleCancel = useCallback(
    (requestId: string) => {
      if (!cafeId) return;
      cancel.mutate({ cafeId, requestId });
    },
    [cafeId, cancel],
  );

  const handleApprove = useCallback((request: LobbyMergeRequestDto) => {
    setReviewState({ request, mode: "approve" });
  }, []);

  const handleReject = useCallback((request: LobbyMergeRequestDto) => {
    setReviewState({ request, mode: "reject" });
  }, []);

  const filteredHistory = history;

  if (!cafeId) {
    return (
      <Card>
        <CardContent className="py-8 text-center text-sm text-neutral-600">
          Chọn quán để xem yêu cầu ghép lobby.
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader className="border-b-2 border-current/10">
          <CardTitle className="flex items-center gap-2 font-mono text-base font-extrabold uppercase tracking-tight">
            <UsersRound className="size-4" />
            Ghép lobby (Lobby Merge)
          </CardTitle>
          <CardAction className="flex items-center gap-2">
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => void refetchPending()}
              className="gap-1.5"
              aria-label="Làm mới danh sách yêu cầu"
            >
              <RefreshCw className={`size-3.5 ${pendingLoading ? "animate-spin" : ""}`} />
              Làm mới
            </Button>
            <Button
              type="button"
              size="sm"
              onClick={async () => {
                // POS truyền sessionId vào dropdown — service cần lobbyId thật của BE.
                // Resolve trước khi mở dialog để user chọn sẵn; nếu session nào chưa có
                // lobbyId (session mới), vẫn cho mở dialog để user thấy thông báo.
                if (fetchSessionLobbyId && activeLobbies.length > 0) {
                  setResolvingLobbyIds(true);
                  try {
                    await Promise.all(
                      activeLobbies.map((l) => fetchSessionLobbyId(l.id)),
                    );
                  } finally {
                    setResolvingLobbyIds(false);
                  }
                }
                setCreateOpen(true);
              }}
              disabled={activeLobbies.length < 2 || resolvingLobbyIds}
              className="gap-1.5"
            >
              {resolvingLobbyIds ? (
                <Spinner className="size-3.5" />
              ) : (
                <Plus className="size-3.5" />
              )}
              {resolvingLobbyIds ? "Đang tra lobby…" : "Tạo yêu cầu"}
            </Button>
          </CardAction>
        </CardHeader>
        <CardContent className="p-0">
          <Tabs defaultValue="pending" className="w-full">
            <TabsList className="m-3 inline-flex h-9">
              <TabsTrigger value="pending" className="gap-1.5">
                <Clock className="size-3.5" />
                Đang chờ ({pending.length})
              </TabsTrigger>
              <TabsTrigger value="history" className="gap-1.5">
                <History className="size-3.5" />
                Lịch sử
              </TabsTrigger>
            </TabsList>

            <TabsContent value="pending" className="m-0 space-y-2 p-3 pt-0">
              {pendingLoading && pending.length === 0 ? (
                <div className="flex items-center justify-center gap-2 py-8 text-sm text-neutral-600">
                  <Spinner className="size-4" />
                  Đang tải…
                </div>
              ) : pendingError ? (
                <div className="rounded-md border border-amber-300 bg-amber-50 p-3 text-sm text-amber-900">
                  Không thể tải danh sách yêu cầu.{" "}
                  <button
                    type="button"
                    className="underline"
                    onClick={() => void refetchPending()}
                  >
                    Thử lại
                  </button>
                </div>
              ) : pending.length === 0 ? (
                <div className="rounded-md border border-dashed py-8 text-center text-sm text-neutral-600">
                  Không có yêu cầu ghép nhóm đang chờ duyệt.
                </div>
              ) : (
                <ul className="space-y-2">
                  {pending.map((req) => (
                    <li
                      key={req.id}
                      className="rounded-md border border-amber-200 bg-amber-50/40 p-3"
                    >
                      <div className="flex flex-wrap items-start justify-between gap-3">
                        <div className="min-w-0 flex-1 space-y-1">
                          <div className="flex flex-wrap items-center gap-2">
                            <p className="font-semibold">
                              {req.sourceLobbyName || req.sourceLobbyId.slice(0, 8)}
                              <span className="mx-1.5 text-neutral-400">→</span>
                              {req.targetLobbyName || req.targetLobbyId.slice(0, 8)}
                            </p>
                            <Badge
                              variant="outline"
                              className={`border ${STATUS_TONE[req.status]}`}
                            >
                              {LOBBY_MERGE_STATUS_LABELS[req.status]}
                            </Badge>
                          </div>

                          <p className="text-xs text-neutral-700">
                            Người tạo: {req.requestedByUserName || req.requestedByUserId.slice(0, 8)}
                            {req.reason ? ` · Lý do: ${req.reason}` : ""}
                          </p>

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
              )}
            </TabsContent>

            <TabsContent value="history" className="m-0 space-y-3 p-3 pt-0">
              <div className="flex items-center gap-2">
                <span className="text-xs font-medium text-neutral-600">Lobby:</span>
                <Select value={historyLobbyId} onValueChange={setHistoryLobbyId}>
                  <SelectTrigger size="sm" className="h-8 max-w-xs flex-1">
                    <SelectValue placeholder="Tất cả lobby" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="">Tất cả lobby</SelectItem>
                    {activeLobbies.map((l) => (
                      <SelectItem key={l.id} value={l.id}>
                        {l.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  onClick={() => void refetchHistory()}
                  className="gap-1.5"
                >
                  <RefreshCw className={`size-3.5 ${historyLoading ? "animate-spin" : ""}`} />
                </Button>
              </div>

              {historyLoading && history.length === 0 ? (
                <div className="flex items-center justify-center gap-2 py-8 text-sm text-neutral-600">
                  <Spinner className="size-4" />
                  Đang tải…
                </div>
              ) : history.length === 0 ? (
                <div className="rounded-md border border-dashed py-8 text-center text-sm text-neutral-600">
                  Chưa có lịch sử ghép lobby.
                </div>
              ) : (
                <ul className="space-y-1.5">
                  {filteredHistory.map((log) => (
                    <li
                      key={log.id}
                      className="flex flex-wrap items-start gap-2 rounded-md border border-neutral-200 bg-white px-3 py-2 text-xs"
                    >
                      <Badge variant="outline" className="border-neutral-300 bg-neutral-50">
                        {log.action}
                      </Badge>
                      <span className="text-neutral-700">
                        {log.performedByUserName ||
                          log.performedByUserId?.slice(0, 8) ||
                          "—"}
                      </span>
                      <span className="ml-auto text-neutral-500">
                        {new Date(log.createdAt).toLocaleString("vi-VN")}
                      </span>
                      {!log.success ? (
                        <Badge variant="outline" className="border-rose-300 bg-rose-50 text-rose-800">
                          Lỗi: {log.errorMessage ?? "không rõ"}
                        </Badge>
                      ) : null}
                    </li>
                  ))}
                </ul>
              )}
            </TabsContent>
          </Tabs>
        </CardContent>
      </Card>

      <LobbyMergeCreateDialog
        cafeId={cafeId}
        isOpen={createOpen}
        onClose={() => setCreateOpen(false)}
        lobbies={activeLobbies}
        members={
          historyLobbyId && membersByLobby[historyLobbyId]
            ? membersByLobby[historyLobbyId]
            : Object.values(membersByLobby).flat()
        }
        memberLobbyIds={memberLobbyIds}
        resolveLobbyId={fetchSessionLobbyId}
        onSuccess={() => {
          void refetchPending();
        }}
      />

      {reviewState && cafeId ? (
        <LobbyMergeReviewDialog
          cafeId={cafeId}
          request={reviewState.request}
          mode={reviewState.mode}
          isOpen={Boolean(reviewState)}
          onClose={() => {
            setReviewState(null);
            void refetchPending();
          }}
        />
      ) : null}
    </div>
  );
}
