"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { X, XCircle, AlertTriangle } from "lucide-react";
import { TournamentMatch } from "../types/tournament.types";

interface Props {
  isOpen: boolean;
  onClose: () => void;
  match: TournamentMatch | null;
  onCancelMatch: (matchId: string, reason: string) => Promise<boolean>;
}

export function TournamentMatchCancelModal({
  isOpen,
  onClose,
  match,
  onCancelMatch,
}: Props) {
  const [reason, setReason] = useState("");
  const [loading, setLoading] = useState(false);

  if (!isOpen || !match) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!reason.trim()) {
      alert("Vui lòng nhập lý do hủy bàn đấu!");
      return;
    }

    setLoading(true);
    const ok = await onCancelMatch(match.id, reason.trim());
    setLoading(false);

    if (ok) {
      setReason("");
      onClose();
    }
  };

  return (
    <div className="fixed inset-0 bg-neutral-950/40 backdrop-blur-xs z-50 flex items-center justify-center p-4">
      <div className="bg-white border border-neutral-200 rounded-3xl max-w-md w-full p-6 space-y-4 shadow-xl animate-in fade-in-50 duration-150">
        <div className="flex items-center justify-between border-b pb-3">
          <div className="flex items-center gap-2.5">
            <div className="p-2 bg-rose-50 text-rose-600 border border-rose-200 rounded-xl">
              <XCircle className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-extrabold text-base text-neutral-950">
                Hủy Bàn Đấu #{match.tableNumber}
              </h3>
              <p className="text-xs text-neutral-500 font-mono">
                Vòng #{match.roundNumber} | Mã: #{match.id.slice(0, 8)}
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
              Lý do hủy ván đấu (* Bắt buộc):
            </label>
            <Input
              type="text"
              placeholder="Vd: Bàn thiếu người, tranh chấp không giải quyết được..."
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              className="h-9 text-xs bg-neutral-50 rounded-xl"
              required
            />
          </div>

          <div className="p-3 bg-rose-50/80 border border-rose-200/80 rounded-2xl text-[11px] text-rose-800 flex items-start gap-2">
            <AlertTriangle className="w-4 h-4 text-rose-600 shrink-0 mt-0.5" />
            <span>
              Ván đấu sẽ chuyển sang trạng thái <strong>Cancelled</strong> và lý
              do sẽ được lưu vào hệ thống audit log.
            </span>
          </div>

          <div className="pt-2 border-t flex justify-end gap-2">
            <Button
              type="button"
              variant="outline"
              onClick={onClose}
              className="h-9 text-xs rounded-xl border-neutral-200"
            >
              Đóng
            </Button>
            <Button
              type="submit"
              disabled={loading}
              className="h-9 bg-rose-600 hover:bg-rose-700 text-white text-xs font-bold rounded-xl px-4 shadow-2xs"
            >
              {loading ? "Đang xử lý..." : "Xác Nhận Hủy Bàn"}
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
}
