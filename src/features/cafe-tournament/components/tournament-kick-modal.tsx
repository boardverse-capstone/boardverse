"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { X, UserMinus, AlertTriangle } from "lucide-react";

interface Props {
  isOpen: boolean;
  onClose: () => void;
  tournamentId: string;
  participantId: string;
  participantName: string;
  onSubmit: (
    tournamentId: string,
    participantId: string,
    reason?: string,
  ) => Promise<boolean>;
}

export function TournamentKickModal({
  isOpen,
  onClose,
  tournamentId,
  participantId,
  participantName,
  onSubmit,
}: Props) {
  const [reason, setReason] = useState("");
  const [loading, setLoading] = useState(false);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    const ok = await onSubmit(tournamentId, participantId, reason.trim());
    setLoading(false);

    if (ok) {
      setReason("");
      onClose();
    }
  };

  return (
    <div className="fixed inset-0 bg-neutral-950/40 backdrop-blur-xs z-50 flex items-center justify-center p-4">
      <div className="bg-white border border-neutral-200 rounded-2xl max-w-md w-full p-6 space-y-4 shadow-xl animate-in fade-in-50 duration-150">
        <div className="flex items-center justify-between border-b pb-3">
          <div className="flex items-center gap-2">
            <div className="p-2 bg-rose-50 text-rose-700 border border-rose-200 rounded-lg">
              <UserMinus className="w-4 h-4" />
            </div>
            <div>
              <h3 className="font-bold text-base text-neutral-950">
                Loại VĐV Khỏi Giải Đấu
              </h3>
              <p className="text-xs text-neutral-500 font-medium">
                VĐV:{" "}
                <strong className="text-neutral-900">{participantName}</strong>
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="text-neutral-400 p-1 rounded-lg hover:text-neutral-900"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-1">
            <label className="text-[11px] font-semibold text-neutral-700">
              Lý do kick (Audit Log):
            </label>
            <Input
              type="text"
              placeholder="Vd: Đăng ký sai thông tin, vi phạm quy định..."
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              className="h-9 text-xs bg-neutral-50"
            />
          </div>

          <div className="p-3 bg-rose-50 border border-rose-200/80 rounded-xl text-[11px] text-rose-800 flex items-start gap-2">
            <AlertTriangle className="w-4 h-4 text-rose-600 shrink-0 mt-0.5" />
            <span>
              Trạng thái VĐV sẽ chuyển thành <strong>Withdrawn</strong>[cite:
              1]. Hành động này không thể hoàn tác sau khi xác nhận.
            </span>
          </div>

          <div className="pt-2 border-t flex justify-end gap-2">
            <Button
              type="button"
              variant="outline"
              onClick={onClose}
              className="h-9 text-xs rounded-lg border-neutral-200"
            >
              Hủy
            </Button>
            <Button
              type="submit"
              disabled={loading}
              className="h-9 bg-rose-600 hover:bg-rose-700 text-white text-xs font-bold rounded-lg px-4"
            >
              {loading ? "Đang xử lý..." : "Xác Nhận Kick VĐV"}
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
}
