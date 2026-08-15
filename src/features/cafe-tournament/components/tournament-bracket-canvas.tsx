"use client";

import React, { useState } from "react";
import {
  TournamentMatch,
  TournamentPairingPreview,
  TournamentParticipant,
} from "../types/tournament.types";
import { Trophy, Crown, GripVertical, Swords, Sparkles } from "lucide-react";
import { Button } from "@/components/ui/button";

interface Props {
  matches: TournamentMatch[];
  participants?: TournamentParticipant[];
  pairingPreview?: TournamentPairingPreview | null;
  currentRound?: number;
  totalRounds?: number;
  onSelectMatch: (match: TournamentMatch) => void;
  onAdvancePlayer?: (
    matchId: string,
    player: { userId: string; userName: string },
  ) => void;
  onConfirmPairings?: () => void;
}

export function TournamentBracketCanvas({
  matches,
  participants = [],
  pairingPreview,
  currentRound = 1,
  totalRounds = 4,
  onSelectMatch,
  onAdvancePlayer,
  onConfirmPairings,
}: Props) {
  const [draggedPlayer, setDraggedPlayer] = useState<{
    userId: string;
    userName: string;
  } | null>(null);

  // Helper map ID sang tên & elo VĐV
  const getPlayerInfo = (userId: string) => {
    const p = participants.find(
      (item) => item.userId === userId || item.id === userId,
    );
    return {
      userId,
      name: p?.walkInDisplayName || p?.username || `VĐV #${userId.slice(0, 6)}`,
      elo: p?.currentElo || p?.initialElo || 1200,
      isWalkIn: p?.isWalkIn || false,
      avatarUrl: p?.avatarUrl || null,
    };
  };

  // Gom các ván đấu theo Round
  const roundMap: Record<number, TournamentMatch[]> = {};
  matches.forEach((m) => {
    const round = m.roundNumber || 1;
    if (!roundMap[round]) roundMap[round] = [];
    roundMap[round].push(m);
  });

  // Nếu matches chưa có nhưng có pairingPreview -> Convert preview pairings thành danh sách bàn hiển thị
  if (
    Object.keys(roundMap).length === 0 &&
    pairingPreview &&
    pairingPreview.pairings.length > 0
  ) {
    const previewRound = pairingPreview.roundNumber || currentRound || 1;
    roundMap[previewRound] = pairingPreview.pairings.map(
      (p): TournamentMatch => ({
        id: `preview-match-${p.matchNumber}`,
        tournamentId: pairingPreview.tournamentId,
        roundNumber: previewRound,
        tableNumber: p.matchNumber,
        status: "Scheduled" as TournamentMatch["status"], // 👈 Ép kiểu trực tiếp theo type của TournamentMatch
        results: p.playerIds.map((id) => {
          const info = getPlayerInfo(id);
          return {
            userId: id,
            userName: info.name,
            score: 0,
            cardsBought: 0,
          };
        }),
      }),
    );
  }

  const rounds = Object.keys(roundMap)
    .map(Number)
    .sort((a, b) => a - b);

  // Quán quân giải đấu
  const finalRoundNum = rounds.length > 0 ? rounds[rounds.length - 1] : 1;
  const finalMatch = (roundMap[finalRoundNum] || [])[0];
  const championResult = finalMatch?.results?.find(
    (r) => r.userId === finalMatch.winnerUserId,
  );
  const championName =
    championResult?.userName ||
    (finalMatch?.winnerUserId
      ? `Winner #${finalMatch.winnerUserId.slice(0, 6)}`
      : null);

  const handleDragStart = (
    e: React.DragEvent,
    player: { userId: string; userName: string },
  ) => {
    setDraggedPlayer(player);
    e.dataTransfer.setData("text/plain", JSON.stringify(player));
    e.dataTransfer.effectAllowed = "move";
  };

  const handleDrop = (e: React.DragEvent, targetMatchId: string) => {
    e.preventDefault();
    if (!draggedPlayer) return;

    if (onAdvancePlayer) {
      onAdvancePlayer(targetMatchId, draggedPlayer);
    }
    setDraggedPlayer(null);
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = "move";
  };

  return (
    <div className="w-full bg-[#f8f9fa] border border-neutral-200/80 rounded-3xl p-6 sm:p-10 shadow-sm relative overflow-x-auto min-h-160">
      {/* 1. Header Canvas */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-8 pb-4 border-b border-neutral-200">
        <div>
          <div className="flex items-center gap-2">
            <span className="text-xs font-bold font-mono uppercase tracking-widest text-emerald-600">
              • Sơ Đồ Bảng Ghép Cặp (Pairings & Bracket Canvas)
            </span>
            {pairingPreview && (
              <span className="px-2.5 py-0.5 bg-emerald-100 text-emerald-800 text-[10px] font-black uppercase rounded-md">
                {pairingPreview.source || "Auto Swiss"}
              </span>
            )}
          </div>
          <p className="text-xs text-neutral-500 mt-1">
            Bấm vào bàn đấu để nhập điểm chiến thắng • Kéo thả VĐV để điều chỉnh
            cặp đấu
          </p>
        </div>

        {/* Tiêu đề góc phải chuẩn theo ảnh mẫu */}
        <div className="flex items-center gap-3">
          <div className="text-right">
            <h2 className="text-2xl sm:text-3xl font-black uppercase tracking-tight text-neutral-950 leading-none">
              TOURNAMENT
            </h2>
            <h2 className="text-2xl sm:text-3xl font-black uppercase tracking-tight text-neutral-950 leading-none mt-1">
              PAIRINGS
            </h2>
          </div>
          <div className="w-3 h-12 bg-emerald-500 rounded-xs shrink-0" />
        </div>
      </div>

      {/* 2. Banner Preview Pairings nếu có */}
      {pairingPreview &&
        pairingPreview.pairings.length > 0 &&
        matches.length === 0 && (
          <div className="mb-8 p-4 bg-emerald-50 border border-emerald-200 rounded-2xl flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-emerald-600 text-white rounded-xl">
                <Swords className="w-5 h-5" />
              </div>
              <div>
                <h4 className="text-xs font-bold text-emerald-950">
                  Bảng chia cặp dự kiến cho Vòng #{pairingPreview.roundNumber} (
                  {pairingPreview.source})
                </h4>
                <p className="text-[11px] text-emerald-700">
                  {pairingPreview.pairings.length} bàn đấu đã được xếp tự động.
                  Hãy xác nhận để kích hoạt vòng đấu.
                </p>
              </div>
            </div>
            {onConfirmPairings && (
              <Button
                onClick={onConfirmPairings}
                className="h-8 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold rounded-xl px-4 shrink-0 shadow-2xs"
              >
                <Sparkles className="w-3.5 h-3.5 mr-1" />
                <span>Xác Nhận & Bắt Đầu Vòng</span>
              </Button>
            )}
          </div>
        )}

      {/* 3. Render Bracket & Bảng Ghép Cặp */}
      {rounds.length === 0 ? (
        <div className="text-center py-24 text-xs text-neutral-400 border border-dashed border-neutral-300 rounded-2xl bg-white">
          Chưa có bàn đấu nào. Hãy đảm bảo VĐV đã Check-in và bấm &quot;Xem
          Trước Ghép Cặp&quot; hoặc &quot;Bắt Đầu Giải&quot;.
        </div>
      ) : (
        <div className="flex items-start gap-8 sm:gap-12 min-w-max pb-8 pt-2">
          {rounds.map((roundNum, roundIdx) => {
            const roundMatches = roundMap[roundNum] || [];
            const isLastRound =
              roundIdx === rounds.length - 1 && roundNum === totalRounds;

            return (
              <React.Fragment key={roundNum}>
                <div className="flex flex-col justify-around gap-6 h-full w-72 sm:w-80">
                  <div className="text-center mb-1">
                    <span className="text-xs font-black uppercase tracking-wider text-neutral-600 bg-neutral-200/80 px-4 py-1 rounded-full">
                      {isLastRound ? "Chung Kết (Final)" : `Vòng #${roundNum}`}
                    </span>
                  </div>

                  <div className="flex flex-col justify-around gap-8 flex-1">
                    {roundMatches.map((m) => {
                      const isCompleted = m.status === "Completed";
                      const winnerId = m.winnerUserId;
                      const results = m.results || [];

                      return (
                        <div
                          key={m.id}
                          onDragOver={handleDragOver}
                          onDrop={(e) => handleDrop(e, m.id)}
                          className="flex items-center group relative"
                        >
                          {/* Khối Bàn Đấu */}
                          <div
                            onClick={() => onSelectMatch(m)}
                            className={`w-full p-3.5 rounded-2xl border shadow-2xs transition-all cursor-pointer space-y-2.5 ${
                              isCompleted
                                ? "bg-white border-emerald-300 ring-1 ring-emerald-400/30"
                                : "bg-neutral-100/90 hover:bg-white border-neutral-300"
                            }`}
                          >
                            <div className="flex justify-between items-center text-xs">
                              <span className="font-black text-neutral-950 flex items-center gap-1.5">
                                <div
                                  className={`w-2.5 h-2.5 rounded-full ${
                                    isCompleted
                                      ? "bg-emerald-500"
                                      : "bg-amber-500"
                                  }`}
                                />
                                BÀN #{m.tableNumber}
                              </span>
                              <span
                                className={`px-2 py-0.5 rounded-md text-[9px] font-black uppercase ${
                                  isCompleted
                                    ? "bg-emerald-100 text-emerald-800"
                                    : "bg-amber-100 text-amber-800"
                                }`}
                              >
                                {isCompleted ? "Đã Xong" : "Đang Đấu"}
                              </span>
                            </div>

                            {/* Danh sách người chơi trong bàn */}
                            <div className="space-y-1.5">
                              {results.map((p) => {
                                const isWinner = winnerId === p.userId;

                                return (
                                  <div
                                    key={p.userId}
                                    draggable
                                    onDragStart={(e) =>
                                      handleDragStart(e, {
                                        userId: p.userId,
                                        userName: p.userName || "VĐV",
                                      })
                                    }
                                    className={`flex items-center justify-between p-2 rounded-xl text-xs font-bold transition-all ${
                                      isWinner
                                        ? "bg-emerald-500 text-white font-black shadow-xs"
                                        : "bg-white border border-neutral-200 text-neutral-800"
                                    }`}
                                  >
                                    <div className="flex items-center gap-1.5 truncate">
                                      <GripVertical
                                        className={`w-3.5 h-3.5 opacity-0 group-hover:opacity-100 transition-opacity shrink-0 ${
                                          isWinner
                                            ? "text-emerald-200"
                                            : "text-neutral-400"
                                        }`}
                                      />
                                      {isWinner && (
                                        <Crown className="w-3.5 h-3.5 text-amber-300 shrink-0" />
                                      )}
                                      <span className="truncate">
                                        {p.userName ||
                                          `User #${p.userId.slice(0, 6)}`}
                                      </span>
                                    </div>

                                    <span
                                      className={`font-mono text-[11px] shrink-0 font-bold ${
                                        isWinner
                                          ? "text-emerald-100"
                                          : "text-neutral-500"
                                      }`}
                                    >
                                      {p.score || 0} pts
                                    </span>
                                  </div>
                                );
                              })}
                            </div>

                            <div className="text-right text-[10px] font-bold text-neutral-400 group-hover:text-emerald-700 transition-colors">
                              {isCompleted
                                ? "Sửa điểm →"
                                : "Ghi nhận kết quả →"}
                            </div>
                          </div>

                          {/* Càng nối góc vuông */}
                          <div className="flex items-center pl-3">
                            <div className="w-4 h-16 border-r-2 border-t-2 border-b-2 border-neutral-900" />
                            <div className="w-2.5 h-8 bg-emerald-500 rounded-xs shrink-0" />
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              </React.Fragment>
            );
          })}

          {/* Cột Quán Quân */}
          <div className="flex flex-col items-center justify-center pl-6 space-y-6">
            <div className="text-center">
              <span className="text-xs font-black uppercase tracking-wider text-amber-800 bg-amber-100 border border-amber-300 px-4 py-1 rounded-full">
                Quán Quân Giải Đấu
              </span>
            </div>

            <div className="flex items-center shadow-md">
              <div className="w-3.5 h-12 bg-emerald-500 rounded-xs shrink-0" />
              <div className="w-56 sm:w-64 h-12 bg-neutral-200 border border-neutral-300 flex items-center justify-center px-4">
                <span className="text-sm font-black uppercase tracking-wider text-neutral-950 truncate">
                  {championName || "ĐANG XÁC ĐỊNH"}
                </span>
              </div>
            </div>

            <div className="pt-2 flex flex-col items-center">
              <div className="w-24 h-24 bg-white text-neutral-950 rounded-2xl flex items-center justify-center border-2 border-neutral-950 shadow-md relative">
                <Trophy className="w-12 h-12 text-neutral-950 stroke-[2.2]" />
                {championName && (
                  <Crown className="w-7 h-7 text-amber-500 absolute -top-4 -right-2 transform rotate-12 fill-amber-400" />
                )}
              </div>
              <div className="w-16 h-3 bg-neutral-950 rounded-xs mt-2" />
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
