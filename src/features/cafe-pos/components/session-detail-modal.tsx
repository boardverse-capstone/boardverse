/* eslint-disable @typescript-eslint/no-explicit-any */
"use client";

import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { X, User, Users, Boxes, Barcode, Timer, Info } from "lucide-react";

interface SessionDetailModalProps {
  isOpen: boolean;
  onClose: () => void;
  sessionId: string | null;
  onFetchDetail: (sessionId: string) => Promise<any>;
  onOpenChecklist: (sessionGameId: string) => void;
}

export function SessionDetailModal({
  isOpen,
  onClose,
  sessionId,
  onFetchDetail,
  onOpenChecklist,
}: SessionDetailModalProps) {
  const [detail, setDetail] = useState<any | null>(null);
  const [fetchingId, setFetchingId] = useState<string | null>(null);

  // 1. Tự động tính toán trạng thái loading dựa trên state thay vì setState trong useEffect
  const loading = isOpen && !!sessionId && fetchingId !== sessionId;

  useEffect(() => {
    let ignore = false;

    if (isOpen && sessionId) {
      onFetchDetail(sessionId).then((data) => {
        if (!ignore) {
          setDetail(data);
          setFetchingId(sessionId); // Đánh dấu đã fetch xong ID này
        }
      });
    }

    return () => {
      ignore = true;
    };
  }, [isOpen, sessionId, onFetchDetail]);

  if (!isOpen || !sessionId) return null;

  return (
    <div className="fixed inset-0 bg-neutral-950/40 backdrop-blur-xs z-50 flex items-center justify-center p-4">
      <div className="bg-white border border-neutral-200 rounded-2xl max-w-lg w-full p-6 space-y-4 shadow-xl">
        {/* HEADER MODAL */}
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
            {/* CỤM THÔNG TIN CHÍNH */}
            <div className="grid grid-cols-2 gap-3 p-3 bg-neutral-50 border border-neutral-200/80 rounded-xl text-xs">
              <div>
                <span className="text-[10px] font-bold text-neutral-400 uppercase">
                  Vị trí bàn:
                </span>
                <div className="font-extrabold text-neutral-950 text-sm">
                  {detail.tableName}
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
                  {detail.elapsedMinutes} phút
                </div>
              </div>
              <div>
                <span className="text-[10px] font-bold text-neutral-400 uppercase">
                  Thời điểm bắt đầu:
                </span>
                <div className="font-mono text-neutral-600">
                  {new Date(detail.startedAt).toLocaleTimeString("vi-VN", {
                    hour: "2-digit",
                    minute: "2-digit",
                  })}
                </div>
              </div>
            </div>

            {/* DANH SÁCH GAME ĐANG DÙNG TRONG PHIÊN */}
            <div className="space-y-2">
              <h4 className="text-xs font-bold text-neutral-900 uppercase tracking-wider flex items-center gap-1.5">
                <Boxes className="w-4 h-4 text-neutral-600" /> Hộp Game Trong
                Phiên ({detail.games?.length || 0})
              </h4>

              {detail.games?.length === 0 ? (
                <div className="p-3 border border-dashed border-neutral-200 rounded-xl text-center text-xs text-neutral-400">
                  Chưa gán hộp game vật lý nào cho bàn này.
                </div>
              ) : (
                <div className="space-y-2 max-h-40 overflow-y-auto pr-1">
                  {detail.games?.map((g: any) => (
                    <div
                      key={g.id}
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
                      </div>

                      <div className="flex items-center gap-2 shrink-0">
                        <span
                          className={`px-2 py-0.5 rounded text-[9px] font-bold uppercase border ${
                            g.checkStatus === "Verified"
                              ? "bg-emerald-50 text-emerald-700 border-emerald-200"
                              : "bg-amber-50 text-amber-800 border-amber-200"
                          }`}
                        >
                          {g.checkStatus}
                        </span>

                        <Button
                          type="button"
                          size="sm"
                          variant="outline"
                          onClick={() => {
                            onClose();
                            onOpenChecklist(g.id);
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

            {/* DANH SÁCH THÀNH VIÊN */}
            <div className="space-y-2">
              <h4 className="text-xs font-bold text-neutral-900 uppercase tracking-wider flex items-center gap-1.5">
                <Users className="w-4 h-4 text-neutral-600" /> Khách Tham Gia (
                {detail.members?.length || 0})
              </h4>
              <div className="flex flex-wrap gap-1.5 max-h-24 overflow-y-auto">
                {detail.members?.map((m: any) => (
                  <span
                    key={m.id}
                    className="inline-flex items-center gap-1 text-[11px] font-semibold bg-neutral-100 border border-neutral-200 px-2 py-1 rounded-lg text-neutral-800"
                  >
                    <User className="w-3 h-3 text-neutral-400" />
                    {m.userName}
                  </span>
                ))}
              </div>
            </div>
          </div>
        ) : (
          <div className="py-8 text-center text-xs text-rose-500 font-semibold">
            Không thể tải thông tin chi tiết của phiên chơi này.
          </div>
        )}

        {/* FOOTER ACTIONS */}
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
