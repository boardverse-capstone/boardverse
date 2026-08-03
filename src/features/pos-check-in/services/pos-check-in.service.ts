import apiClient from '@/core/api/client';
import type {
  ActivatedSession,
  ActiveSessionDetail,
  AddGuestSlotsPayload,
  AddSessionMembersPayload,
  AlternativeGame,
  AssignSessionGamesPayload,
  BookedGame,
  CafeSessionDetail,
  CheckInBookingPayload,
  CheckSessionGamesPayload,
  CompleteSessionResult,
  FloorPlan,
  MarkAbsentResult,
  MergeSessionsPayload,
  PartialCheckoutPayload,
  PaySessionPayload,
  PaymentCode,
  QrResolveResult,
  ReportInventoryLossPayload,
  SessionBill,
  StaffCafe,
  TableBooking,
} from '../types/pos-check-in.interface';
import {
  buildFloorPlanFromBookings,
  mapApiActivatedSession,
  mapApiBoardGame,
  mapApiBookingList,
  mapApiCompleteSession,
  mapApiFloorPlan,
  mapApiPaymentCode,
  mapApiSession,
  mapApiSessionBill,
  isPendingCheckInBooking,
} from '../utils/pos-check-in.mapper';
import { PosCheckInMockService } from './pos-check-in.mock';

const USE_MOCK = process.env.NEXT_PUBLIC_USE_MOCK_POS_API !== 'false';

const boardGameCache = new Map<string, BookedGame>();

/** GET /api/v1/board-games/{gameId} — hydrate tên/ảnh khi booking.gameName null */
async function fetchBoardGame(gameId: string): Promise<BookedGame | null> {
  if (!gameId) return null;
  const cached = boardGameCache.get(gameId);
  if (cached) return cached;

  try {
    const raw = await apiClient.get<never, unknown>(`/api/v1/board-games/${gameId}`);
    const game = mapApiBoardGame(raw, gameId);
    if (game.name && game.name !== 'Chưa có tên game') {
      boardGameCache.set(gameId, game);
    }
    return game;
  } catch {
    return null;
  }
}

function needsGameHydration(game: BookedGame): boolean {
  return Boolean(game.id) && (!game.name || game.name === 'Chưa có tên game');
}

async function enrichBookingsWithGames(bookings: TableBooking[]): Promise<TableBooking[]> {
  const ids = [
    ...new Set(
      bookings
        .filter((b) => needsGameHydration(b.bookedGame))
        .map((b) => b.bookedGame.id)
        .filter(Boolean),
    ),
  ];

  if (ids.length === 0) return bookings;

  const entries = await Promise.all(
    ids.map(async (id) => [id, await fetchBoardGame(id)] as const),
  );
  const byId = new Map(entries.filter(([, game]) => Boolean(game)));

  return bookings.map((booking) => {
    if (!needsGameHydration(booking.bookedGame)) return booking;
    const game = byId.get(booking.bookedGame.id);
    if (!game) return booking;
    return {
      ...booking,
      bookedGame: {
        ...booking.bookedGame,
        name: game.name,
        imageUrl: game.imageUrl,
        minPlayers: game.minPlayers,
        maxPlayers: game.maxPlayers,
      },
    };
  });
}

function mapStaffCafe(raw: unknown): StaffCafe | null {
  const r = (raw && typeof raw === 'object' ? raw : {}) as Record<string, unknown>;
  const id = String(r.id ?? r.cafeId ?? r.Id ?? r.CafeId ?? '');
  if (!id) return null;
  return {
    id,
    name: String(r.name ?? r.cafeName ?? r.Name ?? 'Quán'),
    address: r.address != null ? String(r.address) : r.Address != null ? String(r.Address) : undefined,
  };
}

export const POS_QUERY_KEYS = {
  cafe: 'pos-staff-cafe',
  floorPlan: 'pos-floor-plan',
  bookings: 'pos-pending-bookings',
  booking: 'pos-booking',
  alternatives: 'pos-alternative-games',
  activeSession: 'pos-active-session',
  session: 'pos-session',
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

function sessionPath(cafeId: string, sessionId: string, suffix = '') {
  return `/api/cafes/${cafeId}/sessions/${sessionId}${suffix}`;
}

async function mockSessionDetail(sessionId: string): Promise<CafeSessionDetail> {
  const session = await PosCheckInMockService.getSessionById(sessionId);
  return { ...session, status: 'Active' };
}

export const PosCheckInService = {
  getStaffCafe: async (): Promise<StaffCafe> => {
    if (USE_MOCK) return PosCheckInMockService.getStaffCafe();

    try {
      const raw = await apiClient.get<never, unknown>('/api/staff/my-cafes');
      const list = Array.isArray(raw)
        ? raw
        : Array.isArray((raw as { data?: unknown[] })?.data)
          ? ((raw as { data: unknown[] }).data)
          : [];
      for (const item of list) {
        const cafe = mapStaffCafe(item);
        if (cafe) return cafe;
      }
    } catch {
      // fallback mock
    }

    return PosCheckInMockService.getStaffCafe();
  },

  /** GET /api/cafes/{cafeId}/pos/tables */
  getFloorPlan: async (cafeId: string): Promise<FloorPlan> => {
    if (USE_MOCK) return PosCheckInMockService.getFloorPlan(cafeId);

    try {
      const raw = await apiClient.get<never, unknown>(`/api/cafes/${cafeId}/pos/tables`);
      const plan = mapApiFloorPlan(raw, cafeId);
      if (plan.tables.length > 0) return plan;
    } catch {
      // fallback từ bookings
    }

    try {
      const bookings = await PosCheckInService.getCafeBookings(cafeId);
      return buildFloorPlanFromBookings(cafeId, bookings);
    } catch {
      return { cafeId, tables: [] };
    }
  },

  resolveQrOrBookingId: async (payload: string): Promise<QrResolveResult> => {
    if (USE_MOCK) return PosCheckInMockService.resolveQrOrBookingId(payload);

    const cafe = await PosCheckInService.getStaffCafe();
    const bookings = await PosCheckInService.getCafeBookings(cafe.id);
    const trimmed = payload.trim();
    const found = bookings.find(
      (b) =>
        b.id === trimmed ||
        b.qrCode === trimmed ||
        b.qrCode.toLowerCase() === trimmed.toLowerCase(),
    );
    if (!found) throw new Error('Không tìm thấy booking từ mã QR.');

    return {
      booking: found,
      table: {
        id: found.tableId,
        label: found.tableLabel,
        zone: '',
        seats: found.playerQuantity ?? found.participants.length,
        position: { row: 0, col: 0 },
        status: found.sessionStatus === 'Active' ? 'Occupied' : 'Reserved',
        bookingId: found.id,
        sessionId: found.sessionId,
        gameName: found.bookedGame.name,
        presentCount: found.participants.length,
      },
    };
  },

  /** GET /api/bookings/cafe/{cafeId} */
  getCafeBookings: async (cafeId: string): Promise<TableBooking[]> => {
    if (USE_MOCK) return PosCheckInMockService.getPendingBookings();

    const raw = await apiClient.get<never, unknown>(`/api/bookings/cafe/${cafeId}`);
    const bookings = mapApiBookingList(raw);
    return enrichBookingsWithGames(bookings);
  },

  getPendingBookings: async (cafeId: string): Promise<TableBooking[]> => {
    if (USE_MOCK) return PosCheckInMockService.getPendingBookings();

    try {
      const bookings = await PosCheckInService.getCafeBookings(cafeId);
      return bookings.filter(isPendingCheckInBooking);
    } catch {
      return PosCheckInMockService.getPendingBookings();
    }
  },

  getBookingById: async (id: string, cafeId?: string): Promise<TableBooking> => {
    if (USE_MOCK) return PosCheckInMockService.getBookingById(id);

    const resolvedCafeId = cafeId ?? (await PosCheckInService.getStaffCafe()).id;
    const bookings = await PosCheckInService.getCafeBookings(resolvedCafeId);
    const found = bookings.find((b) => b.id === id);
    if (found) return found;
    throw new Error('Không tìm thấy đơn đặt bàn.');
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
        .filter((game) => game.minPlayers <= playerCount && game.maxPlayers >= playerCount);
    } catch {
      return PosCheckInMockService.getAlternativeGames(cafeId, playerCount);
    }
  },

  markAbsent: async (bookingId: string, participantIds: string[]): Promise<MarkAbsentResult> => {
    // CafeStaff không có mark-absent riêng — mock local; real flow gửi presentIds lúc check-in
    if (USE_MOCK) {
      const result = await PosCheckInMockService.markAbsent(bookingId, participantIds);
      return { ...result, karmaPenalty: 5 };
    }

    const result = await PosCheckInMockService.markAbsent(bookingId, participantIds);
    return { ...result, karmaPenalty: 5 };
  },

  /** POST /api/bookings/{bookingId}/check-in */
  checkInBooking: async (
    bookingId: string,
    payload: CheckInBookingPayload,
    game?: BookedGame,
  ): Promise<ActivatedSession> => {
    if (USE_MOCK) {
      const fallbackGame: BookedGame = game ?? {
        id: payload.inventoryId ?? 'game',
        inventoryId: payload.inventoryId,
        name: 'Game',
        imageUrl: 'https://picsum.photos/seed/game/400/300',
        minPlayers: 1,
        maxPlayers: 8,
      };
      return PosCheckInMockService.activateSession(
        bookingId,
        fallbackGame,
        payload.presentParticipantIds,
      );
    }

    const raw = await apiClient.post<never, unknown>(
      `/api/bookings/${bookingId}/check-in`,
      payload,
    );
    return mapApiActivatedSession(raw);
  },

  /** POST /api/bookings/{bookingId}/check-out */
  checkOutBooking: async (bookingId: string): Promise<void> => {
    if (USE_MOCK) {
      try {
        const session = await PosCheckInMockService.getActiveSessionByBookingId(bookingId);
        await PosCheckInMockService.completeSession(session.sessionId);
      } catch {
        // booking chưa có session — bỏ qua trong mock
      }
      return;
    }

    await apiClient.post(`/api/bookings/${bookingId}/check-out`);
  },

  activateSession: async (
    bookingId: string,
    game: BookedGame,
    presentParticipantIds: string[],
  ): Promise<ActivatedSession> => {
    return PosCheckInService.checkInBooking(
      bookingId,
      {
        presentParticipantIds,
        inventoryId: game.inventoryId ?? game.id,
      },
      game,
    );
  },

  getActiveSessionByBookingId: async (bookingId: string): Promise<ActiveSessionDetail> => {
    if (USE_MOCK) return PosCheckInMockService.getActiveSessionByBookingId(bookingId);
    return PosCheckInMockService.getActiveSessionByBookingId(bookingId);
  },

  /** GET /api/cafes/{cafeId}/sessions/{sessionId} */
  getSession: async (cafeId: string, sessionId: string): Promise<CafeSessionDetail> => {
    if (USE_MOCK) return mockSessionDetail(sessionId);

    const raw = await apiClient.get<never, unknown>(sessionPath(cafeId, sessionId));
    return mapApiSession(raw);
  },

  /** POST .../guest-slots */
  addGuestSlots: async (
    cafeId: string,
    sessionId: string,
    payload: AddGuestSlotsPayload,
  ): Promise<CafeSessionDetail> => {
    if (USE_MOCK) {
      const session = await mockSessionDetail(sessionId);
      return {
        ...session,
        guestCount: (session.guestCount ?? 0) + payload.guestCount,
        presentCount: session.presentCount + payload.guestCount,
      };
    }

    const raw = await apiClient.post<never, unknown>(
      sessionPath(cafeId, sessionId, '/guest-slots'),
      payload,
    );
    return mapApiSession(raw);
  },

  /** POST .../members/add */
  addSessionMembers: async (
    cafeId: string,
    sessionId: string,
    payload: AddSessionMembersPayload,
  ): Promise<CafeSessionDetail> => {
    if (USE_MOCK) {
      const session = await mockSessionDetail(sessionId);
      return {
        ...session,
        presentCount: session.presentCount + payload.userIds.length,
        memberIds: [...(session.memberIds ?? []), ...payload.userIds],
      };
    }

    const raw = await apiClient.post<never, unknown>(
      sessionPath(cafeId, sessionId, '/members/add'),
      payload,
    );
    return mapApiSession(raw);
  },

  /** POST .../games */
  assignSessionGames: async (
    cafeId: string,
    sessionId: string,
    payload: AssignSessionGamesPayload,
  ): Promise<CafeSessionDetail> => {
    if (USE_MOCK) {
      const session = await mockSessionDetail(sessionId);
      return { ...session, assignedInventoryIds: payload.inventoryIds };
    }

    const raw = await apiClient.post<never, unknown>(
      sessionPath(cafeId, sessionId, '/games'),
      payload,
    );
    return mapApiSession(raw);
  },

  /** POST .../games/check */
  checkSessionGames: async (
    cafeId: string,
    sessionId: string,
    payload: CheckSessionGamesPayload,
  ): Promise<CafeSessionDetail> => {
    if (USE_MOCK) {
      void payload;
      const session = await mockSessionDetail(sessionId);
      return { ...session, status: 'Checking' };
    }

    const raw = await apiClient.post<never, unknown>(
      sessionPath(cafeId, sessionId, '/games/check'),
      payload,
    );
    return mapApiSession(raw);
  },

  /** POST .../inventory-loss */
  reportInventoryLoss: async (
    cafeId: string,
    sessionId: string,
    payload: ReportInventoryLossPayload,
  ): Promise<CafeSessionDetail> => {
    if (USE_MOCK) {
      void payload;
      const session = await mockSessionDetail(sessionId);
      return { ...session, status: 'Checking' };
    }

    const raw = await apiClient.post<never, unknown>(
      sessionPath(cafeId, sessionId, '/inventory-loss'),
      payload,
    );
    return mapApiSession(raw);
  },

  /** POST .../end-game → CHECKING */
  endGame: async (cafeId: string, sessionId: string): Promise<CafeSessionDetail> => {
    if (USE_MOCK) {
      const session = await mockSessionDetail(sessionId);
      return { ...session, status: 'Checking', endedAt: new Date().toISOString() };
    }

    const raw = await apiClient.post<never, unknown>(sessionPath(cafeId, sessionId, '/end-game'));
    return mapApiSession(raw);
  },

  /** POST .../merge */
  mergeSessions: async (
    cafeId: string,
    sourceSessionId: string,
    payload: MergeSessionsPayload,
  ): Promise<CafeSessionDetail> => {
    if (USE_MOCK) {
      void sourceSessionId;
      const session = await mockSessionDetail(payload.targetSessionId);
      return { ...session, memberIds: payload.memberIds };
    }

    const raw = await apiClient.post<never, unknown>(
      sessionPath(cafeId, sourceSessionId, '/merge'),
      payload,
    );
    return mapApiSession(raw);
  },

  /** POST .../partial-checkout */
  partialCheckout: async (
    cafeId: string,
    sessionId: string,
    payload: PartialCheckoutPayload,
  ): Promise<SessionBill> => {
    if (USE_MOCK) {
      void payload;
      return PosCheckInMockService.calculateBill(sessionId);
    }

    const raw = await apiClient.post<never, unknown>(
      sessionPath(cafeId, sessionId, '/partial-checkout'),
      payload,
    );
    return mapApiSessionBill(raw, sessionId);
  },

  /** POST .../pay */
  paySession: async (
    cafeId: string,
    sessionId: string,
    payload: PaySessionPayload = { paymentMethod: 'QR' },
  ): Promise<PaymentCode> => {
    if (USE_MOCK) {
      void cafeId;
      void payload;
      return PosCheckInMockService.generatePaymentCode(sessionId);
    }

    const raw = await apiClient.post<never, unknown>(
      sessionPath(cafeId, sessionId, '/pay'),
      payload,
    );
    return mapApiPaymentCode(raw);
  },

  /** POST .../checkout */
  checkoutSession: async (cafeId: string, sessionId: string): Promise<CompleteSessionResult> => {
    if (USE_MOCK) {
      void cafeId;
      return PosCheckInMockService.completeSession(sessionId);
    }

    const raw = await apiClient.post<never, unknown>(sessionPath(cafeId, sessionId, '/checkout'));
    return mapApiCompleteSession(raw, sessionId);
  },

  calculateBill: async (sessionId: string, cafeId?: string): Promise<SessionBill> => {
    if (USE_MOCK || !cafeId) return PosCheckInMockService.calculateBill(sessionId);

    const session = await PosCheckInService.getSession(cafeId, sessionId);
    const raw = await apiClient.get<never, unknown>(sessionPath(cafeId, sessionId));
    const billCandidate = (raw as { bill?: unknown })?.bill;
    if (billCandidate) return mapApiSessionBill(billCandidate, sessionId);

    return {
      sessionId,
      bookingId: session.bookingId,
      billingModel: session.billingModel,
      durationMinutes: Math.max(
        1,
        Math.ceil((Date.now() - new Date(session.startedAt).getTime()) / 60_000),
      ),
      lineItems: [],
      depositCreditTotal: session.depositCreditTotal,
      subtotal: 0,
      totalDue: 0,
      currency: 'VND',
      calculatedAt: new Date().toISOString(),
    };
  },

  generatePaymentCode: async (sessionId: string, cafeId?: string): Promise<PaymentCode> => {
    if (USE_MOCK || !cafeId) return PosCheckInMockService.generatePaymentCode(sessionId);
    return PosCheckInService.paySession(cafeId, sessionId);
  },

  completeSession: async (sessionId: string, cafeId?: string): Promise<CompleteSessionResult> => {
    if (USE_MOCK || !cafeId) return PosCheckInMockService.completeSession(sessionId);
    return PosCheckInService.checkoutSession(cafeId, sessionId);
  },
};
