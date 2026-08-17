"use client";

import React, { useState } from "react";
import { CreateTournamentDto } from "../types/tournament.types";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { X, Trophy, Sparkles, ChevronDown, ChevronUp } from "lucide-react";
import { toast } from "sonner";

interface Props {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (dto: CreateTournamentDto) => Promise<boolean>;
  defaultGameTemplateId?: string;
}

export function TournamentCreateModal({
  isOpen,
  onClose,
  onSubmit,
  defaultGameTemplateId,
}: Props) {
  // 1. Thông tin cơ bản
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [gameTemplateId, setGameTemplateId] = useState(
    defaultGameTemplateId || "",
  );

  // 2. Thời gian
  const [startTime, setStartTime] = useState("");
  const [registrationDeadline, setRegistrationDeadline] = useState("");
  const [roundDurationMinutes, setRoundDurationMinutes] = useState(45);

  // 3. Quy mô & Thể thức
  const [minParticipants, setMinParticipants] = useState(4);
  const [maxParticipants, setMaxParticipants] = useState(16);
  const [pairingMode, setPairingMode] = useState<"Auto" | "Manual">("Auto");
  const [hasThirdPlaceMatch, setHasThirdPlaceMatch] = useState(true);

  // 4. Điều kiện & Điểm thưởng
  const [minKarmaRequirement, setMinKarmaRequirement] = useState(0);
  const [minEloRequirement, setMinEloRequirement] = useState(0);
  const [maxEloRequirement, setMaxEloRequirement] = useState(3000);
  const [noShowKarmaPenalty, setNoShowKarmaPenalty] = useState(-30);

  // Toggle cấu hình nâng cao
  const [showAdvanced, setShowAdvanced] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!title.trim()) {
      toast.error("Vui lòng nhập tên giải đấu.");
      return;
    }

    if (!startTime) {
      toast.error("Vui lòng chọn thời gian bắt đầu.");
      return;
    }

    const startIso = new Date(startTime).toISOString();
    // Nếu không nhập hạn chót đăng ký -> Mặc định trước giờ bắt đầu 1 tiếng
    const deadlineIso = registrationDeadline
      ? new Date(registrationDeadline).toISOString()
      : new Date(new Date(startTime).getTime() - 60 * 60 * 1000).toISOString();

    if (new Date(deadlineIso) >= new Date(startIso)) {
      toast.error("Hạn chót đăng ký phải diễn ra trước giờ bắt đầu giải đấu.");
      return;
    }

    if (minParticipants > maxParticipants) {
      toast.error("Số lượng tối thiểu không được lớn hơn số lượng tối đa.");
      return;
    }

    const payload: CreateTournamentDto = {
      title: title.trim(),
      description: description.trim() || undefined,
      gameTemplateId: gameTemplateId.trim() || undefined,
      startTime: startIso,
      registrationDeadline: deadlineIso,
      roundDurationMinutes: Number(roundDurationMinutes),
      minParticipants: Number(minParticipants),
      maxParticipants: Number(maxParticipants),
      minKarmaRequirement: Number(minKarmaRequirement),
      minEloRequirement: Number(minEloRequirement),
      maxEloRequirement: Number(maxEloRequirement),
      noShowKarmaPenalty: Number(noShowKarmaPenalty),
      pairingMode,
      hasThirdPlaceMatch,
      winnerKarmaBonus: 50,
      finalistKarmaBonus: 20,
    };

    setIsSubmitting(true);
    try {
      const ok = await onSubmit(payload);
      if (ok) {
        onClose();
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-neutral-950/60 backdrop-blur-xs z-50 flex items-center justify-center p-4">
      <div className="bg-white border border-neutral-200 rounded-3xl max-w-2xl w-full p-6 space-y-4 shadow-2xl animate-in fade-in-50 zoom-in-95 max-h-[90vh] flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between border-b pb-3 shrink-0">
          <div className="flex items-center gap-2.5">
            <div className="p-2.5 bg-amber-50 text-amber-600 border border-amber-200/80 rounded-2xl">
              <Trophy className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-black text-base text-neutral-950">
                Tạo Giải Đấu Mới
              </h3>
              <p className="text-xs text-neutral-500 font-medium">
                Thiết lập giải đấu Splendor tại quán
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1.5 text-neutral-400 hover:text-neutral-800 rounded-xl transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Scrollable Form Body */}
        <form
          onSubmit={handleSubmit}
          className="space-y-4 text-xs overflow-y-auto pr-1 flex-1 scrollbar-thin"
        >
          {/* Nhóm 1: Thông tin cơ bản */}
          <div className="space-y-3">
            <h4 className="font-extrabold text-neutral-900 flex items-center gap-1.5">
              <Sparkles className="w-3.5 h-3.5 text-amber-500" /> Thông tin cơ
              bản
            </h4>

            <div>
              <label className="font-bold text-neutral-700 block mb-1">
                Tên giải đấu *
              </label>
              <Input
                required
                placeholder="VD: Splendor Championship - Tháng 8/2026"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                className="h-9 font-medium"
              />
            </div>

            <div>
              <label className="font-bold text-neutral-700 block mb-1">
                Mô tả giải đấu
              </label>
              <Input
                placeholder="Ghi chú quy định, thể lệ ván đấu..."
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                className="h-9"
              />
            </div>
          </div>

          {/* Nhóm 2: Lịch trình & Quy mô */}
          <div className="space-y-3 pt-2 border-t border-neutral-100">
            <h4 className="font-extrabold text-neutral-900">
              Lịch trình & Sĩ số
            </h4>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="font-bold text-neutral-700 block mb-1">
                  Giờ bắt đầu *
                </label>
                <Input
                  required
                  type="datetime-local"
                  value={startTime}
                  onChange={(e) => setStartTime(e.target.value)}
                  className="h-9 font-medium"
                />
              </div>

              <div>
                <label className="font-bold text-neutral-700 block mb-1">
                  Hạn chót đăng ký
                </label>
                <Input
                  type="datetime-local"
                  value={registrationDeadline}
                  onChange={(e) => setRegistrationDeadline(e.target.value)}
                  className="h-9 font-medium"
                  placeholder="Mặc định: Trước 1 giờ"
                />
              </div>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
              <div>
                <label className="font-bold text-neutral-700 block mb-1">
                  Thời lượng (phút/ván)
                </label>
                <Input
                  type="number"
                  min={15}
                  max={240}
                  value={roundDurationMinutes}
                  onChange={(e) =>
                    setRoundDurationMinutes(Number(e.target.value))
                  }
                  className="h-9 font-mono font-bold"
                />
              </div>

              <div>
                <label className="font-bold text-neutral-700 block mb-1">
                  Tối thiểu (Min)
                </label>
                <Input
                  type="number"
                  min={2}
                  max={32}
                  value={minParticipants}
                  onChange={(e) => setMinParticipants(Number(e.target.value))}
                  className="h-9 font-mono font-bold"
                />
              </div>

              <div>
                <label className="font-bold text-neutral-700 block mb-1">
                  Tối đa (Max)
                </label>
                <select
                  value={maxParticipants}
                  onChange={(e) => setMaxParticipants(Number(e.target.value))}
                  className="w-full h-9 px-3 rounded-xl border bg-white font-mono font-bold text-neutral-800 outline-none"
                >
                  <option value={4}>4 VĐV (1 bàn)</option>
                  <option value={8}>8 VĐV (2 bàn)</option>
                  <option value={12}>12 VĐV (3 bàn)</option>
                  <option value={16}>16 VĐV (4 bàn)</option>
                  <option value={20}>20 VĐV (5 bàn)</option>
                  <option value={32}>32 VĐV (8 bàn)</option>
                </select>
              </div>
            </div>
          </div>

          {/* Toggle Cấu hình nâng cao */}
          <div className="pt-2 border-t border-neutral-100">
            <button
              type="button"
              onClick={() => setShowAdvanced(!showAdvanced)}
              className="flex items-center justify-between w-full p-2.5 bg-neutral-50 hover:bg-neutral-100 rounded-2xl text-neutral-700 font-bold transition-colors"
            >
              <span>Cấu hình nâng cao (Elo, Karma & Tranh hạng ba)</span>
              {showAdvanced ? (
                <ChevronUp className="w-4 h-4" />
              ) : (
                <ChevronDown className="w-4 h-4" />
              )}
            </button>

            {showAdvanced && (
              <div className="mt-3 space-y-3 p-3 bg-neutral-50/50 rounded-2xl border border-neutral-200">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="font-bold text-neutral-700 block mb-1">
                      Chế độ ghép cặp
                    </label>
                    <select
                      value={pairingMode}
                      onChange={(e) =>
                        setPairingMode(e.target.value as "Auto" | "Manual")
                      }
                      className="w-full h-8.5 px-3 rounded-xl border bg-white font-bold text-neutral-800"
                    >
                      <option value="Auto">Tự động (Auto Swiss)</option>
                      <option value="Manual">Thủ công (Manual)</option>
                    </select>
                  </div>

                  <div>
                    <label className="font-bold text-neutral-700 block mb-1">
                      Tranh Hạng 3
                    </label>
                    <select
                      value={hasThirdPlaceMatch ? "true" : "false"}
                      onChange={(e) =>
                        setHasThirdPlaceMatch(e.target.value === "true")
                      }
                      className="w-full h-8.5 px-3 rounded-xl border bg-white font-bold text-neutral-800"
                    >
                      <option value="true">Có đấu tranh hạng 3</option>
                      <option value="false">Không (Chỉ Chung kết)</option>
                    </select>
                  </div>
                </div>

                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                  <div>
                    <label className="font-bold text-neutral-600 block mb-1 text-[11px]">
                      Elo tối thiểu
                    </label>
                    <Input
                      type="number"
                      value={minEloRequirement}
                      onChange={(e) =>
                        setMinEloRequirement(Number(e.target.value))
                      }
                      className="h-8 font-mono bg-white"
                    />
                  </div>

                  <div>
                    <label className="font-bold text-neutral-600 block mb-1 text-[11px]">
                      Elo tối đa
                    </label>
                    <Input
                      type="number"
                      value={maxEloRequirement}
                      onChange={(e) =>
                        setMaxEloRequirement(Number(e.target.value))
                      }
                      className="h-8 font-mono bg-white"
                    />
                  </div>

                  <div>
                    <label className="font-bold text-neutral-600 block mb-1 text-[11px]">
                      Karma tối thiểu
                    </label>
                    <Input
                      type="number"
                      value={minKarmaRequirement}
                      onChange={(e) =>
                        setMinKarmaRequirement(Number(e.target.value))
                      }
                      className="h-8 font-mono bg-white"
                    />
                  </div>

                  <div>
                    <label className="font-bold text-neutral-600 block mb-1 text-[11px]">
                      Phạt No-Show
                    </label>
                    <Input
                      type="number"
                      value={noShowKarmaPenalty}
                      onChange={(e) =>
                        setNoShowKarmaPenalty(Number(e.target.value))
                      }
                      className="h-8 font-mono bg-white"
                    />
                  </div>
                </div>

                {defaultGameTemplateId === undefined && (
                  <div>
                    <label className="font-bold text-neutral-600 block mb-1 text-[11px]">
                      Game Template ID (Tùy chọn)
                    </label>
                    <Input
                      placeholder="Để trống sẽ mặc định chọn Splendor"
                      value={gameTemplateId}
                      onChange={(e) => setGameTemplateId(e.target.value)}
                      className="h-8 font-mono bg-white text-[11px]"
                    />
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Footer Actions */}
          <div className="pt-3 flex items-center justify-end gap-2 border-t border-neutral-100 shrink-0">
            <Button
              type="button"
              variant="outline"
              onClick={onClose}
              className="h-9 px-4 rounded-xl font-bold"
            >
              Hủy
            </Button>
            <Button
              type="submit"
              disabled={isSubmitting}
              className="h-9 px-6 bg-neutral-950 hover:bg-neutral-800 text-white font-bold rounded-xl shadow-xs"
            >
              {isSubmitting ? "Đang tạo..." : "Lưu Draft"}
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
}
