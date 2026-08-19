"use client";

import { useState } from "react";
import { AddWalkInDto } from "../types/tournament.types";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { X, UserPlus } from "lucide-react";

interface Props {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (dto: AddWalkInDto) => Promise<boolean>;
}

export function TournamentWalkInModal({ isOpen, onClose, onSubmit }: Props) {
  const [displayName, setDisplayName] = useState("");
  const [phoneNumber, setPhoneNumber] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!displayName.trim()) return;

    setIsSubmitting(true);
    try {
      const ok = await onSubmit({
        displayName: displayName.trim(),
        phoneNumber: phoneNumber.trim() || undefined,
      });
      if (ok) {
        setDisplayName("");
        setPhoneNumber("");
        onClose();
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-neutral-950/60 backdrop-blur-xs z-50 flex items-center justify-center p-4">
      <div className="bg-white border rounded-3xl max-w-sm w-full p-6 space-y-4 shadow-2xl">
        <div className="flex items-center justify-between border-b pb-3">
          <div className="flex items-center gap-2">
            <div className="p-2 bg-emerald-50 text-emerald-600 rounded-xl">
              <UserPlus className="w-5 h-5" />
            </div>
            <h3 className="font-black text-base text-neutral-950">
              Thêm Khách Vãng Lai
            </h3>
          </div>
          <button
            onClick={onClose}
            className="p-1 text-neutral-400 hover:text-neutral-800"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-3 text-xs">
          <div>
            <label className="font-bold text-neutral-700 block mb-1">
              Tên khách chơi *
            </label>
            <Input
              required
              placeholder="VD: Vietcold"
              value={displayName}
              onChange={(e) => setDisplayName(e.target.value)}
              className="h-9"
            />
          </div>

          <div>
            <label className="font-bold text-neutral-700 block mb-1">
              Số điện thoại (Tùy chọn)
            </label>
            <Input
              type="tel"
              placeholder="VD: 0854315552"
              value={phoneNumber}
              onChange={(e) => setPhoneNumber(e.target.value)}
              className="h-9 font-mono"
            />
          </div>

          <div className="pt-2 flex items-center justify-end gap-2 border-t">
            <Button
              type="button"
              variant="outline"
              onClick={onClose}
              className="h-9 px-4 rounded-xl"
            >
              Hủy
            </Button>
            <Button
              type="submit"
              disabled={isSubmitting}
              className="h-9 px-5 bg-neutral-950 hover:bg-neutral-800 text-white font-bold rounded-xl"
            >
              {isSubmitting ? "Đang thêm..." : "Đăng Ký"}
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
}
