/* eslint-disable @typescript-eslint/no-explicit-any */
"use client";

import React, { useMemo, useState } from "react";
import {
  TournamentMatch,
  RecordMatchResultDto,
  UpdateMatchResultDto,
} from "../types/tournament.types";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  X,
  Trophy,
  Minus,
  Plus,
  AlertCircle,
  Sparkles,
  Layers,
  Award,
} from "lucide-react";
import { toast } from "sonner";
import {
  backdropCloseHandler,
  useDismissOnBackdrop,
} from "../lib/use-dismiss-on-backdrop";

interface Props {
  isOpen: boolean;
  onClose: () => void;
  match: TournamentMatch | null;
  staffId?: string;
  onSaveResult: (dto: RecordMatchResultDto) => Promise<boolean>;
  onUpdateResult?: (dto: UpdateMatchResultDto) => Promise<boolean>;
}

export function MatchResultModal({
  isOpen,
  onClose,
  match,
  staffId,
  onSaveResult,
  onUpdateResult,
}: Props) {
  // Click ra ngoài backdrop hoặc nhấn Escape để đóng
  useDismissOnBackdrop(isOpen, onClose);

  if (!isOpen || !match) return null;

  return (
    <MatchResultModalContent
      key={match.id}
      match={match}
      staffId={staffId}
      onClose={onClose}
      onSaveResult={onSaveResult}
      onUpdateResult={onUpdateResult}
    />
  );
}

function MatchResultModalContent({
  match,
  staffId,
  onClose,
  onSaveResult,
  onUpdateResult,
}: {
  match: TournamentMatch;
  staffId?: string;
  onClose: () => void;
  onSaveResult: (dto: RecordMatchResultDto) => Promise<boolean>;
  onUpdateResult?: (dto: UpdateMatchResultDto) => Promise<boolean>;
}) {
  const isEditMode = match.status === "Completed";
  // Stable identity so the useMemo below can use it as a dependency without
  // re-running on every render (parent re-renders wouldn't change it).
  const matchPlayers = (match as any).players;
  const playersList = useMemo<any[]>(
    () => matchPlayers || [],
    [matchPlayers],
  );

  // Mặc định tất cả người chơi bắt đầu ở 15 điểm Prestige và 10 thẻ mua
  const [playerScores, setPlayerScores] = useState<
    Record<
      string,
      {
        prestigeScore: number;
        cardsBought: number;
      }
    >
  >(() => {
    const initial: Record<
      string,
      { prestigeScore: number; cardsBought: number }
    > = {};
    playersList.forEach((p) => {
      const pId = p.userId || p.id;
      const defaultScore =
        p.score !== null && p.score !== undefined ? p.score : 15;
      const defaultCards =
        p.cardsBought !== null && p.cardsBought !== undefined
          ? p.cardsBought
          : 10;

      initial[pId] = {
        prestigeScore: defaultScore,
        cardsBought: defaultCards,
      };
    });
    return initial;
  });

  const [notes, setNotes] = useState(match.notes || "");
  const [correctionReason, setCorrectionReason] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Tăng/Giảm điểm Prestige (giới hạn tối thiểu 0, tối đa 50)
  const adjustScore = (userId: string, delta: number) => {
    setPlayerScores((prev) => {
      const current = prev[userId]?.prestigeScore ?? 15;
      const nextScore = Math.max(0, Math.min(50, current + delta));
      return {
        ...prev,
        [userId]: {
          ...prev[userId],
          prestigeScore: nextScore,
        },
      };
    });
  };

  // Tăng/Giảm số thẻ đã mua (giới hạn tối thiểu 0, tối đa 100)
  const adjustCards = (userId: string, delta: number) => {
    setPlayerScores((prev) => {
      const current = prev[userId]?.cardsBought ?? 10;
      const nextCards = Math.max(0, Math.min(100, current + delta));
      return {
        ...prev,
        [userId]: {
          ...prev[userId],
          cardsBought: nextCards,
        },
      };
    });
  };

  // Tìm người chiến thắng: Điểm cao hơn -> Nếu hòa xét mua ít thẻ hơn.
  // Memoized: re-sorts only when roster or scores change, not on every render.
  const sortedPlayers = useMemo(() => {
    return [...playersList].sort((a, b) => {
      const pAId = a.userId || a.id;
      const pBId = b.userId || b.id;
      const scoreA = playerScores[pAId]?.prestigeScore ?? 0;
      const scoreB = playerScores[pBId]?.prestigeScore ?? 0;
      const cardsA = playerScores[pAId]?.cardsBought ?? 0;
      const cardsB = playerScores[pBId]?.cardsBought ?? 0;

      if (scoreB !== scoreA) return scoreB - scoreA;
      return cardsA - cardsB;
    });
  }, [playersList, playerScores]);
  const winnerUserId = sortedPlayers[0]?.userId || sortedPlayers[0]?.id;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!winnerUserId) {
      toast.error("Chưa có tuyển thủ nào trong bàn đấu này. Vui lòng kiểm tra lại danh sách VĐV.");
      return;
    }

    const results = Object.entries(playerScores).map(([userId, data]) => ({
      userId,
      score: data.prestigeScore,
      cardsBought: data.cardsBought,
    }));

    if (results.length < 2) {
      toast.error("Bàn đấu cần tối thiểu 2 tuyển thủ.");
      return;
    }

    setIsSubmitting(true);
    try {
      if (isEditMode) {
        if (!correctionReason.trim()) {
          toast.error("Vui lòng nhập lý do sửa kết quả để ghi log hệ thống.");
          setIsSubmitting(false);
          return;
        }

        if (!onUpdateResult) {
          toast.error("Chức năng sửa kết quả chưa được cấu hình.");
          setIsSubmitting(false);
          return;
        }

        const patchPayload: UpdateMatchResultDto = {
          matchId: match.id,
          winnerUserId,
          correctionReason: correctionReason.trim(),
          results,
        };

        const ok = await onUpdateResult(patchPayload);
        if (ok) onClose();
      } else {
        const postPayload: RecordMatchResultDto = {
          matchId: match.id,
          winnerUserId,
          recordedByStaffId: staffId || undefined,
          notes: notes.trim() || undefined,
          results,
        };

        const ok = await onSaveResult(postPayload);
        if (ok) onClose();
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div
      className="fixed inset-0 bg-neutral-950/60 backdrop-blur-xs z-50 flex items-center justify-center p-4 max-[480px]:p-2 max-[480px]:pb-[max(0.5rem,env(safe-area-inset-bottom))] max-[480px]:pt-[max(0.5rem,env(safe-area-inset-top))]"
      onClick={backdropCloseHandler(onClose)}
    >
      <div
        className="bg-white border border-neutral-200 rounded-3xl max-w-xl w-full p-6 flex flex-col gap-4 shadow-2xl animate-in fade-in-50 zoom-in-95 max-h-[92vh]"
        onClick={(event) => event.stopPropagation()}
      >
        {/* Header Modal */}
        <div className="flex items-center justify-between border-b pb-3 shrink-0">
          <div className="flex items-center gap-3">
            <div
              className={`p-2.5 rounded-2xl text-white shadow-xs ${
                isEditMode ? "bg-purple-600" : "bg-amber-500"
              }`}
            >
              <Trophy className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="font-black text-base text-neutral-950">
                  {isEditMode
                    ? "Sửa Kết Quả Bàn Đấu"
                    : "Ghi Nhận Kết Quả Bàn Đấu"}
                </h3>
                <span className="px-2 py-0.5 rounded-md text-[10px] font-black uppercase bg-neutral-100 text-neutral-700">
                  {match.tableName ||
                    `Bàn #${match.tableNumber || match.id.slice(0, 6)}`}
                </span>
              </div>
              <p className="text-xs text-neutral-500 font-medium">
                Mặc định <strong>15 điểm Prestige</strong> & <strong>10 thẻ</strong> mỗi VĐV.
                Dùng nút <strong>−</strong> và <strong>+</strong> để điều chỉnh.
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

        {/* Warning Banner khi ở Edit Mode */}
        {isEditMode && (
          <div className="bg-purple-50 border border-purple-200/80 p-3 rounded-2xl flex items-start gap-2.5 text-xs text-purple-950 shrink-0">
            <AlertCircle className="w-4 h-4 text-purple-600 shrink-0 mt-0.5" />
            <div>
              <strong>Lưu ý:</strong> Hệ thống sẽ tự động hoàn tác điểm cũ và
              tính lại Elo theo kết quả mới.
            </div>
          </div>
        )}

        {/* Form nhập điểm 4 VĐV */}
        <form
          onSubmit={handleSubmit}
          className="flex flex-1 flex-col overflow-y-auto pr-1 scrollbar-thin"
        >
          <div className="flex flex-col gap-3">
            {playersList.map((player: any) => {
              const pId = player.userId || player.id;
              const current = playerScores[pId] || {
                prestigeScore: 15,
                cardsBought: 10,
              };
              const isWinner = winnerUserId === pId;

              return (
                <div
                  key={pId}
                  className={`flex flex-col gap-3 p-3.5 rounded-2xl border transition-all ${
                    isWinner
                      ? "bg-amber-50/70 border-amber-300 ring-2 ring-amber-400/30"
                      : "bg-neutral-50/70 border-neutral-200/90"
                  }`}
                >
                  {/* Tên VĐV & Badge Winner */}
                  <div className="flex items-center justify-between gap-2">
                    <div className="flex items-center gap-2 truncate">
                      {isWinner ? (
                        <span className="px-2 py-0.5 rounded-lg bg-amber-500 text-white font-black text-[10px] flex items-center gap-1 shadow-2xs">
                          <Trophy className="w-3 h-3" /> HẠNG NHẤT
                        </span>
                      ) : (
                        <Award className="w-4 h-4 text-neutral-400 shrink-0" />
                      )}
                      <span className="font-black text-sm text-neutral-900 truncate">
                        {player.userName || player.username || "VĐV"}
                      </span>
                    </div>

                    <span className="shrink-0 text-[11px] font-mono text-neutral-400 font-bold">
                      Elo: {player.currentElo || 1200}
                    </span>
                  </div>

                  {/* Bộ điều khiển Điểm & Thẻ */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                    {/* CỘT 1: ĐIỂM PRESTIGE (Mặc định 15đ) */}
                    <div className="flex flex-col gap-1 bg-white p-2 rounded-xl border border-neutral-200/80 shadow-2xs">
                      <div className="flex items-center justify-between text-[11px] font-bold text-neutral-600">
                        <span className="flex items-center gap-1">
                          <Sparkles className="w-3 h-3 text-amber-500" /> Điểm
                          Prestige
                        </span>
                        <span className="text-[10px] text-neutral-400 font-mono">
                          Chuẩn: 15đ
                        </span>
                      </div>

                      <div className="flex items-center justify-between gap-1">
                        {/* Nút giảm nhanh -5 và -1 */}
                        <div className="flex gap-1">
                          <button
                            type="button"
                            onClick={() => adjustScore(pId, -5)}
                            className="w-7 h-8 bg-rose-100/70 hover:bg-rose-200 text-rose-700 rounded-lg font-bold text-[10px] active:scale-95 transition-transform"
                            title="Giảm 5 điểm"
                          >
                            -5
                          </button>
                          <button
                            type="button"
                            onClick={() => adjustScore(pId, -1)}
                            className="w-8 h-8 bg-rose-100/70 hover:bg-rose-200 text-rose-700 rounded-lg flex items-center justify-center font-black active:scale-95 transition-transform"
                            title="Giảm 1 điểm"
                          >
                            <Minus className="w-3.5 h-3.5" />
                          </button>
                        </div>

                        {/* Ô hiển thị & nhập số điểm */}
                        <input
                          type="number"
                          min={0}
                          max={50}
                          value={current.prestigeScore}
                          onChange={(e) => {
                            const val = Number(e.target.value);
                            setPlayerScores((prev) => ({
                              ...prev,
                              [pId]: { ...prev[pId], prestigeScore: val },
                            }));
                          }}
                          className="w-14 h-8 text-center font-mono font-black text-base text-amber-900 bg-amber-50 rounded-lg border border-amber-200 focus:border-amber-500 focus:ring-1 focus:ring-amber-400/40 focus:outline-none"
                        />

                        {/* Nút tăng +1 */}
                        <button
                          type="button"
                          onClick={() => adjustScore(pId, +1)}
                          className="w-8 h-8 bg-emerald-100/70 hover:bg-emerald-200 text-emerald-700 rounded-lg flex items-center justify-center font-black active:scale-95 transition-transform"
                          title="Tăng 1 điểm"
                        >
                          <Plus className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </div>

                    {/* CỘT 2: SỐ THẺ ĐÃ MUA (Mặc định 10 thẻ) */}
                    <div className="flex flex-col gap-1 bg-white p-2 rounded-xl border border-neutral-200/80 shadow-2xs">
                      <div className="flex items-center justify-between text-[11px] font-bold text-neutral-600">
                        <span className="flex items-center gap-1">
                          <Layers className="w-3 h-3 text-blue-500" /> Thẻ Đã
                          Mua
                        </span>
                        <span className="text-[10px] text-neutral-400 font-mono">
                          Chuẩn: 10 thẻ
                        </span>
                      </div>

                      <div className="flex items-center justify-between gap-1">
                        {/* Nút giảm -1 */}
                        <button
                          type="button"
                          onClick={() => adjustCards(pId, -1)}
                          className="w-8 h-8 bg-rose-100/70 hover:bg-rose-200 text-rose-700 rounded-lg flex items-center justify-center font-black active:scale-95 transition-transform"
                          title="Giảm 1 thẻ"
                        >
                          <Minus className="w-3.5 h-3.5" />
                        </button>

                        {/* Ô hiển thị & nhập số thẻ */}
                        <input
                          type="number"
                          min={0}
                          max={100}
                          value={current.cardsBought}
                          onChange={(e) => {
                            const val = Number(e.target.value);
                            setPlayerScores((prev) => ({
                              ...prev,
                              [pId]: { ...prev[pId], cardsBought: val },
                            }));
                          }}
                          className="w-14 h-8 text-center font-mono font-black text-base text-blue-900 bg-blue-50 rounded-lg border border-blue-200 focus:border-blue-500 focus:ring-1 focus:ring-blue-400/40 focus:outline-none"
                        />

                        {/* Nút tăng +1 và +5 */}
                        <div className="flex gap-1">
                          <button
                            type="button"
                            onClick={() => adjustCards(pId, +1)}
                            className="w-8 h-8 bg-emerald-100/70 hover:bg-emerald-200 text-emerald-700 rounded-lg flex items-center justify-center font-black active:scale-95 transition-transform"
                            title="Tăng 1 thẻ"
                          >
                            <Plus className="w-3.5 h-3.5" />
                          </button>
                          <button
                            type="button"
                            onClick={() => adjustCards(pId, +5)}
                            className="w-7 h-8 bg-emerald-100/70 hover:bg-emerald-200 text-emerald-700 rounded-lg font-bold text-[10px] active:scale-95 transition-transform"
                            title="Tăng 5 thẻ"
                          >
                            +5
                          </button>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>

          {/* Ghi chú hoặc Lý do sửa */}
          {isEditMode ? (
            <div>
              <label className="font-bold text-purple-900 block mb-1 text-xs">
                Lý do sửa kết quả <span className="text-rose-500">*</span>
              </label>
              <Input
                required
                placeholder="VD: Nhập nhầm điểm bàn 1, điều chỉnh số thẻ tiebreaker..."
                value={correctionReason}
                onChange={(e) => setCorrectionReason(e.target.value)}
                className="h-9 text-xs bg-purple-50/40 border-purple-200 focus:border-purple-500 rounded-xl"
              />
            </div>
          ) : (
            <div>
              <label className="font-bold text-neutral-700 block mb-1 text-xs">
                Ghi chú ván đấu (Tùy chọn)
              </label>
              <Input
                placeholder="VD: Ván đấu kết thúc nhanh, chiến thuật gem xanh..."
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                className="h-9 text-xs rounded-xl"
              />
            </div>
          )}

          {/* Nút Xác nhận */}
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
              className="h-9 rounded-xl bg-primary px-6 text-xs font-bold text-primary-foreground shadow-xs hover:bg-primary/90"
            >
              {isSubmitting
                ? "Đang lưu..."
                : isEditMode
                  ? "Cập nhật kết quả"
                  : "Xác nhận kết quả"}
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
}
