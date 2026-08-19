/* eslint-disable @typescript-eslint/no-unused-vars */
/* eslint-disable @typescript-eslint/no-explicit-any */
import { useState, useCallback } from "react";
import { apiClient } from "@/core/api/client";
import { toast } from "sonner";
import {
  TournamentDetail,
  CreateTournamentDto,
  RecordMatchResultDto,
  TournamentStatus,
  UpdateMatchResultDto,
} from "../types/tournament.types";

export function useTournamentPos(cafeId: string | null) {
  const [tournaments, setTournaments] = useState<TournamentDetail[]>([]);
  const [activeTournament, setActiveTournament] = useState<TournamentDetail | null>(null);
  const [loading, setLoading] = useState(false);

  // 1. GET /cafes/{cafeId}
  const fetchTournaments = useCallback(
    async (status?: TournamentStatus | "ALL") => {
      if (!cafeId) return;
      try {
        setLoading(true);
        const query = status && status !== "ALL" ? `?status=${status}` : "";
        const res: any = await apiClient.get(`/api/v1/pos/tournaments/cafes/${cafeId}${query}`);
        const list: TournamentDetail[] = res?.data || res || [];
        setTournaments(list);

        // Auto select active/ongoing or first available tournament
        if (list.length > 0) {
          setActiveTournament((prev) => {
            if (prev) {
              const matched = list.find((t) => t.id === prev.id);
              if (matched) return matched;
            }
            const live = list.find((t) => t.status === "OnGoing" || t.status === "RegistrationClosed" || t.status === "RegistrationOpen");
            return live || list[0];
          });
        } else {
          setActiveTournament(null);
        }
      } catch (err: any) {
        toast.error(err?.message || "Không thể tải danh sách giải đấu.");
      } finally {
        setLoading(false);
      }
    },
    [cafeId]
  );

  // 2. POST /cafes/{cafeId} (Create Draft)
  const handleCreateTournament = async (dto: CreateTournamentDto) => {
    if (!cafeId) return false;
    try {
      const res: any = await apiClient.post(`/api/v1/pos/tournaments/cafes/${cafeId}`, dto);
      toast.success("Tạo giải đấu mới thành công!");
      await fetchTournaments();
      if (res?.data) setActiveTournament(res.data);
      return true;
    } catch (err: any) {
      toast.error(err?.message || "Lỗi tạo giải đấu.");
      return false;
    }
  };

  // 3. PATCH /{tournamentId} (Update Draft)[cite: 1]
  const handleUpdateTournament = async (tournamentId: string, partialData: Partial<CreateTournamentDto>) => {
    try {
      await apiClient.patch(`/api/v1/pos/tournaments/${tournamentId}`, partialData);
      toast.success("Cập nhật thông tin giải thành công!");
      await fetchTournaments();
      return true;
    } catch (err: any) {
      toast.error(err?.message || "Lỗi cập nhật giải.");
      return false;
    }
  };

  // 4. POST /{tournamentId}/open-registration[cite: 1]
  const handleOpenRegistration = async (tournamentId: string) => {
    try {
      await apiClient.post(`/api/v1/pos/tournaments/${tournamentId}/open-registration`, {});
      toast.success("Đã mở đăng ký!");
      await fetchTournaments();
      return true;
    } catch (err: any) {
      toast.error(err?.message || "Lỗi mở đăng ký.");
      return false;
    }
  };

  // 5. POST /{tournamentId}/close-registration[cite: 1]
  const handleCloseRegistration = async (tournamentId: string) => {
    try {
      await apiClient.post(`/api/v1/pos/tournaments/${tournamentId}/close-registration`, {});
      toast.success("Đã đóng đăng ký!");
      await fetchTournaments();
      return true;
    } catch (err: any) {
      toast.error(err?.message || "Lỗi đóng đăng ký.");
      return false;
    }
  };

  // 6. POST /{tournamentId}/start (Build Round 1)[cite: 1]
  const handleStartTournament = async (tournamentId: string) => {
    try {
      await apiClient.post(`/api/v1/pos/tournaments/${tournamentId}/start`, {});
      toast.success("Giải đấu đã chính thức bắt đầu (Vòng 1)!");
      await fetchTournaments();
      return true;
    } catch (err: any) {
      toast.error(err?.message || "Chưa đủ điều kiện bắt đầu giải.");
      return false;
    }
  };

  // 7. POST /{tournamentId}/advance-round[cite: 1]
  const handleAdvanceRound = async (tournamentId: string) => {
    try {
      await apiClient.post(`/api/v1/pos/tournaments/${tournamentId}/advance-round`, {});
      toast.success("Đã chuyển sang vòng đấu tiếp theo!");
      await fetchTournaments();
      return true;
    } catch (err: any) {
      toast.error(err?.message || "Các bàn chưa hoàn thành kết quả.");
      return false;
    }
  };

  // 8. POST /{tournamentId}/complete[cite: 1]
  const handleCompleteTournament = async (tournamentId: string) => {
    try {
      await apiClient.post(`/api/v1/pos/tournaments/${tournamentId}/complete`, {});
      toast.success("Đã hoàn thành giải đấu & đồng bộ Elo/Karma!");
      await fetchTournaments();
      return true;
    } catch (err: any) {
      toast.error(err?.message || "Lỗi hoàn tất giải.");
      return false;
    }
  };

  // 9. POST /{tournamentId}/cancel[cite: 1]
  const handleCancelTournament = async (tournamentId: string, reason: string) => {
    try {
      await apiClient.post(`/api/v1/pos/tournaments/${tournamentId}/cancel`, { reason });
      toast.success("Đã hủy giải đấu.");
      await fetchTournaments();
      return true;
    } catch (err: any) {
      toast.error(err?.message || "Lỗi hủy giải.");
      return false;
    }
  };

  // 10. Check-in & No-Show[cite: 1]
  const handleCheckInParticipant = async (tournamentId: string, participantId: string) => {
    try {
      await apiClient.post(
        `/api/v1/pos/tournaments/${tournamentId}/participants/${participantId}/check-in`,
        {}
      );
      toast.success("Check-in VĐV thành công!");
      await fetchTournaments();
      return true;
    } catch (err: any) {
      toast.error(err?.message || "Lỗi điểm danh VĐV.");
      return false;
    }
  };

  const handleNoShowParticipant = async (tournamentId: string, participantId: string) => {
    try {
      await apiClient.post(
        `/api/v1/pos/tournaments/${tournamentId}/participants/${participantId}/no-show`,
        {}
      );
      toast.success("Đã đánh dấu vắng mặt (No-Show).");
      await fetchTournaments();
      return true;
    } catch (err: any) {
      toast.error(err?.message || "Lỗi đánh dấu No-Show.");
      return false;
    }
  };

  // 11. Match Actions (Start, Result, Cancel)[cite: 1]
  const handleStartMatch = async (matchId: string) => {
    try {
      await apiClient.post(`/api/v1/pos/tournaments/matches/${matchId}/start`, {});
      toast.success("Bàn đấu đã bắt đầu tính giờ!");
      await fetchTournaments();
      return true;
    } catch (err: any) {
      toast.error(err?.message || "Lỗi bắt đầu bàn đấu.");
      return false;
    }
  };

// Ghi nhận kết quả lần đầu (POST)
const handleRecordMatchResult = async (dto: RecordMatchResultDto): Promise<boolean> => {
  try {
    const res: any = await apiClient.post(
      `/api/v1/pos/tournaments/matches/${dto.matchId}/result`,
      dto
    );
    toast.success(res?.message || "Ghi nhận kết quả bàn đấu thành công!");
    return true;
  } catch (err: unknown) {
    const error = err as { message?: string; errors?: Record<string, string[]> };
    toast.error(error?.errors?.Results?.[0] || error?.message || "Lỗi ghi nhận kết quả.");
    return false;
  }
};

// Sửa kết quả bàn đấu đã Completed (PATCH)
const handleUpdateMatchResult = async (dto: UpdateMatchResultDto): Promise<boolean> => {
  try {
    const res: any = await apiClient.patch(
      `/api/v1/pos/tournaments/matches/${dto.matchId}/result`,
      dto
    );
    toast.success(res?.message || "Sửa kết quả bàn đấu thành công!");
    return true;
  } catch (err: unknown) {
    const error = err as { message?: string; errors?: Record<string, string[]> };
    toast.error(error?.errors?.Results?.[0] || error?.message || "Lỗi cập nhật kết quả.");
    return false;
  }
};

  const handleCancelMatch = async (matchId: string, reason: string) => {
    try {
      await apiClient.post(`/api/v1/pos/tournaments/matches/${matchId}/cancel`, { reason });
      toast.success("Đã hủy bàn đấu.");
      await fetchTournaments();
      return true;
    } catch (err: any) {
      toast.error(err?.message || "Lỗi hủy bàn đấu.");
      return false;
    }
  };
  const fetchRoundPairingsPreview = useCallback(
  async (tournamentId: string, roundNumber: number) => {
    try {
      const res: any = await apiClient.get(
        `/api/v1/pos/tournaments/${tournamentId}/pairings/${roundNumber}/preview`
      );
      const resData = res?.data || res;
      // Trả về pairings hoặc tables từ payload preview
      return resData?.pairings || resData?.tables || [];
    } catch (err) {
      return [];
    }
  },
  []
);

  return {
    tournaments,
    activeTournament,
    setActiveTournament,
    loading,
    fetchTournaments,
    handleCreateTournament,
    handleUpdateTournament,
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
    handleUpdateMatchResult,
    handleCancelMatch,
    fetchRoundPairingsPreview,
  };
}