"use client";

import React, { useState } from "react";
import { CreateTournamentDto } from "../types/tournament.types";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  X,
  Trophy,
  Sparkles,
  ChevronDown,
  ChevronUp,
  Layers,
  ShieldCheck,
  CheckCircle2,
  Lock,
  Banknote,
  Gift,
} from "lucide-react";
import { toast } from "sonner";
import {
  backdropCloseHandler,
  useDismissOnBackdrop,
} from "../lib/use-dismiss-on-backdrop";
import { TournamentCoverUpload } from "./tournament-cover-upload";

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

  // 3. Quy mô
  const [minParticipants, setMinParticipants] = useState(4);
  const [maxParticipants, setMaxParticipants] = useState(16);

  // 4. Điều kiện & Điểm thưởng (Cấu hình Elo: 0 - 5000, Karma: 0 - 100)
  const [minKarmaRequirement, setMinKarmaRequirement] = useState(0);
  const [minEloRequirement, setMinEloRequirement] = useState(0);
  const [maxEloRequirement, setMaxEloRequirement] = useState(5000);
  const [noShowKarmaPenalty, setNoShowKarmaPenalty] = useState(-30);

  // 5. Phí tham gia, giải thưởng & ảnh bìa (mở rộng theo BE DTO)
  const [entryFee, setEntryFee] = useState<string>(""); // rỗng = miễn phí
  const [prize, setPrize] = useState("");
  const [imageUrl, setImageUrl] = useState("");

  // Toggle cấu hình nâng cao
  const [showAdvanced, setShowAdvanced] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Click ra ngoài backdrop hoặc nhấn Escape để đóng
  useDismissOnBackdrop(
    isOpen,
    () => {
      if (isSubmitting) return;
      onClose();
    },
    { busy: isSubmitting },
  );

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
    const deadlineIso = registrationDeadline
      ? new Date(registrationDeadline).toISOString()
      : new Date(new Date(startTime).getTime() - 60 * 60 * 1000).toISOString();

    if (new Date(deadlineIso) >= new Date(startIso)) {
      toast.error("Hạn chót đăng ký phải diễn ra trước giờ bắt đầu giải đấu.");
      return;
    }

    if (Number(minParticipants) > Number(maxParticipants)) {
      toast.error("Số lượng tối thiểu không được lớn hơn số lượng tối đa.");
      return;
    }

    // Ép kiểu & validate khoảng Elo/Karma
    const minElo = Math.max(0, Math.min(5000, Number(minEloRequirement) || 0));
    const maxElo = Math.max(
      minElo,
      Math.min(5000, Number(maxEloRequirement) || 5000),
    );
    const minKarma = Math.max(
      0,
      Math.min(100, Number(minKarmaRequirement) || 0),
    );

    // Phí tham gia: rỗng → miễn phí; cap 100.000.000đ (1 tỉ ký tự dễ nhập nhầm).
    const entryFeeTrim = entryFee.trim();
    const parsedEntryFee = entryFeeTrim ? Number(entryFeeTrim) : undefined;
    if (
      parsedEntryFee !== undefined &&
      (!Number.isFinite(parsedEntryFee) || parsedEntryFee < 0)
    ) {
      toast.error("Phí tham gia không hợp lệ. Vui lòng nhập số từ 0đ trở lên.");
      return;
    }

    // imageUrl: do <TournamentCoverUpload> set qua onUploaded; nếu rỗng
    // thì BE dùng ảnh mặc định. URL đã được validate phía upload route.
    const imageUrlTrim = imageUrl.trim();

    const payload: CreateTournamentDto = {
      title: title.trim(),
      description: description.trim() || undefined,
      gameTemplateId: gameTemplateId.trim() || undefined,
      startTime: startIso,
      registrationDeadline: deadlineIso,
      roundDurationMinutes: Number(roundDurationMinutes),
      minParticipants: Number(minParticipants),
      maxParticipants: Number(maxParticipants),
      minKarmaRequirement: minKarma,
      minEloRequirement: minElo,
      maxEloRequirement: maxElo,
      noShowKarmaPenalty: Number(noShowKarmaPenalty),
      pairingMode: "Auto", // Khóa cứng Tự động (Auto Swiss)
      hasThirdPlaceMatch: true, // Khóa cứng Vòng chung kết
      winnerKarmaBonus: 50,
      finalistKarmaBonus: 20,
      entryFee: parsedEntryFee,
      prize: prize.trim() || undefined,
      imageUrl: imageUrlTrim || undefined,
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
    <div
      className="fixed inset-0 bg-neutral-950/60 backdrop-blur-xs z-50 flex items-center justify-center p-4 max-[480px]:p-2 max-[480px]:pb-[max(0.5rem,env(safe-area-inset-bottom))] max-[480px]:pt-[max(0.5rem,env(safe-area-inset-top))]"
      onClick={backdropCloseHandler(
        () => {
          if (isSubmitting) return;
          onClose();
        },
        isSubmitting,
      )}
    >
      <div
        className="bg-white border border-neutral-200 rounded-3xl max-w-2xl w-full p-6 flex flex-col gap-4 shadow-2xl animate-in fade-in-50 zoom-in-95 max-h-[90vh]"
        onClick={(event) => event.stopPropagation()}
      >
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
          className="flex flex-col gap-5 text-xs overflow-y-auto pr-1 flex-1 scrollbar-thin"
        >
          {/* Nhóm 1: Thông tin cơ bản */}
          <div className="flex flex-col gap-3">
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
                placeholder="VD: Giải Splendor Tháng 8"
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
          <div className="flex flex-col gap-3 pt-2 border-t border-neutral-100">
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
                <Select
                  value={String(maxParticipants)}
                  onValueChange={(v) => setMaxParticipants(Number(v))}
                >
                  <SelectTrigger
                    className="w-full h-9 px-3 rounded-xl border bg-white font-mono font-bold text-neutral-800"
                    aria-describedby="max-participants-hint"
                  >
                    <SelectValue placeholder="Chọn số VĐV tối đa" />
                  </SelectTrigger>
                  <SelectContent position="popper" sideOffset={4}>
                    <SelectItem value="4">4 VĐV (1 bàn)</SelectItem>
                    <SelectItem value="8">8 VĐV (2 bàn)</SelectItem>
                    <SelectItem value="12">12 VĐV (3 bàn)</SelectItem>
                    <SelectItem value="16">16 VĐV (4 bàn)</SelectItem>
                    <SelectItem value="20">20 VĐV (5 bàn)</SelectItem>
                    <SelectItem value="32">32 VĐV (8 bàn)</SelectItem>
                  </SelectContent>
                </Select>
                <p
                  id="max-participants-hint"
                  className="mt-1 text-[10px] text-neutral-500 leading-snug"
                >
                  Mỗi bàn 4 VĐV (theo luật Splendor). Hệ thống tự tính số bàn.
                </p>
              </div>
            </div>
          </div>

          {/* Nhóm 3: Phí tham gia, Giải thưởng & Ảnh bìa (mở rộng theo BE DTO) */}
          <div className="flex flex-col gap-3 pt-2 border-t border-neutral-100">
            <h4 className="font-extrabold text-neutral-900 flex items-center gap-1.5">
              <Banknote className="w-3.5 h-3.5 text-emerald-600" /> Phí tham
              gia, Giải thưởng & Ảnh bìa
            </h4>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="font-bold text-neutral-700 block mb-1">
                  Phí tham gia (VND)
                </label>
                <div className="relative">
                  <Input
                    type="number"
                    inputMode="numeric"
                    min={0}
                    step={1000}
                    value={entryFee}
                    onChange={(e) => setEntryFee(e.target.value)}
                    placeholder="0 (miễn phí)"
                    className="h-9 pr-10 font-mono font-bold"
                  />
                  <span className="absolute right-3 top-1/2 -translate-y-1/2 text-[11px] text-neutral-500 font-bold">
                    đ
                  </span>
                </div>
                <p className="mt-1 text-[10px] text-neutral-500 leading-snug">
                  Để trống = miễn phí. Bước 1.000đ.
                </p>
              </div>

              <div>
                <label className="font-bold text-neutral-700 block mb-1">
                  Giải thưởng
                </label>
                <div className="relative">
                  <Gift
                    className="absolute left-2.5 top-1/2 -translate-y-1/2 w-4 h-4 text-amber-500 pointer-events-none"
                    aria-hidden
                  />
                  <Input
                    value={prize}
                    onChange={(e) => setPrize(e.target.value)}
                    placeholder="VD: 1.000.000đ + Cúp lưu niệm"
                    className="h-9 pl-9 font-medium"
                  />
                </div>
              </div>
            </div>

            <div>
              <label className="font-bold text-neutral-700 block mb-1">
                Ảnh bìa
              </label>
              <TournamentCoverUpload
                initialUrl={imageUrl || undefined}
                onUploaded={(url) => setImageUrl(url)}
                onCleared={() => setImageUrl("")}
                disabled={isSubmitting}
                data-testid="tournament-cover"
              />
              <p className="mt-1 text-[10px] text-neutral-500 leading-snug">
                Ảnh sẽ hiển thị ở lobby & trang chi tiết. Để trống sẽ dùng
                ảnh mặc định.
              </p>
            </div>
          </div>

          {/* Toggle Cấu hình nâng cao */}
          <div className="pt-2 border-t border-neutral-100">
            <button
              type="button"
              onClick={() => setShowAdvanced(!showAdvanced)}
              className="flex items-center justify-between w-full p-2.5 bg-neutral-50 hover:bg-neutral-100 rounded-2xl text-neutral-700 font-bold transition-colors"
            >
              <span>Cấu hình nâng cao (Thể thức & Điều kiện Elo/Karma)</span>
              {showAdvanced ? (
                <ChevronUp className="w-4 h-4" />
              ) : (
                <ChevronDown className="w-4 h-4" />
              )}
            </button>

            {showAdvanced && (
              <div className="mt-3 flex flex-col gap-3">
                {/* Phần 1: Thể thức thi đấu (Cố định cứng Tự động & Chung kết) */}
                <div className="flex flex-col gap-2.5 p-3 bg-neutral-50/70 rounded-2xl border border-neutral-200">
                  <div className="flex items-center justify-between">
                    <span className="font-bold text-neutral-800 text-xs flex items-center gap-1.5">
                      <Layers className="w-3.5 h-3.5 text-amber-600" /> Thể thức
                      thi đấu chuẩn
                    </span>
                    <span className="text-[10px] font-bold text-neutral-400 flex items-center gap-1">
                      <Lock className="w-3 h-3 text-neutral-400" /> Cố định mặc
                      định
                    </span>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                    <div className="p-2.5 bg-white rounded-xl border border-neutral-200/90 flex items-center justify-between shadow-2xs">
                      <div>
                        <span className="text-[10px] font-bold text-neutral-400 uppercase block">
                          Chế độ ghép cặp
                        </span>
                        <span className="font-black text-xs text-neutral-900">
                          Tự Động (Auto Swiss)
                        </span>
                      </div>
                      <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                    </div>

                    <div className="p-2.5 bg-white rounded-xl border border-neutral-200/90 flex items-center justify-between shadow-2xs">
                      <div>
                        <span className="text-[10px] font-bold text-neutral-400 uppercase block">
                          Thể thức vòng cuối
                        </span>
                        <span className="font-black text-xs text-neutral-900">
                          Vòng Chung Kết
                        </span>
                      </div>
                      <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                    </div>
                  </div>
                </div>

                {/* Phần 2: Điều kiện Elo, Karma & Phạt No-Show */}
                <div className="flex flex-col gap-2.5 p-3 bg-neutral-50/70 rounded-2xl border border-neutral-200">
                  <span className="font-bold text-neutral-800 text-xs flex items-center gap-1.5">
                    <ShieldCheck className="w-3.5 h-3.5 text-blue-600" /> Điều
                    kiện tham gia & Điểm số
                  </span>

                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                    <div>
                      <label className="font-bold text-neutral-600 block mb-1 text-[11px]">
                        Elo tối thiểu (0-5000)
                      </label>
                      <Input
                        type="number"
                        min={0}
                        max={5000}
                        value={minEloRequirement}
                        onChange={(e) =>
                          setMinEloRequirement(Number(e.target.value))
                        }
                        className="h-8 font-mono bg-white"
                      />
                    </div>

                    <div>
                      <label className="font-bold text-neutral-600 block mb-1 text-[11px]">
                        Elo tối đa (0-5000)
                      </label>
                      <Input
                        type="number"
                        min={0}
                        max={5000}
                        value={maxEloRequirement}
                        onChange={(e) =>
                          setMaxEloRequirement(Number(e.target.value))
                        }
                        className="h-8 font-mono bg-white"
                      />
                    </div>

                    <div>
                      <label className="font-bold text-neutral-600 block mb-1 text-[11px]">
                        Karma tối thiểu (0-100)
                      </label>
                      <Input
                        type="number"
                        min={0}
                        max={100}
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
                    <div className="pt-1">
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
