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
import { TournamentPairingStudioModal } from "./tournament-pairing-studio-modal";
import { TournamentParticipantsTable } from "./tournament-participants-table";
import { TournamentPodiumModal } from "./tournament-podium-modal";
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
  RefreshCw,
  Lock,
  LayoutGrid,
  Users,
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
  const [matches, setMatches] = useState<any[]>([]);
  const [loadingMatches, setLoadingMatches] = useState(false);

  // Tab View khi OnGoing: MATCHES (Bàn Đấu) hoặc ROSTER (Quản Lý Tuyển Thủ)
  const [mainView, setMainView] = useState<"MATCHES" | "ROSTER">("MATCHES");

  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showPairingStudio, setShowPairingStudio] = useState(false);
  const [showPodiumModal, setShowPodiumModal] = useState(false);
  const [selectedMatch, setSelectedMatch] = useState<TournamentMatch | null>(
    null,
  );
  const [actionLoadingId, setActionLoadingId] = useState<string | null>(null);

  // 1. Refresh danh sách VĐV
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

  // 2. Fetch danh sách Bàn đấu
  const refreshMatches = useCallback(
    async (tournamentId: string, currentRound: number) => {
      try {
        setLoadingMatches(true);
        const round = currentRound > 0 ? currentRound : 1;

        let list: any[] = [];
        try {
          const res: unknown = await apiClient.get(
            `/api/v1/pos/tournaments/${tournamentId}/matches/round/${round}`,
          );
          const resData = res as { data?: any[] };
          list = resData?.data || (res as any[]) || [];
        } catch {
          const previewRes: unknown = await apiClient.get(
            `/api/v1/pos/tournaments/${tournamentId}/pairings/${round}/preview`,
          );
          const prevData = previewRes as { data?: any };
          const data = prevData?.data || previewRes;
          list =
            data?.pairings || data?.tables || (Array.isArray(data) ? data : []);
        }

        setMatches(list);
      } catch {
        setMatches([]);
      } finally {
        setLoadingMatches(false);
      }
    },
    [],
  );

  // 3. Fetch danh sách giải đấu ban đầu
  useEffect(() => {
    if (!cafeId) return;

    let isMounted = true;
    const loadTournaments = async () => {
      try {
        await fetchTournaments();
      } catch {
        // Handled in hook
      }
    };

    if (isMounted) {
      void loadTournaments();
    }

    return () => {
      isMounted = false;
    };
  }, [cafeId, fetchTournaments]);

  // 4. Tự động load VĐV & Bàn đấu khi activeTournament thay đổi
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
        const round = currentRound > 0 ? currentRound : 1;

        let list: any[] = [];
        try {
          const res: unknown = await apiClient.get(
            `/api/v1/pos/tournaments/${tournamentId}/matches/round/${round}`,
          );
          const resData = res as { data?: any[] };
          list = resData?.data || (res as any[]) || [];
        } catch {
          const previewRes: unknown = await apiClient.get(
            `/api/v1/pos/tournaments/${tournamentId}/pairings/${round}/preview`,
          );
          const prevData = previewRes as { data?: any };
          const data = prevData?.data || previewRes;
          list =
            data?.pairings || data?.tables || (Array.isArray(data) ? data : []);
        }

        if (isMounted) {
          setMatches(list);
        }
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

  // Bắt đầu 1 bàn đấu
  const onStartMatch = async (matchId: string) => {
    if (!activeTournament) return;
    const ok = await handleStartMatch(matchId);
    if (ok) {
      await refreshMatches(activeTournament.id, activeTournament.currentRound);
    }
  };

  // Ghi nhận kết quả bàn đấu (POST)
  const onSaveMatchResult = async (dto: any) => {
    if (!activeTournament) return false;
    const ok = await handleRecordMatchResult(dto);
    if (ok) {
      await refreshMatches(activeTournament.id, activeTournament.currentRound);
      await refreshParticipants(activeTournament.id);
    }
    return ok;
  };

  // Sửa kết quả bàn đấu đã Completed (PATCH)
  const onUpdateMatchResult = async (dto: any) => {
    if (!activeTournament) return false;
    try {
      const res: any = await apiClient.patch(
        `/api/v1/pos/tournaments/matches/${dto.matchId}/result`,
        dto,
      );
      toast.success(res?.message || "Sửa kết quả bàn đấu thành công!");
      await refreshMatches(activeTournament.id, activeTournament.currentRound);
      await refreshParticipants(activeTournament.id);
      return true;
    } catch (err: unknown) {
      const error = err as {
        message?: string;
        errors?: Record<string, string[]>;
      };
      toast.error(
        error?.errors?.Results?.[0] ||
          error?.message ||
          "Lỗi cập nhật kết quả.",
      );
      return false;
    }
  };

  // Hủy bàn đấu
  const onCancelMatch = async (matchId: string, reason: string) => {
    if (!activeTournament) return;
    const ok = await handleCancelMatch(matchId, reason);
    if (ok) {
      await refreshMatches(activeTournament.id, activeTournament.currentRound);
    }
  };

  // Loại VĐV khỏi giải đấu (Kick)
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
      toast.success("Đã loại tuyển thủ khỏi danh sách.");
      await refreshParticipants(activeTournament.id);
      await fetchTournaments();
    } catch (err: unknown) {
      const error = err as { message?: string };
      toast.error(error?.message || "Lỗi loại tuyển thủ.");
    } finally {
      setActionLoadingId(null);
    }
  };

  // Check-in VĐV tại quầy
  const onCheckIn = async (participantId: string) => {
    if (!activeTournament) return;
    setActionLoadingId(participantId);
    try {
      const ok = await handleCheckInParticipant(
        activeTournament.id,
        participantId,
      );
      if (ok) {
        await refreshParticipants(activeTournament.id);
      }
    } finally {
      setActionLoadingId(null);
    }
  };

  // No-show
  const onNoShow = async (participantId: string) => {
    if (!activeTournament) return;
    setActionLoadingId(participantId);
    try {
      const ok = await handleNoShowParticipant(
        activeTournament.id,
        participantId,
      );
      if (ok) {
        await refreshParticipants(activeTournament.id);
      }
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

  // Khóa sửa bảng cặp nếu có bàn đã OnGoing hoặc Completed
  const isAnyMatchStarted = matches.some(
    (m) => m.status === "OnGoing" || m.status === "Completed",
  );

  return (
    <div className="space-y-4 max-w-7xl mx-auto pb-10">
      {/* 1. Header Bar */}
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

      {/* 2. Hero Tournament Card */}
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

              {/* Action Buttons theo State Machine */}
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
                      onClick={() => handleStartTournament(activeTournament.id)}
                      className="h-9 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold rounded-xl px-5 shadow-xs"
                    >
                      <Swords className="w-4 h-4 mr-1.5" /> Bắt Đầu Giải (Start
                      R1)
                    </Button>
                  </>
                )}

                {activeTournament.status === "OnGoing" &&
                  (() => {
                    const totalRounds = activeTournament.totalRounds || 4;
                    const isFinalRound =
                      activeTournament.currentRound >= totalRounds;
                    const isAllMatchesCompleted =
                      matches.length > 0 &&
                      matches.every((m) => m.status === "Completed");
                    const canComplete = isFinalRound && isAllMatchesCompleted;

                    return (
                      <>
                        {!isFinalRound && (
                          <Button
                            onClick={() =>
                              handleAdvanceRound(activeTournament.id)
                            }
                            className="h-9 bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold rounded-xl px-4"
                          >
                            <ChevronRight className="w-4 h-4 mr-1" /> Chuyển
                            Vòng Tiếp
                          </Button>
                        )}

                        <Button
                          onClick={async () => {
                            if (!canComplete) {
                              if (!isFinalRound) {
                                toast.warning(
                                  `Giải đấu chưa hoàn thành vòng ${totalRounds}. Hiện đang ở vòng #${activeTournament.currentRound}.`,
                                );
                              } else if (!isAllMatchesCompleted) {
                                toast.warning(
                                  "Vẫn còn bàn đấu ở vòng cuối chưa ghi nhận kết quả.",
                                );
                              }
                              return;
                            }

                            const ok = await handleCompleteTournament(
                              activeTournament.id,
                            );
                            if (ok) {
                              await refreshParticipants(activeTournament.id);
                              setShowPodiumModal(true);
                            }
                          }}
                          disabled={!canComplete}
                          className={`h-9 text-xs font-bold rounded-xl px-4 transition-all flex items-center gap-1.5 ${
                            canComplete
                              ? "bg-emerald-600 hover:bg-emerald-700 text-white shadow-md ring-2 ring-emerald-400/40 animate-pulse"
                              : "bg-neutral-200 text-neutral-400 cursor-not-allowed border border-neutral-300 opacity-60"
                          }`}
                          title={
                            canComplete
                              ? "Tất cả các ván vòng 4 đã xong. Bấm để tổng kết giải và đồng bộ Elo/Karma!"
                              : "Chỉ hoàn thành giải khi đã thi đấu xong tất cả các bàn ở vòng 4."
                          }
                        >
                          <CheckCircle2 className="w-4 h-4" />
                          {canComplete
                            ? "Hoàn Thành Giải Đấu"
                            : `Hoàn Thành Giải (Cần xong Vòng ${totalRounds})`}
                        </Button>
                      </>
                    );
                  })()}

                {/* Khi giải đã Hoàn thành -> Cho phép mở lại Bảng Vinh Danh */}
                {activeTournament.status === "Completed" && (
                  <Button
                    onClick={() => setShowPodiumModal(true)}
                    className="h-9 bg-amber-500 hover:bg-amber-600 text-white text-xs font-bold rounded-xl px-4 flex items-center gap-1.5 shadow-xs"
                  >
                    <Trophy className="w-4 h-4" /> Xem Bảng Vinh Danh
                  </Button>
                )}

                {/* Ẩn nút hủy giải khi đã OnGoing hoặc Completed */}
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

          {/* Thanh chuyển đổi View khi giải OnGoing */}
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

          {/* 3. KHU VỰC NỘI DUNG CHÍNH */}
          {activeTournament.status === "OnGoing" && mainView === "MATCHES" ? (
            /* 3A. ARENA BÀN ĐẤU */
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
                  {matches.map((match: any, idx: number) => {
                    const matchNumber =
                      match.matchNumber || match.tableNumber || idx + 1;
                    let tablePlayers: any[] = [];

                    // Phân giải player1Id -> player4Id
                    const slotIndices = [1, 2, 3, 4] as const;
                    const flatPlayers = slotIndices
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
                            participantInfo?.username ||
                            `VĐV #${pId.slice(0, 4)}`,
                          avatarUrl: participantInfo?.avatarUrl,
                          currentElo:
                            participantInfo?.currentElo ||
                            participantInfo?.initialElo ||
                            1200,
                          score: match[`player${slot}Score`],
                          cardsBought: match[`player${slot}CardsBought`],
                          isWinner:
                            match.winnerPlayerId === pId ||
                            match.winnerUserId === pId,
                        };
                      })
                      .filter(Boolean);

                    if (flatPlayers.length > 0) {
                      tablePlayers = flatPlayers;
                    } else if (
                      Array.isArray(match.playerIds) &&
                      match.playerIds.length > 0
                    ) {
                      tablePlayers = match.playerIds.map((pId: string) => {
                        const participantInfo = participants.find(
                          (p) => p.userId === pId || p.id === pId,
                        );
                        return {
                          userId: pId,
                          userName:
                            participantInfo?.username ||
                            `VĐV #${pId.slice(0, 4)}`,
                          avatarUrl: participantInfo?.avatarUrl,
                          currentElo:
                            participantInfo?.currentElo ||
                            participantInfo?.initialElo ||
                            1200,
                          score:
                            match.scores?.find((s: any) => s.userId === pId)
                              ?.score ?? null,
                          cardsBought:
                            match.scores?.find((s: any) => s.userId === pId)
                              ?.cardsBought ?? null,
                          isWinner:
                            match.winnerUserId === pId ||
                            match.winnerPlayerId === pId,
                        };
                      });
                    } else if (Array.isArray(match.players)) {
                      tablePlayers = match.players.map((p: any) => {
                        const pId = p.userId || p.id;
                        const participantInfo = participants.find(
                          (part) => part.userId === pId || part.id === pId,
                        );
                        return {
                          userId: pId,
                          userName:
                            p.userName ||
                            p.username ||
                            participantInfo?.username ||
                            "VĐV",
                          avatarUrl: p.avatarUrl || participantInfo?.avatarUrl,
                          currentElo:
                            p.currentElo ||
                            participantInfo?.currentElo ||
                            participantInfo?.initialElo ||
                            1200,
                          score: p.score ?? null,
                          cardsBought: p.cardsBought ?? null,
                          isWinner: p.isWinner || match.winnerUserId === pId,
                        };
                      });
                    }

                    const matchStatus = match.status || "Scheduled";

                    return (
                      <div
                        key={match.id || `table-${matchNumber}`}
                        className="p-4 rounded-3xl border border-neutral-200/90 bg-white space-y-3.5 shadow-2xs flex flex-col justify-between overflow-hidden"
                      >
                        <div className="space-y-3">
                          {/* Header Bàn đấu */}
                          <div className="flex items-center justify-between">
                            <span className="font-black text-sm text-neutral-950">
                              {match.tableName || `Bàn #${matchNumber}`}
                            </span>
                            <span
                              className={`px-2 py-0.5 rounded-lg text-[9px] font-black uppercase tracking-wider ${
                                matchStatus === "Completed"
                                  ? "bg-emerald-100 text-emerald-800"
                                  : matchStatus === "OnGoing"
                                    ? "bg-blue-100 text-blue-800"
                                    : "bg-neutral-100 text-neutral-600"
                              }`}
                            >
                              {matchStatus}
                            </span>
                          </div>

                          {/* Danh sách 4 VĐV trong bàn */}
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

                        {/* Action buttons */}
                        <div className="pt-3 border-t border-neutral-100 flex flex-wrap items-center justify-end gap-1.5">
                          {match.id &&
                            matchStatus !== "Completed" &&
                            matchStatus !== "Cancelled" && (
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

                          {match.id && matchStatus === "Scheduled" && (
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
                              if (!match.id || match.id.startsWith("table-")) {
                                toast.error(
                                  "Bàn đấu chưa có UUID hợp lệ trong cơ sở dữ liệu.",
                                );
                                return;
                              }

                              setSelectedMatch({
                                ...match,
                                id: match.id,
                                tableName:
                                  match.tableName || `Bàn #${matchNumber}`,
                                players: tablePlayers,
                              });
                            }}
                            className="h-8 px-3.5 bg-neutral-950 hover:bg-neutral-800 text-white text-[11px] font-bold rounded-xl shadow-2xs"
                          >
                            {matchStatus === "Completed"
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
            /* 3B. BẢNG QUẢN LÝ TUYỂN THỦ */
            <TournamentParticipantsTable
              participants={participants}
              loading={loadingParticipants}
              onCheckIn={onCheckIn}
              onNoShow={onNoShow}
              onKick={handleKickParticipant}
              actionLoadingId={actionLoadingId}
              onRefresh={() => {
                if (activeTournament) {
                  void refreshParticipants(activeTournament.id);
                }
              }}
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

      {/* 4. Các Modal Vệ Tinh */}
      <MatchResultModal
        isOpen={!!selectedMatch}
        onClose={() => setSelectedMatch(null)}
        match={selectedMatch}
        onSaveResult={onSaveMatchResult}
        onUpdateResult={onUpdateMatchResult}
      />

      <TournamentCreateModal
        isOpen={showCreateModal}
        onClose={() => setShowCreateModal(false)}
        onSubmit={handleCreateTournament}
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

      {activeTournament && (
        <TournamentPodiumModal
          isOpen={showPodiumModal}
          onClose={() => setShowPodiumModal(false)}
          tournamentTitle={activeTournament.title}
          participants={participants}
        />
      )}
    </div>
  );
}
