/* eslint-disable @typescript-eslint/no-explicit-any */
"use client";

import React, { useState } from "react";
import {
  TournamentMatch,
  RecordMatchResultDto,
} from "../types/tournament.types";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { X, Trophy, Sparkles, Medal, Award } from "lucide-react";
import { toast } from "sonner";

interface Props {
  isOpen: boolean;
  onClose: () => void;
  match: TournamentMatch | null;
  onSaveResult: (dto: RecordMatchResultDto) => Promise<boolean>;
}

// Bảng điểm Swiss chuẩn: 1st (+6), 2nd (+4), 3rd (+2), 4th (+0)
const SWISS_POINTS: Record<number, number> = {
  1: 6,
  2: 4,
  3: 2,
  4: 0,
};

export function MatchResultModal({
  isOpen,
  onClose,
  match,
  onSaveResult,
}: Props) {
  if (!isOpen || !match) return null;

  return (
    <MatchResultModalContent
      key={match.id}
      match={match}
      onClose={onClose}
      onSaveResult={onSaveResult}
    />
  );
}

function MatchResultModalContent({
  match,
  onClose,
  onSaveResult,
}: {
  match: TournamentMatch;
  onClose: () => void;
  onSaveResult: (dto: RecordMatchResultDto) => Promise<boolean>;
}) {
  const playersList: any[] = (match as any).players || [];

  const [playerScores, setPlayerScores] = useState<
    Record<
      string,
      {
        prestigeScore: number;
        cardsBought: number;
        rank: number;
      }
    >
  >(() => {
    const initial: Record<
      string,
      { prestigeScore: number; cardsBought: number; rank: number }
    > = {};
    playersList.forEach((p, idx) => {
      const pId = p.userId || p.id;
      initial[pId] = {
        prestigeScore: p.score ?? 15,
        cardsBought: p.cardsBought ?? 7,
        rank: idx + 1,
      };
    });
    return initial;
  });

  const [notes, setNotes] = useState(match.notes || "");
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Tự động xếp hạng 1 -> 4 theo điểm Prestige và số thẻ mua
  const handleAutoRank = () => {
    const sorted = [...playersList].sort((a, b) => {
      const pA = playerScores[a.userId || a.id] || {
        prestigeScore: 0,
        cardsBought: 0,
      };
      const pB = playerScores[b.userId || b.id] || {
        prestigeScore: 0,
        cardsBought: 0,
      };

      // 1. Điểm Prestige cao hơn xếp trên
      if (pB.prestigeScore !== pA.prestigeScore) {
        return pB.prestigeScore - pA.prestigeScore;
      }
      // 2. Tiebreaker: Số thẻ mua ít hơn xếp trên
      return pA.cardsBought - pB.cardsBought;
    });

    const updated = { ...playerScores };
    sorted.forEach((p, idx) => {
      const pId = p.userId || p.id;
      if (updated[pId]) {
        updated[pId].rank = idx + 1;
      }
    });

    setPlayerScores(updated);
    toast.success("Đã tự động xếp hạng & tính điểm Swiss (+6, +4, +2, +0)!");
  };

  const handleScoreChange = (
    userId: string,
    field: "prestigeScore" | "cardsBought",
    val: number,
  ) => {
    setPlayerScores((prev) => ({
      ...prev,
      [userId]: {
        ...prev[userId],
        [field]: Number(val),
      },
    }));
  };

  const handleSetRankManually = (userId: string, rank: number) => {
    setPlayerScores((prev) => ({
      ...prev,
      [userId]: {
        ...prev[userId],
        rank,
      },
    }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    // Tìm người hạng 1 (Winner)
    const winnerEntry = Object.entries(playerScores).find(
      ([, val]) => val.rank === 1,
    );

    const winnerUserId = winnerEntry
      ? winnerEntry[0]
      : playersList[0]?.userId || playersList[0]?.id;

    // Chuẩn bị payload results theo schema của Backend
    const results = Object.entries(playerScores).map(([userId, data]) => ({
      userId,
      score: SWISS_POINTS[data.rank] ?? 0, // Điểm Swiss +6, +4, +2, +0 gửi vào trường score
      cardsBought: data.cardsBought,
    }));

    if (results.length < 2) {
      toast.error("Bàn đấu cần tối thiểu 2 người chơi để ghi kết quả.");
      return;
    }

    const payload: RecordMatchResultDto = {
      matchId: match.id,
      winnerUserId,
      results,
      notes: notes.trim() || undefined,
    };

    setIsSubmitting(true);
    try {
      const ok = await onSaveResult(payload);
      if (ok) {
        toast.success("Đã ghi nhận kết quả bàn đấu!");
        onClose();
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-neutral-950/60 backdrop-blur-xs z-50 flex items-center justify-center p-4">
      <div className="bg-white border border-neutral-200 rounded-3xl max-w-xl w-full p-6 space-y-4 shadow-2xl animate-in fade-in-50 zoom-in-95 max-h-[90vh] flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between border-b pb-3 shrink-0">
          <div className="flex items-center gap-3">
            <div className="p-2.5 bg-amber-500 text-white rounded-2xl shadow-xs">
              <Trophy className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-black text-base text-neutral-950">
                Ghi Nhận Kết Quả •{" "}
                {match.tableName ||
                  `Bàn #${match.tableNumber || match.id.slice(0, 6)}`}
              </h3>
              <p className="text-xs text-neutral-500 font-medium">
                Cơ chế điểm Swiss:{" "}
                <strong>1st: +6đ • 2nd: +4đ • 3rd: +2đ • 4th: +0đ</strong>
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="p-1.5 text-neutral-400 hover:text-neutral-800 rounded-xl"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Action Button: Auto-Rank */}
        <div className="flex items-center justify-between bg-amber-50/70 border border-amber-200/80 p-2.5 rounded-2xl shrink-0">
          <span className="text-xs font-bold text-amber-900 flex items-center gap-1.5">
            <Sparkles className="w-4 h-4 text-amber-600" /> Tự động xếp hạng
            theo điểm và thẻ mua
          </span>
          <Button
            type="button"
            size="sm"
            onClick={handleAutoRank}
            className="h-7 px-3 bg-amber-600 hover:bg-amber-700 text-white font-bold text-[11px] rounded-xl shadow-2xs"
          >
            Tính Xếp Hạng & Điểm
          </Button>
        </div>

        {/* Form nhập điểm 4 VĐV */}
        <form
          onSubmit={handleSubmit}
          className="space-y-3 overflow-y-auto pr-1 flex-1 scrollbar-thin"
        >
          <div className="space-y-2.5">
            {playersList.map((player: any) => {
              const pId = player.userId || player.id;
              const current = playerScores[pId] || {
                prestigeScore: 0,
                cardsBought: 0,
                rank: 4,
              };
              const swissPts = SWISS_POINTS[current.rank] ?? 0;
              const isFirst = current.rank === 1;

              return (
                <div
                  key={pId}
                  className={`p-3 rounded-2xl border transition-all ${
                    isFirst
                      ? "bg-amber-50/60 border-amber-300 ring-2 ring-amber-400/20"
                      : "bg-neutral-50/70 border-neutral-200"
                  }`}
                >
                  <div className="flex flex-wrap items-center justify-between gap-2 mb-2.5">
                    <div className="flex items-center gap-2 truncate">
                      {isFirst ? (
                        <Medal className="w-4 h-4 text-amber-600 shrink-0" />
                      ) : (
                        <Award className="w-4 h-4 text-neutral-400 shrink-0" />
                      )}
                      <span className="font-extrabold text-xs text-neutral-900 truncate">
                        {player.userName || player.username || "VĐV"}
                      </span>
                    </div>

                    {/* Huy hiệu Swiss Points */}
                    <div className="flex items-center gap-1.5">
                      <span className="text-[10px] font-bold text-neutral-500">
                        Thứ hạng:
                      </span>
                      <div className="flex gap-1">
                        {[1, 2, 3, 4].map((r) => (
                          <button
                            key={r}
                            type="button"
                            onClick={() => handleSetRankManually(pId, r)}
                            className={`w-6 h-6 rounded-lg text-[10px] font-black transition-all ${
                              current.rank === r
                                ? r === 1
                                  ? "bg-amber-500 text-white shadow-xs"
                                  : "bg-neutral-950 text-white"
                                : "bg-white border border-neutral-200 text-neutral-600 hover:bg-neutral-100"
                            }`}
                          >
                            #{r}
                          </button>
                        ))}
                      </div>

                      <span
                        className={`px-2 py-0.5 rounded-lg text-[11px] font-mono font-black ml-1 ${
                          swissPts === 6
                            ? "bg-amber-100 text-amber-800 border border-amber-300"
                            : swissPts === 4
                              ? "bg-blue-100 text-blue-800"
                              : swissPts === 2
                                ? "bg-emerald-100 text-emerald-800"
                                : "bg-neutral-200 text-neutral-600"
                        }`}
                      >
                        +{swissPts}đ
                      </span>
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-3 text-xs">
                    <div>
                      <label className="font-bold text-neutral-600 block mb-1 text-[11px]">
                        Điểm Prestige (0 - 30)
                      </label>
                      <Input
                        type="number"
                        min={0}
                        max={50}
                        value={current.prestigeScore}
                        onChange={(e) =>
                          handleScoreChange(
                            pId,
                            "prestigeScore",
                            Number(e.target.value),
                          )
                        }
                        className="h-8.5 bg-white font-mono font-bold"
                      />
                    </div>

                    <div>
                      <label className="font-bold text-neutral-600 block mb-1 text-[11px]">
                        Số thẻ đã mua (Tiebreaker)
                      </label>
                      <Input
                        type="number"
                        min={0}
                        max={50}
                        value={current.cardsBought}
                        onChange={(e) =>
                          handleScoreChange(
                            pId,
                            "cardsBought",
                            Number(e.target.value),
                          )
                        }
                        className="h-8.5 bg-white font-mono font-bold"
                      />
                    </div>
                  </div>
                </div>
              );
            })}
          </div>

          <div>
            <label className="font-bold text-neutral-700 block mb-1 text-xs">
              Ghi chú bàn đấu (Tùy chọn)
            </label>
            <Input
              placeholder="VD: Trận đấu kết thúc ở lượt thứ 24..."
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              className="h-8.5 text-xs"
            />
          </div>

          <div className="pt-3 border-t border-neutral-100 flex items-center justify-end gap-2 shrink-0">
            <Button
              type="button"
              variant="outline"
              onClick={onClose}
              className="h-9 px-4 text-xs font-bold rounded-xl"
            >
              Hủy
            </Button>
            <Button
              type="submit"
              disabled={isSubmitting}
              className="h-9 px-6 bg-neutral-950 hover:bg-neutral-800 text-white text-xs font-bold rounded-xl shadow-xs"
            >
              {isSubmitting ? "Đang lưu..." : "Xác Nhận Kết Quả"}
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
}
