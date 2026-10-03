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
  StartWithOptionsDto,
} from "../types/tournament.types";

/**
 * Phát hiện lỗi "không đủ VĐV" từ backend khi gọi POST /start.
 * Backend .NET trả message thường có dạng:
 *  - "Số lượng người tham gia không đủ..."
 *  - "Minimum participants not reached"
 *  - "Không đủ tuyển thủ..."
 *  - "Not enough participants"
 * Match theo keyword (lowercase, có thể tiếng Việt/Anh) để quyết định có
 * đề xuất fallback `/start-with-options` hay không. Tránh match quá rộng
 * (chỉ chứa từ "participant") để không false-positive với lỗi khác.
 */
export function isMinParticipantsError(message: string): boolean {
  const m = message.toLowerCase();
  return (
    m.includes("không đủ") ||
    m.includes("not enough") ||
    m.includes("minimum participants") ||
    m.includes("số lượng") ||
    m.includes("minparticipants") ||
    (m.includes("participant") && (m.includes("min") || m.includes("minimum")))
  );
}

export function useTournamentPos(cafeId: string | null) {
  const [tournaments, setTournaments] = useState<TournamentDetail[]>([]);
  const [activeTournament, setActiveTournament] = useState<TournamentDetail | null>(null);
  const [loading, setLoading] = useState(false);

  /**
   * Resolve tên giải đấu từ id để hiển thị trong toast. Rơi về chuỗi rút gọn
   * nếu cache chưa sẵn sàng (vd: ngay sau một action thay đổi danh sách).
   */
  const titleOf = useCallback(
    (tournamentId: string): string => {
      const t = tournaments.find((x) => x.id === tournamentId);
      if (t) return `"${t.title}"`;
      return `giải #${tournamentId.slice(0, 6)}`;
    },
    [tournaments],
  );

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
      toast.success(`Đã mở đăng ký cho ${titleOf(tournamentId)}.`);
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
      toast.success(`Đã đóng đăng ký cho ${titleOf(tournamentId)}.`);
      await fetchTournaments();
      return true;
    } catch (err: any) {
      toast.error(err?.message || "Lỗi đóng đăng ký.");
      return false;
    }
  };

  // 5c. POST /{tournamentId}/reopen-registration[cite: 1]
  // Dùng khi manager lỡ tay close form và muốn mở lại để tuyển thêm VĐV
  // (BE phân biệt open vs reopen: open chỉ áp dụng cho trạng thái
  // RegistrationClosed → RegistrationOpen với auto-extend; reopen dùng
  // khi muốn override sau khi auto-extend không đủ).
  const handleReopenRegistration = async (tournamentId: string) => {
    try {
      await apiClient.post(
        `/api/v1/pos/tournaments/${tournamentId}/reopen-registration`,
        {},
      );
      toast.success(`Đã mở lại đăng ký cho ${titleOf(tournamentId)}.`);
      await fetchTournaments();
      return true;
    } catch (err: any) {
      toast.error(err?.message || "Lỗi mở lại đăng ký.");
      return false;
    }
  };

  // 6. POST /{tournamentId}/start (Build Round 1)[cite: 1]
  // Trả về { ok, message? } thay vì auto-toast để caller (UI) có thể
  // phát hiện lỗi "không đủ VĐV" và đề xuất fallback /start-with-options.
  // Nếu fail vì lý do khác, caller có thể toast bình thường.
  const handleStartTournament = async (
    tournamentId: string,
  ): Promise<{ ok: boolean; message?: string }> => {
    try {
      await apiClient.post(`/api/v1/pos/tournaments/${tournamentId}/start`, {});
      toast.success(`${titleOf(tournamentId)} đã chính thức bắt đầu — Vòng 1!`);
      await fetchTournaments();
      return { ok: true };
    } catch (err: any) {
      return {
        ok: false,
        message: err?.message || "Chưa đủ điều kiện bắt đầu giải.",
      };
    }
  };

  // 6b. POST /{tournamentId}/start-with-options
  // Bắt đầu giải với options override (partial start, reduced rounds).
  // Dùng khi Manager muốn tiến hành dù không đủ MinParticipants.
  const handleStartWithOptions = async (
    tournamentId: string,
    dto: StartWithOptionsDto,
  ): Promise<{ ok: boolean; message?: string }> => {
    try {
      await apiClient.post(
        `/api/v1/pos/tournaments/${tournamentId}/start-with-options`,
        dto,
      );
      toast.success(
        `${titleOf(tournamentId)} đã bắt đầu với tùy chọn — Vòng 1!`,
      );
      await fetchTournaments();
      return { ok: true };
    } catch (err: any) {
      return {
        ok: false,
        message: err?.message || "Không thể bắt đầu giải với tùy chọn.",
      };
    }
  };

  // 7. POST /{tournamentId}/advance-round[cite: 1]
  const handleAdvanceRound = async (tournamentId: string) => {
    try {
      await apiClient.post(`/api/v1/pos/tournaments/${tournamentId}/advance-round`, {});
      toast.success(`Đã chuyển ${titleOf(tournamentId)} sang vòng tiếp theo.`);
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
      toast.success(`Đã hoàn thành ${titleOf(tournamentId)} — Elo & Karma đã đồng bộ!`);
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
      toast.success(`Đã hủy ${titleOf(tournamentId)}.`);
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

  /**
   * Check-in hàng loạt — duyệt song song danh sách VĐV đã chọn.
   * BE chỉ có endpoint đơn lẻ, nên ta loop với Promise.allSettled để:
   *  - Một VĐV lỗi không chặn các VĐV khác
   *  - Tổng thời gian ≈ 1 round-trip thay vì N lần nối tiếp
   * Trả về { ok, failed[] } để UI hiển thị kết quả chi tiết.
   */
  const handleBulkCheckIn = async (
    tournamentId: string,
    participantIds: string[],
  ): Promise<{ ok: number; failed: string[] }> => {
    if (participantIds.length === 0) return { ok: 0, failed: [] };

    const results = await Promise.allSettled(
      participantIds.map((id) =>
        apiClient.post(
          `/api/v1/pos/tournaments/${tournamentId}/participants/${id}/check-in`,
          {},
        ),
      ),
    );

    const failed: string[] = [];
    results.forEach((r, idx) => {
      if (r.status === "rejected") {
        failed.push(participantIds[idx]!);
      }
    });

    const ok = participantIds.length - failed.length;
    if (ok > 0) {
      toast.success(
        `Đã check-in ${ok}/${participantIds.length} VĐV${failed.length > 0 ? ` (${failed.length} lỗi)` : ""}.`,
      );
    }
    if (failed.length > 0 && ok === 0) {
      toast.error(`Check-in thất bại cho cả ${failed.length} VĐV.`);
    }
    await fetchTournaments();
    return { ok, failed };
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
    handleReopenRegistration,
    handleStartTournament,
    handleStartWithOptions,
    handleAdvanceRound,
    handleCompleteTournament,
    handleCancelTournament,
    handleCheckInParticipant,
    handleBulkCheckIn,
    handleNoShowParticipant,
    handleStartMatch,
    handleRecordMatchResult,
    handleUpdateMatchResult,
    handleCancelMatch,
  };
}