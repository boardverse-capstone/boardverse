"use client";

import { useState, useEffect, useCallback } from "react";
import { useTournamentLobby } from "../hooks/useTournamentLobby";
import { TournamentWalkInModal } from "./tournament-walkin-modal";
import { TournamentPairingStudioModal } from "./tournament-pairing-studio-modal";
import { apiClient } from "@/core/api/client";
import {
  RoundPairingPreviewResponse,
  PairingTablePreview,
} from "../types/tournament.types";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Search,
  UserPlus,
  Swords,
  CheckCircle2,
  XCircle,
  Clock,
  UserX,
  Settings,
  ArrowLeft,
  Eye,
  Users,
  RefreshCw,
} from "lucide-react";

interface Props {
  tournamentId: string;
  tournamentTitle: string;
  minParticipants: number;
  maxParticipants: number;
  onBack?: () => void;
  onTournamentStarted?: () => void;
}

export function TournamentLobbyScreen({
  tournamentId,
  tournamentTitle,
  minParticipants = 4,
  maxParticipants = 16,
  onBack,
  onTournamentStarted,
}: Props) {
  const {
    participants,
    loading,
    fetchParticipants,
    handleCheckIn,
    handleAddWalkIn,
    handleNoShow,
    handleKick,
    handleStart,
    handleStartWithOptions,
    handleCancelTournament,
  } = useTournamentLobby(tournamentId);

  // Tab chuyển đổi giữa Danh sách VĐV và Xem trước Bảng Cặp R1
  const [activeView, setActiveView] = useState<"ROSTER" | "PAIRING_PREVIEW">(
    "ROSTER",
  );
  const [search, setSearch] = useState("");
  const [filterTab, setFilterTab] = useState<
    "ALL" | "CheckedIn" | "Registered" | "NoShow"
  >("ALL");

  // Modals state
  const [showWalkInModal, setShowWalkInModal] = useState(false);
  const [showPairingStudio, setShowPairingStudio] = useState(false);
  const [loadingActionId, setLoadingActionId] = useState<string | null>(null);

  // Preview Data State
  const [previewData, setPreviewData] =
    useState<RoundPairingPreviewResponse | null>(null);
  const [loadingPreview, setLoadingPreview] = useState(false);

  // 1. Hàm refresh dùng cho nút "Làm mới bảng cặp" hoặc sau khi lưu xong bảng cặp
  const refreshPairingPreview = useCallback(async () => {
    if (!tournamentId) return;
    try {
      setLoadingPreview(true);
      const res: unknown = await apiClient.get(
        `/api/v1/pos/tournaments/${tournamentId}/pairings/1/preview`,
      );
      const resData = res as { data?: RoundPairingPreviewResponse };
      const data = resData?.data || (res as RoundPairingPreviewResponse);
      setPreviewData(data);
    } catch {
      setPreviewData(null);
    } finally {
      setLoadingPreview(false);
    }
  }, [tournamentId]);

  // 2. Tự động load preview khi chuyển sang tab PAIRING_PREVIEW (Dùng cờ isMounted tránh cascading render)
  useEffect(() => {
    if (activeView !== "PAIRING_PREVIEW" || !tournamentId) return;

    let isMounted = true;

    const loadInitialPreview = async () => {
      try {
        setLoadingPreview(true);
        const res: unknown = await apiClient.get(
          `/api/v1/pos/tournaments/${tournamentId}/pairings/1/preview`,
        );
        const resData = res as { data?: RoundPairingPreviewResponse };
        const data = resData?.data || (res as RoundPairingPreviewResponse);
        if (isMounted) {
          setPreviewData(data);
        }
      } catch {
        if (isMounted) {
          setPreviewData(null);
        }
      } finally {
        if (isMounted) {
          setLoadingPreview(false);
        }
      }
    };

    void loadInitialPreview();

    return () => {
      isMounted = false;
    };
  }, [activeView, tournamentId]);

  const checkedInList = participants.filter(
    (p) => p.status === "CheckedIn" || p.status === "Active",
  );
  const checkedInCount = checkedInList.length;
  const isEnoughToStart = checkedInCount >= minParticipants;

  const filteredParticipants = participants.filter((p) => {
    const name = (p.walkInDisplayName || p.username || "").toLowerCase();
    const matchesSearch = name.includes(search.toLowerCase());
    const matchesTab =
      filterTab === "ALL"
        ? true
        : filterTab === "CheckedIn"
          ? p.status === "CheckedIn" || p.status === "Active"
          : p.status === filterTab;
    return matchesSearch && matchesTab;
  });

  const handleStartRegular = async () => {
    const ok = await handleStart();
    if (ok && onTournamentStarted) onTournamentStarted();
  };

  const handleStartPartial = async () => {
    const reason = prompt("Lý do khởi chạy tùy chọn / rút gọn:");
    if (!reason) return;
    const ok = await handleStartWithOptions({
      allowPartialStart: true,
      reason,
    });
    if (ok && onTournamentStarted) onTournamentStarted();
  };

  return (
    <div className="space-y-4 max-w-7xl mx-auto pb-10">
      {/* 1. Header Hero Bar */}
      <div className="bg-white p-4 rounded-3xl border border-neutral-200 shadow-2xs flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          {onBack && (
            <button
              onClick={onBack}
              className="p-2 hover:bg-neutral-100 rounded-xl transition-colors"
            >
              <ArrowLeft className="w-5 h-5 text-neutral-600" />
            </button>
          )}
          <div>
            <div className="flex items-center gap-2">
              <h2 className="text-base font-black text-neutral-950">
                {tournamentTitle}
              </h2>
              <span className="text-xs font-mono text-neutral-400">
                #{tournamentId.slice(0, 8)}
              </span>
            </div>
            <p className="text-xs text-neutral-500 font-medium">
              Sảnh Điểm Danh • Yêu cầu tối thiểu:{" "}
              <strong>{minParticipants} VĐV</strong> (Tối đa {maxParticipants})
            </p>
          </div>
        </div>

        {/* Action Toolbar */}
        <div className="flex items-center gap-2">
          <Button
            onClick={() => setShowWalkInModal(true)}
            variant="outline"
            className="h-9 border-neutral-300 text-neutral-800 text-xs font-bold rounded-xl flex items-center gap-1.5"
          >
            <UserPlus className="w-3.5 h-3.5" /> Thêm Walk-in
          </Button>

          {isEnoughToStart ? (
            <Button
              onClick={handleStartRegular}
              className="h-9 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold rounded-xl px-5 shadow-xs flex items-center gap-1.5"
            >
              <Swords className="w-4 h-4" /> Bắt Đầu Giải (Start R1)
            </Button>
          ) : (
            <Button
              onClick={handleStartPartial}
              variant="outline"
              className="h-9 border-amber-300 bg-amber-50 text-amber-900 hover:bg-amber-100 text-xs font-bold rounded-xl flex items-center gap-1.5"
            >
              <Settings className="w-3.5 h-3.5" /> Bắt Đầu Tùy Chọn
            </Button>
          )}

          <Button
            variant="outline"
            onClick={() => {
              const reason = prompt("Lý do hủy giải đấu:");
              if (reason?.trim()) void handleCancelTournament(reason.trim());
            }}
            className="h-9 border-rose-200 text-rose-700 hover:bg-rose-50 text-xs font-bold rounded-xl"
          >
            <XCircle className="w-3.5 h-3.5 mr-1" /> Hủy Giải
          </Button>
        </div>
      </div>

      {/* 2. Thanh Điều Hướng Giữa Danh Sách Điểm Danh & Bảng Cặp R1 */}
      <div className="bg-white p-3 rounded-3xl border border-neutral-200 shadow-2xs flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <button
            onClick={() => setActiveView("ROSTER")}
            className={`px-4 py-2 rounded-2xl text-xs font-extrabold transition-all flex items-center gap-2 ${
              activeView === "ROSTER"
                ? "bg-neutral-950 text-white shadow-xs"
                : "bg-neutral-100 text-neutral-600 hover:bg-neutral-200"
            }`}
          >
            <Users className="w-4 h-4" /> Danh Sách Điểm Danh ({checkedInCount}/
            {participants.length})
          </button>

          <button
            onClick={() => setActiveView("PAIRING_PREVIEW")}
            className={`px-4 py-2 rounded-2xl text-xs font-extrabold transition-all flex items-center gap-2 ${
              activeView === "PAIRING_PREVIEW"
                ? "bg-neutral-950 text-white shadow-xs"
                : "bg-neutral-100 text-neutral-600 hover:bg-neutral-200"
            }`}
          >
            <Eye className="w-4 h-4" /> Xem Trước Bảng Cặp R1
          </button>
        </div>

        {activeView === "PAIRING_PREVIEW" && (
          <div className="flex items-center gap-2">
            <Button
              size="sm"
              variant="outline"
              onClick={() => void refreshPairingPreview()}
              disabled={loadingPreview}
              className="h-8 text-xs font-bold rounded-xl"
            >
              <RefreshCw
                className={`w-3.5 h-3.5 mr-1 ${loadingPreview ? "animate-spin" : ""}`}
              />{" "}
              Làm mới bảng cặp
            </Button>
            <Button
              size="sm"
              onClick={() => setShowPairingStudio(true)}
              className="h-8 bg-amber-600 hover:bg-amber-700 text-white text-xs font-bold rounded-xl flex items-center gap-1.5"
            >
              <Swords className="w-3.5 h-3.5" /> Chỉnh Sửa / Xếp Bàn Tay
            </Button>
          </div>
        )}
      </div>

      {/* 3A. VIEW: DANH SÁCH VẬN ĐỘNG VIÊN & ĐIỂM DANH */}
      {activeView === "ROSTER" && (
        <div className="space-y-4">
          <div className="bg-white p-4 rounded-3xl border border-neutral-200 shadow-2xs space-y-3">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div className="flex items-center gap-1.5 text-xs font-bold">
                {(["ALL", "CheckedIn", "Registered", "NoShow"] as const).map(
                  (tab) => (
                    <button
                      key={tab}
                      onClick={() => setFilterTab(tab)}
                      className={`px-3 py-1.5 rounded-xl transition-colors ${
                        filterTab === tab
                          ? "bg-neutral-950 text-white"
                          : "bg-neutral-100 text-neutral-600 hover:bg-neutral-200"
                      }`}
                    >
                      {tab === "ALL"
                        ? `Tất cả (${participants.length})`
                        : tab === "CheckedIn"
                          ? `Đã đến (${checkedInCount})`
                          : tab === "Registered"
                            ? `Chưa đến (${participants.filter((p) => p.status === "Registered").length})`
                            : `No-Show (${participants.filter((p) => p.status === "NoShow").length})`}
                    </button>
                  ),
                )}
              </div>

              <div className="relative flex-1 max-w-xs">
                <Search className="w-3.5 h-3.5 absolute left-3 top-3 text-neutral-400" />
                <Input
                  type="text"
                  placeholder="Tìm theo tên VĐV..."
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  className="h-9 pl-8 text-xs bg-neutral-50 rounded-xl"
                />
              </div>
            </div>
          </div>

          {loading ? (
            <div className="text-center py-20 text-xs text-neutral-400 font-bold">
              Đang nạp danh sách VĐV...
            </div>
          ) : filteredParticipants.length === 0 ? (
            <div className="text-center py-16 bg-white border border-dashed rounded-3xl p-6 text-xs text-neutral-400 font-medium">
              Không tìm thấy vận động viên nào phù hợp.
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3.5">
              {filteredParticipants.map((p) => {
                const displayName = p.walkInDisplayName || p.username || "VĐV";
                const isChecked =
                  p.status === "CheckedIn" || p.status === "Active";
                const isNoShow = p.status === "NoShow";
                const isWithdrawn = p.status === "Withdrawn";
                const isActionLoading = loadingActionId === p.id;

                return (
                  <div
                    key={p.id}
                    className={`p-3.5 rounded-2xl border flex flex-col justify-between space-y-3 transition-all ${
                      isChecked
                        ? "bg-emerald-50/40 border-emerald-300"
                        : isNoShow || isWithdrawn
                          ? "bg-neutral-100 border-neutral-200 opacity-60"
                          : "bg-white border-neutral-200 shadow-2xs"
                    }`}
                  >
                    <div>
                      <div className="flex items-start justify-between gap-2">
                        <div>
                          <h4 className="font-extrabold text-xs text-neutral-950 truncate max-w-140px">
                            {displayName}
                          </h4>
                          {p.isWalkIn ? (
                            <span className="text-[9px] font-bold text-amber-700 bg-amber-100 px-1.5 py-0.2 rounded font-mono">
                              Walk-in{" "}
                              {p.walkInPhoneNumber &&
                                `• ${p.walkInPhoneNumber}`}
                            </span>
                          ) : (
                            <span className="text-[10px] font-mono text-neutral-400">
                              Elo: {p.currentElo || p.initialElo || 1200}
                            </span>
                          )}
                        </div>

                        <span
                          className={`px-2 py-0.5 rounded-md text-[9px] font-black uppercase ${
                            isChecked
                              ? "bg-emerald-100 text-emerald-800"
                              : isNoShow
                                ? "bg-rose-100 text-rose-800"
                                : isWithdrawn
                                  ? "bg-neutral-200 text-neutral-700"
                                  : "bg-neutral-100 text-neutral-600"
                          }`}
                        >
                          {p.status}
                        </span>
                      </div>

                      <div className="mt-2 text-[10px] text-neutral-400 font-mono flex items-center gap-1">
                        {isChecked ? (
                          <span className="text-emerald-700 font-bold flex items-center gap-1">
                            <CheckCircle2 className="w-3 h-3" /> Đã điểm danh
                          </span>
                        ) : (
                          <span className="flex items-center gap-1">
                            <Clock className="w-3 h-3" /> Chưa điểm danh
                          </span>
                        )}
                      </div>
                    </div>

                    <div className="pt-2 border-t border-neutral-100 flex items-center justify-end gap-1.5">
                      {!isChecked && !isNoShow && !isWithdrawn && (
                        <>
                          <Button
                            size="sm"
                            disabled={isActionLoading}
                            onClick={async () => {
                              setLoadingActionId(p.id);
                              await handleCheckIn(p.id);
                              setLoadingActionId(null);
                            }}
                            className="h-7 px-3 bg-neutral-950 hover:bg-neutral-800 text-white text-[10px] font-bold rounded-lg"
                          >
                            Check-in
                          </Button>

                          <Button
                            size="sm"
                            variant="outline"
                            disabled={isActionLoading}
                            onClick={async () => {
                              setLoadingActionId(p.id);
                              await handleNoShow(p.id);
                              setLoadingActionId(null);
                            }}
                            className="h-7 px-2 border-amber-200 text-amber-700 hover:bg-amber-50 text-[10px] font-bold rounded-lg"
                            title="Đánh dấu vắng mặt"
                          >
                            <UserX className="w-3 h-3" />
                          </Button>

                          <Button
                            size="sm"
                            variant="outline"
                            disabled={isActionLoading}
                            onClick={async () => {
                              const reason = prompt(
                                `Nhập lý do xóa VĐV ${displayName}:`,
                              );
                              if (reason?.trim()) {
                                setLoadingActionId(p.id);
                                await handleKick(p.id, reason.trim());
                                setLoadingActionId(null);
                              }
                            }}
                            className="h-7 px-2 border-rose-200 text-rose-700 hover:bg-rose-50 text-[10px] font-bold rounded-lg"
                            title="Xóa khỏi giải"
                          >
                            <XCircle className="w-3 h-3" />
                          </Button>
                        </>
                      )}

                      {isChecked && (
                        <span className="text-emerald-700 font-extrabold text-[11px] flex items-center gap-1">
                          <CheckCircle2 className="w-3.5 h-3.5" /> Sẵn sàng ✓
                        </span>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* 3B. VIEW: XEM TRƯỚC BẢNG GHÉP CẶP ROUND 1 (PAIRING PREVIEW) */}
      {activeView === "PAIRING_PREVIEW" && (
        <div className="bg-white p-5 rounded-3xl border border-neutral-200 shadow-2xs space-y-4">
          <div className="flex items-center justify-between border-b pb-3">
            <div>
              <h3 className="font-black text-sm text-neutral-950 flex items-center gap-2">
                <Swords className="w-4 h-4 text-amber-600" />
                Dự Kiến Xếp Bàn Vòng 1 ({previewData?.tables?.length || 0} bàn)
              </h3>
              <p className="text-xs text-neutral-500 mt-0.5">
                Thuật toán tự động xếp 4 người/bàn dựa trên số VĐV đã điểm danh
                ({checkedInCount} người)
              </p>
            </div>

            <span
              className={`px-3 py-1 rounded-full text-xs font-black uppercase ${
                previewData?.isManualOverride
                  ? "bg-purple-100 text-purple-800 border border-purple-300"
                  : "bg-emerald-100 text-emerald-800 border border-emerald-300"
              }`}
            >
              {previewData?.isManualOverride ? "Manual Custom" : "Auto Swiss"}
            </span>
          </div>

          {loadingPreview ? (
            <div className="text-center py-16 text-xs text-neutral-400 font-bold">
              Đang tính toán bảng cặp đấu...
            </div>
          ) : !previewData?.tables || previewData.tables.length === 0 ? (
            <div className="text-center py-16 border border-dashed rounded-2xl bg-neutral-50/50 p-6 space-y-2">
              <Users className="w-8 h-8 text-neutral-300 mx-auto" />
              <p className="text-xs text-neutral-500 font-medium">
                Chưa có dữ liệu bảng cặp. Cần ít nhất {minParticipants} VĐV điểm
                danh để tạo bàn đấu.
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {previewData.tables.map((table: PairingTablePreview) => (
                <div
                  key={table.tableNumber}
                  className="bg-neutral-50/80 border border-neutral-200 rounded-2xl p-4 space-y-3 shadow-2xs"
                >
                  <div className="flex items-center justify-between border-b pb-2">
                    <span className="font-extrabold text-xs text-neutral-900 flex items-center gap-1.5">
                      <Users className="w-3.5 h-3.5 text-neutral-500" />
                      {table.tableName || `Bàn Thi Đấu #${table.tableNumber}`}
                    </span>
                    <span className="text-[10px] font-mono font-bold text-neutral-400">
                      {table.players.length} Players
                    </span>
                  </div>

                  <div className="space-y-1.5">
                    {table.players.map((p) => (
                      <div
                        key={p.userId}
                        className="flex items-center justify-between text-xs bg-white p-2.5 rounded-xl border border-neutral-200"
                      >
                        <span className="font-extrabold text-neutral-900 truncate">
                          {p.userName}
                        </span>
                        {p.currentElo !== undefined && (
                          <span className="text-[10px] font-mono text-neutral-400">
                            Elo: {p.currentElo}
                          </span>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* 4. Các Modals Vệ Tinh */}
      <TournamentWalkInModal
        isOpen={showWalkInModal}
        onClose={() => setShowWalkInModal(false)}
        onSubmit={handleAddWalkIn}
      />

      <TournamentPairingStudioModal
        isOpen={showPairingStudio}
        onClose={() => setShowPairingStudio(false)}
        tournamentId={tournamentId}
        roundNumber={1}
        onPairingSaved={() => {
          void fetchParticipants();
          void refreshPairingPreview();
        }}
      />
    </div>
  );
}
