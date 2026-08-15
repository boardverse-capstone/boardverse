"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { X, UserPlus, Phone, User } from "lucide-react";

interface Props {
  isOpen: boolean;
  onClose: () => void;
  tournamentId: string;
  onSubmit: (
    tournamentId: string,
    payload: { displayName: string; phoneNumber?: string }
  ) => Promise<boolean>;
}

export function TournamentWalkInModal({
  isOpen,
  onClose,
  tournamentId,
  onSubmit,
}: Props) {
  const [displayName, setDisplayName] = useState("");
  const [phoneNumber, setPhoneNumber] = useState("");
  const [loading, setLoading] = useState(false);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!displayName.trim()) {
      alert("Vui lòng nhập tên hiển thị cho khách vãng lai!");
      return;
    }

    setLoading(true);
    const ok = await onSubmit(tournamentId, {
      displayName: displayName.trim(),
      phoneNumber: phoneNumber.trim() || undefined,
    });
    setLoading(false);

    if (ok) {
      setDisplayName("");
      setPhoneNumber("");
      onClose();
    }
  };

  return (
    <div className="fixed inset-0 bg-neutral-950/40 backdrop-blur-xs z-50 flex items-center justify-center p-4">
      <div className="bg-white border border-neutral-200 rounded-2xl max-w-md w-full p-6 space-y-4 shadow-xl animate-in fade-in-50 duration-150">
        <div className="flex items-center justify-between border-b pb-3">
          <div className="flex items-center gap-2">
            <div className="p-2 bg-emerald-50 text-emerald-700 border border-emerald-200 rounded-lg">
              <UserPlus className="w-4 h-4" />
            </div>
            <div>
              <h3 className="font-bold text-base text-neutral-950">
                Thêm Khách Vãng Lai (Walk-in)
              </h3>
              <p className="text-xs text-neutral-500">
                Tạo VĐV không có tài khoản BoardVerse tại quầy
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
          <div className="space-y-3">
            <div className="space-y-1">
              <label className="text-[11px] font-semibold text-neutral-700 flex items-center gap-1">
                <User className="w-3 h-3 text-neutral-400" />
                Tên hiển thị khách (*):
              </label>
              <Input
                type="text"
                placeholder="Vd: Vietcold"
                value={displayName}
                onChange={(e) => setDisplayName(e.target.value)}
                className="h-9 text-xs bg-neutral-50"
                required
              />
            </div>

            <div className="space-y-1">
              <label className="text-[11px] font-semibold text-neutral-700 flex items-center gap-1">
                <Phone className="w-3 h-3 text-neutral-400" />
                Số điện thoại liên hệ:
              </label>
              <Input
                type="text"
                placeholder="Vd: 0865415552"
                value={phoneNumber}
                onChange={(e) => setPhoneNumber(e.target.value)}
                className="h-9 text-xs bg-neutral-50 font-mono"
              />
            </div>
          </div>

          <div className="p-3 bg-amber-50 border border-amber-200/80 rounded-xl text-[11px] text-amber-800 space-y-1">
            <p className="font-bold">Lưu ý cho khách Walk-in:</p>
            <p className="text-[10px]">
              • Khách vãng lai sẽ tự động được đánh dấu Check-in.
            </p>
            <p className="text-[10px]">
              • Khách vãng lai không nhận Karma Bonus hoặc tích điểm Elo sau giải.
            </p>
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
              className="h-9 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold rounded-lg px-4"
            >
              {loading ? "Đang xử lý..." : "Xác Nhận Thêm Khách"}
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
}