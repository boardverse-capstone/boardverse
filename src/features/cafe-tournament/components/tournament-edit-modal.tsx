"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { X, Edit3, Clock, Users, Settings2 } from "lucide-react";
import { Tournament, UpdateTournamentPayload } from "../types/tournament.types";

interface Props {
  isOpen: boolean;
  onClose: () => void;
  tournament: Tournament | null;
  onSubmit: (
    tournamentId: string,
    payload: UpdateTournamentPayload,
  ) => Promise<boolean>;
}

export function TournamentEditModal({
  isOpen,
  onClose,
  tournament,
  onSubmit,
}: Props) {
  const [loading, setLoading] = useState(false);

  // Khởi tạo trực tiếp State từ prop `tournament` (Không dùng useEffect)
  const [title, setTitle] = useState(tournament?.title || "");
  const [description, setDescription] = useState(tournament?.description || "");
  const [startTime, setStartTime] = useState(
    tournament?.startTime
      ? new Date(tournament.startTime).toISOString().slice(0, 16)
      : "",
  );
  const [registrationDeadline, setRegistrationDeadline] = useState(
    tournament?.registrationDeadline
      ? new Date(tournament.registrationDeadline).toISOString().slice(0, 16)
      : "",
  );
  const [roundDurationMinutes, setRoundDurationMinutes] = useState(
    tournament?.roundDurationMinutes || 45,
  );
  const [maxParticipants, setMaxParticipants] = useState(
    tournament?.maxParticipants || 16,
  );
  const [minKarmaRequirement, setMinKarmaRequirement] = useState(
    tournament?.minKarmaRequirement || 0,
  );
  const [minEloRequirement, setMinEloRequirement] = useState(
    tournament?.minEloRequirement || 0,
  );
  const [maxEloRequirement, setMaxEloRequirement] = useState(
    tournament?.maxEloRequirement || 5000,
  );
  const [noShowKarmaPenalty, setNoShowKarmaPenalty] = useState(
    tournament?.noShowKarmaPenalty ?? -30,
  );
  const [autoExtendOnShortage, setAutoExtendOnShortage] = useState(true);
  const [maxExtensionCount, setMaxExtensionCount] = useState(3);
  const [extensionMinutesPerAttempt, setExtensionMinutesPerAttempt] =
    useState(60);
  const [preliminaryRounds, setPreliminaryRounds] = useState(
    tournament?.preliminaryRounds || 3,
  );

  if (!isOpen || !tournament) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    const payload: UpdateTournamentPayload = {
      title: title.trim() || undefined,
      description: description.trim() || undefined,
      startTime: startTime ? new Date(startTime).toISOString() : undefined,
      registrationDeadline: registrationDeadline
        ? new Date(registrationDeadline).toISOString()
        : undefined,
      roundDurationMinutes: Number(roundDurationMinutes),
      maxParticipants: Number(maxParticipants),
      minKarmaRequirement: Number(minKarmaRequirement),
      minEloRequirement: Number(minEloRequirement),
      maxEloRequirement: Number(maxEloRequirement),
      noShowKarmaPenalty: Number(noShowKarmaPenalty),
      autoExtendOnShortage,
      maxExtensionCount: Number(maxExtensionCount),
      extensionMinutesPerAttempt: Number(extensionMinutesPerAttempt),
      preliminaryRounds: Number(preliminaryRounds),
    };

    const ok = await onSubmit(tournament.id, payload);
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
              <Edit3 className="w-4 h-4" />
            </div>
            <div>
              <h3 className="font-bold text-base text-neutral-950">
                Chỉnh Sửa Giải Đấu (Draft)
              </h3>
              <p className="text-xs text-neutral-500 font-mono">
                Mã giải: #{tournament.id.slice(0, 8)}
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
          {/* Thông tin cơ bản */}
          <div className="space-y-2">
            <span className="text-xs font-bold text-neutral-800">
              Thông tin cơ bản:
            </span>
            <div className="space-y-1">
              <label className="text-[11px] font-semibold text-neutral-600">
                Tên giải đấu:
              </label>
              <Input
                type="text"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                className="h-8 text-xs bg-neutral-50"
              />
            </div>
            <div className="space-y-1">
              <label className="text-[11px] font-semibold text-neutral-600">
                Mô tả:
              </label>
              <Input
                type="text"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                className="h-8 text-xs bg-neutral-50"
              />
            </div>
          </div>

          {/* Thời gian */}
          <div className="space-y-2 pt-2 border-t">
            <span className="text-xs font-bold text-neutral-800 flex items-center gap-1">
              <Clock className="w-3.5 h-3.5 text-neutral-500" /> Thời gian & Số
              vòng:
            </span>
            <div className="grid grid-cols-2 gap-2">
              <div>
                <label className="text-[11px] font-semibold text-neutral-600">
                  Bắt đầu:
                </label>
                <Input
                  type="datetime-local"
                  value={startTime}
                  onChange={(e) => setStartTime(e.target.value)}
                  className="h-8 text-xs bg-neutral-50 font-mono"
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

            <div className="grid grid-cols-2 gap-2">
              <div>
                <label className="text-[11px] font-semibold text-neutral-600">
                  Thời lượng vòng (phút):
                </label>
                <Input
                  type="number"
                  value={roundDurationMinutes}
                  onChange={(e) =>
                    setRoundDurationMinutes(parseInt(e.target.value) || 45)
                  }
                  className="h-8 text-xs bg-neutral-50 font-mono"
                />
              </div>
              <div>
                <label className="text-[11px] font-semibold text-neutral-600">
                  Số vòng sơ loại (Swiss):
                </label>
                <Input
                  type="number"
                  value={preliminaryRounds}
                  onChange={(e) =>
                    setPreliminaryRounds(parseInt(e.target.value) || 3)
                  }
                  className="h-8 text-xs bg-neutral-50 font-mono"
                />
              </div>
            </div>
          </div>

          {/* Cấu hình tự động gia hạn khi thiếu người */}
          <div className="space-y-2 pt-2 border-t">
            <span className="text-xs font-bold text-neutral-800 flex items-center gap-1">
              <Settings2 className="w-3.5 h-3.5 text-neutral-500" /> Cấu hình
              gia hạn đăng ký tự động:
            </span>

            <div className="flex items-center justify-between text-xs bg-neutral-50 p-2.5 rounded-xl border">
              <span className="font-semibold text-neutral-700">
                Tự động gia hạn khi thiếu người:
              </span>
              <input
                type="checkbox"
                checked={autoExtendOnShortage}
                onChange={(e) => setAutoExtendOnShortage(e.target.checked)}
                className="w-4 h-4 rounded accent-amber-500"
              />
            </div>

            {autoExtendOnShortage && (
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="text-[11px] font-semibold text-neutral-600">
                    Số lần gia hạn tối đa:
                  </label>
                  <Input
                    type="number"
                    value={maxExtensionCount}
                    onChange={(e) =>
                      setMaxExtensionCount(parseInt(e.target.value) || 3)
                    }
                    className="h-8 text-xs bg-neutral-50 font-mono"
                  />
                </div>
                <div>
                  <label className="text-[11px] font-semibold text-neutral-600">
                    Số phút gia hạn/lần:
                  </label>
                  <Input
                    type="number"
                    value={extensionMinutesPerAttempt}
                    onChange={(e) =>
                      setExtensionMinutesPerAttempt(
                        parseInt(e.target.value) || 60,
                      )
                    }
                    className="h-8 text-xs bg-neutral-50 font-mono"
                  />
                </div>
              </div>
            )}
          </div>

          {/* VĐV & Elo/Karma */}
          <div className="space-y-2 pt-2 border-t">
            <span className="text-xs font-bold text-neutral-800 flex items-center gap-1">
              <Users className="w-3.5 h-3.5 text-neutral-500" /> Số lượng &
              Karma / Elo:
            </span>

            <div className="grid grid-cols-2 gap-2">
              <div>
                <label className="text-[11px] font-semibold text-neutral-600">
                  VĐV tối đa (Max):
                </label>
                <Input
                  type="number"
                  value={maxParticipants}
                  onChange={(e) =>
                    setMaxParticipants(parseInt(e.target.value) || 16)
                  }
                  className="h-8 text-xs bg-neutral-50 font-mono"
                />
              </div>
              <div>
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
          </div>

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
              className="h-9 bg-amber-500 hover:bg-amber-600 text-white text-xs font-bold rounded-lg px-4"
            >
              {loading ? "Đang lưu..." : "Lưu Thay Đổi"}
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
}
