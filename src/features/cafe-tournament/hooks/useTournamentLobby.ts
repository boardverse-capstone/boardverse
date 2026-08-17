import { useState, useCallback, useEffect } from "react";
import { apiClient } from "@/core/api/client";
import { toast } from "sonner";
import {
  TournamentParticipant,
  AddWalkInDto,
  StartWithOptionsDto,
} from "../types/tournament.types";

export function useTournamentLobby(tournamentId: string | null) {
  const [participants, setParticipants] = useState<TournamentParticipant[]>([]);
  const [loading, setLoading] = useState(false);

  // 1. Tách hàm fetch data dùng cho việc refresh sau mỗi action
  const fetchParticipants = useCallback(async () => {
    if (!tournamentId) return;
    try {
      setLoading(true);
      const res: unknown = await apiClient.get(
        `/api/v1/pos/tournaments/${tournamentId}/participants`
      );
      const resData = res as { data?: TournamentParticipant[] };
      const list = resData?.data || (res as TournamentParticipant[]) || [];
      setParticipants(list);
    } catch (err: unknown) {
      const error = err as { message?: string };
      toast.error(error?.message || "Không thể tải danh sách VĐV.");
    } finally {
      setLoading(false);
    }
  }, [tournamentId]);

  // 2. Fetch lần đầu khi mount và đổi tournamentId (dùng flag isMounted để tránh warning của linter)
  useEffect(() => {
    if (!tournamentId) return;

    let isMounted = true;

    const loadInitialData = async () => {
      try {
        setLoading(true);
        const res: unknown = await apiClient.get(
          `/api/v1/pos/tournaments/${tournamentId}/participants`
        );
        const resData = res as { data?: TournamentParticipant[] };
        const list = resData?.data || (res as TournamentParticipant[]) || [];
        if (isMounted) {
          setParticipants(list);
        }
      } catch (err: unknown) {
        if (isMounted) {
          const error = err as { message?: string };
          toast.error(error?.message || "Không thể tải danh sách VĐV.");
        }
      } finally {
        if (isMounted) {
          setLoading(false);
        }
      }
    };

    void loadInitialData();

    return () => {
      isMounted = false;
    };
  }, [tournamentId]);

  // 3. POST /participants/{id}/check-in[cite: 1]
  const handleCheckIn = async (participantId: string) => {
    if (!tournamentId) return false;
    try {
      await apiClient.post(
        `/api/v1/pos/tournaments/${tournamentId}/participants/${participantId}/check-in`,
        {}
      );
      toast.success("Check-in VĐV thành công!");
      await fetchParticipants();
      return true;
    } catch (err: unknown) {
      const error = err as { message?: string };
      toast.error(error?.message || "Lỗi điểm danh.");
      return false;
    }
  };

  // 4. POST /walk-in
  const handleAddWalkIn = async (dto: AddWalkInDto) => {
    if (!tournamentId) return false;
    try {
      await apiClient.post(
        `/api/v1/pos/tournaments/${tournamentId}/walk-in`,
        dto
      );
      toast.success("Đã thêm khách vãng lai (Walk-in)!");
      await fetchParticipants();
      return true;
    } catch (err: unknown) {
      const error = err as { message?: string };
      toast.error(error?.message || "Lỗi thêm khách vãng lai.");
      return false;
    }
  };

  // 5. POST /participants/{id}/no-show[cite: 1]
  const handleNoShow = async (participantId: string) => {
    if (!tournamentId) return false;
    try {
      await apiClient.post(
        `/api/v1/pos/tournaments/${tournamentId}/participants/${participantId}/no-show`,
        {}
      );
      toast.success("Đã đánh dấu vắng mặt (No-Show).");
      await fetchParticipants();
      return true;
    } catch (err: unknown) {
      const error = err as { message?: string };
      toast.error(error?.message || "Lỗi đánh dấu No-Show.");
      return false;
    }
  };

  // 6. POST /participants/{id}/kick
  const handleKick = async (participantId: string, reason: string) => {
    if (!tournamentId) return false;
    try {
      await apiClient.post(
        `/api/v1/pos/tournaments/${tournamentId}/participants/${participantId}/kick`,
        { reason }
      );
      toast.success("Đã xóa VĐV khỏi danh sách.");
      await fetchParticipants();
      return true;
    } catch (err: unknown) {
      const error = err as { message?: string };
      toast.error(error?.message || "Lỗi xóa VĐV.");
      return false;
    }
  };

  // 7. POST /start[cite: 1]
  const handleStart = async () => {
    if (!tournamentId) return false;
    try {
      await apiClient.post(
        `/api/v1/pos/tournaments/${tournamentId}/start`,
        {}
      );
      toast.success("Giải đấu đã bắt đầu (Round 1)!");
      return true;
    } catch (err: unknown) {
      const error = err as { message?: string };
      toast.error(error?.message || "Không thể bắt đầu giải.");
      return false;
    }
  };

  // 8. POST /start-with-options
  const handleStartWithOptions = async (dto: StartWithOptionsDto) => {
    if (!tournamentId) return false;
    try {
      await apiClient.post(
        `/api/v1/pos/tournaments/${tournamentId}/start-with-options`,
        dto
      );
      toast.success("Bắt đầu giải đấu tùy chọn thành công!");
      return true;
    } catch (err: unknown) {
      const error = err as { message?: string };
      toast.error(error?.message || "Lỗi khởi chạy tùy chọn.");
      return false;
    }
  };

  // 9. POST /cancel (Query param)[cite: 1]
  const handleCancelTournament = async (reason: string) => {
    if (!tournamentId) return false;
    try {
      await apiClient.post(
        `/api/v1/pos/tournaments/${tournamentId}/cancel?reason=${encodeURIComponent(
          reason
        )}`,
        {}
      );
      toast.success("Đã hủy giải đấu.");
      return true;
    } catch (err: unknown) {
      const error = err as { message?: string };
      toast.error(error?.message || "Lỗi hủy giải đấu.");
      return false;
    }
  };

  return {
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
  };
}