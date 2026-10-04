"use client";

import React from "react";
import { TournamentParticipant } from "../types/tournament.types";
import { Trophy, Medal, Award, X, Sparkles } from "lucide-react";
import {
  backdropCloseHandler,
  useDismissOnBackdrop,
} from "../lib/use-dismiss-on-backdrop";

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

const TIER_VISUALS: Record<
  number,
  { title: string; accent: string; icon: React.ReactNode }
> = {
  1: {
    title: "Quán quân",
    accent: "bg-amber-500 text-amber-50 border-amber-400",
    icon: <Trophy className="h-3.5 w-3.5" />,
  },
  2: {
    title: "Á quân",
    accent: "bg-slate-400 text-slate-50 border-slate-300",
    icon: <Medal className="h-3.5 w-3.5" />,
  },
  3: {
    title: "Quý quân",
    accent: "bg-amber-700 text-amber-50 border-amber-600",
    icon: <Award className="h-3.5 w-3.5" />,
  },
};

const TIER_TINT: Record<number, string> = {
  1: "bg-amber-50/60 border-amber-200/60",
  2: "bg-slate-50/60 border-slate-200/60",
  3: "bg-orange-50/60 border-orange-200/60",
};

export function TournamentPodiumModal({
  isOpen,
  onClose,
  tournamentTitle,
  participants,
}: Props) {
  useDismissOnBackdrop(isOpen, onClose);
  if (!isOpen) return null;

  // Gom VĐV theo điểm Swiss, lấy Top 3 bậc điểm cao nhất
  const activeScorers = participants.filter(
    (p) =>
      (p.swissScore ?? 0) > 0 &&
      p.status !== "Eliminated" &&
      (p.status as string) !== "Kicked",
  );
  const uniqueScores = Array.from(
    new Set(activeScorers.map((p) => p.swissScore ?? 0)),
  )
    .sort((a, b) => b - a)
    .slice(0, 3);

  const rankedGroups: RankedGroup[] = uniqueScores.map((score, idx) => ({
    rank: idx + 1,
    swissScore: score,
    players: activeScorers.filter((p) => (p.swissScore ?? 0) === score),
  }));

  return (
    <div
      className="fixed inset-0 bg-neutral-950/70 backdrop-blur-sm z-50 flex items-center justify-center p-4"
      onClick={backdropCloseHandler(onClose)}
    >
      <div
        className="bg-white border border-neutral-200 rounded-2xl max-w-2xl w-full shadow-2xl animate-in fade-in-50 zoom-in-95"
        onClick={(event) => event.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-3 border-b border-neutral-100">
          <div className="flex items-center gap-2.5 min-w-0">
            <Trophy className="h-5 w-5 text-amber-500 shrink-0" />
            <h3 className="font-black text-sm text-neutral-950 truncate">
              Vinh danh · {tournamentTitle}
            </h3>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1 text-neutral-400 hover:text-neutral-800 rounded-lg"
            aria-label="Đóng"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        {/* Body */}
        <div className="px-5 py-4 max-h-[70vh] overflow-y-auto scrollbar-thin">
          {rankedGroups.length === 0 ? (
            <div className="flex flex-col items-center gap-1.5 text-center py-10 text-neutral-400 text-xs font-medium">
              <Sparkles className="h-6 w-6 text-neutral-300" />
              <p>Chưa có tuyển thủ tích lũy điểm Swiss dương.</p>
            </div>
          ) : (
            <div className="flex flex-col gap-2.5">
              {rankedGroups.map((group) => {
                const visual = TIER_VISUALS[group.rank] ?? {
                  title: `Hạng #${group.rank}`,
                  accent: "bg-neutral-800 text-white border-neutral-700",
                  icon: <Award className="h-3.5 w-3.5" />,
                };
                const tint = TIER_TINT[group.rank] ?? "bg-neutral-50 border-neutral-200";
                return (
                  <div
                    key={group.rank}
                    className={`rounded-xl border ${tint} p-3`}
                  >
                    {/* Tier header */}
                    <div className="flex items-center justify-between mb-2">
                      <span
                        className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full border text-[10px] font-black uppercase tracking-wider ${visual.accent}`}
                      >
                        {visual.icon}
                        {visual.title}
                        {group.players.length > 1 && (
                          <span className="ml-1 opacity-80">
                            ×{group.players.length}
                          </span>
                        )}
                      </span>
                    </div>

                    {/* Players — compact 1-row list */}
                    <ul className="flex flex-col divide-y divide-neutral-200/60 bg-white rounded-lg border border-neutral-200/60 overflow-hidden">
                      {group.players.map((p) => {
                        const name = p.walkInDisplayName || p.username || "VĐV";
                        const baseElo = p.initialElo ?? 1200;
                        const delta = p.eloDelta ?? 0;
                        const deltaColor =
                          delta > 0
                            ? "text-emerald-700"
                            : delta < 0
                              ? "text-rose-700"
                              : "text-neutral-400";
                        return (
                          <li
                            key={p.id}
                            className="flex items-center gap-2.5 px-3 py-2"
                          >
                            <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-neutral-100 text-[11px] font-black text-neutral-700">
                              {name.charAt(0).toUpperCase()}
                            </span>
                            <span className="flex-1 min-w-0 text-xs font-semibold text-neutral-900 truncate">
                              {name}
                              {p.isWalkIn && (
                                <span className="ml-1.5 text-[9px] font-bold uppercase text-neutral-400">
                                  Walk-in
                                </span>
                              )}
                            </span>
                            <span className="font-mono text-[11px] text-neutral-500 tabular-nums">
                              {baseElo}
                            </span>
                            <span
                              className={`font-mono text-[11px] font-bold tabular-nums ${deltaColor}`}
                            >
                              {delta > 0 ? "+" : ""}
                              {delta}
                            </span>
                          </li>
                        );
                      })}
                    </ul>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
