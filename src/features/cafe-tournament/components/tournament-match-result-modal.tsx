"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { X, Swords, Crown, AlertCircle } from "lucide-react";
import {
  TournamentMatch,
  RecordMatchResultPayload,
  UpdateMatchResultPayload,
} from "../types/tournament.types";

interface Props {
  isOpen: boolean;
  onClose: () => void;
  match: TournamentMatch | null;
  onSaveResult: (payload: RecordMatchResultPayload) => Promise<boolean>;
  onUpdateResult?: (
    matchId: string,
    payload: UpdateMatchResultPayload,
  ) => Promise<boolean>;
}

export function TournamentMatchResultModal({
  isOpen,
  onClose,
  match,
  onSaveResult,
  onUpdateResult,
}: Props) {
  const isEditing = match?.status === "Completed";

  const [winnerUserId, setWinnerUserId] = useState<string>(
    match?.winnerUserId || "",
  );
  const [notes, setNotes] = useState<string>(match?.notes || "");
  const [playerResults, setPlayerResults] = useState<
    Array<{
      userId: string;
      userName?: string;
      score: number;
      cardsBought: number;
    }>
  >(
    match?.results?.map((r) => ({
      userId: r.userId,
      userName: r.userName,
      score: r.score || 0,
      cardsBought: r.cardsBought || 0,
    })) || [],
  );
  const [loading, setLoading] = useState(false);

  if (!isOpen || !match) return null;

  const handleScoreChange = (userId: string, score: number) => {
    setPlayerResults((prev) =>
      prev.map((p) => (p.userId === userId ? { ...p, score } : p)),
    );
  };

  const handleCardsChange = (userId: string, cardsBought: number) => {
    setPlayerResults((prev) =>
      prev.map((p) => (p.userId === userId ? { ...p, cardsBought } : p)),
    );
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!winnerUserId) {
      alert("Vui lòng chọn người chiến thắng của bàn đấu!");
      return;
    }

    setLoading(true);
    let ok = false;

    if (isEditing && onUpdateResult) {
      // Gọi API PATCH sửa kết quả
      const payload: UpdateMatchResultPayload = {
        winnerUserId,
        notes: notes.trim() || undefined,
        results: playerResults.map((p) => ({
          userId: p.userId,
          score: Number(p.score) || 0,
          cardsBought: Number(p.cardsBought) || 0,
        })),
      };
      ok = await onUpdateResult(match.id, payload);
    } else {
      // Gọi API POST ghi nhận kết quả lần đầu
      const payload: RecordMatchResultPayload = {
        matchId: match.id,
        winnerUserId,
        notes: notes.trim() || undefined,
        results: playerResults.map((p) => ({
          userId: p.userId,
          score: Number(p.score) || 0,
          cardsBought: Number(p.cardsBought) || 0,
        })),
      };
      ok = await onSaveResult(payload);
    }

    setLoading(false);

    if (ok) {
      onClose();
    }
  };

  return (
    <div className="fixed inset-0 bg-neutral-950/40 backdrop-blur-xs z-50 flex items-center justify-center p-4">
      <div className="bg-white border border-neutral-200 rounded-3xl max-w-lg w-full p-6 space-y-4 shadow-xl max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between border-b pb-3">
          <div className="flex items-center gap-2.5">
            <div
              className={`p-2.5 rounded-xl border ${
                isEditing
                  ? "bg-amber-50 text-amber-700 border-amber-200"
                  : "bg-blue-50 text-blue-700 border-blue-200"
              }`}
            >
              <Swords className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-extrabold text-base text-neutral-950">
                {isEditing
                  ? `Sửa Kết Quả: Bàn #${match.tableNumber}`
                  : `Ghi Nhận Kết Quả: Bàn #${match.tableNumber}`}
              </h3>
              <p className="text-xs text-neutral-500 font-mono">
                Vòng đấu: #{match.roundNumber} | Mã bàn: #{match.id.slice(0, 8)}
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

        {isEditing && (
          <div className="p-3 bg-amber-50/80 border border-amber-200/80 rounded-2xl text-[11px] text-amber-900 flex items-start gap-2">
            <AlertCircle className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
            <span>
              Hệ thống sẽ <strong>revert Swiss score & Elo cũ</strong> và tính
              toán lại theo kết quả mới.
            </span>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-3">
            <label className="text-xs font-bold text-neutral-800 uppercase tracking-wider text-[10px] block">
              Điểm số và số thẻ mua của từng VĐV:
            </label>

            <div className="space-y-2">
              {playerResults.map((p) => {
                const isWinner = winnerUserId === p.userId;
                return (
                  <div
                    key={p.userId}
                    className={`p-3 rounded-2xl border transition-all ${
                      isWinner
                        ? "bg-amber-50/60 border-amber-300 ring-1 ring-amber-300/40"
                        : "bg-neutral-50 border-neutral-200"
                    }`}
                  >
                    <div className="flex items-center justify-between gap-2 mb-2">
                      <span className="font-black text-xs text-neutral-900 line-clamp-1">
                        {p.userName || `User #${p.userId.slice(0, 8)}`}
                      </span>
                      <button
                        type="button"
                        onClick={() => setWinnerUserId(p.userId)}
                        className={`px-2.5 py-1 rounded-lg text-[10px] font-bold flex items-center gap-1 border transition-all ${
                          isWinner
                            ? "bg-amber-500 text-white border-amber-500 shadow-2xs"
                            : "bg-white text-neutral-600 border-neutral-200 hover:bg-neutral-100"
                        }`}
                      >
                        <Crown className="w-3 h-3" />
                        <span>{isWinner ? "Winner" : "Chọn Thắng"}</span>
                      </button>
                    </div>

                    <div className="grid grid-cols-2 gap-2">
                      <div>
                        <label className="text-[10px] font-semibold text-neutral-500">
                          Điểm Uy Tín (Prestige):
                        </label>
                        <Input
                          type="number"
                          value={p.score}
                          onChange={(e) =>
                            handleScoreChange(
                              p.userId,
                              parseInt(e.target.value) || 0,
                            )
                          }
                          className="h-8 text-xs bg-white font-mono font-bold"
                          min={0}
                          required
                        />
                      </div>
                      <div>
                        <label className="text-[10px] font-semibold text-neutral-500">
                          Số Thẻ Mua (Cards Bought):
                        </label>
                        <Input
                          type="number"
                          value={p.cardsBought}
                          onChange={(e) =>
                            handleCardsChange(
                              p.userId,
                              parseInt(e.target.value) || 0,
                            )
                          }
                          className="h-8 text-xs bg-white font-mono font-bold"
                          min={0}
                        />
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          <div className="space-y-1 pt-1">
            <label className="text-[11px] font-semibold text-neutral-700">
              Ghi chú trận đấu (Tùy chọn):
            </label>
            <Input
              type="text"
              placeholder="Nhập ghi chú hoặc lý do chỉnh sửa kết quả..."
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              className="h-8 text-xs bg-neutral-50 rounded-xl"
            />
          </div>

          <div className="pt-2 border-t flex justify-end gap-2">
            <Button
              type="button"
              variant="outline"
              onClick={onClose}
              className="h-9 text-xs rounded-xl border-neutral-200"
            >
              Hủy
            </Button>
            <Button
              type="submit"
              disabled={loading}
              className={`h-9 text-white text-xs font-bold rounded-xl px-4 ${
                isEditing
                  ? "bg-amber-600 hover:bg-amber-700"
                  : "bg-neutral-950 hover:bg-neutral-800"
              }`}
            >
              {loading
                ? "Đang lưu..."
                : isEditing
                  ? "Cập Nhật Kết Quả (PATCH)"
                  : "Xác Nhận Kết Quả (POST)"}
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
}
