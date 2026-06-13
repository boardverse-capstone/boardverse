import apiClient from '@/core/api/client';
import type {
  ActivatedSession,
  AlternativeGame,
  BookedGame,
  FloorPlan,
  MarkAbsentResult,
  QrResolveResult,
  StaffCafe,
  TableBooking,
} from '../types/pos-check-in.interface';
import { PosCheckInMockService } from './pos-check-in.mock';

const USE_MOCK = process.env.NEXT_PUBLIC_USE_MOCK_POS_API !== 'false';

export const POS_QUERY_KEYS = {
  cafe: 'pos-staff-cafe',
  floorPlan: 'pos-floor-plan',
  bookings: 'pos-pending-bookings',
  booking: 'pos-booking',
  alternatives: 'pos-alternative-games',
} as const;

function mapInventoryItem(raw: Record<string, unknown>): AlternativeGame {
  return {
    inventoryId: String(raw.inventoryId ?? raw.id ?? raw.Id ?? ''),
    gameTemplateId: String(raw.gameTemplateId ?? raw.templateId ?? ''),
    name: String(raw.name ?? raw.gameName ?? raw.GameName ?? 'Unknown'),
    imageUrl: String(raw.imageUrl ?? raw.coverUrl ?? 'https://picsum.photos/seed/game/400/300'),
    minPlayers: Number(raw.minPlayers ?? raw.minPlayerCount ?? 2),
    maxPlayers: Number(raw.maxPlayers ?? raw.maxPlayerCount ?? 4),
    boxQuantity: Number(raw.boxQuantity ?? raw.quantity ?? 1),
    status: String(raw.status ?? 'Available'),
  };
}

export const PosCheckInService = {
  getStaffCafe: async (): Promise<StaffCafe> => {
    if (USE_MOCK) return PosCheckInMockService.getStaffCafe();

    try {
      const raw = await apiClient.get<never, StaffCafe[] | { data: StaffCafe[] }>(
        '/api/staff/my-cafes',
      );
      const cafes = Array.isArray(raw) ? raw : (raw as { data?: StaffCafe[] }).data ?? [];
      if (!cafes.length) return PosCheckInMockService.getStaffCafe();
      return cafes[0];
    } catch {
      return PosCheckInMockService.getStaffCafe();
    }
  },

  getFloorPlan: async (cafeId: string): Promise<FloorPlan> => {
    if (USE_MOCK) return PosCheckInMockService.getFloorPlan(cafeId);
    return PosCheckInMockService.getFloorPlan(cafeId);
  },

  resolveQrOrBookingId: async (payload: string): Promise<QrResolveResult> => {
    if (USE_MOCK) return PosCheckInMockService.resolveQrOrBookingId(payload);
    return PosCheckInMockService.resolveQrOrBookingId(payload);
  },

  getPendingBookings: async (cafeId: string): Promise<TableBooking[]> => {
    if (USE_MOCK) return PosCheckInMockService.getPendingBookings();
    // Backend booking API chưa có — fallback mock
    return PosCheckInMockService.getPendingBookings();
  },

  getBookingById: async (id: string): Promise<TableBooking> => {
    if (USE_MOCK) return PosCheckInMockService.getBookingById(id);
    return PosCheckInMockService.getBookingById(id);
  },

  getAlternativeGames: async (cafeId: string, playerCount: number): Promise<AlternativeGame[]> => {
    if (USE_MOCK) return PosCheckInMockService.getAlternativeGames(cafeId, playerCount);

    try {
      const raw = await apiClient.get<never, { data?: unknown[] } | unknown[]>(
        `/api/cafes/${cafeId}/inventory`,
        {
          params: { pageNumber: 1, pageSize: 50, status: 'Available' },
        },
      );

      const items = Array.isArray(raw) ? raw : ((raw as { data?: unknown[] }).data ?? []);
      return items
        .map((item) => mapInventoryItem(item as Record<string, unknown>))
        .filter(
          (game) => game.minPlayers <= playerCount && game.maxPlayers >= playerCount,
        );
    } catch {
      return PosCheckInMockService.getAlternativeGames(cafeId, playerCount);
    }
  },

  markAbsent: async (bookingId: string, participantIds: string[]): Promise<MarkAbsentResult> => {
    if (USE_MOCK) {
      const result = await PosCheckInMockService.markAbsent(bookingId, participantIds);
      return { ...result, karmaPenalty: 5 };
    }

    const result = await PosCheckInMockService.markAbsent(bookingId, participantIds);
    return { ...result, karmaPenalty: 5 };
  },

  activateSession: async (
    bookingId: string,
    game: BookedGame,
    presentParticipantIds: string[],
  ): Promise<ActivatedSession> => {
    if (USE_MOCK) {
      return PosCheckInMockService.activateSession(bookingId, game, presentParticipantIds);
    }
    return PosCheckInMockService.activateSession(bookingId, game, presentParticipantIds);
  },
};
