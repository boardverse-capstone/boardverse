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
import { toast } from "sonner";
import { useAuthStore } from "@/features/auth/store/auth.store";
import {
  X,
  User,
  Users,
  Boxes,
  Barcode,
  Timer,
  Info,
  UserPlus,
} from "lucide-react";

interface SessionDetailModalProps {
  isOpen: boolean;
  onClose: () => void;
  sessionId: string | null;
  cafeId?: string | null;
  onFetchDetail: (sessionId: string) => Promise<any>;
  onOpenChecklist: (sessionGameId: string) => void;
  onReturnTable?: (sessionId: string) => void;
  onAddGuest?: (sessionId: string, displayName: string) => Promise<boolean>;
}

export function SessionDetailModal({
  isOpen,
  onClose,
  sessionId,
  cafeId,
  onFetchDetail,
  onOpenChecklist,
  onReturnTable,
  onAddGuest,
}: SessionDetailModalProps) {
  const [detail, setDetail] = useState<any | null>(null);
  const [fetchingId, setFetchingId] = useState<string | null>(null);
  const [guestName, setGuestName] = useState("");
  const [addingGuest, setAddingGuest] = useState(false);
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

  return (
    <div className="fixed inset-0 bg-neutral-950/40 backdrop-blur-xs z-50 flex items-center justify-center p-4">
      <div className="bg-white border border-neutral-200 rounded-2xl max-w-lg w-full p-6 space-y-4 shadow-xl max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between border-b border-neutral-100 pb-3">
          <div className="flex items-center gap-2">
            <div className="p-2 rounded-lg bg-neutral-100 border border-neutral-200 text-neutral-800">
              <Info className="w-4 h-4" />
            </div>
            <div>
              <h3 className="font-bold text-base text-neutral-950">
                Chi Tiết Phiên Chơi POS
              </h3>
              <p className="text-[11px] text-neutral-500 font-mono">
                ID: {sessionId}
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="text-neutral-400 hover:text-neutral-950 p-1 rounded-lg"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {loading ? (
          <div className="py-12 text-center text-xs font-semibold text-neutral-400 animate-pulse uppercase tracking-wider">
            Đang tải dữ liệu phiên chơi từ server...
          </div>
        ) : detail ? (
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-3 p-3 bg-neutral-50 border border-neutral-200/80 rounded-xl text-xs">
              <div>
                <span className="text-[10px] font-bold text-neutral-400 uppercase">
                  Vị trí bàn:
                </span>
                <div className="font-extrabold text-neutral-950 text-sm">
                  {detail.tableName || detail.tableLabel}
                </div>
              </div>
              <div>
                <span className="text-[10px] font-bold text-neutral-400 uppercase">
                  Host điều hành:
                </span>
                <div className="font-semibold text-neutral-800 truncate">
                  {detail.hostName || "N/A"}
                </div>
              </div>
              <div>
                <span className="text-[10px] font-bold text-neutral-400 uppercase">
                  Thời gian đã chơi:
                </span>
                <div className="font-mono font-bold text-amber-700 flex items-center gap-1">
                  <Timer className="w-3.5 h-3.5" />
                  {detail.elapsedMinutes ?? "—"} phút
                </div>
              </div>
              <div>
                <span className="text-[10px] font-bold text-neutral-400 uppercase">
                  Số người:
                </span>
                <div className="font-semibold text-neutral-800">
                  {(() => {
                    const present =
                      members.length > 0
                        ? guests.length
                        : readPresentCount(detail);
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
              <div>
                <span className="text-[10px] font-bold text-neutral-400 uppercase">
                  Thời điểm bắt đầu:
                </span>
                <div className="font-mono text-neutral-600">
                  {detail.startedAt
                    ? new Date(detail.startedAt).toLocaleTimeString("vi-VN", {
                        hour: "2-digit",
                        minute: "2-digit",
                      })
                    : "—"}
                </div>
              </div>
            </div>

            <div className="space-y-2">
              <h4 className="text-xs font-bold text-neutral-900 uppercase tracking-wider flex items-center gap-1.5">
                <Boxes className="w-4 h-4 text-neutral-600" /> Hộp Game Trong
                Phiên ({detail.games?.length || 0})
              </h4>

              {(detail.games?.length || 0) === 0 ? (
                <div className="p-3 border border-dashed border-neutral-200 rounded-xl text-center text-xs text-neutral-400">
                  Chưa gán hộp game vật lý nào cho bàn này.
                </div>
              ) : (
                <div className="space-y-2 max-h-40 overflow-y-auto pr-1">
                  {detail.games?.map((g: any) => (
                    <div
                      key={g.id || g.sessionGameId}
                      className="p-3 bg-white border border-neutral-200 rounded-xl flex items-center justify-between gap-2 shadow-2xs"
                    >
                      <div className="space-y-0.5">
                        <div className="font-bold text-xs text-neutral-950">
                          {g.gameName}
                        </div>
                        <div className="flex items-center gap-1 text-[11px] font-mono text-neutral-500">
                          <Barcode className="w-3 h-3 text-neutral-400" />
                          <span>{g.boxBarcode}</span>
                        </div>
                        {formatPlayerRange(readPlayerRange(g)) && (
                          <div className="text-[11px] font-semibold text-neutral-600">
                            {formatPlayerRange(readPlayerRange(g))}
                          </div>
                        )}
                      </div>

                      <div className="flex items-center gap-2 shrink-0">
                        <span
                          className={`px-2 py-0.5 rounded text-[9px] font-bold uppercase border ${
                            g.checkStatus === "Verified"
                              ? "bg-emerald-50 text-emerald-700 border-emerald-200"
                              : "bg-amber-50 text-amber-800 border-amber-200"
                          }`}
                        >
                          {g.checkStatus || "Pending"}
                        </span>

                        <Button
                          type="button"
                          size="sm"
                          variant="outline"
                          onClick={() => {
                            const status = String(
                              detail.status ??
                                detail.Status ??
                                detail.sessionStatus ??
                                "",
                            )
                              .toLowerCase()
                              .replace(/[_\s-]/g, "");
                            const returned =
                              status === "checking" ||
                              status === "unpaid" ||
                              status === "paid" ||
                              Boolean(detail.isCheckingInventory);
                            if (!returned) {
                              toast.error(
                                "Chưa trả bàn. Thứ tự: Trả bàn → kiểm kê → Thanh toán.",
                                {
                                  duration: 8000,
                                  action: {
                                    label: "Trả bàn",
                                    onClick: () => {
                                      onClose();
                                      onReturnTable?.(sessionId);
                                    },
                                  },
                                },
                              );
                              return;
                            }
                            onClose();
                            onOpenChecklist(g.id || g.sessionGameId);
                          }}
                          className="h-7 px-2 text-[10px] font-bold border-neutral-200 rounded-lg"
                        >
                          Kiểm kê
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            <div className="space-y-2">
              <h4 className="text-xs font-bold text-neutral-900 uppercase tracking-wider flex items-center gap-1.5">
                <Users className="w-4 h-4 text-neutral-600" /> Khách Tham Gia (
                {guests.length || 0})
              </h4>
              <div className="flex flex-wrap gap-1.5 max-h-24 overflow-y-auto">
                {guests.map((m: any) => (
                  <span
                    key={m.id || m.userId}
                    className="inline-flex items-center gap-1 text-[11px] font-semibold bg-neutral-100 border border-neutral-200 px-2 py-1 rounded-lg text-neutral-800"
                  >
                    <User className="w-3 h-3 text-neutral-400" />
                    {m.userName || m.displayName || m.id}
                  </span>
                ))}
                {guests.length === 0 && (
                  <span className="text-[11px] text-neutral-400">
                    Chưa có thành viên / khách walk-in.
                  </span>
                )}
              </div>

              {onAddGuest && cafeId && (
                <div className="flex gap-2 pt-1">
                  <Input
                    value={guestName}
                    onChange={(e) => setGuestName(e.target.value)}
                    placeholder="Tên khách vãng lai..."
                    className="h-8 text-xs border-neutral-200"
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
                    <UserPlus className="mr-1 h-3 w-3" />
                    {addingGuest ? "..." : "Thêm"}
                  </Button>
                </div>
              )}
            </div>
          </div>
        ) : (
          <div className="py-8 text-center text-xs text-rose-500 font-semibold">
            Không thể tải thông tin chi tiết của phiên chơi này.
          </div>
        )}

        <div className="pt-3 border-t border-neutral-100 flex justify-end">
          <Button
            type="button"
            variant="outline"
            onClick={onClose}
            className="h-9 text-xs rounded-lg px-4 border-neutral-200"
          >
            Đóng
          </Button>
        </div>
      </div>
    </div>
  );
}
