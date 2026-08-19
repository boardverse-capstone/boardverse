/* eslint-disable @typescript-eslint/no-explicit-any */
"use client";

import React, { useState, useEffect, useCallback } from "react";
import { apiClient } from "@/core/api/client";
import { toast } from "sonner";
import { RoundPairingPreviewResponse } from "../types/tournament.types";
import { Button } from "@/components/ui/button";
import {
  X,
  Swords,
  RefreshCw,
  RotateCcw,
  Users,
  GripVertical,
  MoveRight,
  Sparkles,
  ToggleLeft,
  ToggleRight,
} from "lucide-react";

interface Props {
  isOpen: boolean;
  onClose: () => void;
  tournamentId: string;
  roundNumber?: number;
  onPairingSaved?: () => void;
}

interface StudioPlayer {
  userId: string;
  userName: string;
  currentElo?: number;
  swissScore?: number;
}

interface StudioTable {
  matchNumber: number;
  tableName?: string;
  players: StudioPlayer[];
}

export function TournamentPairingStudioModal({
  isOpen,
  onClose,
  tournamentId,
  roundNumber = 1,
  onPairingSaved,
}: Props) {
  const [loading, setLoading] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);

  // Pairing Mode: "Auto" hoặc "Manual"
  const [isManualMode, setIsManualMode] = useState(false);
  const [previewData, setPreviewData] =
    useState<RoundPairingPreviewResponse | null>(null);
  const [tables, setTables] = useState<StudioTable[]>([]);
  const [participants, setParticipants] = useState<any[]>([]);

  // State hỗ trợ Click-to-Swap (Màn cảm ứng POS)
  const [selectedPlayer, setSelectedPlayer] = useState<{
    tableIndex: number;
    playerIndex: number;
    player: StudioPlayer;
  } | null>(null);

  // State Drag & Drop
  const [draggedItem, setDraggedItem] = useState<{
    tableIndex: number;
    playerIndex: number;
  } | null>(null);
  const [dragOverTableIndex, setDragOverTableIndex] = useState<number | null>(
    null,
  );

  // Helper parse dữ liệu bàn đấu từ Preview API
  const parseTablesWithParticipants = (
    rawTables: any[],
    participantList: any[],
  ): StudioTable[] => {
    return rawTables.map((t: any, idx: number) => {
      const matchNumber = t.matchNumber || t.tableNumber || idx + 1;
      const tableName = t.tableName || `Bàn #${matchNumber}`;
      let parsedPlayers: StudioPlayer[] = [];

      if (Array.isArray(t.playerIds) && t.playerIds.length > 0) {
        parsedPlayers = t.playerIds.map((pId: string) => {
          const found = participantList.find(
            (part) => part.userId === pId || part.id === pId,
          );
          return {
            userId: pId,
            userName:
              found?.walkInDisplayName ||
              found?.username ||
              `VĐV #${pId?.slice(0, 4)}`,
            currentElo: found?.currentElo ?? found?.initialElo ?? 1200,
            swissScore: found?.swissScore ?? 0,
          };
        });
      } else if (Array.isArray(t.players) && t.players.length > 0) {
        parsedPlayers = t.players.map((p: any) => {
          const pId = p.userId || p.id;
          const found = participantList.find(
            (part) => part.userId === pId || part.id === pId,
          );
          return {
            userId: pId,
            userName:
              p.userName ||
              p.username ||
              found?.walkInDisplayName ||
              found?.username ||
              `VĐV #${pId?.slice(0, 4)}`,
            currentElo: p.currentElo ?? found?.currentElo ?? 1200,
            swissScore: p.swissScore ?? found?.swissScore ?? 0,
          };
        });
      } else {
        const slotIndices = [1, 2, 3, 4] as const;
        parsedPlayers = slotIndices
          .map((slot) => {
            const pId = t[`player${slot}Id`];
            if (!pId) return null;
            const found = participantList.find(
              (part) => part.userId === pId || part.id === pId,
            );
            return {
              userId: pId,
              userName:
                found?.walkInDisplayName ||
                found?.username ||
                `VĐV #${pId?.slice(0, 4)}`,
              currentElo: found?.currentElo ?? found?.initialElo ?? 1200,
              swissScore: found?.swissScore ?? 0,
            };
          })
          .filter(Boolean) as StudioPlayer[];
      }

      return {
        matchNumber,
        tableName,
        players: parsedPlayers,
      };
    });
  };

  // 1. GET /pairings/{roundNumber}/preview: Tải Preview Pairings
  const refreshPreview = useCallback(async () => {
    if (!tournamentId) return;
    try {
      setLoading(true);
      const [pairingRes, partRes]: [any, any] = await Promise.all([
        apiClient.get(
          `/api/v1/pos/tournaments/${tournamentId}/pairings/${roundNumber}/preview`,
        ),
        apiClient
          .get(`/api/v1/pos/tournaments/${tournamentId}/participants`)
          .catch(() => ({ data: [] })),
      ]);

      const pairingData = pairingRes?.data || pairingRes || {};
      const participantList = partRes?.data || partRes || [];

      setPreviewData(pairingData);
      setParticipants(participantList);

      // Cập nhật trạng thái mode hiện tại từ Backend
      const isManual =
        pairingData?.isManualOverride ||
        pairingData?.pairingMode === "Manual" ||
        pairingData?.source?.includes("Manual") ||
        false;
      setIsManualMode(isManual);

      const rawTables =
        pairingData.tables ||
        pairingData.pairings ||
        (Array.isArray(pairingData) ? pairingData : []);

      const formattedTables = parseTablesWithParticipants(
        rawTables,
        participantList,
      );
      setTables(formattedTables);
      setSelectedPlayer(null);
      setDraggedItem(null);
    } catch (err: unknown) {
      const error = err as { message?: string };
      toast.error(error?.message || "Không thể tải bản xem trước bảng cặp.");
    } finally {
      setLoading(false);
    }
  }, [tournamentId, roundNumber]);

  useEffect(() => {
    if (!isOpen || !tournamentId) return;
    let isMounted = true;

    const loadData = async () => {
      if (isMounted) await refreshPreview();
    };

    void loadData();

    return () => {
      isMounted = false;
    };
  }, [isOpen, tournamentId, roundNumber, refreshPreview]);

  if (!isOpen) return null;

  // 2. POST /pairing-mode: Đổi Mode Auto <-> Manual
  const handleTogglePairingMode = async () => {
    const nextMode = !isManualMode;
    try {
      setIsProcessing(true);
      await apiClient.post(
        `/api/v1/pos/tournaments/${tournamentId}/pairing-mode`,
        {
          mode: nextMode ? "Manual" : "Auto",
        },
      );
      setIsManualMode(nextMode);
      toast.success(
        nextMode
          ? "Đã chuyển sang chế độ Thủ Công (Manual Mode)!"
          : "Đã bật chế độ Tự Động (Auto Mode)!",
      );
      await refreshPreview();
    } catch (err: unknown) {
      const error = err as { message?: string };
      toast.error(error?.message || "Lỗi khi đổi chế độ ghép cặp.");
    } finally {
      setIsProcessing(false);
    }
  };

  // 3. POST /pairings/swap: Hoán đổi trực tiếp 2 VĐV
  const handleSwapApi = async (
    srcTableIdx: number,
    srcPlayerIdx: number,
    targetTableIdx: number,
    targetPlayerIdx: number,
  ) => {
    if (srcTableIdx === targetTableIdx && srcPlayerIdx === targetPlayerIdx)
      return;

    const sourceTable = tables[srcTableIdx];
    const targetTable = tables[targetTableIdx];
    const playerA = sourceTable.players[srcPlayerIdx];
    const playerB = targetTable.players[targetPlayerIdx];

    if (!playerA || !playerB) return;

    const swapPayload = {
      roundNumber,
      fromMatchNumber: sourceTable.matchNumber,
      toMatchNumber: targetTable.matchNumber,
      playerAId: playerA.userId,
      playerBId: playerB.userId,
    };

    try {
      setIsProcessing(true);
      const res: any = await apiClient.post(
        `/api/v1/pos/tournaments/${tournamentId}/pairings/swap`,
        swapPayload,
      );

      const resData = res?.data || res;
      toast.success(
        res?.message ||
          `Đã đổi chỗ ${playerA.userName} (Bàn #${sourceTable.matchNumber}) ➔ ${playerB.userName} (Bàn #${targetTable.matchNumber})`,
      );

      if (resData?.pairings) {
        setPreviewData(resData);
        setIsManualMode(true);
        const updated = parseTablesWithParticipants(
          resData.pairings,
          participants,
        );
        setTables(updated);
      } else {
        await refreshPreview();
      }
    } catch (err: unknown) {
      const error = err as { message?: string };
      toast.error(error?.message || "Lỗi hoán đổi vị trí.");
      await refreshPreview();
    } finally {
      setIsProcessing(false);
      setSelectedPlayer(null);
      setDraggedItem(null);
      setDragOverTableIndex(null);
    }
  };

  // 4. POST /pairings: Manager lưu toàn bộ Manual Pairings ghi đè Auto Swiss
  const handleSaveManualPairings = async () => {
    try {
      setIsProcessing(true);
      const payload = {
        roundNumber,
        pairings: tables.map((t) => ({
          matchNumber: t.matchNumber,
          playerIds: t.players.map((p) => p.userId),
        })),
      };

      await apiClient.post(
        `/api/v1/pos/tournaments/${tournamentId}/pairings`,
        payload,
      );

      toast.success(`Đã lưu bảng ghép cặp thủ công Vòng #${roundNumber}!`);
      if (onPairingSaved) onPairingSaved();
      onClose();
    } catch (err: unknown) {
      const error = err as { message?: string };
      toast.error(error?.message || "Lỗi lưu bảng cặp.");
    } finally {
      setIsProcessing(false);
    }
  };

  // 5. DELETE /pairings/{roundNumber}: Xóa Manual Pairings, khôi phục Auto Swiss
  const handleResetToAuto = async () => {
    try {
      setIsProcessing(true);
      await apiClient.delete(
        `/api/v1/pos/tournaments/${tournamentId}/pairings/${roundNumber}`,
      );
      toast.success("Đã xóa bảng ghép cặp thủ công. Khôi phục về Auto Swiss!");
      setIsManualMode(false);
      await refreshPreview();
      if (onPairingSaved) onPairingSaved();
    } catch (err: unknown) {
      const error = err as { message?: string };
      toast.error(error?.message || "Lỗi khôi phục bảng cặp tự động.");
    } finally {
      setIsProcessing(false);
    }
  };

  // Drag & Drop Handlers
  const handleDragStart = (
    e: React.DragEvent,
    tableIndex: number,
    playerIndex: number,
  ) => {
    if (isProcessing) return;
    setDraggedItem({ tableIndex, playerIndex });
    e.dataTransfer.effectAllowed = "move";
  };

  const handleDragOverTable = (e: React.DragEvent, tableIndex: number) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = "move";
    if (dragOverTableIndex !== tableIndex) {
      setDragOverTableIndex(tableIndex);
    }
  };

  const handleDropOnPlayer = (
    e: React.DragEvent,
    targetTableIdx: number,
    targetPlayerIdx: number,
  ) => {
    e.preventDefault();
    e.stopPropagation();
    if (!draggedItem || isProcessing) return;

    void handleSwapApi(
      draggedItem.tableIndex,
      draggedItem.playerIndex,
      targetTableIdx,
      targetPlayerIdx,
    );
  };

  // Click-to-Swap Handlers
  const handleClickPlayer = (tableIndex: number, playerIndex: number) => {
    if (isProcessing) return;
    const clickedPlayer = tables[tableIndex].players[playerIndex];

    if (!selectedPlayer) {
      setSelectedPlayer({ tableIndex, playerIndex, player: clickedPlayer });
      return;
    }

    if (
      selectedPlayer.tableIndex === tableIndex &&
      selectedPlayer.playerIndex === playerIndex
    ) {
      setSelectedPlayer(null);
      return;
    }

    void handleSwapApi(
      selectedPlayer.tableIndex,
      selectedPlayer.playerIndex,
      tableIndex,
      playerIndex,
    );
  };

  return (
    <div className="fixed inset-0 bg-neutral-950/60 backdrop-blur-xs z-50 flex items-center justify-center p-4">
      <div className="bg-white border border-neutral-200 rounded-3xl max-w-5xl w-full p-6 space-y-4 shadow-2xl animate-in fade-in-50 zoom-in-95 max-h-[92vh] flex flex-col">
        {/* Header Modal */}
        <div className="flex flex-wrap items-center justify-between gap-3 border-b pb-3.5 shrink-0">
          <div className="flex items-center gap-3">
            <div className="p-2.5 bg-amber-500 text-white rounded-2xl shadow-xs">
              <Swords className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="font-black text-base text-neutral-950">
                  Pairing Studio • Vòng #{roundNumber}
                </h3>
                <span
                  className={`px-2.5 py-0.5 rounded-full text-[10px] font-black uppercase ${
                    isManualMode
                      ? "bg-purple-100 text-purple-800 border border-purple-300"
                      : "bg-emerald-100 text-emerald-800 border border-emerald-300"
                  }`}
                >
                  {isManualMode ? "Manual Override" : "Auto Swiss Mode"}
                </span>
              </div>
              <p className="text-xs text-neutral-500 font-medium">
                Xem trước dự thảo bàn đấu và kéo thả điều chỉnh thí sinh theo ý
                muốn
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            {/* Nút chuyển đổi Mode Auto / Manual */}
            <Button
              size="sm"
              variant="outline"
              onClick={handleTogglePairingMode}
              disabled={isProcessing}
              className={`h-8.5 text-xs font-bold rounded-xl border flex items-center gap-1.5 ${
                isManualMode
                  ? "border-purple-300 bg-purple-50/70 text-purple-900"
                  : "border-emerald-300 bg-emerald-50/70 text-emerald-900"
              }`}
            >
              {isManualMode ? (
                <>
                  <ToggleRight className="w-4 h-4 text-purple-600" /> Mode: Thủ
                  Công
                </>
              ) : (
                <>
                  <ToggleLeft className="w-4 h-4 text-emerald-600" /> Mode: Tự
                  Động
                </>
              )}
            </Button>

            <Button
              variant="outline"
              size="sm"
              onClick={() => void refreshPreview()}
              disabled={loading || isProcessing}
              className="h-8.5 text-xs font-bold rounded-xl"
            >
              <RefreshCw
                className={`w-3.5 h-3.5 mr-1 ${loading ? "animate-spin" : ""}`}
              />{" "}
              Tải lại
            </Button>

            <button
              type="button"
              onClick={onClose}
              className="p-1.5 text-neutral-400 hover:text-neutral-800 rounded-xl"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Action Bar Hướng dẫn */}
        <div className="bg-neutral-50 border border-neutral-200/90 p-3 rounded-2xl flex flex-wrap items-center justify-between text-xs text-neutral-800 gap-2 shrink-0">
          <div className="flex items-center gap-2">
            <Sparkles className="w-4 h-4 text-amber-600 shrink-0" />
            <span>
              {isProcessing ? (
                <strong className="text-amber-800 animate-pulse">
                  Đang xử lý đồng bộ lên máy chủ...
                </strong>
              ) : selectedPlayer ? (
                <strong className="text-amber-900">
                  Đang chọn: {selectedPlayer.player.userName} (Bàn #
                  {tables[selectedPlayer.tableIndex]?.matchNumber}) ➔ Nhấp vào 1
                  VĐV bàn khác để đổi chỗ!
                </strong>
              ) : (
                "Kéo thả trực tiếp thí sinh đè lên thí sinh bàn khác (hoặc nhấp chọn 2 người) để đổi bàn thi đấu."
              )}
            </span>
          </div>

          {selectedPlayer && !isProcessing && (
            <button
              onClick={() => setSelectedPlayer(null)}
              className="text-[11px] font-bold text-rose-600 hover:underline shrink-0"
            >
              Hủy chọn
            </button>
          )}
        </div>

        {/* Lưới Bàn Đấu (Arena Drag & Drop Canvas) */}
        <div className="flex-1 overflow-y-auto space-y-4 pr-1 scrollbar-thin">
          {loading ? (
            <div className="text-center py-20 text-xs text-neutral-400 font-bold">
              Đang tính toán ma trận ghép cặp và nạp dữ liệu bàn đấu...
            </div>
          ) : tables.length === 0 ? (
            <div className="text-center py-20 border border-dashed rounded-3xl text-xs text-neutral-400">
              Chưa có dữ liệu bàn đấu cho vòng này.
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {tables.map((table, tIdx) => {
                const isDragOver = dragOverTableIndex === tIdx;

                return (
                  <div
                    key={table.matchNumber}
                    onDragOver={(e) => handleDragOverTable(e, tIdx)}
                    onDragLeave={() => setDragOverTableIndex(null)}
                    className={`rounded-3xl border p-4 space-y-3 transition-all ${
                      isDragOver
                        ? "bg-amber-50/90 border-amber-500 ring-2 ring-amber-400/30 scale-[1.01]"
                        : "bg-neutral-50/70 border-neutral-200/90 shadow-2xs"
                    }`}
                  >
                    {/* Header bàn */}
                    <div className="flex items-center justify-between border-b pb-2.5">
                      <div className="flex items-center gap-1.5">
                        <Users className="w-4 h-4 text-neutral-500" />
                        <span className="font-black text-xs text-neutral-900">
                          {table.tableName}
                        </span>
                      </div>
                      <span
                        className={`text-[10px] font-mono font-bold px-2 py-0.5 rounded-full ${
                          table.players.length === 4
                            ? "bg-emerald-100 text-emerald-800"
                            : "bg-amber-100 text-amber-800"
                        }`}
                      >
                        {table.players.length}/4 VĐV
                      </span>
                    </div>

                    {/* Danh sách 4 VĐV trong bàn */}
                    <div className="space-y-2">
                      {table.players.map((p, pIdx) => {
                        const isSelected =
                          selectedPlayer?.tableIndex === tIdx &&
                          selectedPlayer?.playerIndex === pIdx;
                        const isDragging =
                          draggedItem?.tableIndex === tIdx &&
                          draggedItem?.playerIndex === pIdx;

                        return (
                          <div
                            key={p.userId}
                            draggable={!isProcessing}
                            onDragStart={(e) => handleDragStart(e, tIdx, pIdx)}
                            onDragEnd={() => {
                              setDraggedItem(null);
                              setDragOverTableIndex(null);
                            }}
                            onDrop={(e) => handleDropOnPlayer(e, tIdx, pIdx)}
                            onClick={() => handleClickPlayer(tIdx, pIdx)}
                            className={`p-2.5 rounded-2xl border flex items-center justify-between cursor-grab active:cursor-grabbing transition-all select-none ${
                              isDragging
                                ? "opacity-40 border-dashed border-amber-500 scale-95"
                                : isSelected
                                  ? "bg-amber-100 border-amber-500 ring-2 ring-amber-400/40 scale-[1.02]"
                                  : "bg-white border-neutral-200 hover:border-neutral-400 hover:shadow-xs"
                            }`}
                          >
                            <div className="flex items-center gap-2 truncate">
                              <GripVertical className="w-3.5 h-3.5 text-neutral-300 shrink-0" />
                              <span className="font-black text-xs text-neutral-900 truncate max-w-130px">
                                {p.userName}
                              </span>
                              {p.currentElo !== undefined && (
                                <span className="text-[9px] font-mono text-neutral-400 font-bold">
                                  ({p.currentElo})
                                </span>
                              )}
                            </div>

                            <div className="flex items-center gap-1 text-[10px] font-mono shrink-0">
                              {isSelected ? (
                                <span className="text-amber-700 font-bold flex items-center gap-0.5">
                                  Đổi chỗ <MoveRight className="w-3 h-3" />
                                </span>
                              ) : (
                                <span className="text-neutral-400">
                                  Swiss: {p.swissScore}đ
                                </span>
                              )}
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Footer Actions: Quyết định Lưu Manual hay Khôi Phục Auto */}
        <div className="pt-3 border-t border-neutral-100 flex flex-wrap items-center justify-between gap-3 shrink-0">
          {/* <div>
            {isManualMode && (
              <Button
                type="button"
                variant="outline"
                disabled={isProcessing || loading}
                onClick={() => void handleResetToAuto()}
                className="h-9 text-xs font-bold rounded-xl border-rose-200 text-rose-700 hover:bg-rose-50 flex items-center gap-1.5"
                title="Xóa cấu hình thủ công và quay lại thuật toán Auto Swiss ban đầu"
              >
                <RotateCcw className="w-3.5 h-3.5 text-rose-600" />
                Khôi Phục Auto Swiss (Delete Manual)
              </Button>
            )}
          </div> */}

          <div className="pt-3 border-t border-neutral-100 flex items-center justify-end gap-2 shrink-0">
            <Button
              type="button"
              variant="outline"
              onClick={onClose}
              className="h-9 px-4 text-xs font-bold rounded-xl"
            >
              Đóng
            </Button>

            {/* <Button
              type="button"
              disabled={isProcessing || loading}
              onClick={() => void handleSaveManualPairings()}
              className="h-9 px-5 bg-neutral-950 hover:bg-neutral-800 text-white text-xs font-bold rounded-xl shadow-xs flex items-center gap-1.5"
            >
              <Save className="w-3.5 h-3.5" />
              {isProcessing ? "Đang lưu..." : "Xác Nhận & Lưu Bảng Cặp"}
            </Button> */}
          </div>
        </div>
      </div>
    </div>
  );
}
