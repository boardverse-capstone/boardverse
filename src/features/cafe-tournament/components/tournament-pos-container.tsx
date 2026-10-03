/* eslint-disable @typescript-eslint/no-explicit-any */
"use client";

import { useEffect, useState, useCallback, useMemo } from "react";
import { useTournamentPos } from "../hooks/useTournamentPos";
import {
  TournamentMatch,
  TournamentParticipant,
} from "../types/tournament.types";
import {
  buildParticipantLookup,
  normalizeMatch,
  normalizeMatchStatus,
  normalizeMatchLabel,
} from "../lib/match-normalize";
import { MatchResultModal } from "./match-result-modal";
import { TournamentCreateModal } from "./tournament-create-modal";
import { TournamentPairingStudioModal } from "./tournament-pairing-studio-modal";
import { TournamentParticipantsTable } from "./tournament-participants-table";
import { TournamentPodiumModal } from "./tournament-podium-modal";
import { TournamentRowList } from "./tournament-row-list";
import { CancelReasonDialog } from "./cancel-reason-dialog";
import { apiClient } from "@/core/api/client";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { cn } from "@/lib/utils";
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

const primaryActionClass =
  "h-9 rounded-xl bg-primary px-4 text-xs font-semibold text-primary-foreground shadow-sm hover:bg-primary/90";
const secondaryActionClass =
  "h-9 rounded-xl border-border bg-background px-4 text-xs font-semibold text-foreground hover:bg-muted/70";
const destructiveOutlineClass =
  "h-9 rounded-xl border-destructive/30 px-4 text-xs font-semibold text-destructive hover:bg-destructive/5 hover:text-destructive";
const toolbarButtonClass =
  "h-8 rounded-xl border-border px-3 text-xs font-semibold text-foreground hover:bg-muted/70";

function getTournamentStatusLabel(status?: string) {
  switch (status) {
    case "OnGoing":
      return "Đang diễn ra";
    case "Completed":
      return "Đã hoàn tất";
    case "RegistrationOpen":
      return "Đang mở đăng ký";
    case "RegistrationClosed":
      return "Đã đóng đăng ký";
    case "Draft":
      return "Bản nháp";
    case "Cancelled":
      return "Đã hủy";
    case "Scheduled":
      return "Đã lên lịch";
    default:
      return status || "Chưa xác định";
  }
}

function getTournamentStatusBadgeClass(status?: string) {
  switch (status) {
    case "OnGoing":
      return "border-primary/20 bg-primary/10 text-primary";
    case "Completed":
      return "border-emerald-200 bg-emerald-50 text-emerald-700";
    case "RegistrationOpen":
      return "border-amber-200 bg-amber-50 text-amber-700";
    case "Cancelled":
      return "border-destructive/20 bg-destructive/10 text-destructive";
    case "RegistrationClosed":
    case "Scheduled":
    case "Draft":
    default:
      return "border-border bg-muted/60 text-muted-foreground";
  }
}

function getMatchStatusLabel(status?: string) {
  switch (status) {
    case "Scheduled":
      return "Đã lên lịch";
    case "OnGoing":
      return "Đang diễn ra";
    case "Completed":
      return "Đã kết thúc";
    case "Cancelled":
      return "Đã hủy";
    default:
      return status || "Chưa xác định";
  }
}

function getMatchStatusBadgeClass(status?: string) {
  switch (status) {
    case "OnGoing":
      return "border-primary/20 bg-primary/10 text-primary";
    case "Completed":
      return "border-emerald-200 bg-emerald-50 text-emerald-700";
    case "Cancelled":
      return "border-destructive/20 bg-destructive/10 text-destructive";
    case "Scheduled":
    default:
      return "border-border bg-muted/60 text-muted-foreground";
  }
}

function MetricTile({
  label,
  value,
  suffix,
  valueClassName,
}: {
  label: string;
  value: string | number;
  suffix?: string;
  valueClassName?: string;
}) {
  return (
    <div className="rounded-xl border border-border/70 bg-muted/20 px-4 py-3">
      <span className="block text-xs font-medium text-muted-foreground">
        {label}
      </span>
      <div className="mt-1 flex items-baseline gap-1.5">
        <span
          className={cn(
            "text-xl font-semibold tracking-tight text-foreground",
            valueClassName,
          )}
        >
          {value}
        </span>
        {suffix && (
          <span className="text-sm font-medium text-muted-foreground">
            {suffix}
          </span>
        )}
      </div>
    </div>
  );
}

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
  const [showCancelTournament, setShowCancelTournament] = useState(false);
  const [showCancelMatchFor, setShowCancelMatchFor] = useState<{
    id: string;
    name: string;
  } | null>(null);
  const [selectedMatch, setSelectedMatch] = useState<TournamentMatch | null>(
    null,
  );
  const [actionLoadingId, setActionLoadingId] = useState<string | null>(null);

  // 1. Refresh danh sách VĐV — guarded bởi isMounted để tránh setState sau unmount
  const refreshParticipants = useCallback(
    async (tournamentId: string, isMounted?: boolean) => {
      try {
        setLoadingParticipants(true);
        const res: unknown = await apiClient.get(
          `/api/v1/pos/tournaments/${tournamentId}/participants`,
        );
        const resData = res as { data?: TournamentParticipant[] };
        const list = resData?.data || (res as TournamentParticipant[]) || [];
        if (isMounted !== false) setParticipants(list);
      } catch {
        if (isMounted !== false) setParticipants([]);
      } finally {
        if (isMounted !== false) setLoadingParticipants(false);
      }
    },
    [],
  );

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

    // Sync participants + matches with BE when the active tournament changes.
    // This is the canonical "sync external system on prop change" use case
    // for useEffect (https://react.dev/reference/react/useEffect#examples-connecting).
    // The setState inside is required; suppress the cascade-render warning.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    void refreshParticipants(tournamentId, isMounted);

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

    void loadMatches();

    return () => {
      isMounted = false;
    };
  }, [
    activeTournament?.id,
    activeTournament?.status,
    activeTournament?.currentRound,
    refreshParticipants,
  ]);

  // 4. Pre-compute participant lookup + normalized match list once per
  // (participants, matches) change. Replaces 70 lines of inline parser
  // running O(n×m×4) Array.find per render. See audit P0-2.
  const participantLookup = useMemo(
    () => buildParticipantLookup(participants),
    [participants],
  );

  const normalizedMatches = useMemo(
    () =>
      matches.map((match, idx) => {
        const label = normalizeMatchLabel(match as any, idx);
        return {
          id: match.id || `table-${label.number}`,
          number: label.number,
          name: label.name,
          status: normalizeMatchStatus(match as any),
          players: normalizeMatch(match as any, participantLookup),
        };
      }),
    [matches, participantLookup],
  );

  // Memoized count: re-derives only when participants changes.
  const checkedInCount = useMemo(
    () =>
      participants.reduce(
        (n, p) =>
          p.status === "CheckedIn" || p.status === "Active" ? n + 1 : n,
        0,
      ),
    [participants],
  );

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
      toast.success(
        res?.message || "Đã sửa kết quả — Elo/Karma sẽ được tính lại sau.",
      );
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
          "Không thể cập nhật kết quả — vui lòng thử lại.",
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
      toast.error(
        error?.message || "Không thể loại tuyển thủ — vui lòng thử lại.",
      );
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

  const openMatchResultModal = (
    match: any,
    matchNumber: number,
    players: any[],
  ) => {
    if (!match.id || match.id.startsWith("table-")) {
      toast.error(
        "Bàn đấu chưa sẵn sàng — vui lòng tạo lại bảng cặp cho vòng này.",
      );
      return;
    }

    setSelectedMatch({
      ...match,
      id: match.id,
      tableName: match.tableName || `Bàn #${matchNumber}`,
      players,
    });
  };

  if (loading && !activeTournament) {
    return (
      <div className="flex h-96 flex-col items-center justify-center gap-3">
        <div className="h-8 w-8 animate-spin rounded-full border-2 border-primary border-t-transparent" />
        <span className="text-xs font-medium text-muted-foreground">
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
    <div className="mx-auto max-w-7xl flex flex-col gap-4 pb-10">
      {/* 1. Header Bar */}
      <div className="flex flex-col gap-4 rounded-2xl border border-border bg-card p-4 shadow-sm lg:flex-row lg:items-center lg:justify-between">
        <div className="flex items-center gap-3">
          <div className="flex size-11 items-center justify-center rounded-xl bg-primary/10 text-primary">
            <Trophy className="h-5 w-5" />
          </div>
          <div>
            <h1 className="text-xl font-semibold tracking-tight text-foreground">
              Tournament Command Center
            </h1>
            <p className="text-sm text-muted-foreground">
              Quản lý và điều phối giải đấu Splendor tại quầy
            </p>
          </div>
        </div>

        <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
          <Button
            onClick={() => setShowCreateModal(true)}
            className={cn(primaryActionClass, "gap-1.5")}
          >
            <Plus className="h-4 w-4" /> Tạo giải mới
          </Button>
        </div>
      </div>

      {/* 1b. Danh sách giải đấu dạng thanh ngang (thay thế dropdown cũ) */}
      <TournamentRowList
        tournaments={tournaments}
        activeTournamentId={activeTournament?.id ?? null}
        onSelect={setActiveTournament}
        onOpenRegistration={handleOpenRegistration}
        onCloseRegistration={handleCloseRegistration}
        onStartTournament={handleStartTournament}
        onAdvanceRound={handleAdvanceRound}
        onCancelTournament={async (id) => {
          await handleCancelTournament(id, "Không có lý do");
        }}
        onRefresh={fetchTournaments}
        refreshing={loading}
        loading={loading}
      />

      {/* 2. Hero Tournament Card */}
      {activeTournament ? (
        <div className="flex flex-col gap-4">
          <div className="flex flex-col gap-4 rounded-2xl border border-border bg-card p-5 shadow-sm">
            <div className="flex flex-col gap-3 border-b border-border pb-4 lg:flex-row lg:items-start lg:justify-between">
              <div>
                <div className="flex flex-wrap items-center gap-2">
                  <Badge
                    variant="outline"
                    className={cn(
                      "h-6 rounded-full px-2.5 text-xs font-semibold",
                      getTournamentStatusBadgeClass(activeTournament.status),
                    )}
                  >
                    {getTournamentStatusLabel(activeTournament.status)}
                  </Badge>
                  <h2 className="text-lg font-semibold tracking-tight text-foreground">
                    {activeTournament.title}
                  </h2>
                </div>
                <p className="mt-1 text-xs font-medium text-muted-foreground">
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
              <div className="flex flex-wrap items-center gap-2">
                {activeTournament.status === "Draft" && (
                  <Button
                    onClick={() => handleOpenRegistration(activeTournament.id)}
                    className={cn(primaryActionClass, "gap-1.5")}
                  >
                    <Play className="h-3.5 w-3.5" /> Mở đăng ký
                  </Button>
                )}

                {activeTournament.status === "RegistrationOpen" && (
                  <>
                    <Button
                      onClick={() => setShowPairingStudio(true)}
                      className={cn(primaryActionClass, "gap-1.5")}
                    >
                      <Swords className="h-3.5 w-3.5" /> Xếp bảng cặp R1
                    </Button>
                    <Button
                      onClick={() =>
                        handleCloseRegistration(activeTournament.id)
                      }
                      variant="outline"
                      className={secondaryActionClass}
                    >
                      Đóng đăng ký
                    </Button>
                  </>
                )}

                {activeTournament.status === "RegistrationClosed" && (
                  <>
                    <Button
                      onClick={() => handleStartTournament(activeTournament.id)}
                      className={cn(primaryActionClass, "gap-1.5 px-5")}
                    >
                      <Swords className="h-4 w-4" /> Bắt đầu giải
                    </Button>
                    <Button
                      onClick={() => setShowPairingStudio(true)}
                      variant="outline"
                      className={cn(secondaryActionClass, "gap-1.5")}
                    >
                      <Swords className="h-3.5 w-3.5" /> Xếp bảng cặp R1
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
                            className={cn(primaryActionClass, "gap-1.5")}
                          >
                            <ChevronRight className="h-4 w-4" /> Chuyển vòng
                            tiếp
                          </Button>
                        )}

                        <Button
                          onClick={async () => {
                            if (!canComplete) {
                              if (!isFinalRound) {
                                toast.warning(
                                  `Cần hoàn thành vòng ${totalRounds} trước khi tổng kết. Hiện đang ở vòng #${activeTournament.currentRound}.`,
                                );
                              } else if (!isAllMatchesCompleted) {
                                toast.warning(
                                  `Vẫn còn ${matches.length - matches.filter((m) => m.status === "Completed").length} bàn đấu ở vòng cuối chưa ghi nhận kết quả.`,
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
                          className={cn(
                            "h-9 rounded-xl px-4 text-xs font-semibold transition-all",
                            canComplete
                              ? "bg-primary text-primary-foreground shadow-sm hover:bg-primary/90"
                              : "cursor-not-allowed border border-border bg-muted text-muted-foreground opacity-70",
                          )}
                          title={
                            canComplete
                              ? `Tất cả các ván vòng ${totalRounds} đã xong. Bấm để tổng kết giải và đồng bộ Elo/Karma.`
                              : `Chỉ hoàn thành giải khi đã thi đấu xong tất cả các bàn ở vòng ${totalRounds}.`
                          }
                        >
                          <CheckCircle2 className="h-4 w-4" />
                          {canComplete
                            ? "Hoàn thành giải đấu"
                            : `Hoàn thành giải (Cần xong vòng ${totalRounds})`}
                        </Button>
                      </>
                    );
                  })()}

                {/* Khi giải đã Hoàn thành -> Cho phép mở lại Bảng Vinh Danh */}
                {activeTournament.status === "Completed" && (
                  <Button
                    onClick={() => setShowPodiumModal(true)}
                    className={cn(primaryActionClass, "gap-1.5")}
                  >
                    <Trophy className="h-4 w-4" /> Xem bảng vinh danh
                  </Button>
                )}

                {/* Ẩn nút hủy giải khi đã OnGoing hoặc Completed */}
                {activeTournament.status !== "OnGoing" &&
                  activeTournament.status !== "Completed" &&
                  activeTournament.status !== "Cancelled" && (
                    <Button
                      variant="outline"
                      onClick={() => setShowCancelTournament(true)}
                      className={cn(destructiveOutlineClass, "gap-1.5")}
                    >
                      <XCircle className="h-3.5 w-3.5" /> Hủy giải
                    </Button>
                  )}
              </div>
            </div>

            {/* Quick Specs Grid */}
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
              <MetricTile
                label="Tiến độ vòng"
                value={`#${activeTournament.currentRound}/${
                  activeTournament.totalRounds || 4
                }`}
              />
              <MetricTile
                label="Sĩ số VĐV"
                value={`${participants.length}/${activeTournament.maxParticipants}`}
              />
              <MetricTile
                label="Đã check-in"
                value={checkedInCount}
                suffix="VĐV"
                valueClassName={
                  checkedInCount > 0 ? "text-emerald-700" : undefined
                }
              />
              <MetricTile
                label="Thời lượng ván"
                value={activeTournament.roundDurationMinutes}
                suffix="phút"
              />
            </div>
          </div>

          {/* 3. KHU VỰC NỘI DUNG CHÍNH */}
          {activeTournament.status === "OnGoing" ? (
            <div className="overflow-hidden rounded-2xl border border-border bg-card shadow-sm">
              <div className="flex flex-col gap-3 border-b border-border p-4 lg:flex-row lg:items-center lg:justify-between">
                <Tabs
                  value={mainView}
                  onValueChange={(value) =>
                    setMainView(value as "MATCHES" | "ROSTER")
                  }
                >
                  <TabsList className="h-10 rounded-xl bg-muted/70 p-1">
                    <TabsTrigger
                      value="MATCHES"
                      className="rounded-lg px-3 text-xs font-semibold"
                    >
                      <LayoutGrid className="h-4 w-4" /> Bàn đấu vòng #
                      {activeTournament.currentRound} ({matches.length})
                    </TabsTrigger>
                    <TabsTrigger
                      value="ROSTER"
                      className="rounded-lg px-3 text-xs font-semibold"
                    >
                      <Users className="h-4 w-4" /> Danh sách tuyển thủ (
                      {participants.length})
                    </TabsTrigger>
                  </TabsList>
                </Tabs>

                <div className="flex flex-wrap items-center gap-2">
                  {!isAnyMatchStarted ? (
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => setShowPairingStudio(true)}
                      className={cn(toolbarButtonClass, "gap-1.5")}
                    >
                      <Swords className="h-3.5 w-3.5" /> Xếp lại bảng cặp
                    </Button>
                  ) : (
                    <span className="inline-flex h-8 items-center gap-1 rounded-xl border border-border bg-muted/50 px-2.5 text-xs font-semibold text-muted-foreground">
                      <Lock className="h-3 w-3" /> Đã khóa ghép cặp
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
                    className={cn(toolbarButtonClass, "gap-1.5")}
                  >
                    <RefreshCw
                      className={cn(
                        "h-3.5 w-3.5",
                        loadingMatches && "animate-spin",
                      )}
                    />
                    Làm mới
                  </Button>
                </div>
              </div>

              {mainView === "MATCHES" ? (
                <div className="flex flex-col gap-4 p-4">
                  {loadingMatches ? (
                    <div className="py-16 text-center text-xs font-medium text-muted-foreground">
                      Đang tải danh sách bàn đấu...
                    </div>
                  ) : normalizedMatches.length === 0 ? (
                    <div className="flex flex-col items-center gap-2 rounded-2xl border border-dashed border-border bg-muted/20 p-8 text-center">
                      <Swords className="mx-auto h-8 w-8 text-muted-foreground/50" />
                      <p className="text-sm font-medium text-foreground">
                        Chưa có bàn đấu nào
                      </p>
                      <p className="text-xs text-muted-foreground">
                        Vòng #{activeTournament.currentRound} chưa có bàn đấu
                        được khởi tạo.
                      </p>
                    </div>
                  ) : (
                    <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3">
                      {normalizedMatches.map(({ id, number, name, status: matchStatus, players: tablePlayers }) => {
                        return (
                          <div
                            key={id}
                            className="flex flex-col gap-4 rounded-2xl border border-border bg-background p-4 shadow-sm"
                          >
                            <div className="flex flex-col gap-3">
                              {/* Header Bàn đấu */}
                              <div className="flex items-center justify-between gap-3">
                                <span className="text-sm font-semibold text-foreground">
                                  {name}
                                </span>
                                <Badge
                                  variant="outline"
                                  className={cn(
                                    "h-6 rounded-full px-2.5 text-xs font-semibold",
                                    getMatchStatusBadgeClass(matchStatus),
                                  )}
                                >
                                  {getMatchStatusLabel(matchStatus)}
                                </Badge>
                              </div>

                              {/* Danh sách VĐV trong bàn */}
                              <div className="overflow-hidden rounded-xl border border-border bg-card divide-y divide-border/70">
                                {tablePlayers.map((p) => (
                                  <div
                                    key={p.userId}
                                    className={cn(
                                      "flex items-center justify-between gap-3 px-3 py-2.5",
                                      p.isWinner && "bg-amber-50/70",
                                    )}
                                  >
                                    <div className="flex min-w-0 items-center gap-2 pr-2">
                                      {p.isWinner && (
                                        <Trophy className="h-3.5 w-3.5 shrink-0 text-amber-600" />
                                      )}
                                      <span className="truncate text-sm font-medium text-foreground">
                                        {p.userName}
                                      </span>
                                    </div>

                                    <div className="flex shrink-0 items-center gap-1.5 font-mono text-xs text-muted-foreground">
                                      <span>Elo {p.currentElo}</span>
                                      <span>•</span>
                                      {p.score !== null ? (
                                        <span className="font-semibold text-foreground">
                                          {p.score}đ
                                        </span>
                                      ) : (
                                        <span>--</span>
                                      )}
                                      {p.cardsBought !== null && (
                                        <span>({p.cardsBought} thẻ)</span>
                                      )}
                                    </div>
                                  </div>
                                ))}
                              </div>
                            </div>

                            {/* Action buttons */}
                            <div className="flex flex-wrap items-center justify-end gap-2 border-t border-border pt-3">
                              {id && !id.startsWith("table-") && matchStatus === "Scheduled" && (
                                <>
                                  <Button
                                    size="sm"
                                    variant="outline"
                                    onClick={() =>
                                      setShowCancelMatchFor({
                                        id,
                                        name,
                                      })
                                    }
                                    className={cn(
                                      destructiveOutlineClass,
                                      "h-9 px-3",
                                    )}
                                  >
                                    Hủy bàn
                                  </Button>
                                  <Button
                                    size="sm"
                                    onClick={() => onStartMatch(id)}
                                    className={cn(
                                      primaryActionClass,
                                      "h-9 px-3.5",
                                    )}
                                  >
                                    Bắt đầu bàn
                                  </Button>
                                </>
                              )}

                              {matchStatus === "OnGoing" && (
                                <Button
                                  size="sm"
                                  onClick={() => {
                                    const original = matches.find(
                                      (m) => (m.id || `table-${number}`) === id,
                                    );
                                    if (original) {
                                      openMatchResultModal(
                                        original,
                                        number,
                                        tablePlayers,
                                      );
                                    }
                                  }}
                                  className={cn(
                                    primaryActionClass,
                                    "h-9 px-3.5",
                                  )}
                                >
                                  Ghi kết quả
                                </Button>
                              )}

                              {matchStatus === "Completed" && (
                                <Button
                                  size="sm"
                                  variant="outline"
                                  onClick={() => {
                                    const original = matches.find(
                                      (m) => (m.id || `table-${number}`) === id,
                                    );
                                    if (original) {
                                      openMatchResultModal(
                                        original,
                                        number,
                                        tablePlayers,
                                      );
                                    }
                                  }}
                                  className={cn(
                                    secondaryActionClass,
                                    "h-9 px-3.5",
                                  )}
                                >
                                  Sửa điểm
                                </Button>
                              )}

                              {matchStatus === "Cancelled" && (
                                <span className="text-xs font-medium text-muted-foreground">
                                  Không còn thao tác
                                </span>
                              )}
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>
              ) : (
                <div className="bg-muted/10 p-4">
                  <TournamentParticipantsTable
                    participants={participants}
                    loading={loadingParticipants}
                    onCheckIn={onCheckIn}
                    onNoShow={onNoShow}
                    onKick={async (id, reason) => {
                      await handleKickParticipant(id, reason);
                    }}
                    actionLoadingId={actionLoadingId}
                    isTournamentCompleted={
                      (activeTournament.status as string) === "Completed"
                    }
                    onRefresh={() => refreshParticipants(activeTournament.id)}
                  />
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
              onKick={async (id, reason) => {
                await handleKickParticipant(id, reason);
              }}
              actionLoadingId={actionLoadingId}
              isTournamentCompleted={activeTournament.status === "Completed"}
              onRefresh={() => {
                if (activeTournament) {
                  void refreshParticipants(activeTournament.id);
                }
              }}
            />
          )}
        </div>
      ) : (
        <div className="rounded-2xl border border-dashed border-border bg-card p-8 py-20 text-center">
          <p className="text-xs font-medium text-muted-foreground">
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

      {activeTournament && (
        <CancelReasonDialog
          open={showCancelTournament}
          onOpenChange={setShowCancelTournament}
          scope="tournament"
          subjectName={activeTournament.title}
          submitting={actionLoadingId === activeTournament.id}
          onConfirm={async (reason) => {
            setActionLoadingId(activeTournament.id);
            try {
              await handleCancelTournament(
                activeTournament.id,
                reason || "Không có lý do",
              );
            } finally {
              setActionLoadingId(null);
            }
          }}
        />
      )}

      <CancelReasonDialog
        open={!!showCancelMatchFor}
        onOpenChange={(open) => {
          if (!open) setShowCancelMatchFor(null);
        }}
        scope="match"
        subjectName={showCancelMatchFor?.name}
        submitting={!!showCancelMatchFor && actionLoadingId === showCancelMatchFor.id}
        onConfirm={async (reason) => {
          if (!showCancelMatchFor) return;
          setActionLoadingId(showCancelMatchFor.id);
          try {
            await onCancelMatch(showCancelMatchFor.id, reason || "Không có lý do");
          } finally {
            setActionLoadingId(null);
          }
        }}
      />
    </div>
  );
}
