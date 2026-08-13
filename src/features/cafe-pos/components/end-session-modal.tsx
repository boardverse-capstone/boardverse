"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { X, LogOut, Clock, Users, AlertCircle } from "lucide-react";

type ActiveSession = {
  id: string;
  tableName?: string;
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
    <div className="fixed inset-0 bg-neutral-950/40 backdrop-blur-xs z-50 flex items-center justify-center p-4">
      <div className="bg-white border border-neutral-200 rounded-2xl max-w-md w-full p-6 space-y-4 shadow-xl">
        {/* HEADER MODAL */}
        <div className="flex items-center justify-between border-b border-neutral-100 pb-3">
          <div className="flex items-center gap-2">
            <div className="p-2 rounded-lg bg-rose-50 text-rose-700 border border-rose-200">
              <LogOut className="w-4 h-4 text-rose-600" />
            </div>
            <div>
              <h3 className="font-bold text-base text-neutral-950">
                Xác Nhận Trả Bàn & Kết Thúc
              </h3>
              <p className="text-[11px] text-neutral-500 font-medium">
                Phiên chơi:{" "}
                <strong className="text-neutral-900">
                  {session.tableName}
                </strong>
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="text-neutral-400 hover:text-neutral-950 p-1 rounded-lg transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* BẢNG TÓM TẮT PHIÊN CHƠI THỰC TẾ */}
        <div className="p-3.5 bg-neutral-50 border border-neutral-200 rounded-xl space-y-2.5 text-xs">
          <div className="flex items-center justify-between">
            <span className="text-neutral-500 font-medium flex items-center gap-1.5">
              <Clock className="w-3.5 h-3.5 text-neutral-400" /> Thời gian đã
              chơi:
            </span>
            <span className="font-mono font-extrabold text-neutral-950 text-sm">
              {session.elapsedMinutes} phút
            </span>
          </div>

          <div className="flex items-center justify-between">
            <span className="text-neutral-500 font-medium flex items-center gap-1.5">
              <Users className="w-3.5 h-3.5 text-neutral-400" /> Tổng số khách:
            </span>
            <span className="font-bold text-neutral-900">
              {session.members?.length || 0} người
            </span>
          </div>

          <div className="flex items-center justify-between pt-2 border-t border-neutral-200/80">
            <span className="text-neutral-500 font-medium">
              Host phụ trách:
            </span>
            <span className="font-semibold text-neutral-800 truncate max-w-180px">
              {session.hostName || "N/A"}
            </span>
          </div>
        </div>

        {/* CANH BÁO TÁC VỤ */}
        <div className="flex items-start gap-2 p-3 bg-amber-50 border border-amber-200 rounded-xl text-[11px] text-amber-900 leading-tight">
          <AlertCircle className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
          <span>
            Thao tác này sẽ trả lại hộp game vật lý về kho, tính thời gian chơi
            và chuyển trạng thái <strong>{session.tableName}</strong> về sẵn
            sàng (Available).
          </span>
        </div>

        {/* FOOTER ACTIONS */}
        <div className="pt-3 border-t border-neutral-100 flex justify-end gap-2">
          <Button
            type="button"
            variant="outline"
            onClick={onClose}
            className="h-9 text-xs rounded-lg border-neutral-200"
          >
            Hủy
          </Button>
          <Button
            type="button"
            disabled={loading}
            onClick={handleEnd}
            className="h-9 bg-rose-600 text-white hover:bg-rose-700 text-xs font-bold rounded-lg px-4 disabled:opacity-50"
          >
            {loading ? "Đang xử lý..." : "Xác Nhận Trả Bàn"}
          </Button>
        </div>
      </div>
    </div>
  );
}
