"use client";

import React from "react";
import {
  TournamentMatch,
  TournamentParticipant,
} from "../types/tournament.types";
import { Trophy, Crown, Edit3 } from "lucide-react";

interface Props {
  matches: TournamentMatch[];
  participants?: TournamentParticipant[];
  onSelectMatch: (match: TournamentMatch) => void;
}

export function TournamentBracketView({
  matches,
  participants = [],
  onSelectMatch,
}: Props) {
  // Nhóm các trận đấu theo từng Round (Vòng 1, Vòng 2 / Bán kết, Vòng 3 / Chung kết)
  const roundMap: Record<number, TournamentMatch[]> = {};
  matches.forEach((m) => {
    const round = m.roundNumber || 1;
    if (!roundMap[round]) roundMap[round] = [];
    roundMap[round].push(m);
  });

  const rounds = Object.keys(roundMap)
    .map(Number)
    .sort((a, b) => a - b);

  // Tìm trận chung kết và người vô địch
  const finalRoundNumber = rounds.length > 0 ? rounds[rounds.length - 1] : 1;
  const finalMatches = roundMap[finalRoundNumber] || [];
  const finalMatch = finalMatches[0];
  const championResult = finalMatch?.results?.find(
    (r) => r.userId === finalMatch.winnerUserId,
  );
  const championName =
    championResult?.userName ||
    (finalMatch?.winnerUserId
      ? `Winner #${finalMatch.winnerUserId.slice(0, 6)}`
      : null);

  return (
    <div className="bg-[#fcfcfd] border border-neutral-200/80 rounded-3xl p-6 sm:p-10 shadow-sm relative overflow-hidden">
      {/* 1. Header phong cách chuẩn theo ảnh mẫu */}
      <div className="flex justify-between items-start mb-8 pb-4 border-b border-neutral-100">
        <div>
          <span className="text-xs font-bold font-mono uppercase tracking-widest text-neutral-400">
            Trực quan hóa vòng đấu
          </span>
          <p className="text-xs text-neutral-500 mt-0.5">
            Bấm vào cặp đấu bất kỳ để ghi nhận hoặc chỉnh sửa điểm số
          </p>
        </div>

        {/* TIÊU ĐỀ TOURNAMENT BRACKET CÓ THANH XANH */}
        <div className="flex items-center gap-2.5">
          <div className="text-right">
            <h2 className="text-2xl sm:text-3xl font-black uppercase tracking-tight text-neutral-950 leading-none">
              Tournament
            </h2>
            <h2 className="text-2xl sm:text-3xl font-black uppercase tracking-tight text-neutral-950 leading-none mt-1">
              Bracket
            </h2>
          </div>
          <div className="w-2.5 h-12 bg-emerald-500 rounded-xs shrink-0" />
        </div>
      </div>

      {/* 2. Sơ đồ nhánh đấu Bracket */}
      {matches.length === 0 ? (
        <div className="text-center py-20 text-xs text-neutral-400 border border-dashed border-neutral-200 rounded-2xl">
          Chưa có nhánh đấu nào được tạo. Vui lòng bấm &quot;Bắt Đầu Giải&quot;
          để sinh cặp đấu.
        </div>
      ) : (
        <div className="overflow-x-auto pb-6 pt-2 scrollbar-thin">
          <div className="flex items-center gap-4 sm:gap-6 min-w-max">
            {/* CÁC CỘT ROUND */}
            {rounds.map((roundNum, roundIdx) => {
              const roundMatches = roundMap[roundNum] || [];
              const isLastRound = roundIdx === rounds.length - 1;

              return (
                <React.Fragment key={roundNum}>
                  {/* Cột trận đấu của 1 Round */}
                  <div className="flex flex-col justify-around gap-8 h-full py-4">
                    <div className="text-center mb-1">
                      <span className="text-[11px] font-black uppercase tracking-wider text-neutral-500 bg-neutral-100 px-3 py-1 rounded-full">
                        {isLastRound ? "Chung Kết" : `Vòng #${roundNum}`}
                      </span>
                    </div>

                    <div className="flex flex-col justify-around gap-12 flex-1">
                      {roundMatches.map((m) => {
                        const isCompleted = m.status === "Completed";
                        const winnerId = m.winnerUserId;

                        // Lấy 2 người chơi đại diện của trận
                        const player1 = m.results?.[0];
                        const player2 = m.results?.[1];

                        return (
                          <div
                            key={m.id}
                            onClick={() => onSelectMatch(m)}
                            className="group cursor-pointer transition-all flex items-center"
                          >
                            {/* Card cặp đấu */}
                            <div className="space-y-2 w-52 sm:w-60">
                              {/* Người chơi 1 */}
                              <div
                                className={`flex items-center h-10 rounded-sm border shadow-2xs transition-all overflow-hidden ${
                                  winnerId &&
                                  player1 &&
                                  winnerId === player1.userId
                                    ? "bg-emerald-50 border-emerald-400 text-emerald-950 font-black"
                                    : "bg-neutral-200/85 border-neutral-300/80 text-neutral-800 font-bold"
                                }`}
                              >
                                <div
                                  className={`w-3 h-full shrink-0 ${
                                    winnerId &&
                                    player1 &&
                                    winnerId === player1.userId
                                      ? "bg-emerald-500"
                                      : "bg-neutral-900"
                                  }`}
                                />
                                <div className="px-3 flex-1 flex justify-between items-center text-xs truncate">
                                  <span className="truncate">
                                    {player1?.userName || `VĐV 1`}
                                  </span>
                                  {player1 && (
                                    <span className="font-mono text-[11px] opacity-75">
                                      {player1.score}p
                                    </span>
                                  )}
                                </div>
                              </div>

                              {/* Người chơi 2 */}
                              <div
                                className={`flex items-center h-10 rounded-sm border shadow-2xs transition-all overflow-hidden ${
                                  winnerId &&
                                  player2 &&
                                  winnerId === player2.userId
                                    ? "bg-emerald-50 border-emerald-400 text-emerald-950 font-black"
                                    : "bg-neutral-200/85 border-neutral-300/80 text-neutral-800 font-bold"
                                }`}
                              >
                                <div
                                  className={`w-3 h-full shrink-0 ${
                                    winnerId &&
                                    player2 &&
                                    winnerId === player2.userId
                                      ? "bg-emerald-500"
                                      : "bg-neutral-900"
                                  }`}
                                />
                                <div className="px-3 flex-1 flex justify-between items-center text-xs truncate">
                                  <span className="truncate">
                                    {player2?.userName || `VĐV 2`}
                                  </span>
                                  {player2 && (
                                    <span className="font-mono text-[11px] opacity-75">
                                      {player2.score}p
                                    </span>
                                  )}
                                </div>
                              </div>
                            </div>

                            {/* Càng nối góc vuông Bracket + Vạch Xanh Neon chuyển tiếp */}
                            <div className="flex items-center pl-2">
                              {/* Khung rẽ nhánh (Bracket Fork) */}
                              <div className="w-4 h-16 border-r-2 border-t-2 border-b-2 border-neutral-900" />
                              {/* Vạch xanh lá neon chuyển tiếp người thắng */}
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

            {/* CỘT GRAND CHAMPION (NGƯỜI VÔ ĐỊCH & CÚP) */}
            <div className="flex flex-col items-center justify-center pl-4 space-y-6">
              <div className="text-center">
                <span className="text-[11px] font-black uppercase tracking-wider text-amber-700 bg-amber-100 px-3 py-1 rounded-full">
                  Quán Quân
                </span>
              </div>

              {/* Box Champion theo style ảnh mẫu */}
              <div className="flex items-center">
                <div className="w-2.5 h-8 bg-emerald-500 rounded-xs shrink-0" />
                <div className="w-52 sm:w-60 h-11 bg-neutral-200/90 border border-neutral-300 rounded-xs flex items-center justify-center px-4 shadow-sm">
                  <span className="text-sm font-black uppercase tracking-wider text-neutral-950 truncate">
                    {championName || "ĐANG XÁC ĐỊNH"}
                  </span>
                </div>
              </div>

              {/* Biểu tượng Cúp Vô Địch */}
              <div className="pt-2 flex flex-col items-center">
                <div className="w-20 h-20 bg-amber-50 text-neutral-950 rounded-2xl flex items-center justify-center border-2 border-neutral-900 shadow-sm relative">
                  <Trophy className="w-10 h-10 text-neutral-950 stroke-[2.2]" />
                  {championName && (
                    <Crown className="w-6 h-6 text-amber-500 absolute -top-3.5 -right-2 transform rotate-12 fill-amber-400" />
                  )}
                </div>
                <div className="w-12 h-2.5 bg-neutral-900 rounded-xs mt-1.5" />
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
