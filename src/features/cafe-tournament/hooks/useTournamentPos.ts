/* eslint-disable @typescript-eslint/no-explicit-any */
"use client";

import { useState, useCallback } from "react";
import { apiClient } from "@/core/api/client";
import {
  Tournament,
  TournamentParticipant,
  TournamentStatusFilter,
  CreateTournamentPayload,
  UpdateTournamentPayload,
  RecordMatchResultPayload,
  UpdateMatchResultPayload,
  TournamentPairingPreview,
} from "../types/tournament.types";

export function useTournamentPos(cafeId: string | null) {
  const [tournaments, setTournaments] = useState<Tournament[]>([]);
  const [activeTournaments, setActiveTournaments] = useState<Tournament[]>([]);
  const [loading, setLoading] = useState<boolean>(false);
  const [participantsLoading, setParticipantsLoading] = useState<boolean>(false);
  const [activeTournament, setActiveTournament] = useState<Tournament | null>(null);
  const [selectedStatus, setSelectedStatus] = useState<TournamentStatusFilter>("ALL");
  const [pairingPreview, setPairingPreview] = useState<TournamentPairingPreview | null>(null);
  const [pairingPreviewLoading, setPairingPreviewLoading] = useState<boolean>(false);

  // 1. GET /api/v1/pos/tournaments/{tournamentId}/participants
  const fetchTournamentParticipants = useCallback(async (tournamentId: string) => {
    if (!tournamentId) return;
    try {
      setParticipantsLoading(true);
      const res = await apiClient.get<TournamentParticipant[]>(
        `/api/v1/pos/tournaments/${tournamentId}/participants`
      );
      const list: TournamentParticipant[] = (res as any)?.data || res || [];

      setActiveTournament((prev) => {
        if (!prev || prev.id !== tournamentId) return prev;
        return {
          ...prev,
          participants: list,
        };
      });
    } catch (err: unknown) {
      console.error("Lỗi lấy danh sách VĐV:", err);
    } finally {
      setParticipantsLoading(false);
    }
  }, []);

  // 2. GET /api/v1/pos/tournaments/cafes/{cafeId}
  const fetchTournaments = useCallback(
    async (statusFilter?: TournamentStatusFilter, targetTournamentId?: string) => {
      if (!cafeId) return;
      try {
        setLoading(true);
        const currentFilter = statusFilter !== undefined ? statusFilter : selectedStatus;
        const url =
          currentFilter && currentFilter !== "ALL"
            ? `/api/v1/pos/tournaments/cafes/${cafeId}?status=${currentFilter}`
            : `/api/v1/pos/tournaments/cafes/${cafeId}`;

        const res = await apiClient.get<Tournament[]>(url);
        const data: Tournament[] = (res as any)?.data || res || [];
        setTournaments(data);

        setActiveTournament((prev) => {
          if (data.length === 0) return null;

          const selectedId = targetTournamentId || prev?.id;
          const matched = data.find((t) => t.id === selectedId);
          const target = matched || data[0];

          if (target?.id) {
            fetchTournamentParticipants(target.id);
          }
          return target;
        });
      } catch (err: unknown) {
        console.error("Lỗi lấy danh sách giải đấu:", err);
      } finally {
        setLoading(false);
      }
    },
    [cafeId, selectedStatus, fetchTournamentParticipants]
  );

  // 3. Chọn giải đấu thủ công
  const handleSelectTournament = useCallback(
    (tournament: Tournament | null) => {
      setActiveTournament(tournament);
      if (tournament?.id) {
        fetchTournamentParticipants(tournament.id);
      }
    },
    [fetchTournamentParticipants]
  );

  // 4. GET /api/v1/pos/tournaments/cafes/{cafeId}/active
  const fetchActiveTournaments = useCallback(async () => {
    if (!cafeId) return;
    try {
      const res = await apiClient.get<Tournament[]>(
        `/api/v1/pos/tournaments/cafes/${cafeId}/active`
      );
      const data = (res as any)?.data || res || [];
      setActiveTournaments(data);
    } catch (err: unknown) {
      console.error("Lỗi lấy danh sách giải đấu OnGoing:", err);
    }
  }, [cafeId]);

  // 5. GET /api/v1/pos/tournaments/{tournamentId}/pairings/{roundNumber}/preview
  const fetchPairingsPreview = useCallback(
    async (tournamentId: string, roundNumber: number) => {
      try {
        setPairingPreviewLoading(true);
        const res = await apiClient.get<TournamentPairingPreview>(
          `/api/v1/pos/tournaments/${tournamentId}/pairings/${roundNumber}/preview`
        );
        const data: TournamentPairingPreview = (res as any)?.data || res;
        setPairingPreview(data);
        return data;
      } catch (err: any) {
        console.error("Lỗi lấy preview pairings:", err);
        alert(err?.message || "Không thể xem trước ghép cặp cho vòng đấu.");
        return null;
      } finally {
        setPairingPreviewLoading(false);
      }
    },
    []
  );

  // 6. POST /api/v1/pos/tournaments/cafes/{cafeId}
  const handleCreateTournament = async (payload: CreateTournamentPayload) => {
    if (!cafeId) return false;
    try {
      await apiClient.post(`/api/v1/pos/tournaments/cafes/${cafeId}`, payload);
      alert("Tạo giải đấu Draft thành công!");
      await fetchTournaments();
      return true;
    } catch (err: any) {
      alert(err?.message || "Lỗi tạo giải đấu.");
      return false;
    }
  };

  // 7. PATCH /api/v1/pos/tournaments/{tournamentId}
  const handleUpdateTournament = async (
    tournamentId: string,
    payload: UpdateTournamentPayload
  ) => {
    try {
      await apiClient.patch(`/api/v1/pos/tournaments/${tournamentId}`, payload);
      alert("Cập nhật thông tin giải đấu thành công!");
      await fetchTournaments(selectedStatus, tournamentId);
      return true;
    } catch (err: any) {
      alert(err?.message || "Lỗi cập nhật giải đấu.");
      return false;
    }
  };

  // 8. POST /open-registration & /close-registration
  const handleToggleRegistration = async (tournamentId: string, open: boolean) => {
    try {
      const endpoint = open ? "open-registration" : "close-registration";
      const res = await apiClient.post(
        `/api/v1/pos/tournaments/${tournamentId}/${endpoint}`,
        {}
      );

      const updatedTournament = (res as any)?.data || res;
      alert(open ? "Mở đăng ký giải đấu thành công!" : "Đã ĐÓNG đăng ký!");

      if (updatedTournament) {
        setActiveTournament((prev) =>
          prev?.id === tournamentId ? { ...prev, ...updatedTournament } : prev
        );
      }

      await fetchTournaments(selectedStatus, tournamentId);
      return true;
    } catch (err: any) {
      alert(err?.message || "Lỗi thay đổi trạng thái đăng ký.");
      return false;
    }
  };

  // 9. POST /reopen-registration
  const handleReopenRegistration = async (tournamentId: string) => {
    try {
      const res = await apiClient.post(
        `/api/v1/pos/tournaments/${tournamentId}/reopen-registration`,
        {}
      );

      const updatedTournament = (res as any)?.data || res;
      alert("Mở lại đăng ký giải đấu thành công!");

      if (updatedTournament) {
        setActiveTournament((prev) =>
          prev?.id === tournamentId ? { ...prev, ...updatedTournament } : prev
        );
      }

      await fetchTournaments(selectedStatus, tournamentId);
      return true;
    } catch (err: any) {
      alert(err?.message || "Lỗi mở lại đăng ký giải đấu.");
      return false;
    }
  };

  // 10. POST /extend-registration
  const handleExtendRegistration = async (tournamentId: string) => {
    try {
      const res = await apiClient.post(
        `/api/v1/pos/tournaments/${tournamentId}/extend-registration`,
        {}
      );

      const updatedTournament = (res as any)?.data || res;
      alert("Gia hạn đăng ký giải đấu thành công!");

      if (updatedTournament) {
        setActiveTournament((prev) =>
          prev?.id === tournamentId ? { ...prev, ...updatedTournament } : prev
        );
      }

      await fetchTournaments(selectedStatus, tournamentId);
      return true;
    } catch (err: any) {
      alert(err?.message || "Lỗi gia hạn đăng ký giải đấu.");
      return false;
    }
  };

  // 11. POST /walk-in
  const handleAddWalkInParticipant = async (
    tournamentId: string,
    payload: { displayName: string; phoneNumber?: string }
  ) => {
    try {
      const res = await apiClient.post(
        `/api/v1/pos/tournaments/${tournamentId}/walk-in`,
        payload
      );

      const newParticipant = (res as any)?.data || res;
      alert(`Thêm khách vãng lai "${newParticipant?.walkInDisplayName || payload.displayName}" thành công!`);

      await fetchTournamentParticipants(tournamentId);
      await fetchTournaments(selectedStatus, tournamentId);
      return true;
    } catch (err: any) {
      alert(err?.message || "Không thể thêm khách vãng lai.");
      return false;
    }
  };

  // 12. POST /participants/{participantId}/check-in
  const handleParticipantCheckIn = async (tournamentId: string, participantId: string) => {
    try {
      const res = await apiClient.post(
        `/api/v1/pos/tournaments/${tournamentId}/participants/${participantId}/check-in`,
        {}
      );

      const updatedParticipant = (res as any)?.data || res;
      const name = updatedParticipant?.username || updatedParticipant?.walkInDisplayName || "VĐV";
      alert(`Check-in thành công cho ${name}!`);

      await fetchTournamentParticipants(tournamentId);
      await fetchTournaments(selectedStatus, tournamentId);
      return true;
    } catch (err: any) {
      alert(err?.message || "Lỗi Check-in VĐV.");
      return false;
    }
  };

  // 13. POST /participants/{participantId}/no-show
  const handleParticipantNoShow = async (tournamentId: string, participantId: string) => {
    try {
      const res = await apiClient.post(
        `/api/v1/pos/tournaments/${tournamentId}/participants/${participantId}/no-show`,
        {}
      );

      const updatedParticipant = (res as any)?.data || res;
      const displayName =
        updatedParticipant?.walkInDisplayName ||
        updatedParticipant?.username ||
        "VĐV";

      alert(`Đã đánh dấu No-Show thành công cho ${displayName}!`);

      await fetchTournamentParticipants(tournamentId);
      await fetchTournaments(selectedStatus, tournamentId);
      return true;
    } catch (err: any) {
      alert(err?.message || "Lỗi đánh dấu No-Show cho VĐV.");
      return false;
    }
  };

  // 14. POST /participants/{participantId}/kick
  const handleKickParticipant = async (
    tournamentId: string,
    participantId: string,
    reason?: string
  ) => {
    try {
      const res = await apiClient.post(
        `/api/v1/pos/tournaments/${tournamentId}/participants/${participantId}/kick`,
        { reason: reason || "" }
      );

      const updatedParticipant = (res as any)?.data || res;
      const displayName =
        updatedParticipant?.walkInDisplayName ||
        updatedParticipant?.username ||
        "VĐV";

      alert(`Đã loại (kick) thành công VĐV ${displayName} khỏi giải đấu!`);

      await fetchTournamentParticipants(tournamentId);
      await fetchTournaments(selectedStatus, tournamentId);
      return true;
    } catch (err: any) {
      alert(err?.message || "Không thể kick VĐV khỏi giải đấu.");
      return false;
    }
  };

  // 15. POST /start
  const handleStartTournament = async (tournamentId: string) => {
    try {
      await apiClient.post(`/api/v1/pos/tournaments/${tournamentId}/start`, {});
      alert("Đã bắt đầu giải đấu và tạo Swiss Round 1!");
      await fetchTournaments(selectedStatus, tournamentId);
      await fetchActiveTournaments();
      return true;
    } catch (err: any) {
      alert(err?.message || "Lỗi khởi chạy giải đấu.");
      return false;
    }
  };

  // 16. POST /advance-round
  const handleAdvanceRound = async (tournamentId: string) => {
    try {
      await apiClient.post(`/api/v1/pos/tournaments/${tournamentId}/advance-round`, {});
      alert("Đã chuyển sang vòng tiếp theo!");
      await fetchTournaments(selectedStatus, tournamentId);
      await fetchActiveTournaments();
      return true;
    } catch (err: any) {
      alert(err?.message || "Vòng hiện tại chưa xong.");
      return false;
    }
  };

  // 17. POST /complete
  const handleCompleteTournament = async (tournamentId: string) => {
    try {
      await apiClient.post(`/api/v1/pos/tournaments/${tournamentId}/complete`, {});
      alert("Đã hoàn thành giải đấu!");
      await fetchTournaments(selectedStatus, tournamentId);
      await fetchActiveTournaments();
      return true;
    } catch (err: any) {
      alert(err?.message || "Lỗi hoàn thành giải đấu.");
      return false;
    }
  };

  // 18. POST /cancel
  const handleCancelTournament = async (tournamentId: string, reason: string) => {
    if (!reason.trim()) {
      alert("Vui lòng nhập lý do hủy!");
      return false;
    }
    try {
      await apiClient.post(`/api/v1/pos/tournaments/${tournamentId}/cancel`, { reason });
      alert("Đã hủy giải đấu.");
      await fetchTournaments(selectedStatus, tournamentId);
      await fetchActiveTournaments();
      return true;
    } catch (err: any) {
      alert(err?.message || "Lỗi hủy giải đấu.");
      return false;
    }
  };

  // 19. Match: Start
  const handleStartMatch = async (matchId: string) => {
    try {
      await apiClient.post(`/api/v1/pos/tournaments/matches/${matchId}/start`, {});
      alert("Đã bắt đầu bàn đấu!");
      if (activeTournament?.id) {
        await fetchTournaments(selectedStatus, activeTournament.id);
      }
      return true;
    } catch (err: any) {
      alert(err?.message || "Lỗi bắt đầu bàn đấu.");
      return false;
    }
  };

  // 20. Match: POST Record Result
  const handleRecordMatchResult = async (payload: RecordMatchResultPayload) => {
    try {
      await apiClient.post(
        `/api/v1/pos/tournaments/matches/${payload.matchId}/result`,
        payload
      );
      alert("Ghi nhận kết quả bàn đấu thành công!");
      if (activeTournament?.id) {
        await fetchTournaments(selectedStatus, activeTournament.id);
      }
      return true;
    } catch (err: any) {
      alert(err?.message || "Lỗi ghi nhận kết quả.");
      return false;
    }
  };

  // 21. Match: PATCH Update Result
  const handleUpdateMatchResult = async (
    matchId: string,
    payload: UpdateMatchResultPayload
  ) => {
    try {
      await apiClient.patch(
        `/api/v1/pos/tournaments/matches/${matchId}/result`,
        payload
      );
      alert("Cập nhật lại kết quả bàn đấu thành công!");
      if (activeTournament?.id) {
        await fetchTournaments(selectedStatus, activeTournament.id);
      }
      return true;
    } catch (err: any) {
      alert(err?.message || "Lỗi sửa kết quả bàn đấu.");
      return false;
    }
  };

  // 22. Match: POST Cancel Match
  const handleCancelMatch = async (matchId: string, reason: string) => {
    if (!reason.trim()) {
      alert("Vui lòng nhập lý do hủy bàn đấu!");
      return false;
    }
    try {
      await apiClient.post(`/api/v1/pos/tournaments/matches/${matchId}/cancel`, {
        reason: reason.trim(),
      });
      alert("Đã hủy bàn đấu thành công!");
      if (activeTournament?.id) {
        await fetchTournaments(selectedStatus, activeTournament.id);
      }
      return true;
    } catch (err: any) {
      alert(err?.message || "Lỗi hủy bàn đấu.");
      return false;
    }
  };

  return {
    tournaments,
    activeTournaments,
    loading,
    participantsLoading,
    activeTournament,
    setActiveTournament,
    handleSelectTournament,
    selectedStatus,
    setSelectedStatus,
    pairingPreview,
    pairingPreviewLoading,
    fetchPairingsPreview,
    fetchTournaments,
    fetchTournamentParticipants,
    fetchActiveTournaments,
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
    handleParticipantCheckIn,
    handleParticipantNoShow,
    handleKickParticipant,
    handleStartMatch,
    handleRecordMatchResult,
    handleUpdateMatchResult,
    handleCancelMatch,
  };
}