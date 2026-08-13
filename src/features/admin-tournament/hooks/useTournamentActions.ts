'use client';

import { useMutation, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import {
  ADMIN_TOURNAMENT_QUERY_KEYS,
  AdminTournamentService,
} from '../services/admin-tournament.service';
import type {
  CancelTournamentRequest,
  CreateAdminTournamentRequest,
  UpdateAdminTournamentRequest,
} from '../types/tournament.interface';

function invalidateTournamentQueries(
  queryClient: ReturnType<typeof useQueryClient>,
  tournamentId?: string,
) {
  queryClient.invalidateQueries({ queryKey: [ADMIN_TOURNAMENT_QUERY_KEYS.list] });
  if (tournamentId) {
    queryClient.invalidateQueries({
      queryKey: [ADMIN_TOURNAMENT_QUERY_KEYS.detail, tournamentId],
    });
    queryClient.invalidateQueries({
      queryKey: [ADMIN_TOURNAMENT_QUERY_KEYS.participants, tournamentId],
    });
  }
}

export function useCreateAdminTournament() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (payload: CreateAdminTournamentRequest) =>
      AdminTournamentService.createTournament(payload),
    onSuccess: (data) => {
      toast.success(`Đã tạo giải "${data.name}"`);
      invalidateTournamentQueries(queryClient, data.id);
    },
    onError: (error: Error) => {
      toast.error(error.message ?? 'Tạo giải đấu thất bại.');
    },
  });
}

export function useUpdateAdminTournament() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({
      id,
      payload,
    }: {
      id: string;
      payload: UpdateAdminTournamentRequest;
    }) => AdminTournamentService.updateTournament(id, payload),
    onSuccess: (data) => {
      toast.success(`Đã cập nhật giải "${data.name}"`);
      invalidateTournamentQueries(queryClient, data.id);
    },
    onError: (error: Error) => {
      toast.error(error.message ?? 'Cập nhật giải đấu thất bại.');
    },
  });
}

export function useDeleteAdminTournament() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (id: string) => AdminTournamentService.deleteTournament(id),
    onSuccess: () => {
      toast.success('Đã xóa giải đấu.');
      invalidateTournamentQueries(queryClient);
    },
    onError: (error: Error) => {
      toast.error(error.message ?? 'Xóa giải đấu thất bại.');
    },
  });
}

export function useOpenTournamentRegistration() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (id: string) => AdminTournamentService.openRegistration(id),
    onSuccess: (_data, id) => {
      toast.success('Đã mở đăng ký giải đấu.');
      invalidateTournamentQueries(queryClient, id);
    },
    onError: (error: Error) => {
      toast.error(error.message ?? 'Mở đăng ký thất bại.');
    },
  });
}

export function useCloseTournamentRegistration() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (id: string) => AdminTournamentService.closeRegistration(id),
    onSuccess: (_data, id) => {
      toast.success('Đã đóng đăng ký giải đấu.');
      invalidateTournamentQueries(queryClient, id);
    },
    onError: (error: Error) => {
      toast.error(error.message ?? 'Đóng đăng ký thất bại.');
    },
  });
}

export function useStartTournament() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (id: string) => AdminTournamentService.startTournament(id),
    onSuccess: (_data, id) => {
      toast.success('Đã bắt đầu giải đấu.');
      invalidateTournamentQueries(queryClient, id);
    },
    onError: (error: Error) => {
      toast.error(error.message ?? 'Bắt đầu giải đấu thất bại.');
    },
  });
}

export function useCompleteTournament() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (id: string) => AdminTournamentService.completeTournament(id),
    onSuccess: (_data, id) => {
      toast.success('Đã hoàn thành giải đấu.');
      invalidateTournamentQueries(queryClient, id);
    },
    onError: (error: Error) => {
      toast.error(error.message ?? 'Hoàn thành giải đấu thất bại.');
    },
  });
}

export function useCancelTournament() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({
      id,
      payload,
    }: {
      id: string;
      payload: CancelTournamentRequest;
    }) => AdminTournamentService.cancelTournament(id, payload),
    onSuccess: (_data, variables) => {
      toast.success('Đã hủy giải đấu.');
      invalidateTournamentQueries(queryClient, variables.id);
    },
    onError: (error: Error) => {
      toast.error(error.message ?? 'Hủy giải đấu thất bại.');
    },
  });
}

export function useCheckInTournamentParticipant() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({
      tournamentId,
      participantId,
    }: {
      tournamentId: string;
      participantId: string;
    }) => AdminTournamentService.checkInParticipant(tournamentId, participantId),
    onSuccess: (_data, variables) => {
      toast.success('Đã check-in người chơi.');
      invalidateTournamentQueries(queryClient, variables.tournamentId);
    },
    onError: (error: Error) => {
      toast.error(error.message ?? 'Check-in thất bại.');
    },
  });
}
