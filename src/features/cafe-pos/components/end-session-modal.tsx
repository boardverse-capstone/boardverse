"use client";

import { useState } from "react";
import { X, LogOut, Clock, Users, AlertTriangle, Zap } from "lucide-react";
import { readPresentCount } from "../lib/player-range";
import {
  backdropCloseHandler,
  useDismissOnBackdrop,
} from "../lib/use-dismiss-on-backdrop";

type ActiveSession = {
  id: string;
  tableName?: string;
  hostId?: string;
  hostName?: string;
  elapsedMinutes?: number;
  members?: unknown[];
};

interface EndSessionModalProps {
  isOpen: boolean;
  onClose: () => void;
  session: ActiveSession | null;
  onConfirmEnd: (sessionId: string) => Promise<boolean>;
}

export function EndSessionModal({
  isOpen,
  onClose,
  session,
  onConfirmEnd,
}: EndSessionModalProps) {
  const [loading, setLoading] = useState(false);

  useDismissOnBackdrop(isOpen, onClose, { busy: loading });

  if (!isOpen || !session) return null;

  const handleEnd = async () => {
    setLoading(true);
    const success = await onConfirmEnd(session.id);
    setLoading(false);
    if (success) {
      onClose();
    }
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-neutral-950/70 backdrop-blur-xs p-4"
      onClick={backdropCloseHandler(onClose, loading)}
    >
      {/* MODAL CONTAINER */}
      <div
        className="relative max-w-md w-full overflow-hidden rounded-2xl border-2 border-amber-400 bg-gradient-to-br from-amber-50 via-orange-50 to-yellow-50 shadow-[6px_6px_0_rgba(249,115,22,0.4)]"
        onClick={(event) => event.stopPropagation()}
      >
        {/* CRT scanlines */}
        <div className="pointer-events-none absolute inset-0 bg-[repeating-linear-gradient(0deg,transparent_0,transparent_3px,rgba(255,255,255,0.05)_3px,rgba(255,255,255,0.05)_4px)]" />
        {/* LED corner dots */}
        <span className="pointer-events-none absolute -left-0.5 -top-0.5 size-2 animate-pulse rounded-full bg-amber-500 shadow-[0_0_10px_currentColor]" />
        <span className="pointer-events-none absolute -right-0.5 -bottom-0.5 size-2 animate-pulse rounded-full bg-orange-500 shadow-[0_0_10px_currentColor] [animation-delay:0.4s]" />
        <span className="pointer-events-none absolute -right-0.5 -top-0.5 size-1.5 animate-pulse rounded-full bg-amber-400 shadow-[0_0_8px_currentColor]" />
        <span className="pointer-events-none absolute -left-0.5 -bottom-0.5 size-1.5 animate-pulse rounded-full bg-orange-500 shadow-[0_0_8px_currentColor] [animation-delay:0.2s]" />

        {/* HEADER */}
        <div className="relative flex items-center justify-between border-b-2 border-amber-300/70 bg-gradient-to-r from-amber-100 via-orange-100 to-yellow-100 px-5 py-3">
          <div className="flex items-center gap-3">
            {/* Icon với glow */}
            <div className="relative p-2.5 rounded-xl border-2 border-neutral-400 bg-gradient-to-br from-amber-400 to-orange-600 shadow-[inset_0_-2px_0_rgba(0,0,0,0.2),0_0_12px_rgba(249,115,22,0.5)]">
              <LogOut className="w-5 h-5 text-white" />
              <span className="absolute -right-1 -top-1 size-2 animate-pulse rounded-full bg-yellow-400 shadow-[0_0_8px_currentColor]" />
            </div>
            <div>
              <h3 className="font-mono text-sm font-extrabold uppercase tracking-widest text-orange-950">
                ► Trả bàn — kết thúc giờ chơi
              </h3>
              <p className="font-mono text-[10px] font-bold uppercase tracking-widest text-amber-700">
                <span className="text-amber-500">▸</span> Bàn{" "}
                <strong className="text-orange-900">
                  {session.tableName}
                </strong>
                : dừng tính giờ, chuyển sang kiểm kê. Chưa thu tiền.
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="rounded-xl border-2 border-amber-300 bg-white p-1.5 font-mono text-amber-500 shadow-[2px_2px_0_rgba(249,115,22,0.3)] transition-all hover:border-amber-500 hover:bg-amber-50"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* BẢNG TÓM TẮT PHIÊN CHƠI */}
        <div className="relative space-y-2 p-4">
          {/* Row 1: Thời gian */}
          <div className="flex items-center justify-between rounded-xl border-2 border-amber-300 bg-white/80 px-4 py-3 shadow-[inset_0_-2px_0_rgba(0,0,0,0.06)]">
            <span className="flex items-center gap-2 font-mono text-[11px] font-bold uppercase tracking-widest text-amber-700">
              <span className="size-1.5 rounded-full bg-amber-500 shadow-[0_0_6px_currentColor] animate-pulse" />
              <Clock className="w-3.5 h-3.5" /> Thời gian đã chơi:
            </span>
            <span className="font-mono text-lg font-extrabold uppercase tracking-wide text-orange-950 [text-shadow:1px_1px_0_rgba(255,255,255,0.8)]">
              {session.elapsedMinutes} phút
            </span>
          </div>

          {/* Row 2: Số khách */}
          <div className="flex items-center justify-between rounded-xl border-2 border-amber-300 bg-white/80 px-4 py-3 shadow-[inset_0_-2px_0_rgba(0,0,0,0.06)]">
            <span className="flex items-center gap-2 font-mono text-[11px] font-bold uppercase tracking-widest text-amber-700">
              <span className="size-1.5 rounded-full bg-orange-500 shadow-[0_0_6px_currentColor] animate-pulse [animation-delay:0.3s]" />
              <Users className="w-3.5 h-3.5" /> Tổng số khách:
            </span>
            <span className="font-mono text-base font-extrabold uppercase tracking-wide text-orange-950">
              {readPresentCount(session) ?? session.members?.length ?? 0}{" "}
              <span className="text-amber-500">người</span>
            </span>
          </div>

          {/* Row 3: Host */}
          <div className="flex items-center justify-between rounded-xl border-2 border-amber-300/70 bg-white/60 px-4 py-2.5 shadow-[inset_0_-1px_0_rgba(0,0,0,0.05)]">
            <span className="font-mono text-[10px] font-bold uppercase tracking-widest text-amber-600">
              <span className="text-amber-500 mr-1">▸</span>Người phụ trách:
            </span>
            <span className="font-mono text-xs font-extrabold uppercase tracking-wide text-orange-900 truncate max-w-[180px]">
              {session.hostName || "—"}
            </span>
          </div>
        </div>

        {/* CẢNH BÁO TÁC VỤ */}
        <div className="relative mx-4 mb-4 flex items-start gap-3 rounded-xl border-2 border-amber-400 bg-gradient-to-r from-amber-50 via-yellow-50 to-orange-50 p-3 shadow-[3px_3px_0_rgba(234,179,8,0.35)]">
          <div className="relative shrink-0">
            <AlertTriangle className="w-5 h-5 text-amber-500" />
            <span className="absolute -right-0.5 -top-0.5 size-1.5 animate-pulse rounded-full bg-amber-400 shadow-[0_0_6px_currentColor]" />
          </div>
          <p className="font-mono text-[11px] font-bold leading-relaxed tracking-wide text-amber-900">
            Nút{" "}
            <span className="inline-flex items-center gap-1 rounded border border-amber-400 bg-amber-100 px-1.5 py-0.5 text-[10px] text-amber-800 shadow-[inset_0_-1px_0_rgba(0,0,0,0.1)]">
              <Zap className="w-3 h-3" /> XÁC NHẬN TRẢ BÀN
            </span>{" "}
            gọi kết thúc phiên: chốt thời gian đã chơi, chuyển sang{" "}
            <span className="rounded border border-amber-400 bg-amber-100 px-1.5 py-0.5 text-[10px] text-amber-800 shadow-[inset_0_-1px_0_rgba(0,0,0,0.1)]">
              ĐANG KIỂM KÊ
            </span>{" "}
            hộp. Bàn chưa trống và chưa thu tiền — bước đó làm sau khi kiểm kê xong.
          </p>
        </div>

        {/* FOOTER ACTIONS */}
        <div className="relative flex justify-end gap-2 border-t-2 border-amber-300/70 bg-gradient-to-r from-amber-100/60 to-orange-100/60 px-5 py-3">
          <button
            type="button"
            onClick={onClose}
            className="inline-flex h-9 items-center justify-center gap-1.5 rounded-xl border-2 border-neutral-400 bg-gradient-to-b from-neutral-100 to-neutral-200 px-5 font-mono text-[11px] font-extrabold uppercase tracking-widest text-neutral-700 shadow-[inset_0_-2px_0_rgba(0,0,0,0.1),2px_2px_0_rgba(0,0,0,0.1)] transition-all hover:from-neutral-200 hover:to-neutral-300 disabled:opacity-50"
          >
            ✕ Hủy
          </button>
          <button
            type="button"
            disabled={loading}
            onClick={handleEnd}
            className="relative inline-flex h-9 items-center justify-center gap-1.5 rounded-xl border-2 border-orange-600 bg-gradient-to-b from-orange-500 to-orange-700 px-5 font-mono text-[11px] font-extrabold uppercase tracking-widest text-white shadow-[inset_0_-2px_0_rgba(0,0,0,0.25),3px_3px_0_rgba(0,0,0,0.15)] transition-all hover:from-orange-400 hover:to-orange-600 disabled:cursor-not-allowed disabled:from-gray-400 disabled:to-gray-500 disabled:shadow-[inset_0_-2px_0_rgba(0,0,0,0.2)]"
          >
            {loading ? (
              <>
                <span className="size-1.5 animate-pulse rounded-full bg-white shadow-[0_0_6px_currentColor]" />
                Đang xử lý…
              </>
            ) : (
              <>
                <Zap className="w-3.5 h-3.5 text-yellow-300" />
                Xác nhận trả bàn
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
}
