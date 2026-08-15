import apiClient from '@/core/api/client';
import type { PaginatedResponse } from '@/shared/types/pagination.interface';
import type {
  AdminTournament,
  AdminTournamentDetail,
  AdminTournamentListParams,
  CancelTournamentRequest,
  CreateAdminTournamentRequest,
  RawAdminTournament,
  RawAdminTournamentListResponse,
  RawTournamentParticipantsResponse,
  TournamentParticipantsParams,
  TournamentParticipantsResponse,
  UpdateAdminTournamentRequest,
} from '../types/tournament.interface';
import {
  mapApiAdminTournamentDetail,
  normalizeAdminTournamentListResponse,
  normalizeTournamentParticipantsResponse,
} from '../utils/tournament.mapper';

export const ADMIN_TOURNAMENT_QUERY_KEYS = {
  list: 'admin-tournament-list',
  detail: 'admin-tournament-detail',
  participants: 'admin-tournament-participants',
} as const;

const BASE = '/api/v1/admin/tournaments';

export const AdminTournamentService = {
  /** GET /api/v1/admin/tournaments */
  getTournaments: async (
    params: AdminTournamentListParams,
  ): Promise<PaginatedResponse<AdminTournament>> => {
    const raw = await apiClient.get<never, RawAdminTournamentListResponse>(BASE, {
      params: {
        page: params.page,
        pageSize: params.limit,
        status:
          params.status && params.status !== 'all' ? params.status : undefined,
        cafeId: params.cafeId || undefined,
      },
    });

    return normalizeAdminTournamentListResponse(raw, params);
  },

  /** GET /api/v1/admin/tournaments/{id} */
  getTournamentById: async (id: string): Promise<AdminTournamentDetail> => {
    const raw = await apiClient.get<never, RawAdminTournament>(`${BASE}/${id}`);
    return mapApiAdminTournamentDetail(raw);
  },

  /** POST /api/v1/admin/tournaments */
  createTournament: async (
    payload: CreateAdminTournamentRequest,
  ): Promise<AdminTournamentDetail> => {
    const body = {
      title: payload.name,
      description: payload.description,
      cafeId: payload.cafeId,
      gameTemplateId: payload.gameTemplateId,
      registrationDeadline: payload.registrationDeadline,
      startTime: payload.startTime,
      maxParticipants: payload.maxParticipants,
      minParticipants: Math.min(Math.max(4, Math.floor(payload.maxParticipants / 2) || 4), 32),
      entryFee: payload.entryFeeBvc ?? 0,
      minKarmaRequirement: payload.minKarmaScore ?? 0,
      minEloRequirement: payload.minEloRequirement ?? 0,
      maxEloRequirement: payload.maxEloRequirement ?? 3000,
    };
    const raw = await apiClient.post<never, RawAdminTournament>(BASE, body);
    return mapApiAdminTournamentDetail(raw);
  },

  /** PUT /api/v1/admin/tournaments/{id} */
  updateTournament: async (
    id: string,
    payload: UpdateAdminTournamentRequest,
  ): Promise<AdminTournamentDetail> => {
    const body: Record<string, unknown> = {};
    if (payload.name != null) body.title = payload.name;
    if (payload.description !== undefined) body.description = payload.description;
    if (payload.registrationDeadline != null) {
      body.registrationDeadline = payload.registrationDeadline;
    }
    if (payload.startTime != null) body.startTime = payload.startTime;
    if (payload.maxParticipants != null) body.maxParticipants = payload.maxParticipants;
    if (payload.entryFeeBvc != null) body.entryFee = payload.entryFeeBvc;
    if (payload.minKarmaScore != null) body.minKarmaRequirement = payload.minKarmaScore;
    if (payload.minEloRequirement != null) body.minEloRequirement = payload.minEloRequirement;
    if (payload.maxEloRequirement != null) body.maxEloRequirement = payload.maxEloRequirement;

    const raw = await apiClient.put<never, RawAdminTournament>(`${BASE}/${id}`, body);
    return mapApiAdminTournamentDetail(raw);
  },

  /** DELETE /api/v1/admin/tournaments/{id} */
  deleteTournament: async (id: string): Promise<void> => {
    await apiClient.delete(`${BASE}/${id}`);
  },

  /** GET /api/v1/admin/tournaments/{id}/participants */
  getParticipants: async (
    params: TournamentParticipantsParams,
  ): Promise<TournamentParticipantsResponse> => {
    const raw = await apiClient.get<never, RawTournamentParticipantsResponse>(
      `${BASE}/${params.tournamentId}/participants`,
      {
        params: {
          status:
            params.status && params.status !== 'all' ? params.status : undefined,
        },
      },
    );
    return normalizeTournamentParticipantsResponse(raw);
  },

  /**
   * Check-in không có trên Admin controller (Swagger live).
   * Dùng POS endpoint: POST /api/v1/pos/tournaments/{id}/participants/{participantId}/check-in
   */
  checkInParticipant: async (
    tournamentId: string,
    participantId: string,
  ): Promise<void> => {
    await apiClient.post(
      `/api/v1/pos/tournaments/${tournamentId}/participants/${participantId}/check-in`,
    );
  },

  /** POST /api/v1/admin/tournaments/{id}/open-registration */
  openRegistration: async (id: string): Promise<void> => {
    await apiClient.post(`${BASE}/${id}/open-registration`);
  },

  /** POST /api/v1/admin/tournaments/{id}/close-registration */
  closeRegistration: async (id: string): Promise<void> => {
    await apiClient.post(`${BASE}/${id}/close-registration`);
  },

  /** POST /api/v1/admin/tournaments/{id}/start */
  startTournament: async (id: string): Promise<void> => {
    await apiClient.post(`${BASE}/${id}/start`);
  },

  /** POST /api/v1/admin/tournaments/{id}/complete */
  completeTournament: async (id: string): Promise<void> => {
    await apiClient.post(`${BASE}/${id}/complete`);
  },

  /** POST /api/v1/admin/tournaments/{id}/cancel */
  cancelTournament: async (
    id: string,
    payload: CancelTournamentRequest,
  ): Promise<void> => {
    await apiClient.post(`${BASE}/${id}/cancel`, payload);
  },
};
