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
  Save,
  Users,
  GripVertical,
  MoveRight,
  ShieldCheck,
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
  const [saving, setSaving] = useState(false);
  const [previewData, setPreviewData] =
    useState<RoundPairingPreviewResponse | null>(null);
  const [tables, setTables] = useState<StudioTable[]>([]);

  // State hỗ trợ Click-to-Swap (Cảm ứng POS)
  const [selectedPlayer, setSelectedPlayer] = useState<{
    tableIndex: number;
    playerIndex: number;
    player: StudioPlayer;
  } | null>(null);

  // State hỗ trợ Drag and Drop
  const [draggedItem, setDraggedItem] = useState<{
    tableIndex: number;
    playerIndex: number;
  } | null>(null);
  const [dragOverTableIndex, setDragOverTableIndex] = useState<number | null>(
    null,
  );

  // Helper chuyển đổi dữ liệu từ API thành StudioTable đầy đủ thông tin tên + Elo
  const parseTablesWithParticipants = (
    rawTables: any[],
    participantList: any[],
  ): StudioTable[] => {
    return rawTables.map((t: any, idx: number) => {
      const matchNumber = t.matchNumber || t.tableNumber || idx + 1;
      const tableName = t.tableName || `Bàn #${matchNumber}`;

      let parsedPlayers: StudioPlayer[] = [];

      // 1. Trường hợp trả về mảng object (players / matchParticipants / participants)
      const rawPlayersArray =
        t.players ||
        t.matchParticipants ||
        t.participants ||
        t.tableMembers ||
        [];

      if (Array.isArray(rawPlayersArray) && rawPlayersArray.length > 0) {
        parsedPlayers = rawPlayersArray.map((p: any) => {
          const pId = p.userId || p.participantId || p.id;
          const found = participantList.find(
            (part) => part.userId === pId || part.id === pId,
          );

          return {
            userId: pId,
            userName:
              p.userName ||
              p.username ||
              p.displayName ||
              found?.walkInDisplayName ||
              found?.username ||
              `VĐV #${pId?.slice(0, 4)}`,
            currentElo:
              p.currentElo ??
              p.elo ??
              found?.currentElo ??
              found?.initialElo ??
              1200,
            swissScore: p.swissScore ?? found?.swissScore ?? 0,
          };
        });
      }

      // 2. Trường hợp trả về mảng ID (playerIds / userIds)
      if (
        parsedPlayers.length === 0 &&
        Array.isArray(t.playerIds) &&
        t.playerIds.length > 0
      ) {
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
      }

      // 3. Trường hợp cấu trúc phẳng player1Id -> player4Id
      if (parsedPlayers.length === 0) {
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

  // Nạp dữ liệu Preview & Participants đồng thời
  const refreshPreview = useCallback(async () => {
    if (!tournamentId) return;
    try {
      setLoading(true);

      // Gọi song song cả preview pairing và danh sách participant để lấy Elo/Tên đầy đủ
      const [pairingRes, partRes]: [any, any] = await Promise.all([
        apiClient
          .get(
            `/api/v1/pos/tournaments/${tournamentId}/pairings/${roundNumber}/preview`,
          )
          .catch(() =>
            // Fallback nếu preview chưa có thì lấy từ matches hiện tại
            apiClient.get(
              `/api/v1/pos/tournaments/${tournamentId}/matches/round/${roundNumber}`,
            ),
          ),
        apiClient
          .get(`/api/v1/pos/tournaments/${tournamentId}/participants`)
          .catch(() => ({ data: [] })),
      ]);

      const pairingData = pairingRes?.data || pairingRes || {};
      const participantList = partRes?.data || partRes || [];

      setPreviewData(pairingData);

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
      toast.error(error?.message || "Không thể tải bảng xem trước ghép cặp.");
    } finally {
      setLoading(false);
    }
  }, [tournamentId, roundNumber]);

  // Load ban đầu khi mở modal
  useEffect(() => {
    if (!isOpen || !tournamentId) return;
    let isMounted = true;

    const loadInitial = async () => {
      try {
        setLoading(true);
        const [pairingRes, partRes]: [any, any] = await Promise.all([
          apiClient
            .get(
              `/api/v1/pos/tournaments/${tournamentId}/pairings/${roundNumber}/preview`,
            )
            .catch(() =>
              apiClient.get(
                `/api/v1/pos/tournaments/${tournamentId}/matches/round/${roundNumber}`,
              ),
            ),
          apiClient
            .get(`/api/v1/pos/tournaments/${tournamentId}/participants`)
            .catch(() => ({ data: [] })),
        ]);

        if (isMounted) {
          const pairingData = pairingRes?.data || pairingRes || {};
          const participantList = partRes?.data || partRes || [];

          setPreviewData(pairingData);

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
        }
      } catch (err: unknown) {
        if (isMounted) {
          const error = err as { message?: string };
          toast.error(error?.message || "Không thể tải bảng xem trước.");
        }
      } finally {
        if (isMounted) {
          setLoading(false);
        }
      }
    };

    void loadInitial();

    return () => {
      isMounted = false;
    };
  }, [isOpen, tournamentId, roundNumber]);

  if (!isOpen) return null;

  // Hoán đổi 2 VĐV
  const swapPlayers = (
    srcTableIdx: number,
    srcPlayerIdx: number,
    targetTableIdx: number,
    targetPlayerIdx: number,
  ) => {
    if (srcTableIdx === targetTableIdx && srcPlayerIdx === targetPlayerIdx)
      return;

    const newTables = [...tables];
    const sourceTable = {
      ...newTables[srcTableIdx],
      players: [...newTables[srcTableIdx].players],
    };
    const targetTable = {
      ...newTables[targetTableIdx],
      players: [...newTables[targetTableIdx].players],
    };

    const movingPlayer = sourceTable.players[srcPlayerIdx];
    const targetPlayer = targetTable.players[targetPlayerIdx];

    sourceTable.players[srcPlayerIdx] = targetPlayer;
    targetTable.players[targetPlayerIdx] = movingPlayer;

    newTables[srcTableIdx] = sourceTable;
    newTables[targetTableIdx] = targetTable;

    setTables(newTables);
    setSelectedPlayer(null);
    setDraggedItem(null);
    setDragOverTableIndex(null);
    toast.info(
      `Đã hoán đổi ${movingPlayer.userName} ➔ ${targetPlayer.userName}`,
    );
  };

  // Chuyển VĐV sang bàn còn chỗ trống (< 4 VĐV)
  const movePlayerToTable = (
    srcTableIdx: number,
    srcPlayerIdx: number,
    targetTableIdx: number,
  ) => {
    if (srcTableIdx === targetTableIdx) return;

    const newTables = [...tables];
    const sourceTable = {
      ...newTables[srcTableIdx],
      players: [...newTables[srcTableIdx].players],
    };
    const targetTable = {
      ...newTables[targetTableIdx],
      players: [...newTables[targetTableIdx].players],
    };

    if (targetTable.players.length >= 4) {
      toast.warning(
        "Bàn này đã đủ 4 người chơi. Hãy kéo đè lên 1 VĐV để hoán đổi chỗ!",
      );
      return;
    }

    const [movingPlayer] = sourceTable.players.splice(srcPlayerIdx, 1);
    targetTable.players.push(movingPlayer);

    newTables[srcTableIdx] = sourceTable;
    newTables[targetTableIdx] = targetTable;

    setTables(newTables);
    setDraggedItem(null);
    setDragOverTableIndex(null);
    toast.info(
      `Đã chuyển ${movingPlayer.userName} sang ${targetTable.tableName}`,
    );
  };

  // Drag & Drop Handlers
  const handleDragStart = (
    e: React.DragEvent,
    tableIndex: number,
    playerIndex: number,
  ) => {
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

    if (!draggedItem) return;
    swapPlayers(
      draggedItem.tableIndex,
      draggedItem.playerIndex,
      targetTableIdx,
      targetPlayerIdx,
    );
  };

  const handleDropOnTable = (e: React.DragEvent, targetTableIdx: number) => {
    e.preventDefault();
    if (!draggedItem) return;

    if (tables[targetTableIdx].players.length < 4) {
      movePlayerToTable(
        draggedItem.tableIndex,
        draggedItem.playerIndex,
        targetTableIdx,
      );
    } else {
      setDragOverTableIndex(null);
      setDraggedItem(null);
    }
  };

  // Click-to-Swap cho màn hình cảm ứng
  const handleClickPlayer = (tableIndex: number, playerIndex: number) => {
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

    swapPlayers(
      selectedPlayer.tableIndex,
      selectedPlayer.playerIndex,
      tableIndex,
      playerIndex,
    );
  };

  // Lưu bảng cặp
  const handleSavePairings = async () => {
    try {
      setSaving(true);

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

      toast.success(`Đã lưu bảng xếp cặp Vòng #${roundNumber}!`);
      if (onPairingSaved) onPairingSaved();
      onClose();
    } catch (err: unknown) {
      const error = err as { message?: string };
      toast.error(error?.message || "Lỗi khi lưu bảng cặp đấu.");
    } finally {
      setSaving(false);
    }
  };

  // Khôi phục tự động Auto Swiss
  const handleResetToAuto = async () => {
    try {
      setSaving(true);
      await apiClient.delete(
        `/api/v1/pos/tournaments/${tournamentId}/pairings/${roundNumber}`,
      );
      toast.success("Đã khôi phục về bảng cặp tự động (Auto Swiss)!");
      await refreshPreview();
      if (onPairingSaved) onPairingSaved();
    } catch (err: unknown) {
      const error = err as { message?: string };
      toast.error(error?.message || "Lỗi khôi phục bảng cặp.");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-neutral-950/60 backdrop-blur-xs z-50 flex items-center justify-center p-4">
      <div className="bg-white border border-neutral-200 rounded-3xl max-w-5xl w-full p-6 space-y-4 shadow-2xl animate-in fade-in-50 zoom-in-95 max-h-[92vh] flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between border-b pb-3 shrink-0">
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
                    previewData?.isManualOverride
                      ? "bg-purple-100 text-purple-800 border border-purple-300"
                      : "bg-emerald-100 text-emerald-800 border border-emerald-300"
                  }`}
                >
                  {previewData?.isManualOverride
                    ? "Custom Override"
                    : "Auto Swiss"}
                </span>
              </div>
              <p className="text-xs text-neutral-500 font-medium">
                Kéo thả các vận động viên giữa các bàn đấu để tùy biến cặp đấu
                trước khi bắt đầu
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => void refreshPreview()}
              disabled={loading}
              className="h-8.5 text-xs font-bold rounded-xl"
            >
              <RefreshCw
                className={`w-3.5 h-3.5 mr-1 ${loading ? "animate-spin" : ""}`}
              />{" "}
              Làm mới
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

        {/* Hướng dẫn thao tác nhanh */}
        <div className="bg-amber-50/70 border border-amber-200/80 p-3 rounded-2xl flex items-center justify-between text-xs text-amber-950 shrink-0">
          <div className="flex items-center gap-2">
            <ShieldCheck className="w-4 h-4 text-amber-600 shrink-0" />
            <span>
              {selectedPlayer ? (
                <strong className="text-amber-800">
                  Đang chọn: {selectedPlayer.player.userName} ➔ Nhấp vào 1 VĐV
                  khác để đổi vị trí!
                </strong>
              ) : (
                "Kéo thả trực tiếp VĐV vào bàn khác hoặc nhấp chuột vào 2 VĐV để hoán đổi chỗ."
              )}
            </span>
          </div>

          {selectedPlayer && (
            <button
              onClick={() => setSelectedPlayer(null)}
              className="text-[11px] font-bold text-rose-600 hover:underline shrink-0"
            >
              Hủy chọn
            </button>
          )}
        </div>

        {/* Lưới Bàn Đấu (Arena Canvas) */}
        <div className="flex-1 overflow-y-auto space-y-4 pr-1 scrollbar-thin">
          {loading ? (
            <div className="text-center py-20 text-xs text-neutral-400 font-bold">
              Đang tính toán ma trận ghép cặp Swiss và nạp dữ liệu VĐV...
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
                    onDrop={(e) => handleDropOnTable(e, tIdx)}
                    className={`rounded-3xl border p-4 space-y-3 transition-all ${
                      isDragOver
                        ? "bg-amber-50/90 border-amber-500 ring-2 ring-amber-400/30 scale-[1.01]"
                        : "bg-neutral-50/70 border-neutral-200/90 shadow-2xs"
                    }`}
                  >
                    {/* Table Header */}
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

                    {/* Danh sách VĐV trong bàn */}
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
                            draggable
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
                              <span className="text-[10px] font-mono text-neutral-400 font-bold">
                                ({p.currentElo})
                              </span>
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

                      {/* Slot trống nếu bàn chưa đủ 4 người */}
                      {Array.from({
                        length: Math.max(0, 4 - table.players.length),
                      }).map((_, emptyIdx) => (
                        <div
                          key={`empty-${emptyIdx}`}
                          className="p-2.5 rounded-2xl border border-dashed border-neutral-300 bg-white/40 flex items-center justify-center text-[10px] text-neutral-400 font-bold"
                        >
                          + Thả VĐV vào vị trí trống này
                        </div>
                      ))}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Footer Actions */}
        <div className="pt-3 border-t border-neutral-100 flex flex-wrap items-center justify-between gap-3 shrink-0">
          <div>
            {previewData?.isManualOverride && (
              <Button
                type="button"
                variant="outline"
                disabled={saving}
                onClick={() => void handleResetToAuto()}
                className="h-9 text-xs font-bold rounded-xl border-neutral-300 text-neutral-700 flex items-center gap-1.5"
              >
                <RotateCcw className="w-3.5 h-3.5" /> Khôi Phục Về Auto Swiss
              </Button>
            )}
          </div>

          <div className="flex items-center gap-2">
            <Button
              type="button"
              variant="outline"
              onClick={onClose}
              className="h-9 px-4 text-xs font-bold rounded-xl"
            >
              Đóng
            </Button>
            <Button
              type="button"
              disabled={saving}
              onClick={() => void handleSavePairings()}
              className="h-9 px-5 bg-neutral-950 hover:bg-neutral-800 text-white text-xs font-bold rounded-xl shadow-xs flex items-center gap-1.5"
            >
              <Save className="w-3.5 h-3.5" />
              {saving ? "Đang lưu..." : "Xác Nhận & Lưu Bảng Cặp"}
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}
