/* eslint-disable @typescript-eslint/no-explicit-any */
"use client";

import { useEffect, useState, useCallback } from "react";
import { useTournamentPos } from "../hooks/useTournamentPos";
import {
  TournamentMatch,
  TournamentParticipant,
} from "../types/tournament.types";
import { MatchResultModal } from "./match-result-modal";
import { TournamentCreateModal } from "./tournament-create-modal";
import { TournamentWalkInModal } from "./tournament-walkin-modal";
import { TournamentPairingStudioModal } from "./tournament-pairing-studio-modal";
import { TournamentParticipantsTable } from "./tournament-participants-table";
import { apiClient } from "@/core/api/client";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import {
  Trophy,
  Swords,
  Play,
  CheckCircle2,
  XCircle,
  Plus,
  ChevronRight,
  UserPlus,
  Users,
  RefreshCw,
  Lock,
  LayoutGrid,
} from "lucide-react";

export function TournamentPosContainer({ cafeId }: { cafeId: string | null }) {
  const {
    tournaments,
    activeTournament,
    setActiveTournament,
    loading,
    fetchTournaments,
    handleCreateTournament,
    handleOpenRegistration,
    handleCloseRegistration,
    handleStartTournament,
    handleAdvanceRound,
    handleCompleteTournament,
    handleCancelTournament,
    handleCheckInParticipant,
    handleNoShowParticipant,
    handleStartMatch,
    handleRecordMatchResult,
    handleCancelMatch,
  } = useTournamentPos(cafeId);

  // States
  const [participants, setParticipants] = useState<TournamentParticipant[]>([]);
  const [loadingParticipants, setLoadingParticipants] = useState(false);
  const [matches, setMatches] = useState<TournamentMatch[]>([]);
  const [loadingMatches, setLoadingMatches] = useState(false);

  // Tab View khi OnGoing: Xem Bàn Đấu (MATCHES) hoặc Xem Bảng Quản Lý Tuyển Thủ (ROSTER)
  const [mainView, setMainView] = useState<"MATCHES" | "ROSTER">("MATCHES");

  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showWalkInModal, setShowWalkInModal] = useState(false);
  const [showPairingStudio, setShowPairingStudio] = useState(false);
  const [selectedMatch, setSelectedMatch] = useState<TournamentMatch | null>(
    null,
  );
  const [actionLoadingId, setActionLoadingId] = useState<string | null>(null);

  // Refresh danh sách VĐV
  const refreshParticipants = useCallback(async (tournamentId: string) => {
    try {
      setLoadingParticipants(true);
      const res: unknown = await apiClient.get(
        `/api/v1/pos/tournaments/${tournamentId}/participants`,
      );
      const resData = res as { data?: TournamentParticipant[] };
      const list = resData?.data || (res as TournamentParticipant[]) || [];
      setParticipants(list);
    } catch {
      setParticipants([]);
    } finally {
      setLoadingParticipants(false);
    }
  }, []);

  // Fetch danh sách Bàn đấu
  const refreshMatches = useCallback(
    async (tournamentId: string, currentRound: number) => {
      try {
        setLoadingMatches(true);
        const endpoint =
          currentRound > 0
            ? `/api/v1/pos/tournaments/${tournamentId}/matches/round/${currentRound}`
            : `/api/v1/pos/tournaments/${tournamentId}/matches`;

        const res: unknown = await apiClient.get(endpoint);
        const resData = res as { data?: any[] };
        const list: any[] = resData?.data || (res as any[]) || [];

        setMatches(list);
      } catch {
        setMatches([]);
      } finally {
        setLoadingMatches(false);
      }
    },
    [],
  );

  // Fetch Tournament ban đầu
  useEffect(() => {
    if (!cafeId) return;
    let isMounted = true;
    const loadTournaments = async () => {
      try {
        await fetchTournaments();
      } catch {}
    };
    if (isMounted) void loadTournaments();
    return () => {
      isMounted = false;
    };
  }, [cafeId, fetchTournaments]);

  // Load VĐV & Bàn đấu khi activeTournament thay đổi
  useEffect(() => {
    const tournamentId = activeTournament?.id;
    const currentRound = activeTournament?.currentRound || 0;
    const isOngoing = activeTournament?.status === "OnGoing";
    let isMounted = true;

    if (!tournamentId) {
      const clearTimer = setTimeout(() => {
        if (isMounted) {
          setParticipants([]);
          setMatches([]);
        }
      }, 0);
      return () => {
        isMounted = false;
        clearTimeout(clearTimer);
      };
    }

    const loadParticipants = async () => {
      try {
        setLoadingParticipants(true);
        const res: unknown = await apiClient.get(
          `/api/v1/pos/tournaments/${tournamentId}/participants`,
        );
        const resData = res as { data?: TournamentParticipant[] };
        const list = resData?.data || (res as TournamentParticipant[]) || [];
        if (isMounted) setParticipants(list);
      } catch {
        if (isMounted) setParticipants([]);
      } finally {
        if (isMounted) setLoadingParticipants(false);
      }
    };

    const loadMatches = async () => {
      if (!isOngoing) {
        if (isMounted) setMatches([]);
        return;
      }
      try {
        setLoadingMatches(true);
        const endpoint =
          currentRound > 0
            ? `/api/v1/pos/tournaments/${tournamentId}/matches/round/${currentRound}`
            : `/api/v1/pos/tournaments/${tournamentId}/matches`;
        const res: unknown = await apiClient.get(endpoint);
        const resData = res as { data?: any[] };
        const list: any[] = resData?.data || (res as any[]) || [];
        if (isMounted) setMatches(list);
      } catch {
        if (isMounted) setMatches([]);
      } finally {
        if (isMounted) setLoadingMatches(false);
      }
    };

    void loadParticipants();
    void loadMatches();

    return () => {
      isMounted = false;
    };
  }, [
    activeTournament?.id,
    activeTournament?.status,
    activeTournament?.currentRound,
  ]);

  const onStartMatch = async (matchId: string) => {
    if (!activeTournament) return;
    const ok = await handleStartMatch(matchId);
    if (ok)
      await refreshMatches(activeTournament.id, activeTournament.currentRound);
  };

  const onSaveMatchResult = async (dto: any) => {
    if (!activeTournament) return false;
    const ok = await handleRecordMatchResult(dto);
    if (ok) {
      await refreshMatches(activeTournament.id, activeTournament.currentRound);
      await refreshParticipants(activeTournament.id);
    }
    return ok;
  };

  const onCancelMatch = async (matchId: string, reason: string) => {
    if (!activeTournament) return;
    const ok = await handleCancelMatch(matchId, reason);
    if (ok)
      await refreshMatches(activeTournament.id, activeTournament.currentRound);
  };

  const handleAddWalkIn = async (dto: {
    displayName: string;
    phoneNumber?: string;
  }) => {
    if (!activeTournament) return false;
    try {
      await apiClient.post(
        `/api/v1/pos/tournaments/${activeTournament.id}/walk-in`,
        dto,
      );
      toast.success("Đã thêm khách vãng lai!");
      await refreshParticipants(activeTournament.id);
      await fetchTournaments();
      return true;
    } catch (err: unknown) {
      const error = err as { message?: string };
      toast.error(error?.message || "Lỗi thêm khách vãng lai.");
      return false;
    }
  };

  const handleKickParticipant = async (
    participantId: string,
    reason: string,
  ) => {
    if (!activeTournament) return;
    setActionLoadingId(participantId);
    try {
      await apiClient.post(
        `/api/v1/pos/tournaments/${activeTournament.id}/participants/${participantId}/kick`,
        { reason },
      );
      toast.success("Đã loại tuyển thủ khỏi giải đấu.");
      await refreshParticipants(activeTournament.id);
      await fetchTournaments();
    } catch (err: unknown) {
      const error = err as { message?: string };
      toast.error(error?.message || "Lỗi loại tuyển thủ.");
    } finally {
      setActionLoadingId(null);
    }
  };

  const onCheckIn = async (participantId: string) => {
    if (!activeTournament) return;
    setActionLoadingId(participantId);
    try {
      const ok = await handleCheckInParticipant(
        activeTournament.id,
        participantId,
      );
      if (ok) await refreshParticipants(activeTournament.id);
    } finally {
      setActionLoadingId(null);
    }
  };

  const onNoShow = async (participantId: string) => {
    if (!activeTournament) return;
    setActionLoadingId(participantId);
    try {
      const ok = await handleNoShowParticipant(
        activeTournament.id,
        participantId,
      );
      if (ok) await refreshParticipants(activeTournament.id);
    } finally {
      setActionLoadingId(null);
    }
  };

  if (loading && !activeTournament) {
    return (
      <div className="h-96 flex flex-col items-center justify-center space-y-3">
        <div className="w-8 h-8 border-2 border-neutral-900 border-t-transparent rounded-full animate-spin" />
        <span className="text-xs text-neutral-400 font-bold">
          Đang nạp dữ liệu giải đấu...
        </span>
      </div>
    );
  }

  const isAnyMatchStarted = matches.some(
    (m) => m.status === "OnGoing" || m.status === "Completed",
  );

  return (
    <div className="space-y-4 max-w-7xl mx-auto pb-10">
      {/* Header Bar */}
      <div className="bg-white p-4 rounded-3xl border border-neutral-200/80 shadow-2xs flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="p-2.5 bg-amber-500 text-white rounded-2xl shadow-xs">
            <Trophy className="w-5 h-5" />
          </div>
          <div>
            <h1 className="text-base font-black text-neutral-950">
              Tournament Command Center
            </h1>
            <p className="text-xs text-neutral-500">
              Quản lý và điều phối giải đấu Splendor tại quầy
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          {tournaments.length > 1 && (
            <select
              value={activeTournament?.id || ""}
              onChange={(e) => {
                const found = tournaments.find((t) => t.id === e.target.value);
                if (found) setActiveTournament(found);
              }}
              className="h-9 px-3 rounded-xl border bg-neutral-50 text-xs font-bold text-neutral-800"
            >
              {tournaments.map((t) => (
                <option key={t.id} value={t.id}>
                  {t.title} ({t.status})
                </option>
              ))}
            </select>
          )}

          <Button
            onClick={() => setShowCreateModal(true)}
            className="h-9 bg-neutral-950 hover:bg-neutral-800 text-white text-xs font-bold rounded-xl px-4 flex items-center gap-1.5"
          >
            <Plus className="w-4 h-4" /> Tạo Giải Mới
          </Button>
        </div>
      </div>

      {/* Hero Tournament Card */}
      {activeTournament ? (
        <div className="space-y-4">
          <div className="bg-white p-5 rounded-3xl border border-neutral-200 shadow-2xs space-y-4">
            <div className="flex flex-wrap items-center justify-between gap-3 border-b pb-3">
              <div>
                <div className="flex items-center gap-2">
                  <span className="px-2.5 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider bg-amber-100 text-amber-800 border border-amber-300">
                    {activeTournament.status}
                  </span>
                  <h2 className="text-lg font-black text-neutral-950">
                    {activeTournament.title}
                  </h2>
                </div>
                <p className="text-xs text-neutral-500 font-medium mt-1">
                  Trò chơi:{" "}
                  <strong>{activeTournament.gameName || "Splendor"}</strong> •
                  Bắt đầu:{" "}
                  <strong>
                    {new Date(activeTournament.startTime).toLocaleString(
                      "vi-VN",
                    )}
                  </strong>
                </p>
              </div>

              {/* Action Buttons */}
              <div className="flex items-center gap-2">
                {activeTournament.status === "Draft" && (
                  <Button
                    onClick={() => handleOpenRegistration(activeTournament.id)}
                    className="h-9 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold rounded-xl px-4"
                  >
                    <Play className="w-3.5 h-3.5 mr-1" /> Mở Đăng Ký
                  </Button>
                )}

                {activeTournament.status === "RegistrationOpen" && (
                  <>
                    <Button
                      onClick={() => setShowPairingStudio(true)}
                      variant="outline"
                      className="h-9 border-neutral-300 text-neutral-800 text-xs font-bold rounded-xl flex items-center gap-1.5"
                    >
                      <Swords className="w-3.5 h-3.5" /> Xếp Bảng Cặp R1
                    </Button>
                    <Button
                      onClick={() => setShowWalkInModal(true)}
                      variant="outline"
                      className="h-9 border-neutral-300 text-neutral-800 text-xs font-bold rounded-xl flex items-center gap-1.5"
                    >
                      <UserPlus className="w-3.5 h-3.5" /> Thêm Walk-in
                    </Button>
                    <Button
                      onClick={() =>
                        handleCloseRegistration(activeTournament.id)
                      }
                      className="h-9 bg-amber-600 hover:bg-amber-700 text-white text-xs font-bold rounded-xl px-4"
                    >
                      Đóng Đăng Ký
                    </Button>
                  </>
                )}

                {activeTournament.status === "RegistrationClosed" && (
                  <>
                    <Button
                      onClick={() => setShowPairingStudio(true)}
                      variant="outline"
                      className="h-9 border-neutral-300 text-neutral-800 text-xs font-bold rounded-xl flex items-center gap-1.5"
                    >
                      <Swords className="w-3.5 h-3.5" /> Xếp Bảng Cặp R1
                    </Button>
                    <Button
                      onClick={() => setShowWalkInModal(true)}
                      variant="outline"
                      className="h-9 border-neutral-300 text-neutral-800 text-xs font-bold rounded-xl flex items-center gap-1.5"
                    >
                      <UserPlus className="w-3.5 h-3.5" /> Thêm Walk-in
                    </Button>
                    <Button
                      onClick={() => handleStartTournament(activeTournament.id)}
                      className="h-9 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold rounded-xl px-5 shadow-xs"
                    >
                      <Swords className="w-4 h-4 mr-1.5" /> Bắt Đầu Giải (Start
                      R1)
                    </Button>
                  </>
                )}

                {activeTournament.status === "OnGoing" && (
                  <>
                    <Button
                      onClick={() => handleAdvanceRound(activeTournament.id)}
                      className="h-9 bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold rounded-xl px-4"
                    >
                      <ChevronRight className="w-4 h-4 mr-1" /> Chuyển Vòng Tiếp
                    </Button>
                    <Button
                      onClick={() =>
                        handleCompleteTournament(activeTournament.id)
                      }
                      className="h-9 bg-emerald-700 hover:bg-emerald-800 text-white text-xs font-bold rounded-xl px-4"
                    >
                      <CheckCircle2 className="w-4 h-4 mr-1" /> Hoàn Thành Giải
                    </Button>
                  </>
                )}

                {activeTournament.status !== "OnGoing" &&
                  activeTournament.status !== "Completed" &&
                  activeTournament.status !== "Cancelled" && (
                    <Button
                      variant="outline"
                      onClick={() => {
                        const reason = prompt("Lý do hủy giải đấu:");
                        if (reason?.trim()) {
                          void handleCancelTournament(
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

            {/* Quick Specs Grid */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs">
              <div className="p-3 bg-neutral-50 rounded-2xl border">
                <span className="text-neutral-400 font-bold text-[10px] uppercase block">
                  Tiến độ vòng
                </span>
                <span className="font-mono font-black text-neutral-900 text-sm">
                  #{activeTournament.currentRound}/
                  {activeTournament.totalRounds || 4}
                </span>
              </div>

              <div className="p-3 bg-neutral-50 rounded-2xl border">
                <span className="text-neutral-400 font-bold text-[10px] uppercase block">
                  Sĩ số VĐV
                </span>
                <span className="font-mono font-black text-neutral-900 text-sm">
                  {participants.length}/{activeTournament.maxParticipants}
                </span>
              </div>

              <div className="p-3 bg-neutral-50 rounded-2xl border">
                <span className="text-neutral-400 font-bold text-[10px] uppercase block">
                  Đã Check-in
                </span>
                <span className="font-mono font-black text-emerald-700 text-sm">
                  {
                    participants.filter(
                      (p) => p.status === "CheckedIn" || p.status === "Active",
                    ).length
                  }{" "}
                  VĐV
                </span>
              </div>

              <div className="p-3 bg-neutral-50 rounded-2xl border">
                <span className="text-neutral-400 font-bold text-[10px] uppercase block">
                  Thời lượng ván
                </span>
                <span className="font-mono font-black text-neutral-900 text-sm">
                  {activeTournament.roundDurationMinutes} phút
                </span>
              </div>
            </div>
          </div>

          {/* Thanh điều hướng Tab khi giải OnGoing */}
          {activeTournament.status === "OnGoing" && (
            <div className="flex items-center gap-2 bg-neutral-100/70 p-1.5 rounded-2xl w-fit">
              <button
                onClick={() => setMainView("MATCHES")}
                className={`px-4 py-2 rounded-xl text-xs font-black transition-all flex items-center gap-1.5 ${
                  mainView === "MATCHES"
                    ? "bg-white text-neutral-950 shadow-xs"
                    : "text-neutral-500 hover:text-neutral-900"
                }`}
              >
                <LayoutGrid className="w-4 h-4" /> Bàn Đấu Vòng #
                {activeTournament.currentRound} ({matches.length})
              </button>

              <button
                onClick={() => setMainView("ROSTER")}
                className={`px-4 py-2 rounded-xl text-xs font-black transition-all flex items-center gap-1.5 ${
                  mainView === "ROSTER"
                    ? "bg-white text-neutral-950 shadow-xs"
                    : "text-neutral-500 hover:text-neutral-900"
                }`}
              >
                <Users className="w-4 h-4" /> Danh Sách Tuyển Thủ (
                {participants.length})
              </button>
            </div>
          )}

          {/* Khu vực nội dung chính */}
          {activeTournament.status === "OnGoing" && mainView === "MATCHES" ? (
            /* 1. ARENA BÀN ĐẤU */
            <div className="bg-white p-5 rounded-3xl border border-neutral-200 shadow-2xs space-y-4">
              <div className="flex flex-wrap items-center justify-between gap-3 border-b pb-3">
                <div className="flex items-center gap-2">
                  <Swords className="w-5 h-5 text-amber-600" />
                  <h3 className="font-black text-sm text-neutral-950">
                    Bàn Đấu Vòng #{activeTournament.currentRound} (
                    {matches.length} bàn)
                  </h3>
                </div>

                <div className="flex items-center gap-2">
                  {!isAnyMatchStarted ? (
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => setShowPairingStudio(true)}
                      className="h-8 text-xs font-bold rounded-xl border-amber-300 bg-amber-50/60 text-amber-900 hover:bg-amber-100 flex items-center gap-1.5"
                    >
                      <Swords className="w-3.5 h-3.5 text-amber-600" /> Xếp Lại
                      Bảng Cặp
                    </Button>
                  ) : (
                    <span className="text-[11px] font-bold text-neutral-500 bg-neutral-100 border border-neutral-200 px-2.5 py-1 rounded-xl flex items-center gap-1">
                      <Lock className="w-3 h-3 text-neutral-400" /> Đã khóa ghép
                      cặp
                    </span>
                  )}

                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() =>
                      refreshMatches(
                        activeTournament.id,
                        activeTournament.currentRound,
                      )
                    }
                    disabled={loadingMatches}
                    className="h-8 text-xs font-bold rounded-xl border-neutral-300 flex items-center gap-1"
                  >
                    <RefreshCw
                      className={`w-3 h-3 ${loadingMatches ? "animate-spin" : ""}`}
                    />{" "}
                    Làm mới bàn đấu
                  </Button>
                </div>
              </div>

              {loadingMatches ? (
                <div className="text-center py-16 text-xs text-neutral-400 font-bold">
                  Đang tải danh sách bàn đấu...
                </div>
              ) : matches.length === 0 ? (
                <div className="text-center py-16 border border-dashed rounded-2xl bg-neutral-50/50 p-6 space-y-2">
                  <Swords className="w-8 h-8 text-neutral-300 mx-auto" />
                  <p className="text-xs text-neutral-500 font-medium">
                    Chưa có bàn đấu nào được khởi tạo cho vòng #
                    {activeTournament.currentRound}.
                  </p>
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
                  {matches.map((match: any) => {
                    const slotIndices = [1, 2, 3, 4] as const;
                    const tablePlayers = slotIndices
                      .map((slot) => {
                        const pId = match[`player${slot}Id`];
                        if (!pId) return null;

                        const participantInfo = participants.find(
                          (p) => p.userId === pId || p.id === pId,
                        );

                        return {
                          slot,
                          userId: pId,
                          userName:
                            participantInfo?.walkInDisplayName ||
                            participantInfo?.username ||
                            `VĐV #${pId.slice(0, 4)}`,
                          avatarUrl: participantInfo?.avatarUrl,
                          currentElo:
                            participantInfo?.currentElo ||
                            participantInfo?.initialElo ||
                            1200,
                          score: match[`player${slot}Score`],
                          cardsBought: match[`player${slot}CardsBought`],
                          isWinner: match.winnerPlayerId === pId,
                        };
                      })
                      .filter(Boolean);

                    return (
                      <div
                        key={match.id}
                        className="p-4 rounded-3xl border border-neutral-200/90 bg-white space-y-3.5 shadow-2xs flex flex-col justify-between overflow-hidden"
                      >
                        <div className="space-y-3">
                          <div className="flex items-center justify-between">
                            <span className="font-black text-sm text-neutral-950">
                              {match.tableName ||
                                `Bàn #${match.matchNumber || match.tableNumber || match.id.slice(0, 6)}`}
                            </span>
                            <span
                              className={`px-2 py-0.5 rounded-lg text-[9px] font-black uppercase tracking-wider ${
                                match.status === "Completed"
                                  ? "bg-emerald-100 text-emerald-800"
                                  : match.status === "OnGoing"
                                    ? "bg-blue-100 text-blue-800"
                                    : "bg-neutral-100 text-neutral-600"
                              }`}
                            >
                              {match.status}
                            </span>
                          </div>

                          <div className="space-y-2">
                            {tablePlayers.map((p: any) => (
                              <div
                                key={p.userId}
                                className={`flex items-center justify-between text-xs px-3 py-2 rounded-2xl border transition-colors ${
                                  p.isWinner
                                    ? "bg-amber-50/80 border-amber-300 font-bold"
                                    : "bg-neutral-50/60 border-neutral-100"
                                }`}
                              >
                                <div className="flex items-center gap-1.5 min-w-0 pr-2">
                                  {p.isWinner && (
                                    <Trophy className="w-3.5 h-3.5 text-amber-600 shrink-0" />
                                  )}
                                  <span className="text-neutral-900 truncate font-bold text-xs">
                                    {p.userName}
                                  </span>
                                  <span className="text-[10px] font-mono text-neutral-400 shrink-0">
                                    ({p.currentElo})
                                  </span>
                                </div>

                                <div className="flex items-center gap-1.5 shrink-0 font-mono text-xs">
                                  {p.score !== null && p.score !== undefined ? (
                                    <span className="font-black text-neutral-900">
                                      {p.score}đ
                                    </span>
                                  ) : (
                                    <span className="text-neutral-300">--</span>
                                  )}
                                  {p.cardsBought !== null &&
                                    p.cardsBought !== undefined && (
                                      <span className="text-neutral-400 text-[10px]">
                                        ({p.cardsBought} thẻ)
                                      </span>
                                    )}
                                </div>
                              </div>
                            ))}
                          </div>
                        </div>

                        <div className="pt-3 border-t border-neutral-100 flex flex-wrap items-center justify-end gap-1.5">
                          {match.status !== "Completed" &&
                            match.status !== "Cancelled" && (
                              <Button
                                size="sm"
                                variant="outline"
                                onClick={() => {
                                  const reason = prompt(
                                    "Nhập lý do hủy bàn đấu:",
                                  );
                                  if (reason?.trim())
                                    onCancelMatch(match.id, reason.trim());
                                }}
                                className="h-8 px-2.5 border-rose-200 text-rose-600 hover:bg-rose-50 text-[11px] font-bold rounded-xl"
                              >
                                Hủy Bàn
                              </Button>
                            )}

                          {match.status === "Scheduled" && (
                            <Button
                              size="sm"
                              onClick={() => onStartMatch(match.id)}
                              className="h-8 px-3 bg-blue-600 hover:bg-blue-700 text-white text-[11px] font-bold rounded-xl shadow-2xs"
                            >
                              Bắt Đầu Bàn
                            </Button>
                          )}

                          <Button
                            size="sm"
                            onClick={() => {
                              setSelectedMatch({
                                ...match,
                                players: tablePlayers,
                              });
                            }}
                            className="h-8 px-3.5 bg-neutral-950 hover:bg-neutral-800 text-white text-[11px] font-bold rounded-xl shadow-2xs"
                          >
                            {match.status === "Completed"
                              ? "Sửa Điểm"
                              : "Ghi Kết Quả"}
                          </Button>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          ) : (
            /* 2. BẢNG QUẢN LÝ TUYỂN THỦ (Dùng chung cho cả Sảnh chờ và Trong lúc thi đấu) */
            <TournamentParticipantsTable
              participants={participants}
              loading={loadingParticipants}
              onCheckIn={onCheckIn}
              onNoShow={onNoShow}
              onKick={handleKickParticipant}
              actionLoadingId={actionLoadingId}
              onAddWalkInClick={() => setShowWalkInModal(true)}
            />
          )}
        </div>
      ) : (
        <div className="text-center py-20 bg-white border border-dashed rounded-3xl p-6">
          <p className="text-xs text-neutral-400 font-medium">
            Chưa có giải đấu nào được chọn hoặc tạo mới.
          </p>
        </div>
      )}

      {/* Các Modal Vệ Tinh */}
      <MatchResultModal
        isOpen={!!selectedMatch}
        onClose={() => setSelectedMatch(null)}
        match={selectedMatch}
        onSaveResult={onSaveMatchResult}
      />

      <TournamentCreateModal
        isOpen={showCreateModal}
        onClose={() => setShowCreateModal(false)}
        onSubmit={handleCreateTournament}
      />

      <TournamentWalkInModal
        isOpen={showWalkInModal}
        onClose={() => setShowWalkInModal(false)}
        onSubmit={handleAddWalkIn}
      />

      {activeTournament && (
        <TournamentPairingStudioModal
          isOpen={showPairingStudio}
          onClose={() => setShowPairingStudio(false)}
          tournamentId={activeTournament.id}
          roundNumber={activeTournament.currentRound || 1}
          onPairingSaved={() => {
            void fetchTournaments();
            if (activeTournament.status === "OnGoing") {
              void refreshMatches(
                activeTournament.id,
                activeTournament.currentRound,
              );
            }
          }}
        />
      )}
    </div>
  );
}
