/* eslint-disable @typescript-eslint/no-explicit-any */
"use client";

import React, { useMemo, useState } from "react";
import {
  TournamentMatch,
  RecordMatchResultDto,
  UpdateMatchResultDto,
} from "../types/tournament.types";

/**
 * Dev-only scenario descriptor used by the preview harness. The modal
 * renders a toolbar of buttons from this list — one click applies the
 * stats for all 4 players at once. Never set this in production code.
 */
export interface DevPresetScenario {
  testId: string;
  label: string;
  /** One stats override per player, in the same order as `match.players`. */
  overrides: Array<{
    prestigeScore?: number;
    cardsBought?: number;
    nobleCards?: number;
    gemsRemaining?: number;
    turnOrder?: number;
  } | null>;
}

export type DevPresetOverrides = DevPresetScenario["overrides"];
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
  Crown,
  Gem,
} from "lucide-react";
import { toast } from "sonner";
import {
  backdropCloseHandler,
  useDismissOnBackdrop,
} from "../lib/use-dismiss-on-backdrop";
import { sortByTiebreakers } from "../lib/tiebreaker";

interface Props {
  isOpen: boolean;
  onClose: () => void;
  match: TournamentMatch | null;
  staffId?: string;
  onSaveResult: (dto: RecordMatchResultDto) => Promise<boolean>;
  onUpdateResult?: (dto: UpdateMatchResultDto) => Promise<boolean>;
  /**
   * Manager hủy bàn đấu (thiếu người / dispute không giải quyết được).
   * Khi cung cấp, modal hiển thị nút "Hủy ván đấu" ở footer.
   * Trả về `true` nếu API thành công — modal sẽ tự đóng.
   */
  onCancelMatch?: (matchId: string, reason: string) => Promise<boolean>;
  /**
   * Dev-only. When provided, the modal renders a "scenario" toolbar at
   * the top of the form. Each scenario's overrides are looked up by
   * player index — the modal itself never references hard-coded ids.
   */
  devPresetScenarios?: DevPresetScenario[];
  /**
   * Dev-only. Called when a scenario button is clicked so the parent
   * can re-seed the player payload (which causes the modal to remount
   * via its `key` prop) instead of the modal mutating its own state.
   */
  devApplyPreset?: (overrides: DevPresetOverrides) => void;
}

export function MatchResultModal({
  isOpen,
  onClose,
  match,
  ...rest
}: Props) {
  // Click ra ngoài backdrop hoặc nhấn Escape để đóng
  useDismissOnBackdrop(isOpen, onClose);

  if (!isOpen || !match) return null;

  // `rest` is forwarded to the inner component; the preview harness
  // passes a `key` (via React.cloneElement semantics of forwarding the
  // caller's `key`) by remounting us with a fresh `key` prop, but the
  // outer call site controls the remount by re-keying <MatchResultModal>
  // itself, so the inner key here is just the match id to keep the
  // default behaviour when no remount key is supplied.
  return (
    <MatchResultModalContent
      key={match.id}
      match={match}
      onClose={onClose}
      {...rest}
    />
  );
}

function MatchResultModalContent({
  match,
  staffId,
  onClose,
  onSaveResult,
  onUpdateResult,
  onCancelMatch,
  devPresetScenarios,
  devApplyPreset,
}: {
  match: TournamentMatch;
  staffId?: string;
  onClose: () => void;
  onSaveResult: (dto: RecordMatchResultDto) => Promise<boolean>;
  onUpdateResult?: (dto: UpdateMatchResultDto) => Promise<boolean>;
  onCancelMatch?: (matchId: string, reason: string) => Promise<boolean>;
  devPresetScenarios?: DevPresetScenario[];
  devApplyPreset?: (overrides: DevPresetOverrides) => void;
}) {
  const isEditMode = match.status === "Completed";
  // Stable identity so the useMemo below can use it as a dependency without
  // re-running on every render (parent re-renders wouldn't change it).
  const matchPlayers = (match as any).players;
  const playersList = useMemo<any[]>(
    () => matchPlayers || [],
    [matchPlayers],
  );

  // Mặc định tất cả người chơi bắt đầu ở 15 điểm uy tín, 10 thẻ phát triển,
  // 0 thẻ Quý tộc, 0 đá quý, lượt 1. Bao gồm đủ 5 chỉ số để tiebreaker chain
  // (uy tín → thẻ phát triển → Quý tộc → đá quý → thứ tự lượt) hoạt động.
  const [playerScores, setPlayerScores] = useState<
    Record<
      string,
      {
        prestigeScore: number;
        cardsBought: number;
        nobleCards: number;
        gemsRemaining: number;
        turnOrder: number;
      }
    >
  >(() => {
    const initial: Record<
      string,
      {
        prestigeScore: number;
        cardsBought: number;
        nobleCards: number;
        gemsRemaining: number;
        turnOrder: number;
      }
    > = {};
    playersList.forEach((p, idx) => {
      const pId = p.userId || p.id;
      const defaultScore =
        p.score !== null && p.score !== undefined ? p.score : 15;
      const defaultCards =
        p.cardsBought !== null && p.cardsBought !== undefined
          ? p.cardsBought
          : 10;
      const defaultNobles =
        p.nobleCards !== null && p.nobleCards !== undefined
          ? p.nobleCards
          : 0;
      const defaultGems =
        p.gemsRemaining !== null && p.gemsRemaining !== undefined
          ? p.gemsRemaining
          : 0;
      // Thứ tự lượt đi mặc định = vị trí trong roster (P1=1, P2=2, …)
      const defaultTurn = idx + 1;

      initial[pId] = {
        prestigeScore: defaultScore,
        cardsBought: defaultCards,
        nobleCards: defaultNobles,
        gemsRemaining: defaultGems,
        turnOrder: defaultTurn,
      };
    });
    return initial;
  });

  const [notes, setNotes] = useState(match.notes || "");
  const [correctionReason, setCorrectionReason] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Tăng/Giảm điểm uy tín (giới hạn tối thiểu 0, tối đa 15 — Splendor endgame)
  const adjustPrestige = (userId: string, delta: number) => {
    setPlayerScores((prev) => {
      const current = prev[userId]?.prestigeScore ?? 15;
      const nextScore = Math.max(0, Math.min(15, current + delta));
      return {
        ...prev,
        [userId]: {
          ...prev[userId],
          prestigeScore: nextScore,
        },
      };
    });
  };

  // Tăng/Giảm số thẻ phát triển đã mua (giới hạn tối thiểu 0, tối đa 100)
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

  // Tăng/Giảm số thẻ Quý tộc (giới hạn 0–10)
  const adjustNobles = (userId: string, delta: number) => {
    setPlayerScores((prev) => {
      const current = prev[userId]?.nobleCards ?? 0;
      const next = Math.max(0, Math.min(10, current + delta));
      return {
        ...prev,
        [userId]: { ...prev[userId], nobleCards: next },
      };
    });
  };

  // Tăng/Giảm số đá quý còn lại (giới hạn 0–50)
  const adjustGems = (userId: string, delta: number) => {
    setPlayerScores((prev) => {
      const current = prev[userId]?.gemsRemaining ?? 0;
      const next = Math.max(0, Math.min(50, current + delta));
      return {
        ...prev,
        [userId]: { ...prev[userId], gemsRemaining: next },
      };
    });
  };

  // Tìm người chiến thắng qua tiebreaker chain đầy đủ 5 chỉ số:
  // (1) Điểm uy tín cao nhất, (2) thẻ phát triển ít nhất, (3) thẻ Quý tộc nhiều nhất,
  // (4) đá quý còn lại nhiều nhất, (5) thứ tự lượt đi sớm nhất.
  // Delegate to the pure lib so the rule order is single-sourced.
  const sortedPlayers = useMemo(
    () => sortByTiebreakers(playersList, playerScores),
    [playersList, playerScores],
  );
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

  // === HỦY VÁN ĐẤU ============================================
  // Manager dùng khi bàn thiếu người hoặc dispute không giải quyết được.
  // Mở dialog nhập lý do → gọi prop `onCancelMatch` (cha đã inject).
  const [showCancelDialog, setShowCancelDialog] = useState(false);
  const [cancelReason, setCancelReason] = useState("");
  const [isCancelling, setIsCancelling] = useState(false);

  const handleConfirmCancel = async () => {
    if (!onCancelMatch) return;
    if (cancelReason.trim().length < 5) {
      toast.error("Vui lòng nhập lý do hủy (ít nhất 5 ký tự).");
      return;
    }
    setIsCancelling(true);
    try {
      const ok = await onCancelMatch(match.id, cancelReason.trim());
      if (ok) {
        setShowCancelDialog(false);
        setCancelReason("");
        onClose();
      }
    } finally {
      setIsCancelling(false);
    }
  };
  // ============================================================

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
        <div className="flex items-start justify-between border-b border-neutral-200/80 pb-4 shrink-0 gap-3">
          <div className="flex items-start gap-3 min-w-0">
            <div
              className={`p-2.5 rounded-2xl text-white shadow-2xs shrink-0 ${
                isEditMode ? "bg-purple-600" : "bg-primary"
              }`}
            >
              <Trophy className="w-5 h-5" />
            </div>
            <div className="min-w-0">
              <div className="flex items-center gap-2 flex-wrap">
                <h3
                  className="font-black text-base text-neutral-950 tracking-tight"
                  style={{ letterSpacing: "-0.015em" }}
                >
                  {isEditMode
                    ? "Sửa Kết Quả Bàn Đấu"
                    : "Ghi Nhận Kết Quả Bàn Đấu"}
                </h3>
                <span className="px-2 py-0.5 rounded-md text-[10px] font-black uppercase bg-neutral-100 text-neutral-700 tracking-wide">
                  {match.tableName ||
                    `Bàn #${match.tableNumber || match.id.slice(0, 6)}`}
                </span>
              </div>
              <p className="mt-1 text-xs text-neutral-500 font-medium leading-relaxed">
                Mặc định 15 điểm uy tín & 10 thẻ phát triển mỗi VĐV — dùng nút{" "}
                <span className="font-black text-neutral-700">−</span> và{" "}
                <span className="font-black text-neutral-700">+</span> để điều chỉnh.
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            aria-label="Đóng"
            className="p-1.5 text-neutral-400 hover:text-neutral-900 hover:bg-neutral-100 rounded-xl transition-colors shrink-0"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Warning Banner khi ở Edit Mode */}
        {isEditMode && (
          <div className="bg-purple-50 border border-purple-200 p-3 rounded-2xl flex items-start gap-2.5 text-xs text-purple-950 shrink-0">
            <AlertCircle className="w-4 h-4 text-purple-600 shrink-0 mt-0.5" />
            <div className="leading-relaxed">
              <strong className="font-black">Lưu ý:</strong> hệ thống sẽ tự động
              hoàn tác điểm cũ và tính lại Elo theo kết quả mới.
            </div>
          </div>
        )}

        {/* Dev-only Preset Toolbar (chỉ hiện khi parent truyền scenarios) */}
        {devPresetScenarios && devApplyPreset && playersList.length > 0 && (
          <div
            data-testid="preset-toolbar"
            className="flex flex-wrap items-center gap-1.5 rounded-xl border border-dashed border-neutral-300 bg-neutral-50 p-2 text-[11px] font-bold text-neutral-600 shrink-0"
          >
            <span className="px-1.5 text-neutral-500 uppercase tracking-wide text-[10px] font-black">
              Kịch bản nhanh
            </span>
            {devPresetScenarios.map((s) => (
              <button
                key={s.testId}
                type="button"
                data-testid={s.testId}
                onClick={() => devApplyPreset(s.overrides)}
                className="rounded-md bg-white px-2 py-1 text-[10px] font-bold text-neutral-700 ring-1 ring-neutral-200 hover:bg-neutral-100 hover:ring-neutral-300 active:scale-95 transition-all"
              >
                {s.label}
              </button>
            ))}
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
                nobleCards: 0,
                gemsRemaining: 0,
                turnOrder: 1,
              };
              const isWinner = winnerUserId === pId;

              return (
                <div
                  key={pId}
                  data-testid="player-card"
                  data-player-id={pId}
                  data-is-winner={isWinner ? "true" : "false"}
                  className={`flex flex-col gap-3 p-3.5 rounded-2xl border transition-all ${
                    isWinner
                      ? "bg-amber-50 border-amber-300 shadow-[0_2px_10px_-2px_rgba(217,119,6,0.25)]"
                      : "bg-white border-neutral-200 shadow-2xs"
                  }`}
                >
                  {/* Tên VĐV & Badge Winner */}
                  <div className="flex items-center justify-between gap-2">
                    <div className="flex items-center gap-2 truncate">
                      {isWinner ? (
                        <span
                          data-testid="winner-badge"
                          className="px-2 py-1 rounded-md bg-amber-500 text-white font-black text-[10px] flex items-center gap-1 shadow-xs tracking-wide uppercase"
                        >
                          <Trophy className="w-3 h-3" /> Hạng nhất
                        </span>
                      ) : (
                        <span className="w-5 h-5 rounded-full bg-neutral-100 flex items-center justify-center shrink-0">
                          <Award className="w-3 h-3 text-neutral-400" />
                        </span>
                      )}
                      <span className="font-black text-sm text-neutral-900 truncate">
                        {player.userName || player.username || "VĐV"}
                      </span>
                    </div>

                    <span className="shrink-0 text-[11px] font-mono text-neutral-400 font-bold tabular-nums">
                      Elo {player.currentElo || 1200}
                    </span>
                  </div>

                  {/* Bộ điều khiển 5 chỉ số tiebreaker */}
                  <div className="flex flex-col gap-2">
                    {/* HÀNG 1: Điểm uy tín + Thẻ phát triển (chỉ số chính) */}
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                      {/* ĐIỂM UY TÍN (Mặc định 15đ) */}
                      <div className="flex flex-col gap-1.5 bg-neutral-50/50 p-2 rounded-xl border border-neutral-200">
                        <div className="flex items-center justify-between text-[11px] font-bold text-neutral-600">
                          <span className="flex items-center gap-1.5">
                            <Sparkles className="w-3 h-3 text-amber-500" />
                            <span>Điểm uy tín</span>
                          </span>
                          <span className="text-[10px] text-neutral-400 font-mono tabular-nums">
                            chuẩn 15
                          </span>
                        </div>

                        <div className="flex items-center gap-1">
                          <button
                            type="button"
                            onClick={() => adjustPrestige(pId, -5)}
                            className="w-8 h-8 bg-white text-neutral-500 rounded-lg font-black text-[10px] active:scale-95 transition-transform hover:bg-neutral-100 border border-neutral-200/80 shadow-2xs tabular-nums"
                            title="Giảm 5 điểm"
                            aria-label="Giảm 5 điểm"
                          >
                            −5
                          </button>
                          <button
                            type="button"
                            onClick={() => adjustPrestige(pId, -1)}
                            className="w-8 h-8 bg-white text-neutral-700 rounded-lg flex items-center justify-center font-black active:scale-95 transition-transform hover:bg-neutral-100 border border-neutral-200/80 shadow-2xs"
                            title="Giảm 1 điểm"
                            aria-label="Giảm 1 điểm"
                          >
                            <Minus className="w-3.5 h-3.5" />
                          </button>

                          <input
                            type="number"
                            min={0}
                            max={15}
                            data-testid="prestige-score"
                            data-player-id={pId}
                            aria-label="Điểm uy tín"
                            value={current.prestigeScore}
                            onChange={(e) => {
                              const val = Number(e.target.value);
                              setPlayerScores((prev) => ({
                                ...prev,
                                [pId]: { ...prev[pId], prestigeScore: val },
                              }));
                            }}
                            className="flex-1 h-8 min-w-0 text-center font-mono font-black text-base text-amber-900 bg-amber-50 rounded-lg border border-amber-200 focus:border-amber-500 focus:ring-2 focus:ring-amber-400/30 focus:outline-none tabular-nums"
                          />

                          <button
                            type="button"
                            onClick={() => adjustPrestige(pId, +1)}
                            className="w-8 h-8 bg-white text-neutral-700 rounded-lg flex items-center justify-center font-black active:scale-95 transition-transform hover:bg-neutral-100 border border-neutral-200/80 shadow-2xs"
                            title="Tăng 1 điểm"
                            aria-label="Tăng 1 điểm"
                          >
                            <Plus className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </div>

                      {/* THẺ PHÁT TRIỂN (Mặc định 10 thẻ) */}
                      <div className="flex flex-col gap-1.5 bg-neutral-50/50 p-2 rounded-xl border border-neutral-200">
                        <div className="flex items-center justify-between text-[11px] font-bold text-neutral-600">
                          <span className="flex items-center gap-1.5">
                            <Layers className="w-3 h-3 text-blue-500" />
                            <span>Thẻ phát triển</span>
                          </span>
                          <span className="text-[10px] text-neutral-400 font-mono tabular-nums">
                            chuẩn 10
                          </span>
                        </div>

                        <div className="flex items-center gap-1">
                          <button
                            type="button"
                            onClick={() => adjustCards(pId, -1)}
                            className="w-8 h-8 bg-white text-neutral-700 rounded-lg flex items-center justify-center font-black active:scale-95 transition-transform hover:bg-neutral-100 border border-neutral-200/80 shadow-2xs"
                            title="Giảm 1 thẻ"
                            aria-label="Giảm 1 thẻ"
                          >
                            <Minus className="w-3.5 h-3.5" />
                          </button>

                          <input
                            type="number"
                            min={0}
                            max={100}
                            data-testid="cards-bought"
                            data-player-id={pId}
                            aria-label="Thẻ phát triển đã mua"
                            value={current.cardsBought}
                            onChange={(e) => {
                              const val = Number(e.target.value);
                              setPlayerScores((prev) => ({
                                ...prev,
                                [pId]: { ...prev[pId], cardsBought: val },
                              }));
                            }}
                            className="flex-1 h-8 min-w-0 text-center font-mono font-black text-base text-blue-900 bg-blue-50 rounded-lg border border-blue-200 focus:border-blue-500 focus:ring-2 focus:ring-blue-400/30 focus:outline-none tabular-nums"
                          />

                          <button
                            type="button"
                            onClick={() => adjustCards(pId, +1)}
                            className="w-8 h-8 bg-white text-neutral-700 rounded-lg flex items-center justify-center font-black active:scale-95 transition-transform hover:bg-neutral-100 border border-neutral-200/80 shadow-2xs"
                            title="Tăng 1 thẻ"
                            aria-label="Tăng 1 thẻ"
                          >
                            <Plus className="w-3.5 h-3.5" />
                          </button>
                          <button
                            type="button"
                            onClick={() => adjustCards(pId, +5)}
                            className="w-8 h-8 bg-white text-neutral-500 rounded-lg font-black text-[10px] active:scale-95 transition-transform hover:bg-neutral-100 border border-neutral-200/80 shadow-2xs tabular-nums"
                            title="Tăng 5 thẻ"
                            aria-label="Tăng 5 thẻ"
                          >
                            +5
                          </button>
                        </div>
                      </div>
                    </div>

                    {/* HÀNG 2: Thẻ Quý tộc + Đá quý + Thứ tự lượt (chỉ số phụ) */}
                    <div className="grid grid-cols-2 gap-2">
                      {/* THẺ QUÝ TỘC */}
                      <div className="flex flex-col gap-1.5 bg-neutral-50/50 p-2 rounded-xl border border-neutral-200">
                        <div className="flex items-center justify-between text-[11px] font-bold text-neutral-600">
                          <span className="flex items-center gap-1 truncate">
                            <Crown className="w-3 h-3 text-purple-500 shrink-0" />
                            <span className="truncate">Quý tộc</span>
                          </span>
                        </div>

                        <div className="flex items-center gap-1">
                          <button
                            type="button"
                            onClick={() => adjustNobles(pId, -1)}
                            className="w-7 h-8 bg-white text-neutral-700 rounded-lg flex items-center justify-center font-black active:scale-95 transition-transform hover:bg-neutral-100 border border-neutral-200/80 shadow-2xs"
                            title="Giảm 1 thẻ Quý tộc"
                            aria-label="Giảm 1 thẻ Quý tộc"
                          >
                            <Minus className="w-3 h-3" />
                          </button>

                          <input
                            type="number"
                            min={0}
                            max={10}
                            data-testid="noble-cards"
                            data-player-id={pId}
                            aria-label="Thẻ Quý tộc đang sở hữu"
                            value={current.nobleCards}
                            onChange={(e) => {
                              const val = Number(e.target.value);
                              setPlayerScores((prev) => ({
                                ...prev,
                                [pId]: { ...prev[pId], nobleCards: val },
                              }));
                            }}
                            className="flex-1 h-8 min-w-0 text-center font-mono font-black text-base text-purple-900 bg-purple-50 rounded-lg border border-purple-200 focus:border-purple-500 focus:ring-2 focus:ring-purple-400/30 focus:outline-none tabular-nums"
                          />

                          <button
                            type="button"
                            onClick={() => adjustNobles(pId, +1)}
                            className="w-7 h-8 bg-white text-neutral-700 rounded-lg flex items-center justify-center font-black active:scale-95 transition-transform hover:bg-neutral-100 border border-neutral-200/80 shadow-2xs"
                            title="Tăng 1 thẻ Quý tộc"
                            aria-label="Tăng 1 thẻ Quý tộc"
                          >
                            <Plus className="w-3 h-3" />
                          </button>
                        </div>
                      </div>

                      {/* ĐÁ QUÝ CÒN LẠI */}
                      <div className="flex flex-col gap-1.5 bg-neutral-50/50 p-2 rounded-xl border border-neutral-200">
                        <div className="flex items-center justify-between text-[11px] font-bold text-neutral-600">
                          <span className="flex items-center gap-1 truncate">
                            <Gem className="w-3 h-3 text-emerald-500 shrink-0" />
                            <span className="truncate">Đá quý</span>
                          </span>
                        </div>

                        <div className="flex items-center gap-1">
                          <button
                            type="button"
                            onClick={() => adjustGems(pId, -1)}
                            className="w-7 h-8 bg-white text-neutral-700 rounded-lg flex items-center justify-center font-black active:scale-95 transition-transform hover:bg-neutral-100 border border-neutral-200/80 shadow-2xs"
                            title="Giảm 1 đá quý"
                            aria-label="Giảm 1 đá quý"
                          >
                            <Minus className="w-3 h-3" />
                          </button>

                          <input
                            type="number"
                            min={0}
                            max={50}
                            data-testid="gems-remaining"
                            data-player-id={pId}
                            aria-label="Số đá quý còn lại"
                            value={current.gemsRemaining}
                            onChange={(e) => {
                              const val = Number(e.target.value);
                              setPlayerScores((prev) => ({
                                ...prev,
                                [pId]: { ...prev[pId], gemsRemaining: val },
                              }));
                            }}
                            className="flex-1 h-8 min-w-0 text-center font-mono font-black text-base text-emerald-900 bg-emerald-50 rounded-lg border border-emerald-200 focus:border-emerald-500 focus:ring-2 focus:ring-emerald-400/30 focus:outline-none tabular-nums"
                          />

                          <button
                            type="button"
                            onClick={() => adjustGems(pId, +1)}
                            className="w-7 h-8 bg-white text-neutral-700 rounded-lg flex items-center justify-center font-black active:scale-95 transition-transform hover:bg-neutral-100 border border-neutral-200/80 shadow-2xs"
                            title="Tăng 1 đá quý"
                            aria-label="Tăng 1 đá quý"
                          >
                            <Plus className="w-3 h-3" />
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
            <div className="flex flex-col gap-1.5">
              <label className="font-bold text-[11px] text-neutral-600 tracking-wide uppercase">
                Ghi chú ván đấu
                <span className="ml-1 normal-case font-medium text-neutral-400">
                  (tùy chọn)
                </span>
              </label>
              <Input
                placeholder="VD: Ván đấu kết thúc nhanh, chiến thuật gem xanh..."
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                className="h-9 text-xs rounded-xl border-neutral-200 bg-neutral-50/50 focus:bg-white"
              />
            </div>
          )}

          {/* Nút Xác nhận */}
          <div className="pt-4 border-t border-neutral-200 flex items-center justify-between gap-2 shrink-0">
            {onCancelMatch && !isEditMode ? (
              <Button
                type="button"
                variant="ghost"
                onClick={() => setShowCancelDialog(true)}
                data-testid="cancel-match"
                className="h-9 px-3 text-xs font-bold rounded-xl text-rose-600 hover:bg-rose-50 hover:text-rose-700 active:scale-[0.98] transition-transform"
              >
                <X className="w-3.5 h-3.5 mr-1" />
                Hủy ván đấu
              </Button>
            ) : (
              <span />
            )}

            <div className="flex items-center gap-2">
              <Button
                type="button"
                variant="outline"
                onClick={onClose}
                className="h-9 px-4 text-xs font-bold rounded-xl border-neutral-200 hover:bg-neutral-100"
              >
                Hủy
              </Button>
              <Button
                type="submit"
                disabled={isSubmitting}
                data-testid="submit-result"
                className="h-9 rounded-xl bg-primary px-5 text-xs font-bold text-primary-foreground shadow-xs hover:bg-primary/90 active:scale-[0.98] transition-transform tabular-nums"
              >
                {isSubmitting
                  ? "Đang lưu..."
                  : isEditMode
                    ? "Cập nhật kết quả"
                    : "Xác nhận kết quả"}
              </Button>
            </div>
          </div>
        </form>
      </div>

      {/* ====== HỦY VÁN ĐẤU — modal nhập lý do ====== */}
      {showCancelDialog && (
        <div
          data-testid="cancel-match-dialog"
          role="dialog"
          aria-modal="true"
          aria-labelledby="cancel-match-title"
          className="fixed inset-0 z-[60] flex items-center justify-center bg-neutral-950/70 backdrop-blur-sm p-4"
          onClick={() => !isCancelling && setShowCancelDialog(false)}
        >
          <div
            className="bg-white rounded-2xl border border-neutral-200 shadow-2xl w-full max-w-md p-5 flex flex-col gap-4 animate-in fade-in-50 zoom-in-95"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-start gap-3">
              <div className="w-9 h-9 rounded-xl bg-rose-100 text-rose-600 flex items-center justify-center shrink-0">
                <AlertCircle className="w-5 h-5" />
              </div>
              <div className="flex-1">
                <h3
                  id="cancel-match-title"
                  className="text-sm font-black text-neutral-900"
                >
                  Hủy ván đấu này?
                </h3>
                <p className="text-[11px] text-neutral-600 mt-0.5">
                  VĐV sẽ không được ghi điểm. Hành động này không thể hoàn tác.
                </p>
              </div>
            </div>

            <label className="flex flex-col gap-1.5">
              <span className="text-[11px] font-bold text-neutral-700">
                Lý do hủy <span className="text-rose-500">*</span>
              </span>
              <textarea
                data-testid="cancel-match-reason"
                value={cancelReason}
                onChange={(e) => setCancelReason(e.target.value)}
                disabled={isCancelling}
                rows={3}
                placeholder="VD: Bàn thiếu 1 VĐV, không tìm được người thay."
                className="w-full rounded-xl border border-neutral-200 bg-neutral-50 px-3 py-2 text-xs text-neutral-900 outline-none focus:border-rose-400 focus:ring-2 focus:ring-rose-200 resize-none disabled:opacity-60"
                autoFocus
              />
              <span className="text-[10px] text-neutral-500 font-bold">
                {cancelReason.trim().length}/5 ký tự tối thiểu
              </span>
            </label>

            <div className="flex items-center justify-end gap-2 pt-2 border-t border-neutral-200">
              <Button
                type="button"
                variant="outline"
                onClick={() => {
                  if (isCancelling) return;
                  setShowCancelDialog(false);
                  setCancelReason("");
                }}
                className="h-9 px-4 text-xs font-bold rounded-xl border-neutral-200"
              >
                Quay lại
              </Button>
              <Button
                type="button"
                onClick={handleConfirmCancel}
                disabled={isCancelling || cancelReason.trim().length < 5}
                data-testid="confirm-cancel-match"
                className="h-9 px-4 text-xs font-bold rounded-xl bg-rose-600 text-white hover:bg-rose-700 active:scale-[0.98] transition-transform disabled:opacity-50"
              >
                {isCancelling ? "Đang hủy..." : "Xác nhận hủy"}
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
