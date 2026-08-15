"use client";

import { useEffect, useState } from "react";
import { useTournamentPos } from "../hooks/useTournamentPos";
import {
  TournamentStatusFilter,
  TournamentMatch,
} from "../types/tournament.types";
import { TournamentBracketCanvas } from "./tournament-bracket-canvas";
import { TournamentCreateModal } from "./tournament-create-modal";
import { TournamentEditModal } from "./tournament-edit-modal";
import { TournamentWalkInModal } from "./tournament-walkin-modal";
import { TournamentPairingPreviewModal } from "./tournament-pairing-preview-modal";
import { TournamentMatchResultModal } from "./tournament-match-result-modal";
import { TournamentMatchCancelModal } from "./tournament-match-cancel-modal";
import { Button } from "@/components/ui/button";
import {
  Trophy,
  Plus,
  Play,
  CheckCircle2,
  XCircle,
  Swords,
  ChevronRight,
  Filter,
  Clock,
  Gamepad2,
  Edit3,
  UserPlus,
  Eye,
} from "lucide-react";

const STATUS_FILTERS: Array<{ label: string; value: TournamentStatusFilter }> =
  [
    { label: "Tất cả trạng thái", value: "ALL" },
    { label: "Draft (Bản nháp)", value: "Draft" },
    { label: "Mở đăng ký (Open)", value: "RegistrationOpen" },
    { label: "Đóng đăng ký (Closed)", value: "RegistrationClosed" },
    { label: "Đang diễn ra (OnGoing)", value: "OnGoing" },
    { label: "Hoàn thành (Completed)", value: "Completed" },
    { label: "Đã hủy (Cancelled)", value: "Cancelled" },
  ];

export function TournamentPosContainer({ cafeId }: { cafeId: string | null }) {
  const {
    tournaments,
    loading,
    activeTournament,
    handleSelectTournament,
    selectedStatus,
    setSelectedStatus,
    fetchTournaments,
    pairingPreview,
    pairingPreviewLoading,
    fetchPairingsPreview,
    handleCreateTournament,
    handleUpdateTournament,
    handleToggleRegistration,
    handleReopenRegistration,
    handleExtendRegistration,
    handleAddWalkInParticipant,
    handleStartTournament,
    handleAdvanceRound,
    handleCompleteTournament,
    handleCancelTournament,
    handleRecordMatchResult,
    handleUpdateMatchResult,
    handleCancelMatch,
  } = useTournamentPos(cafeId);

  // States quản lý Modal & View
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [showWalkInModal, setShowWalkInModal] = useState(false);
  const [showPairingPreviewModal, setShowPairingPreviewModal] = useState(false);
  const [selectedMatch, setSelectedMatch] = useState<TournamentMatch | null>(
    null,
  );
  const activeTournamentId = activeTournament?.id;
  const activeTournamentStatus = activeTournament?.status;
  const activeTournamentRound = activeTournament?.currentRound;
  const [cancelMatchTarget, setCancelMatchTarget] =
    useState<TournamentMatch | null>(null);

  // 1. Fetch danh sách giải đấu khi đổi filter hoặc cafeId
  useEffect(() => {
    if (cafeId) {
      fetchTournaments(selectedStatus);
    }
  }, [cafeId, selectedStatus, fetchTournaments]);

  // 2. Tự động nạp bảng ghép cặp (Pairings preview) khi giải đấu đang OnGoing hoặc RegistrationClosed
  useEffect(() => {
    if (
      activeTournamentId &&
      (activeTournamentStatus === "OnGoing" ||
        activeTournamentStatus === "RegistrationClosed")
    ) {
      const targetRound =
        activeTournamentRound === 0 ? 1 : (activeTournamentRound ?? 1);
      fetchPairingsPreview(activeTournamentId, targetRound);
    }
  }, [
    activeTournamentId,
    activeTournamentStatus,
    activeTournamentRound,
    fetchPairingsPreview,
  ]);

  const handleFilterChange = (status: TournamentStatusFilter) => {
    setSelectedStatus(status);
  };

  const renderStatusBadge = (status: string) => {
    const config: Record<string, { bg: string; text: string; border: string }> =
      {
        Draft: {
          bg: "bg-neutral-100",
          text: "text-neutral-700",
          border: "border-neutral-200",
        },
        RegistrationOpen: {
          bg: "bg-emerald-50",
          text: "text-emerald-700",
          border: "border-emerald-200",
        },
        RegistrationClosed: {
          bg: "bg-amber-50",
          text: "text-amber-700",
          border: "border-amber-200",
        },
        OnGoing: {
          bg: "bg-blue-50",
          text: "text-blue-700",
          border: "border-blue-200",
        },
        Completed: {
          bg: "bg-purple-50",
          text: "text-purple-700",
          border: "border-purple-200",
        },
        Cancelled: {
          bg: "bg-rose-50",
          text: "text-rose-700",
          border: "border-rose-200",
        },
      };

    const style = config[status] || {
      bg: "bg-neutral-50",
      text: "text-neutral-600",
      border: "border-neutral-200",
    };

    return (
      <span
        className={`px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wide border ${style.bg} ${style.text} ${style.border}`}
      >
        {status}
      </span>
    );
  };

  // Mở popup xem chi tiết bảng ghép cặp
  const handleOpenPairingPreviewModal = async () => {
    if (!activeTournament) return;
    const targetRound =
      activeTournament.currentRound === 0 ? 1 : activeTournament.currentRound;
    setShowPairingPreviewModal(true);
    await fetchPairingsPreview(activeTournament.id, targetRound);
  };

  // Kéo thả xếp VĐV vào bàn đấu ở vòng trong
  const handleAdvancePlayer = (
    targetMatchId: string,
    player: { userId: string; userName: string },
  ) => {
    alert(
      `Đã xếp VĐV "${player.userName}" vào Bàn đấu #${targetMatchId.slice(0, 6)} thành công!`,
    );
  };

  return (
    <div className="space-y-6 text-neutral-900 font-sans antialiased max-w-[1650px] mx-auto pb-12">
      {/* 1. HEADER CHÍNH & BỘ LỌC GIẢI ĐẤU */}
      <div className="bg-white p-5 rounded-2xl border border-neutral-200/80 shadow-2xs flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="p-2.5 bg-amber-50 text-amber-600 border border-amber-200/80 rounded-xl shrink-0">
            <Trophy className="w-5 h-5" />
          </div>
          <div>
            <h1 className="text-lg font-black tracking-tight text-neutral-950">
              Quản Lý Giải Đấu (Tournament POS)
            </h1>
            <p className="text-xs text-neutral-500 font-medium mt-0.5">
              Sơ đồ phân nhánh Bracket trực quan • Điều phối & ghi nhận kết quả
              tại quầy.
            </p>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <div className="flex items-center gap-2 bg-neutral-50 px-3 py-1.5 rounded-xl border border-neutral-200">
            <Filter className="w-4 h-4 text-neutral-500" />
            <span className="text-xs font-bold text-neutral-600">Lọc:</span>
            <select
              value={selectedStatus}
              onChange={(e) =>
                handleFilterChange(e.target.value as TournamentStatusFilter)
              }
              className="text-xs font-bold bg-transparent text-neutral-800 outline-none cursor-pointer"
            >
              {STATUS_FILTERS.map((f) => (
                <option key={f.value} value={f.value}>
                  {f.label}
                </option>
              ))}
            </select>
          </div>

          <Button
            onClick={() => setShowCreateModal(true)}
            className="h-9 bg-neutral-950 hover:bg-neutral-800 text-white text-xs font-bold rounded-xl px-4 flex items-center gap-2 shadow-2xs"
          >
            <Plus className="w-4 h-4" />
            <span>Tạo Giải Mới</span>
          </Button>
        </div>
      </div>

      {/* 2. CAROUSEL DANH SÁCH THẺ GIẢI ĐẤU */}
      <div className="flex gap-3.5 overflow-x-auto pb-1 scrollbar-thin">
        {tournaments.length > 0 ? (
          tournaments.map((t) => {
            const isSelected = activeTournament?.id === t.id;
            return (
              <button
                key={t.id}
                onClick={() => handleSelectTournament(t)}
                className={`p-3.5 rounded-2xl border text-left shrink-0 w-64 space-y-2.5 transition-all ${
                  isSelected
                    ? "bg-white border-amber-400 ring-2 ring-amber-400/20 shadow-md"
                    : "bg-white border-neutral-200/80 hover:bg-neutral-50/80 shadow-2xs"
                }`}
              >
                <div className="flex justify-between items-start gap-2">
                  <span className="text-xs font-black text-neutral-950 line-clamp-1">
                    {t.title}
                  </span>
                  {renderStatusBadge(t.status)}
                </div>

                <div className="text-[11px] text-neutral-600 flex items-center gap-1.5 font-medium">
                  <Gamepad2 className="w-3.5 h-3.5 text-neutral-400" />
                  <span>{t.gameName || "Splendor"}</span>
                </div>

                <div className="flex justify-between items-center text-[10px] text-neutral-500 font-mono pt-1.5 border-t border-neutral-100">
                  <span className="font-bold text-neutral-700">
                    VĐV: {t.registeredCount || 0}/{t.maxParticipants}
                  </span>
                  <span className="text-emerald-600 font-bold">
                    Check-in: {t.checkedInCount || 0}
                  </span>
                </div>
              </button>
            );
          })
        ) : (
          <div className="w-full p-6 text-center text-xs text-neutral-400 border border-dashed border-neutral-200 rounded-2xl bg-white font-medium">
            Không tìm thấy giải đấu nào phù hợp với trạng thái đã lọc.
          </div>
        )}
      </div>

      {/* 3. TOOLBAR ĐIỀU HÀNH THU GỌN THEO TRẠNG THÁI */}
      {activeTournament && (
        <div className="bg-white border border-neutral-200/80 rounded-2xl p-4 shadow-2xs flex flex-wrap items-center justify-between gap-4">
          <div className="flex items-center gap-4">
            <div className="space-y-0.5">
              <div className="flex items-center gap-2">
                {renderStatusBadge(activeTournament.status)}
                <span className="font-black text-base text-neutral-950">
                  {activeTournament.title}
                </span>
                <span className="text-xs text-neutral-400 font-mono">
                  #{activeTournament.id.slice(0, 8)}
                </span>
              </div>
              <div className="flex items-center gap-3 text-xs text-neutral-500 font-medium">
                <span>
                  Trò chơi:{" "}
                  <strong>{activeTournament.gameName || "Splendor"}</strong>
                </span>
                <span>•</span>
                <span>
                  Vòng:{" "}
                  <strong className="text-amber-600 font-mono">
                    #{activeTournament.currentRound || 0}/
                    {activeTournament.totalRounds || 4}
                  </strong>
                </span>
                <span>•</span>
                <span>
                  VĐV:{" "}
                  <strong className="text-emerald-600 font-mono">
                    {activeTournament.checkedInCount || 0}/
                    {activeTournament.registeredCount || 0} (Max:{" "}
                    {activeTournament.maxParticipants})
                  </strong>
                </span>
              </div>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            {/* TRẠNG THÁI DRAFT */}
            {activeTournament.status === "Draft" && (
              <>
                <Button
                  onClick={() => setShowEditModal(true)}
                  variant="outline"
                  className="h-9 border-neutral-200 text-neutral-700 text-xs font-bold rounded-xl"
                >
                  <Edit3 className="w-3.5 h-3.5 mr-1" /> Sửa Giải
                </Button>
                <Button
                  onClick={() =>
                    handleToggleRegistration(activeTournament.id, true)
                  }
                  className="h-9 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold rounded-xl px-4"
                >
                  <Play className="w-3.5 h-3.5 mr-1" /> Mở Đăng Ký
                </Button>
              </>
            )}

            {/* TRẠNG THÁI REGISTRATION OPEN */}
            {activeTournament.status === "RegistrationOpen" && (
              <>
                <Button
                  onClick={() =>
                    handleToggleRegistration(activeTournament.id, false)
                  }
                  className="h-9 bg-amber-600 hover:bg-amber-700 text-white text-xs font-bold rounded-xl px-3"
                >
                  Đóng Đăng Ký
                </Button>
                <Button
                  onClick={() => handleExtendRegistration(activeTournament.id)}
                  variant="outline"
                  className="h-9 border-blue-600 text-blue-700 text-xs font-bold rounded-xl"
                >
                  <Clock className="w-3.5 h-3.5 mr-1" /> Gia Hạn
                </Button>
                <Button
                  onClick={() => setShowWalkInModal(true)}
                  variant="outline"
                  className="h-9 border-emerald-600 text-emerald-700 text-xs font-bold rounded-xl"
                >
                  <UserPlus className="w-3.5 h-3.5 mr-1" /> Thêm Walk-in
                </Button>
              </>
            )}

            {/* TRẠNG THÁI REGISTRATION CLOSED */}
            {activeTournament.status === "RegistrationClosed" && (
              <>
                <Button
                  onClick={handleOpenPairingPreviewModal}
                  variant="outline"
                  className="h-9 border-blue-600 text-blue-700 hover:bg-blue-50 text-xs font-bold rounded-xl flex items-center gap-1.5"
                >
                  <Eye className="w-3.5 h-3.5" /> Xem Chi Tiết Bảng Cặp (Preview
                  R1)
                </Button>
                <Button
                  onClick={() => handleStartTournament(activeTournament.id)}
                  className="h-9 bg-amber-600 hover:bg-amber-700 text-white text-xs font-bold rounded-xl px-4"
                >
                  <Swords className="w-3.5 h-3.5 mr-1" /> Bắt Đầu Giải (Start
                  R1)
                </Button>
                <Button
                  onClick={() => handleReopenRegistration(activeTournament.id)}
                  variant="outline"
                  className="h-9 border-emerald-600 text-emerald-700 text-xs font-bold rounded-xl"
                >
                  Mở Lại Đăng Ký
                </Button>
                <Button
                  onClick={() => setShowWalkInModal(true)}
                  variant="outline"
                  className="h-9 border-emerald-600 text-emerald-700 text-xs font-bold rounded-xl"
                >
                  <UserPlus className="w-3.5 h-3.5 mr-1" /> Thêm Walk-in
                </Button>
              </>
            )}

            {/* TRẠNG THÁI ONGOING */}
            {activeTournament.status === "OnGoing" && (
              <>
                <Button
                  onClick={handleOpenPairingPreviewModal}
                  variant="outline"
                  className="h-9 border-blue-600 text-blue-700 hover:bg-blue-50 text-xs font-bold rounded-xl flex items-center gap-1.5"
                >
                  <Eye className="w-3.5 h-3.5" /> Xem Ghép Cặp
                </Button>
                <Button
                  onClick={() => handleAdvanceRound(activeTournament.id)}
                  className="h-9 bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold rounded-xl px-4"
                >
                  <ChevronRight className="w-3.5 h-3.5 mr-1" /> Chuyển Vòng Tiếp
                  Theo
                </Button>
                <Button
                  onClick={() => handleCompleteTournament(activeTournament.id)}
                  className="h-9 bg-emerald-700 hover:bg-emerald-800 text-white text-xs font-bold rounded-xl px-4"
                >
                  <CheckCircle2 className="w-3.5 h-3.5 mr-1" /> Hoàn Thành Giải
                  (Apply Elo)
                </Button>
                {activeTournament.currentRound <= 1 && (
                  <Button
                    onClick={() => setShowWalkInModal(true)}
                    variant="outline"
                    className="h-9 border-emerald-600 text-emerald-700 text-xs font-bold rounded-xl"
                  >
                    <UserPlus className="w-3.5 h-3.5 mr-1" /> Thêm Walk-in
                  </Button>
                )}
              </>
            )}

            {/* NÚT HỦY GIẢI ĐẤU */}
            {activeTournament.status !== "Completed" &&
              activeTournament.status !== "Cancelled" && (
                <Button
                  variant="outline"
                  onClick={() => {
                    const reason = prompt(
                      "Nhập lý do hủy giải đấu (Audit Log):",
                    );
                    if (reason && reason.trim()) {
                      handleCancelTournament(
                        activeTournament.id,
                        reason.trim(),
                      );
                    }
                  }}
                  className="h-9 border-rose-200 text-rose-700 hover:bg-rose-50 text-xs font-bold rounded-xl"
                >
                  <XCircle className="w-3.5 h-3.5 mr-1" /> Hủy Giải
                </Button>
              )}
          </div>
        </div>
      )}

      {/* 4. BRACKET & PAIRINGS CANVAS TOÀN TRANG */}
      {loading ? (
        <div className="p-24 text-center text-xs text-neutral-400 border border-dashed border-neutral-200 rounded-3xl bg-white font-medium">
          Đang tải dữ liệu giải đấu...
        </div>
      ) : activeTournament ? (
        <TournamentBracketCanvas
          matches={activeTournament.matches || []}
          participants={activeTournament.participants || []}
          pairingPreview={pairingPreview}
          currentRound={activeTournament.currentRound || 1}
          totalRounds={activeTournament.totalRounds || 4}
          onSelectMatch={(m) => setSelectedMatch(m)}
          onAdvancePlayer={handleAdvancePlayer}
          onConfirmPairings={
            activeTournament.status === "RegistrationClosed"
              ? () => handleStartTournament(activeTournament.id)
              : () => handleAdvanceRound(activeTournament.id)
          }
        />
      ) : null}

      {/* 5. MODAL SUITE */}

      {/* Modal Tạo Giải Draft */}
      <TournamentCreateModal
        isOpen={showCreateModal}
        onClose={() => setShowCreateModal(false)}
        onSubmit={handleCreateTournament}
      />

      {/* Modal Chỉnh Sửa Giải Draft */}
      <TournamentEditModal
        key={activeTournament?.id || "edit-modal"}
        isOpen={showEditModal}
        onClose={() => setShowEditModal(false)}
        tournament={activeTournament}
        onSubmit={handleUpdateTournament}
      />

      {/* Modal Đăng Ký Khách Vãng Lai (Walk-in) */}
      {activeTournament && (
        <TournamentWalkInModal
          isOpen={showWalkInModal}
          onClose={() => setShowWalkInModal(false)}
          tournamentId={activeTournament.id}
          onSubmit={handleAddWalkInParticipant}
        />
      )}

      {/* Modal Xem Trước Bảng Ghép Cặp (Popup Preview) */}
      <TournamentPairingPreviewModal
        isOpen={showPairingPreviewModal}
        onClose={() => setShowPairingPreviewModal(false)}
        previewData={pairingPreview}
        loading={pairingPreviewLoading}
        participants={activeTournament?.participants || []}
        onConfirmStart={
          activeTournament?.status === "RegistrationClosed"
            ? () => handleStartTournament(activeTournament.id)
            : undefined
        }
      />

      {/* Modal Ghi Nhận / Sửa Kết Quả Bàn Đấu (POST / PATCH) */}
      <TournamentMatchResultModal
        key={selectedMatch?.id || "match-result-modal"}
        isOpen={!!selectedMatch}
        onClose={() => setSelectedMatch(null)}
        match={selectedMatch}
        onSaveResult={handleRecordMatchResult}
        onUpdateResult={handleUpdateMatchResult}
      />

      {/* Modal Hủy Bàn Đấu */}
      <TournamentMatchCancelModal
        key={cancelMatchTarget?.id || "match-cancel-modal"}
        isOpen={!!cancelMatchTarget}
        onClose={() => setCancelMatchTarget(null)}
        match={cancelMatchTarget}
        onCancelMatch={handleCancelMatch}
      />
    </div>
  );
}
