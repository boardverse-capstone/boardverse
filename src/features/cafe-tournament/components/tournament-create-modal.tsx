"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { X, Trophy, Settings2, Clock, Users, ShieldAlert } from "lucide-react";
import { CreateTournamentPayload } from "../types/tournament.types";

interface Props {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (payload: CreateTournamentPayload) => Promise<boolean>;
}

export function TournamentCreateModal({ isOpen, onClose, onSubmit }: Props) {
  const [loading, setLoading] = useState(false);

  // Form states khớp 100% DTO Payload
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [gameTemplateId, setGameTemplateId] = useState(
    "44444444-4444-4444-4444-444444444444",
  );
  const [startTime, setStartTime] = useState("");
  const [registrationDeadline, setRegistrationDeadline] = useState("");
  const [roundDurationMinutes, setRoundDurationMinutes] = useState(45);
  const [maxParticipants, setMaxParticipants] = useState(16);
  const [minParticipants, setMinParticipants] = useState(8);
  const [minKarmaRequirement, setMinKarmaRequirement] = useState(0);
  const [minEloRequirement, setMinEloRequirement] = useState(0);
  const [maxEloRequirement, setMaxEloRequirement] = useState(5000);
  const [noShowKarmaPenalty, setNoShowKarmaPenalty] = useState(-30);
  const [pairingMode, setPairingMode] = useState<"Auto" | "Manual">("Auto");
  const [hasThirdPlaceMatch, setHasThirdPlaceMatch] = useState(true);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim() || !startTime) {
      alert("Vui lòng điền đầy đủ Tên giải đấu và Thời gian bắt đầu!");
      return;
    }

    setLoading(true);
    const ok = await onSubmit({
      title: title.trim(),
      description: description.trim() || undefined,
      gameTemplateId: gameTemplateId.trim() || undefined,
      startTime: new Date(startTime).toISOString(),
      registrationDeadline: registrationDeadline
        ? new Date(registrationDeadline).toISOString()
        : undefined,
      roundDurationMinutes: Number(roundDurationMinutes),
      maxParticipants: Number(maxParticipants),
      minParticipants: Number(minParticipants),
      minKarmaRequirement: Number(minKarmaRequirement),
      minEloRequirement: Number(minEloRequirement),
      maxEloRequirement: Number(maxEloRequirement),
      noShowKarmaPenalty: Number(noShowKarmaPenalty),
      pairingMode,
      hasThirdPlaceMatch,
    });
    setLoading(false);

    if (ok) {
      onClose();
    }
  };

  return (
    <div className="fixed inset-0 bg-neutral-950/40 backdrop-blur-xs z-50 flex items-center justify-center p-4">
      <div className="bg-white border border-neutral-200 rounded-2xl max-w-xl w-full p-6 space-y-4 shadow-xl max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between border-b pb-3">
          <div className="flex items-center gap-2">
            <div className="p-2 bg-amber-50 text-amber-700 border border-amber-200 rounded-lg">
              <Trophy className="w-4 h-4" />
            </div>
            <div>
              <h3 className="font-bold text-base text-neutral-950">
                Tạo Giải Đấu Mới (Draft)
              </h3>
              <p className="text-xs text-neutral-500">
                Thiết lập thông số giải đấu tại quán
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
          {/* Cấu hình cơ bản */}
          <div className="space-y-2">
            <span className="text-xs font-bold text-neutral-800 flex items-center gap-1">
              <Trophy className="w-3.5 h-3.5 text-amber-500" /> Thông tin cơ
              bản:
            </span>

            <div className="space-y-1">
              <label className="text-[11px] font-semibold text-neutral-600">
                Tên giải đấu (*):
              </label>
              <Input
                type="text"
                placeholder="Vd: Splendor Tournament Thủ Đức - August 2026"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                className="h-8 text-xs bg-neutral-50"
                required
              />
            </div>

            <div className="space-y-1">
              <label className="text-[11px] font-semibold text-neutral-600">
                Mô tả:
              </label>
              <Input
                type="text"
                placeholder="Nhập mô tả chi tiết giải đấu..."
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                className="h-8 text-xs bg-neutral-50"
              />
            </div>
          </div>

          {/* Cấu hình Thời gian */}
          <div className="space-y-2 pt-2 border-t">
            <span className="text-xs font-bold text-neutral-800 flex items-center gap-1">
              <Clock className="w-3.5 h-3.5 text-neutral-500" /> Thời gian &
              Thời lượng:
            </span>

            <div className="grid grid-cols-2 gap-2">
              <div>
                <label className="text-[11px] font-semibold text-neutral-600">
                  Bắt đầu (*):
                </label>
                <Input
                  type="datetime-local"
                  value={startTime}
                  onChange={(e) => setStartTime(e.target.value)}
                  className="h-8 text-xs bg-neutral-50 font-mono"
                  required
                />
              </div>

              <div>
                <label className="text-[11px] font-semibold text-neutral-600">
                  Hạn đăng ký:
                </label>
                <Input
                  type="datetime-local"
                  value={registrationDeadline}
                  onChange={(e) => setRegistrationDeadline(e.target.value)}
                  className="h-8 text-xs bg-neutral-50 font-mono"
                />
              </div>
            </div>

            <div className="w-1/2">
              <label className="text-[11px] font-semibold text-neutral-600">
                Thời lượng 1 vòng (Phút):
              </label>
              <Input
                type="number"
                min={15}
                value={roundDurationMinutes}
                onChange={(e) =>
                  setRoundDurationMinutes(parseInt(e.target.value) || 45)
                }
                className="h-8 text-xs bg-neutral-50 font-mono"
              />
            </div>
          </div>

          {/* Cấu hình Số lượng & Điều kiện Elo / Karma */}
          <div className="space-y-2 pt-2 border-t">
            <span className="text-xs font-bold text-neutral-800 flex items-center gap-1">
              <Users className="w-3.5 h-3.5 text-neutral-500" /> Số lượng VĐV &
              Giới hạn Karma / Elo:
            </span>

            <div className="grid grid-cols-2 gap-2">
              <div>
                <label className="text-[11px] font-semibold text-neutral-600">
                  Số VĐV Tối đa (Max):
                </label>
                <Input
                  type="number"
                  min={4}
                  max={32}
                  step={4}
                  value={maxParticipants}
                  onChange={(e) =>
                    setMaxParticipants(parseInt(e.target.value) || 16)
                  }
                  className="h-8 text-xs bg-neutral-50 font-mono"
                />
              </div>

              <div>
                <label className="text-[11px] font-semibold text-neutral-600">
                  Số VĐV Tối thiểu (Min):
                </label>
                <Input
                  type="number"
                  min={4}
                  value={minParticipants}
                  onChange={(e) =>
                    setMinParticipants(parseInt(e.target.value) || 8)
                  }
                  className="h-8 text-xs bg-neutral-50 font-mono"
                />
              </div>
            </div>

            <div className="grid grid-cols-3 gap-2">
              <div>
                <label className="text-[11px] font-semibold text-neutral-600">
                  Min Karma:
                </label>
                <Input
                  type="number"
                  value={minKarmaRequirement}
                  onChange={(e) =>
                    setMinKarmaRequirement(parseInt(e.target.value) || 0)
                  }
                  className="h-8 text-xs bg-neutral-50 font-mono"
                />
              </div>

              <div>
                <label className="text-[11px] font-semibold text-neutral-600">
                  Min Elo:
                </label>
                <Input
                  type="number"
                  value={minEloRequirement}
                  onChange={(e) =>
                    setMinEloRequirement(parseInt(e.target.value) || 0)
                  }
                  className="h-8 text-xs bg-neutral-50 font-mono"
                />
              </div>

              <div>
                <label className="text-[11px] font-semibold text-neutral-600">
                  Max Elo:
                </label>
                <Input
                  type="number"
                  value={maxEloRequirement}
                  onChange={(e) =>
                    setMaxEloRequirement(parseInt(e.target.value) || 5000)
                  }
                  className="h-8 text-xs bg-neutral-50 font-mono"
                />
              </div>
            </div>

            <div className="w-1/2">
              <label className="text-[11px] font-semibold text-neutral-600">
                Phạt No-Show Karma:
              </label>
              <Input
                type="number"
                value={noShowKarmaPenalty}
                onChange={(e) =>
                  setNoShowKarmaPenalty(parseInt(e.target.value) || -30)
                }
                className="h-8 text-xs bg-neutral-50 font-mono text-rose-600 font-bold"
              />
            </div>
          </div>

          {/* Cấu hình Bàn đấu */}
          <div className="space-y-2 pt-2 border-t">
            <span className="text-xs font-bold text-neutral-800 flex items-center gap-1">
              <Settings2 className="w-3.5 h-3.5 text-neutral-500" /> Cấu hình
              ghép bàn:
            </span>

            <div className="flex items-center justify-between text-xs bg-neutral-50 p-2.5 rounded-xl border">
              <span className="font-semibold text-neutral-700">
                Chế độ ghép cặp (Pairing Mode):
              </span>
              <select
                value={pairingMode}
                onChange={(e) =>
                  setPairingMode(e.target.value as "Auto" | "Manual")
                }
                className="h-7 text-xs bg-white border border-neutral-300 rounded-lg px-2 font-bold"
              >
                <option value="Auto">Tự động (Auto)</option>
                <option value="Manual">Thủ công (Manual)</option>
              </select>
            </div>

            <div className="flex items-center justify-between text-xs bg-neutral-50 p-2.5 rounded-xl border">
              <span className="font-semibold text-neutral-700">
                Có trận Tranh Hạng Ba (Third Place Match):
              </span>
              <input
                type="checkbox"
                checked={hasThirdPlaceMatch}
                onChange={(e) => setHasThirdPlaceMatch(e.target.checked)}
                className="w-4 h-4 rounded accent-amber-500"
              />
            </div>
          </div>

          {/* Buttons */}
          <div className="pt-3 border-t flex justify-end gap-2">
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
              className="h-9 bg-neutral-950 text-white text-xs font-bold rounded-lg px-4"
            >
              {loading ? "Đang khởi tạo..." : "Xác Nhận Tạo Draft"}
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
}
