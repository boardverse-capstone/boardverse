"use client";

import React from "react";
import { TournamentParticipant } from "../types/tournament.types";
import { Button } from "@/components/ui/button";
import { Trophy, Medal, Award, X, Sparkles } from "lucide-react";

interface Props {
  isOpen: boolean;
  onClose: () => void;
  tournamentTitle: string;
  participants: TournamentParticipant[];
}

interface RankedGroup {
  rank: number;
  swissScore: number;
  players: TournamentParticipant[];
}

export function TournamentPodiumModal({
  isOpen,
  onClose,
  tournamentTitle,
  participants,
}: Props) {
  if (!isOpen) return null;

  // 1. Lọc bỏ người chơi có 0 điểm Swiss hoặc không có điểm
  const activeScorers = participants.filter(
    (p) =>
      (p.swissScore ?? 0) > 0 &&
      p.status !== "Eliminated" &&
      (p.status as string) !== "Kicked",
  );

  // 2. Nhóm người chơi theo điểm Swiss và lấy Top 3 bậc điểm cao nhất
  const uniqueScores = Array.from(
    new Set(activeScorers.map((p) => p.swissScore ?? 0)),
  ).sort((a, b) => b - a);

  const top3Tiers = uniqueScores.slice(0, 3);

  const rankedGroups: RankedGroup[] = top3Tiers.map((score, idx) => ({
    rank: idx + 1,
    swissScore: score,
    players: activeScorers.filter((p) => (p.swissScore ?? 0) === score),
  }));

  const getTierVisuals = (rank: number) => {
    switch (rank) {
      case 1:
        return {
          title: "QUÁN QUÂN",
          badgeBg: "bg-amber-500",
          cardBg: "bg-amber-500/10 border-amber-300",
          textColor: "text-amber-900",
          icon: <Trophy className="w-7 h-7 text-amber-500" />,
        };
      case 2:
        return {
          title: "Á QUÂN",
          badgeBg: "bg-slate-400",
          cardBg: "bg-slate-500/10 border-slate-300",
          textColor: "text-slate-900",
          icon: <Medal className="w-7 h-7 text-slate-400" />,
        };
      case 3:
        return {
          title: "QUÝ QUÂN",
          badgeBg: "bg-amber-700",
          cardBg: "bg-amber-700/10 border-amber-600/30",
          textColor: "text-amber-950",
          icon: <Award className="w-7 h-7 text-amber-700" />,
        };
      default:
        return {
          title: `HẠNG #${rank}`,
          badgeBg: "bg-neutral-800",
          cardBg: "bg-neutral-100 border-neutral-200",
          textColor: "text-neutral-900",
          icon: <Award className="w-7 h-7 text-neutral-500" />,
        };
    }
  };

  return (
    <div className="fixed inset-0 bg-neutral-950/70 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <div className="bg-white border border-neutral-200 rounded-3xl max-w-4xl w-full p-6 space-y-6 shadow-2xl animate-in fade-in-50 zoom-in-95 max-h-[92vh] flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between border-b pb-4 shrink-0">
          <div className="flex items-center gap-3">
            <div className="p-3 bg-amber-500 text-white rounded-2xl shadow-xs">
              <Trophy className="w-6 h-6" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="font-black text-lg text-neutral-950">
                  Bảng Vinh Danh • Top Tuyển Thủ Xuất Sắc
                </h3>
                <span className="px-2 py-0.5 rounded-full text-[10px] font-black uppercase bg-emerald-100 text-emerald-800 border border-emerald-300">
                  Hoàn thành
                </span>
              </div>
              <p className="text-xs text-neutral-500 font-medium">
                {tournamentTitle}
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

        {/* Podium Area */}
        <div className="flex-1 overflow-y-auto space-y-4 pr-1 scrollbar-thin">
          {rankedGroups.length === 0 ? (
            <div className="text-center py-16 border border-dashed rounded-3xl text-neutral-400 text-xs font-medium space-y-2">
              <Sparkles className="w-8 h-8 mx-auto text-neutral-300" />
              <p>
                Chưa có tuyển thủ nào tích lũy điểm Swiss dương trong giải đấu
                này.
              </p>
            </div>
          ) : (
            rankedGroups.map((group) => {
              const visuals = getTierVisuals(group.rank);

              return (
                <div
                  key={group.rank}
                  className={`p-4 rounded-3xl border ${visuals.cardBg} space-y-3 shadow-2xs`}
                >
                  {/* Tier Title */}
                  <div className="flex items-center justify-between border-b border-black/5 pb-2">
                    <div className="flex items-center gap-2">
                      {visuals.icon}
                      <div>
                        <span className="font-black text-sm tracking-wide text-neutral-950">
                          {visuals.title}
                        </span>
                        {group.players.length > 1 && (
                          <span className="ml-2 text-[10px] font-bold text-neutral-500 uppercase tracking-wider bg-white/80 px-2 py-0.5 rounded-full border">
                            Đồng hạng ({group.players.length} VĐV)
                          </span>
                        )}
                      </div>
                    </div>

                    <span className="text-xs font-black font-mono px-3 py-1 bg-white rounded-xl border text-neutral-900 shadow-2xs">
                      {group.swissScore} Điểm Swiss
                    </span>
                  </div>

                  {/* Danh sách người chơi cùng thứ hạng - Bố trí ngang hàng */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3">
                    {group.players.map((p) => {
                      const displayName =
                        p.walkInDisplayName || p.username || "VĐV";

                      return (
                        <div
                          key={p.id}
                          className="bg-white p-3.5 rounded-2xl border border-neutral-200/80 shadow-2xs flex items-center gap-3"
                        >
                          <div
                            className={`w-10 h-10 rounded-2xl ${visuals.badgeBg} text-white flex items-center justify-center font-black text-sm shrink-0 shadow-2xs`}
                          >
                            {displayName.charAt(0).toUpperCase()}
                          </div>

                          <div className="min-w-0 flex-1">
                            <h4 className="font-black text-xs text-neutral-950 truncate">
                              {displayName}
                            </h4>
                            <div className="text-[10px] font-mono text-neutral-400 mt-0.5">
                              Elo: {p.currentElo || p.initialElo || 1200}
                              {p.isWalkIn && " • Walk-in"}
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              );
            })
          )}
        </div>

        {/* Footer */}
        <div className="pt-3 border-t border-neutral-100 flex items-center justify-end shrink-0">
          <Button
            type="button"
            onClick={onClose}
            className="h-9 px-6 bg-neutral-950 hover:bg-neutral-800 text-white text-xs font-bold rounded-xl shadow-xs"
          >
            Đóng Bảng Tổng Sắp
          </Button>
        </div>
      </div>
    </div>
  );
}
