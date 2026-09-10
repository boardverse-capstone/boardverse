/* eslint-disable @typescript-eslint/no-explicit-any */
"use client";

import { useState, useEffect } from "react";
import {
  formatPlayerRange,
  mergePlayerRange,
  readPlayerRange,
  readPresentCount,
} from "../lib/player-range";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useAuthStore } from "@/features/auth/store/auth.store";
import { apiClient } from "@/core/api/client";
import { SessionAdvancedOps } from "./session-advanced-ops";
import {
  X,
  User,
  Users,
  Boxes,
  Timer,
  Info,
  UserPlus,
  Receipt,
  Dices,
} from "lucide-react";

function beHttpUrl(...candidates: unknown[]): string | null {
  for (const value of candidates) {
    if (typeof value !== "string") continue;
    const trimmed = value.trim();
    if (/^https?:\/\//i.test(trimmed)) return trimmed;
  }
  return null;
}

function imageFromSessionGame(game: any): string | null {
  const template = game?.gameTemplate ?? game?.GameTemplate ?? {};
  return beHttpUrl(
    game?.thumbnailUrl,
    game?.ThumbnailUrl,
    game?.imageUrl,
    game?.ImageUrl,
    game?.coverUrl,
    game?.CoverUrl,
    game?.coverImageUrl,
    game?.CoverImageUrl,
    game?.gameThumbnailUrl,
    game?.GameThumbnailUrl,
    template?.thumbnailUrl,
    template?.ThumbnailUrl,
    template?.imageUrl,
    template?.ImageUrl,
  );
}

function imageFromInventoryRow(row: any): string | null {
  return beHttpUrl(
    row?.thumbnailUrl,
    row?.ThumbnailUrl,
    row?.imageUrl,
    row?.ImageUrl,
    row?.coverUrl,
    row?.CoverUrl,
    row?.coverImageUrl,
    row?.CoverImageUrl,
  );
}

function unwrapInventoryRows(raw: any): any[] {
  if (!raw) return [];
  if (Array.isArray(raw)) return raw;
  const level1 = raw.data ?? raw.Data ?? raw.items ?? raw.Items;
  if (Array.isArray(level1)) return level1;
  if (level1 && typeof level1 === "object") {
    const nested = level1.data ?? level1.Data ?? level1.items ?? level1.Items;
    if (Array.isArray(nested)) return nested;
  }
  return [];
}

function inventoryTotalPages(raw: any): number {
  const meta = raw?.meta ?? raw?.Meta ?? raw?.data?.meta ?? raw?.data?.Meta;
  const pages = Number(meta?.totalPages ?? meta?.TotalPages ?? 1);
  return Number.isFinite(pages) && pages > 0 ? pages : 1;
}

interface SessionDetailModalProps {
  isOpen: boolean;
  onClose: () => void;
  sessionId: string | null;
  cafeId?: string | null;
  onFetchDetail: (sessionId: string) => Promise<any>;
  onReturnTable?: (sessionId: string) => void;
  onAddGuest?: (sessionId: string, displayName: string) => Promise<boolean>;
  otherSessions: Array<{
    id: string;
    tableName?: string;
    status?: string;
    memberUserIds?: string[];
  }>;
  playingUserIds?: string[];
  boxes?: Array<{
    id: string;
    cafeGameInventoryId: string;
    gameTemplateId: string;
    gameName: string;
    barcode: string;
    status: string;
  }>;
  /** Tăng sau khi chốt kiểm kê 1 hộp → reload lại list hộp trong chi tiết */
  detailRefreshKey?: number;
  onAttachGame: (sessionId: string, barcode: string) => Promise<boolean>;
  onAddMembers: (sessionId: string, userIds: string[]) => Promise<boolean>;
  onReportInventoryLoss: (
    sessionId: string,
    payload: {
      sessionGameId: string;
      missingComponents: Array<{
        componentTemplateId: string;
        missingQuantity: number;
      }>;
      notes?: string;
    },
  ) => Promise<boolean>;
  onPartialCheckout: (
    sessionId: string,
    memberUserIds: string[],
    applyDeposit?: boolean,
  ) => Promise<boolean>;
  onMergeMember: (
    sourceSessionId: string,
    memberUserId: string,
    targetSessionId: string,
  ) => Promise<boolean>;
}

export function SessionDetailModal({
  isOpen,
  onClose,
  sessionId,
  cafeId,
  onFetchDetail,
  onReturnTable,
  onAddGuest,
  otherSessions,
  playingUserIds = [],
  boxes = [],
  detailRefreshKey = 0,
  onAttachGame,
  onAddMembers,
  onReportInventoryLoss,
  onPartialCheckout,
  onMergeMember,
}: SessionDetailModalProps) {
  const [detail, setDetail] = useState<any | null>(null);
  const [fetchingId, setFetchingId] = useState<string | null>(null);
  const [guestName, setGuestName] = useState("");
  const [addingGuest, setAddingGuest] = useState(false);
  const [gameImageByKey, setGameImageByKey] = useState<Record<string, string>>(
    {},
  );
  const staffId = useAuthStore((s) => s.user?.id);
  const staffUsername = useAuthStore((s) => s.user?.username);

  const loading = isOpen && !!sessionId && fetchingId !== sessionId;

  useEffect(() => {
    let ignore = false;

    if (isOpen && sessionId) {
      onFetchDetail(sessionId).then((data) => {
        if (!ignore) {
          setDetail(data);
          setFetchingId(sessionId);
        }
      });
    }

    return () => {
      ignore = true;
    };
  }, [isOpen, sessionId, onFetchDetail]);

  useEffect(() => {
    if (!isOpen || !cafeId) return;
    let ignore = false;

    const loadInventoryImages = async () => {
      const map: Record<string, string> = {};
      let page = 1;
      let totalPages = 1;

      try {
        do {
          const res: any = await apiClient.get(
            `/api/cafes/${cafeId}/inventory`,
            {
              params: {
                pageNumber: page,
                pageSize: 100,
                sortDescending: true,
              },
            },
          );
          const payload = res?.data ?? res;
          const rows = unwrapInventoryRows(payload);
          totalPages = inventoryTotalPages(payload);
          for (const row of rows) {
            const url = imageFromInventoryRow(row);
            if (!url) continue;
            const keys = [
              row.gameTemplateId,
              row.GameTemplateId,
              row.id,
              row.Id,
              row.inventoryId,
              row.InventoryId,
              String(row.gameName ?? row.GameName ?? "")
                .trim()
                .toLowerCase(),
            ];
            for (const key of keys) {
              const normalized = String(key ?? "")
                .trim()
                .toLowerCase();
              if (normalized) map[normalized] = url;
            }
          }
          page += 1;
        } while (page <= totalPages && page <= 10);

        if (!ignore) setGameImageByKey(map);
      } catch {
        if (!ignore) setGameImageByKey({});
      }
    };

    void loadInventoryImages();
    return () => {
      ignore = true;
    };
  }, [isOpen, cafeId]);

  useEffect(() => {
    if (!isOpen) return;
    const games = detail?.games;
    if (!Array.isArray(games) || games.length === 0) return;

    const missingIds = [
      ...new Set(
        games
          .filter((game: any) => !imageFromSessionGame(game))
          .map((game: any) =>
            String(game.gameTemplateId || game.GameTemplateId || "").trim(),
          )
          .filter((id: string) => id && !gameImageByKey[id.toLowerCase()]),
      ),
    ];
    if (missingIds.length === 0) return;

    let ignore = false;
    void Promise.all(
      missingIds.map(async (id) => {
        try {
          const res: any = await apiClient.get(
            `/api/v1/board-games/${id}/details`,
          );
          const row = res?.data ?? res;
          const url = imageFromInventoryRow(row);
          return url ? ([id.toLowerCase(), url] as const) : null;
        } catch {
          return null;
        }
      }),
    ).then((pairs) => {
      if (ignore) return;
      const extra: Record<string, string> = {};
      for (const pair of pairs) {
        if (pair) extra[pair[0]] = pair[1];
      }
      if (Object.keys(extra).length === 0) return;
      setGameImageByKey((prev) => ({ ...prev, ...extra }));
    });

    return () => {
      ignore = true;
    };
  }, [isOpen, detail, gameImageByKey]);

  // Reload chi tiết sau khi kiểm kê xong 1 hộp (quay lại catalog còn lại)
  useEffect(() => {
    if (!isOpen || !sessionId || !detailRefreshKey) return;
    let ignore = false;
    onFetchDetail(sessionId).then((data) => {
      if (!ignore && data) {
        setDetail(data);
        setFetchingId(sessionId);
      }
    });
    return () => {
      ignore = true;
    };
  }, [detailRefreshKey, isOpen, sessionId, onFetchDetail]);

  // Poll elapsedMinutes từ BE mỗi 1s khi modal đang mở
  useEffect(() => {
    if (!isOpen || !sessionId || !cafeId) return;

    let cancelled = false;
    let inFlight = false;

    const pollElapsedFromBe = async () => {
      if (cancelled || inFlight) return;
      inFlight = true;
      try {
        const res: any = await apiClient.get(
          `/api/cafes/${cafeId}/pos/sessions/${sessionId}`,
        );
        const fresh = res?.data || res;
        if (cancelled || !fresh) return;

        setDetail((prev: any) => {
          if (!prev) {
            return {
              ...fresh,
              id: sessionId,
              games: fresh.games ?? fresh.Games,
            };
          }
          return {
            ...prev,
            elapsedMinutes:
              fresh.elapsedMinutes ??
              fresh.ElapsedMinutes ??
              prev.elapsedMinutes,
            estimatedRemainingMinutes:
              fresh.estimatedRemainingMinutes ??
              fresh.EstimatedRemainingMinutes ??
              prev.estimatedRemainingMinutes,
            status: fresh.status ?? fresh.Status ?? prev.status,
            startedAt: fresh.startedAt ?? fresh.StartedAt ?? prev.startedAt,
            games: fresh.games ?? fresh.Games ?? prev.games,
            members: fresh.members ?? fresh.Members ?? prev.members,
          };
        });
      } catch {
        // lần poll sau thử lại
      } finally {
        inFlight = false;
      }
    };

    void pollElapsedFromBe();
    const timer = window.setInterval(() => {
      void pollElapsedFromBe();
    }, 1000);

    return () => {
      cancelled = true;
      window.clearInterval(timer);
    };
  }, [isOpen, sessionId, cafeId]);

  if (!isOpen || !sessionId) return null;

  const members = detail?.members || detail?.Members || [];
  const guests = members.filter((m: any) => {
    const uid = String(m.userId ?? m.UserId ?? "");
    const name = String(
      m.userName ?? m.UserName ?? m.username ?? "",
    ).toLowerCase();
    if (staffId && (uid === staffId || String(m.id ?? "") === staffId)) {
      return false;
    }
    if (staffUsername && name && name === staffUsername.toLowerCase()) {
      return false;
    }
    return true;
  });

  const handleAddGuest = async () => {
    if (!onAddGuest || !guestName.trim()) return;
    setAddingGuest(true);
    try {
      const ok = await onAddGuest(sessionId, guestName.trim());
      if (ok) {
        setGuestName("");
        const data = await onFetchDetail(sessionId);
        setDetail(data);
        setFetchingId(sessionId);
      }
    } finally {
      setAddingGuest(false);
    }
  };

  const refreshDetail = async () => {
    const data = await onFetchDetail(sessionId);
    setDetail(data);
    setFetchingId(sessionId);
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-neutral-950/40 p-3 backdrop-blur-xs sm:p-4"
      onClick={onClose}
    >
      <div
        className="flex max-h-[92vh] w-full max-w-6xl flex-col overflow-hidden rounded-2xl border border-neutral-200 bg-white shadow-xl"
        onClick={(event) => event.stopPropagation()}
      >
        <div className="flex shrink-0 items-center justify-between border-b border-neutral-100 px-5 py-3">
          <div className="flex min-w-0 items-center gap-2">
            <div className="rounded-lg border border-neutral-200 bg-neutral-100 p-2 text-neutral-800">
              <Info className="size-4" />
            </div>
            <div className="min-w-0">
              <h3 className="text-base font-bold text-neutral-950">
                Chi Tiết Phiên Chơi POS
              </h3>
              <p className="truncate font-mono text-[11px] text-neutral-500">
                ID: {sessionId}
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="rounded-lg p-1 text-neutral-400 hover:text-neutral-950"
            aria-label="Đóng"
          >
            <X className="size-5" />
          </button>
        </div>

        {loading ? (
          <div className="px-5 py-16 text-center text-xs font-semibold uppercase tracking-wider text-neutral-400 animate-pulse">
            Đang tải dữ liệu phiên chơi từ server...
          </div>
        ) : detail ? (
          <div className="flex min-h-0 flex-1 flex-col gap-3 overflow-hidden px-5 py-4">
            {/* Meta — một hàng ngang */}
            <div className="grid shrink-0 grid-cols-2 gap-2 rounded-xl border border-neutral-200/80 bg-neutral-50 p-3 text-xs sm:grid-cols-3 lg:grid-cols-5">
              <div>
                <span className="text-[10px] font-bold uppercase text-neutral-400">
                  Vị trí bàn
                </span>
                <div className="text-sm font-extrabold text-neutral-950">
                  {detail.tableName || detail.tableLabel}
                </div>
              </div>
              <div>
                <span className="text-[10px] font-bold uppercase text-neutral-400">
                  Người phụ trách
                </span>
                <div className="truncate font-semibold text-neutral-800">
                  {detail.hostName || "—"}
                </div>
              </div>
              <div>
                <span className="text-[10px] font-bold uppercase text-neutral-400">
                  Thời gian đã chơi
                </span>
                <div className="flex items-center gap-1 font-mono font-bold text-amber-700">
                  <Timer className="size-3.5" />
                  {Number(
                    detail.elapsedMinutes ?? detail.ElapsedMinutes ?? 0,
                  )}{" "}
                  phút
                </div>
              </div>
              <div>
                <span className="text-[10px] font-bold uppercase text-neutral-400">
                  Số người
                </span>
                <div className="font-semibold text-neutral-800">
                  {(() => {
                    const present = readPresentCount(detail);
                    const range = mergePlayerRange(
                      detail.games?.[0],
                      detail.game,
                      detail,
                    );
                    const parts: string[] = [];
                    if (present != null) parts.push(`Hiện ${present}`);
                    const rangeLabel = formatPlayerRange(range);
                    if (rangeLabel) parts.push(rangeLabel);
                    return parts.length > 0 ? parts.join(" · ") : "—";
                  })()}
                </div>
              </div>
              <div className="col-span-2 sm:col-span-1">
                <span className="text-[10px] font-bold uppercase text-neutral-400">
                  Thời điểm bắt đầu
                </span>
                <div className="font-mono font-semibold text-neutral-900">
                  {detail.startedAt
                    ? new Date(detail.startedAt).toLocaleString("vi-VN", {
                        hour: "2-digit",
                        minute: "2-digit",
                        day: "2-digit",
                        month: "2-digit",
                        year: "numeric",
                      })
                    : "—"}
                </div>
              </div>
            </div>

            {/* 2 cột ngang: trái = hộp + khách · phải = thao tác nâng cao + hóa đơn */}
            <div className="grid min-h-0 flex-1 gap-4 overflow-hidden lg:grid-cols-12">
              <div className="flex min-h-0 flex-col gap-3 overflow-y-auto lg:col-span-5">
                <div className="space-y-2">
                  <h4 className="flex items-center gap-1.5 text-xs font-bold uppercase tracking-wider text-neutral-900">
                    <Boxes className="size-4 text-neutral-600" /> Hộp Game (
                    {detail.games?.length || 0})
                  </h4>

                  {(detail.games?.length || 0) === 0 ? (
                    <div className="rounded-xl border border-dashed border-neutral-200 p-3 text-center text-xs text-neutral-400">
                      Chưa gán hộp game vật lý nào cho bàn này.
                    </div>
                  ) : (
                    <div className="space-y-2">
                      {detail.games?.map((g: any) => {
                        const templateId = String(
                          g.gameTemplateId || g.GameTemplateId || "",
                        )
                          .trim()
                          .toLowerCase();
                        const inventoryId = String(
                          g.cafeGameInventoryId ||
                            g.CafeGameInventoryId ||
                            g.inventoryId ||
                            g.InventoryId ||
                            "",
                        )
                          .trim()
                          .toLowerCase();
                        const nameKey = String(g.gameName || "")
                          .trim()
                          .toLowerCase();
                        const imageUrl =
                          imageFromSessionGame(g) ||
                          (templateId ? gameImageByKey[templateId] : null) ||
                          (inventoryId ? gameImageByKey[inventoryId] : null) ||
                          (nameKey ? gameImageByKey[nameKey] : null);

                        return (
                          <div
                            key={g.id || g.sessionGameId}
                            className="flex items-center gap-3 rounded-xl border border-neutral-200 bg-white p-3 shadow-2xs"
                          >
                            <div className="size-12 shrink-0 overflow-hidden rounded-lg border border-neutral-200 bg-neutral-100">
                              {imageUrl ? (
                                // eslint-disable-next-line @next/next/no-img-element
                                <img
                                  src={imageUrl}
                                  alt={g.gameName || "Game"}
                                  className="size-full object-cover"
                                />
                              ) : (
                                <div className="flex size-full items-center justify-center text-neutral-400">
                                  <Dices className="size-5" />
                                </div>
                              )}
                            </div>
                            <div className="min-w-0 truncate text-xs font-bold text-neutral-950">
                              {g.gameName}
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>

                <div className="space-y-2">
                  <h4 className="flex items-center gap-1.5 text-xs font-bold uppercase tracking-wider text-neutral-900">
                    <Users className="size-4 text-neutral-600" /> Khách (
                    {guests.length || 0})
                  </h4>
                  <div className="flex flex-wrap gap-1.5">
                    {guests.map((m: any) => (
                      <span
                        key={m.id || m.userId}
                        className="inline-flex items-center gap-1 rounded-lg border border-neutral-200 bg-neutral-100 px-2 py-1 text-[11px] font-semibold text-neutral-800"
                      >
                        <User className="size-3 text-neutral-400" />
                        {m.userName || m.displayName || m.id}
                      </span>
                    ))}
                    {guests.length === 0 && (
                      <span className="text-[11px] text-neutral-400">
                        Chưa có thành viên / khách vãng lai.
                      </span>
                    )}
                  </div>

                  {onAddGuest && cafeId && (
                    <div className="flex gap-2">
                      <Input
                        value={guestName}
                        onChange={(e) => setGuestName(e.target.value)}
                        placeholder="Tên khách vãng lai..."
                        className="h-8 border-neutral-200 text-xs"
                        onKeyDown={(e) => {
                          if (e.key === "Enter") {
                            e.preventDefault();
                            void handleAddGuest();
                          }
                        }}
                      />
                      <Button
                        type="button"
                        size="sm"
                        disabled={addingGuest || !guestName.trim()}
                        onClick={() => void handleAddGuest()}
                        className="h-8 shrink-0 bg-neutral-950 px-2.5 text-[10px] font-bold uppercase text-white"
                      >
                        <UserPlus className="mr-1 size-3" />
                        {addingGuest ? "..." : "Thêm"}
                      </Button>
                    </div>
                  )}
                </div>

                <div className="space-y-2 rounded-xl border border-neutral-200 bg-neutral-50/60 p-3">
                  <h4 className="flex items-center gap-1.5 text-xs font-bold uppercase tracking-wider text-neutral-900">
                    <Receipt className="size-4 text-neutral-600" />
                    Hóa đơn
                  </h4>
                  <p className="text-[11px] leading-relaxed text-neutral-600">
                    Receipt chỉ có khi phiên đã <strong>Paid</strong>. Sau thanh
                    toán phiên biến mất khỏi tab phiên — vào tab{" "}
                    <strong>Giải ngân</strong> → mục phiên đã thanh toán →{" "}
                    <strong>Hóa đơn</strong>.
                  </p>
                </div>
              </div>

              <div className="min-h-0 overflow-y-auto lg:col-span-7">
                {cafeId && detail ? (
                  <SessionAdvancedOps
                    cafeId={cafeId}
                    sessionId={sessionId}
                    detail={detail}
                    boxes={boxes}
                    otherSessions={otherSessions}
                    playingUserIds={playingUserIds}
                    onAttachGame={(barcode) =>
                      onAttachGame(sessionId, barcode)
                    }
                    onAddMembers={(userIds) =>
                      onAddMembers(sessionId, userIds)
                    }
                    onReportInventoryLoss={(payload) =>
                      onReportInventoryLoss(sessionId, payload)
                    }
                    onPartialCheckout={(memberUserIds, applyDeposit) =>
                      onPartialCheckout(
                        sessionId,
                        memberUserIds,
                        applyDeposit,
                      )
                    }
                    onMergeMember={(memberUserId, targetSessionId) =>
                      onMergeMember(
                        sessionId,
                        memberUserId,
                        targetSessionId,
                      )
                    }
                    onRefreshDetail={refreshDetail}
                  />
                ) : null}
              </div>
            </div>
          </div>
        ) : (
          <div className="px-5 py-10 text-center text-xs font-semibold text-rose-500">
            Không thể tải thông tin chi tiết của phiên chơi này.
          </div>
        )}

        <div className="flex shrink-0 justify-end border-t border-neutral-100 px-5 py-3">
          <Button
            type="button"
            variant="outline"
            onClick={onClose}
            className="h-9 rounded-lg border-neutral-200 px-4 text-xs"
          >
            Đóng
          </Button>
        </div>
      </div>
    </div>
  );
}
