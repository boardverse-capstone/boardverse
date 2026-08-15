"use client";

import React from "react";
import { Button } from "@/components/ui/button";
import { X, Swords, AlertTriangle, Sparkles, Loader2 } from "lucide-react";
import {
  TournamentPairingPreview,
  TournamentParticipant,
} from "../types/tournament.types";

interface Props {
  isOpen: boolean;
  onClose: () => void;
  previewData: TournamentPairingPreview | null;
  loading: boolean;
  participants?: TournamentParticipant[];
  onConfirmStart?: () => void;
}

export function TournamentPairingPreviewModal({
  isOpen,
  onClose,
  previewData,
  loading,
  participants = [],
  onConfirmStart,
}: Props) {
  if (!isOpen) return null;

  // Helper map ID người chơi sang Tên & Avatar
  const getPlayerInfo = (userId: string) => {
    const p = participants.find(
      (item) => item.userId === userId || item.id === userId,
    );
    return {
      name: p?.walkInDisplayName || p?.username || `VĐV #${userId.slice(0, 6)}`,
      elo: p?.currentElo || p?.initialElo || 1200,
      isWalkIn: p?.isWalkIn || false,
    };
  };

  return (
    <div className="fixed inset-0 bg-neutral-950/50 backdrop-blur-xs z-50 flex items-center justify-center p-4">
      <div className="bg-white border border-neutral-200 rounded-3xl max-w-2xl w-full p-6 space-y-5 shadow-2xl animate-in fade-in-50 zoom-in-95 duration-150 max-h-[90vh] flex flex-col">
        {/* Header Modal */}
        <div className="flex items-center justify-between border-b border-neutral-100 pb-4 shrink-0">
          <div className="flex items-center gap-3">
            <div className="p-2.5 bg-emerald-50 text-emerald-700 border border-emerald-200 rounded-2xl">
              <Swords className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="font-black text-base text-neutral-950">
                  Xem Trước Bảng Ghép Cặp (Pairings Preview)
                </h3>
                {previewData && (
                  <span className="px-2 py-0.5 bg-emerald-100 text-emerald-800 text-[10px] font-bold rounded-full">
                    {previewData.source}
                  </span>
                )}
              </div>
              <p className="text-xs text-neutral-500">
                Vòng đấu: <strong>#{previewData?.roundNumber || 1}</strong> •
                Thuật toán ghép cặp Swiss
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="text-neutral-400 p-1.5 rounded-xl hover:bg-neutral-100 hover:text-neutral-900 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Nội dung danh sách bàn ghép cặp */}
        <div className="flex-1 overflow-y-auto space-y-4 pr-1 scrollbar-thin">
          {loading ? (
            <div className="flex flex-col items-center justify-center py-20 text-neutral-400 space-y-2">
              <Loader2 className="w-6 h-6 animate-spin text-emerald-600" />
              <span className="text-xs font-medium">
                Đang tính toán ghép cặp tự động...
              </span>
            </div>
          ) : previewData && previewData.pairings.length > 0 ? (
            <>
              {/* Warnings nếu có */}
              {previewData.warnings && previewData.warnings.length > 0 && (
                <div className="p-3 bg-amber-50 border border-amber-200 rounded-2xl text-xs text-amber-800 space-y-1">
                  <div className="flex items-center gap-1.5 font-bold">
                    <AlertTriangle className="w-4 h-4 text-amber-600" />
                    <span>Lưu ý ghép cặp:</span>
                  </div>
                  {previewData.warnings.map((w, i) => (
                    <p key={i} className="text-[11px] pl-5">
                      • {w}
                    </p>
                  ))}
                </div>
              )}

              {/* Danh sách từng Bàn (Match) */}
              <div className="space-y-3">
                {previewData.pairings.map((m) => (
                  <div
                    key={m.matchNumber}
                    className="p-4 bg-neutral-50/80 border border-neutral-200/80 rounded-2xl space-y-2.5"
                  >
                    <div className="flex justify-between items-center text-xs">
                      <span className="font-black text-neutral-900 flex items-center gap-1.5">
                        <span className="w-2 h-2 rounded-full bg-emerald-500" />
                        BÀN #{m.matchNumber}
                      </span>
                      <span className="text-neutral-500 font-mono text-[11px]">
                        {m.playerIds.length} người chơi
                      </span>
                    </div>

                    {/* Danh sách người chơi trong bàn */}
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                      {m.playerIds.map((playerId, idx) => {
                        const info = getPlayerInfo(playerId);
                        return (
                          <div
                            key={playerId}
                            className="flex items-center justify-between p-2.5 bg-white border border-neutral-200 rounded-xl shadow-2xs"
                          >
                            <div className="flex items-center gap-2 truncate">
                              <div className="w-6 h-6 rounded-lg bg-neutral-100 border border-neutral-200 text-neutral-700 font-black text-[10px] flex items-center justify-center shrink-0">
                                {idx + 1}
                              </div>
                              <span className="text-xs font-bold text-neutral-900 truncate">
                                {info.name}
                              </span>
                              {info.isWalkIn && (
                                <span className="px-1.5 py-0.2 bg-amber-100 text-amber-800 text-[9px] font-bold rounded">
                                  Walk-in
                                </span>
                              )}
                            </div>
                            <span className="text-[10px] font-mono text-neutral-400 font-bold shrink-0">
                              Elo: {info.elo}
                            </span>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                ))}
              </div>
            </>
          ) : (
            <div className="text-center py-20 text-xs text-neutral-400 border border-dashed border-neutral-200 rounded-2xl">
              Không có dữ liệu ghép cặp cho vòng đấu này.
            </div>
          )}
        </div>

        {/* Footer Actions */}
        <div className="pt-3 border-t border-neutral-100 flex items-center justify-end gap-2.5 shrink-0">
          <Button
            type="button"
            variant="outline"
            onClick={onClose}
            className="h-9 text-xs rounded-xl border-neutral-200 font-bold"
          >
            Đóng
          </Button>
          {onConfirmStart && (
            <Button
              type="button"
              onClick={() => {
                onClose();
                onConfirmStart();
              }}
              className="h-9 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold rounded-xl px-4 shadow-2xs flex items-center gap-1.5"
            >
              <Sparkles className="w-3.5 h-3.5" />
              <span>Chấp Nhận & Bắt Đầu Vòng</span>
            </Button>
          )}
        </div>
      </div>
    </div>
  );
}
