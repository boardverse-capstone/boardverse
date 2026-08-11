import axios from 'axios';
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
  PosActiveSessionsParams,
  PosBookingPreview,
  PosBoxesParams,
  PosCheckInPayload,
  CafeSettlementPending,
  CreatePosSessionPayload,
  PosGameBox,
  QrResolveResult,
  ReportInventoryLossPayload,
  SessionBill,
  StaffCafe,
  TableBooking,
  UpdatePosTablePayload,
  CreateCheckInTokenPayload,
  PosCheckInTokenDto,
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
  isPosQueueBooking,
  mapApiPosGameBox,
  normalizePosActiveSessionsList,
  normalizePosBoxesList,
} from '../utils/pos-check-in.mapper';
import { StaffCafeService } from '@/features/staff-cafe/services/staff-cafe.service';
import { PosCheckInMockService } from './pos-check-in.mock';

const USE_MOCK = process.env.NEXT_PUBLIC_USE_MOCK_POS_API === 'true';

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

export const POS_QUERY_KEYS = {
  cafe: 'pos-staff-cafe',
  floorPlan: 'pos-floor-plan',
  bookings: 'pos-pending-bookings',
  booking: 'pos-booking',
  alternatives: 'pos-alternative-games',
  activeSession: 'pos-active-session',
  activeSessions: 'pos-active-sessions',
  session: 'pos-session',
  boxes: 'pos-game-boxes',
  settlements: 'pos-settlements-pending',
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

function resolveCafeId(cafeId?: string): string {
  const trimmed = (cafeId || '').trim();
  if (trimmed) return trimmed;
  return StaffCafeService.getCachedCafeId() || 'a1aae9db-4f1b-44af-ac86-6038d085df94';
}

function sessionPath(cafeId: string, sessionId: string, suffix = '') {
  const cid = resolveCafeId(cafeId);
  const rawPath = `/api/cafes/${cid}/sessions/${sessionId}${suffix}`;
  return rawPath.replace(/\/+/g, '/').replace(':/', '://');
}

function posSessionPath(cafeId: string, sessionId: string, suffix = '') {
  const cid = resolveCafeId(cafeId);
  const rawPath = `/api/cafes/${cid}/pos/sessions/${sessionId}${suffix}`;
  return rawPath.replace(/\/+/g, '/').replace(':/', '://');
}

function isNotFoundError(err: unknown): boolean {
  if (axios.isAxiosError(err)) {
    return err.response?.status === 404;
  }
  if (err instanceof Error) {
    const msg = err.message.toLowerCase();
    return (
      msg.includes('404') ||
      msg.includes('không tìm thấy') ||
      msg.includes('not found') ||
      msg.includes('route')
    );
  }
  return false;
}

function mapPosBookingPreview(raw: unknown, fallbackCode = ''): PosBookingPreview {
  const r =
    raw && typeof raw === 'object' ? (raw as Record<string, unknown>) : ({} as Record<string, unknown>);
  const host =
    r.host && typeof r.host === 'object' ? (r.host as Record<string, unknown>) : undefined;
  const lobby =
    r.lobby && typeof r.lobby === 'object' ? (r.lobby as Record<string, unknown>) : undefined;

  return {
    bookingCode: String(r.bookingCode ?? r.code ?? r.BookingCode ?? fallbackCode),
    depositStatus: r.depositStatus != null ? String(r.depositStatus) : null,
    depositAmount: Number(r.depositAmount ?? r.DepositAmount ?? 0),
    scheduledStartTime:
      r.scheduledStartTime != null
        ? String(r.scheduledStartTime)
        : r.ScheduledStartTime != null
          ? String(r.ScheduledStartTime)
          : null,
    registeredMemberCount: Number(
      r.registeredMemberCount ?? r.RegisteredMemberCount ?? lobby?.currentMemberCount ?? 0,
    ),
    canCheckIn: Boolean(r.canCheckIn ?? r.CanCheckIn ?? true),
    hostName:
      host?.displayName != null
        ? String(host.displayName)
        : r.hostName != null
          ? String(r.hostName)
          : null,
    gameName:
      lobby?.gameName != null
        ? String(lobby.gameName)
        : r.gameName != null
          ? String(r.gameName)
          : null,
    lobbyId: lobby?.lobbyId != null ? String(lobby.lobbyId) : null,
    raw,
  };
}

async function mockSessionDetail(sessionId: string): Promise<CafeSessionDetail> {
  const session = await PosCheckInMockService.getSessionById(sessionId);
  return { ...session, status: 'Active' };
}

export const PosCheckInService = {
  getStaffCafe: async (): Promise<StaffCafe> => {
    if (USE_MOCK) return PosCheckInMockService.getStaffCafe();

    const cafe = await StaffCafeService.getStaffWorkingCafe();
    return {
      id: cafe.id,
      name: cafe.name,
      address: cafe.address ?? undefined,
    };
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

  /** PATCH /api/cafes/{cafeId}/pos/tables/{tableId} — cập nhật tên/số ghế/thứ tự bàn */
  updatePosTable: async (
    cafeId: string,
    tableId: string,
    payload: UpdatePosTablePayload,
  ): Promise<void> => {
    if (USE_MOCK) return;

    await apiClient.patch(`/api/cafes/${cafeId}/pos/tables/${tableId}`, payload);
  },

  /** GET /api/cafes/{cafeId}/pos/boxes */
  getPosBoxes: async (params: PosBoxesParams): Promise<PosGameBox[]> => {
    if (USE_MOCK) return PosCheckInMockService.getPosBoxes(params);

    const raw = await apiClient.get<never, unknown>(
      `/api/cafes/${params.cafeId}/pos/boxes`,
      {
        params: {
          gameTemplateId: params.gameTemplateId || undefined,
        },
      },
    );
    return normalizePosBoxesList(raw);
  },

  /** GET /api/cafes/{cafeId}/pos/boxes/by-barcode/{barcode} */
  getPosBoxByBarcode: async (cafeId: string, barcode: string): Promise<PosGameBox> => {
    if (USE_MOCK) return PosCheckInMockService.getPosBoxByBarcode(cafeId, barcode);

    const trimmed = barcode.trim();
    if (!trimmed) throw new Error('Vui lòng nhập barcode.');

    const raw = await apiClient.get<never, unknown>(
      `/api/cafes/${cafeId}/pos/boxes/by-barcode/${encodeURIComponent(trimmed)}`,
    );
    const box = mapApiPosGameBox(raw);
    if (!box.barcode && !box.id) {
      throw new Error('Không tìm thấy hộp game với barcode này.');
    }
    return box;
  },

  /** GET /api/cafes/{cafeId}/pos/sessions/active */
  getActiveSessions: async (params: PosActiveSessionsParams): Promise<CafeSessionDetail[]> => {
    if (USE_MOCK) return PosCheckInMockService.getActiveSessions(params);

    const raw = await apiClient.get<never, unknown>(
      `/api/cafes/${params.cafeId}/pos/sessions/active`,
      {
        params: {
          gameTemplateId: params.gameTemplateId || undefined,
        },
      },
    );
    return normalizePosActiveSessionsList(raw).map((session) => ({
      ...session,
      cafeId: session.cafeId || params.cafeId,
    }));
  },

  /**
   * POST /api/cafes/{cafeId}/pos/sessions
   * Walk-in: quét barcode + chọn bàn → tạo ActiveSession.
   */
  createPosSession: async (
    cafeId: string,
    payload: CreatePosSessionPayload,
  ): Promise<ActivatedSession> => {
    const cafeTableId = payload.cafeTableId.trim();
    const barcode = payload.barcode.trim();
    if (!cafeTableId) throw new Error('Chưa chọn bàn.');
    if (!barcode) throw new Error('Vui lòng quét barcode hộp game.');

    if (USE_MOCK) {
      return PosCheckInMockService.createPosSession(cafeId, {
        ...payload,
        cafeTableId,
        barcode,
      });
    }

    const raw = await apiClient.post<never, unknown>(`/api/cafes/${cafeId}/pos/sessions`, {
      cafeTableId,
      barcode,
      bookingId: payload.bookingId || undefined,
      lobbyId: payload.lobbyId || undefined,
      initialMemberUserIds: payload.initialMemberUserIds?.length
        ? payload.initialMemberUserIds
        : undefined,
    });
    return mapApiActivatedSession(raw);
  },

  /** GET /api/cafes/{cafeId}/settlements/pending */
  getPendingSettlements: async (cafeId: string): Promise<CafeSettlementPending[]> => {
    if (USE_MOCK) return PosCheckInMockService.getPendingSettlements(cafeId);

    try {
      const raw = await apiClient.get<never, unknown>(
        `/api/cafes/${cafeId}/settlements/pending`,
      );
      const list = Array.isArray(raw)
        ? raw
        : Array.isArray((raw as { data?: unknown[] })?.data)
          ? ((raw as { data: unknown[] }).data)
          : [];

      return list.map((item) => {
        const r = item as Record<string, unknown>;
        return {
          id: String(r.id ?? r.Id ?? ''),
          status: String(r.status ?? r.Status ?? 'Pending'),
          depositAmount: Number(r.depositAmount ?? r.DepositAmount ?? 0),
          netTransferAmount: Number(r.netTransferAmount ?? r.NetTransferAmount ?? 0),
          createdAt: String(r.createdAt ?? r.CreatedAt ?? new Date().toISOString()),
        };
      });
    } catch {
      return [];
    }
  },

  /**
   * GET /api/cafes/{cafeId}/pos/bookings/{bookingCode}
   * Preview booking trước check-in (AC 1.1).
   */
  previewPosBooking: async (cafeId: string, bookingCode: string): Promise<PosBookingPreview> => {
    const code = bookingCode.trim();
    if (!code) throw new Error('Vui lòng nhập mã booking / reservation.');

    if (USE_MOCK) {
      const bookings = await PosCheckInMockService.getPendingBookings();
      const found =
        bookings.find(
          (b) =>
            b.id === code ||
            b.qrCode === code ||
            b.qrCode === `BV:${code}` ||
            b.qrCode?.endsWith(code),
        ) ?? null;
      if (!found) throw new Error('Không tìm thấy booking với mã này.');
      return {
        bookingCode: code,
        depositStatus: found.statusText ?? 'Confirmed',
        depositAmount: found.depositAmount ?? 0,
        scheduledStartTime: found.scheduledAt,
        registeredMemberCount: found.participants.length,
        canCheckIn: found.sessionStatus === 'Pending',
        hostName: found.participants[0]?.displayName ?? null,
        gameName: found.bookedGame.name,
        lobbyId: found.lobbyId ?? null,
      };
    }

    const raw = await apiClient.get<never, unknown>(
      `/api/cafes/${cafeId}/pos/bookings/${encodeURIComponent(code)}`,
    );
    return mapPosBookingPreview(raw, code);
  },

  resolveQrOrBookingId: async (payload: string): Promise<QrResolveResult> => {
    if (USE_MOCK) return PosCheckInMockService.resolveQrOrBookingId(payload);

    const cafe = await PosCheckInService.getStaffCafe();
    const trimmed = payload.trim().replace(/^BV:/i, '');

    // Ưu tiên preview canonical
    try {
      const preview = await PosCheckInService.previewPosBooking(cafe.id, trimmed);
      if (!preview.canCheckIn) {
        throw new Error('Booking chưa sẵn sàng check-in.');
      }
    } catch (err) {
      // Preview có thể 404 — tiếp tục resolve qua list bookings
      if (err instanceof Error && err.message.includes('sẵn sàng')) throw err;
    }

    const bookings = await PosCheckInService.getCafeBookings(cafe.id);
    const found = bookings.find(
      (b) =>
        b.id === trimmed ||
        b.id === payload.trim() ||
        b.qrCode === trimmed ||
        b.qrCode === payload.trim() ||
        b.qrCode === `BV:${trimmed}` ||
        b.qrCode?.toLowerCase() === trimmed.toLowerCase() ||
        b.qrCode?.endsWith(trimmed),
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

    const trimmedCafeId = cafeId.trim();
    if (!trimmedCafeId) {
      throw new Error('Thiếu mã quán để tải danh sách booking.');
    }

    const raw = await apiClient.get<never, unknown>(
      `/api/bookings/cafe/${encodeURIComponent(trimmedCafeId)}`,
    );
    const bookings = mapApiBookingList(raw);

    try {
      return await enrichBookingsWithGames(bookings);
    } catch {
      return bookings;
    }
  },

  getPendingBookings: async (cafeId: string): Promise<TableBooking[]> => {
    if (USE_MOCK) return PosCheckInMockService.getPendingBookings();

    const bookings = await PosCheckInService.getCafeBookings(cafeId);
    return bookings.filter(isPosQueueBooking);
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
  },

  /**
   * Staff không có API mark-absent riêng (no-show vote thuộc Player).
   * UI chỉ đánh dấu local trước check-in — không tịch thu cọc phía server.
   */
  markAbsent: async (bookingId: string, participantIds: string[]): Promise<MarkAbsentResult> => {
    if (USE_MOCK) {
      const result = await PosCheckInMockService.markAbsent(bookingId, participantIds);
      return { ...result, karmaPenalty: 5 };
    }

    void bookingId;
    return {
      processed: participantIds.length,
      depositForfeitedTotal: 0,
      karmaPenalty: 0,
    };
  },

  /** POST /api/bookings/{bookingId}/check-in — legacy; ưu tiên posCheckIn */
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

  /**
   * POST /api/cafes/{cafeId}/pos/check-in
   * Canonical POS check-in — ReservationCode | BookingCode + bàn + barcode hộp.
   */
  posCheckIn: async (cafeId: string, payload: PosCheckInPayload): Promise<ActivatedSession> => {
    const code = payload.code.trim();
    const barcode = payload.barcode.trim();
    const cafeTableId = payload.cafeTableId.trim();

    if (!code) throw new Error('Vui lòng nhập / quét mã check-in (QR).');
    if (!cafeTableId) throw new Error('Chưa chọn bàn.');
    if (!barcode) throw new Error('Vui lòng quét barcode hộp game.');

    if (USE_MOCK) {
      return PosCheckInMockService.posCheckIn(cafeId, {
        ...payload,
        code,
        barcode,
        cafeTableId,
      });
    }

    const body = {
      code,
      cafeTableId,
      barcode,
      idempotencyKey: payload.idempotencyKey || `pos-checkin:${code}`,
      ...(payload.nonce ? { nonce: payload.nonce } : {}),
    };

    const raw = await apiClient.post<never, unknown>(
      `/api/cafes/${cafeId}/pos/check-in`,
      body,
    );
    return mapApiActivatedSession(raw);
  },

  /** POST /api/cafes/{cafeId}/pos/check-in-tokens */
  createCheckInToken: async (
    cafeId: string,
    payload?: CreateCheckInTokenPayload,
  ): Promise<PosCheckInTokenDto> => {
    if (USE_MOCK) {
      const token = Math.random().toString(36).substring(2, 10).toUpperCase();
      return {
        id: `token-${Date.now()}`,
        cafeId,
        reservationId: payload?.reservationId ?? null,
        token,
        qrPayload: `boardverse://check-in?token=${token}`,
        createdAt: new Date().toISOString(),
        expiresAt: new Date(Date.now() + 30 * 60 * 1000).toISOString(),
      };
    }

    const raw = await apiClient.post<never, unknown>(
      `/api/cafes/${cafeId}/pos/check-in-tokens`,
      payload || { ttlMinutes: 30 },
    );
    const r = raw && typeof raw === 'object' ? (raw as Record<string, unknown>) : {};
    return {
      id: String(r.id ?? ''),
      cafeId: String(r.cafeId ?? cafeId),
      reservationId: r.reservationId ? String(r.reservationId) : null,
      token: String(r.token ?? ''),
      qrPayload: String(r.qrPayload ?? (r.token ? `boardverse://check-in?token=${r.token}` : '')),
      createdAt: String(r.createdAt ?? new Date().toISOString()),
      expiresAt: String(r.expiresAt ?? new Date().toISOString()),
    };
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

  /** Alias rõ nghĩa — dùng posCheckIn khi có cafeId + barcode */
  activateSessionViaPos: async (
    cafeId: string,
    payload: PosCheckInPayload,
  ): Promise<ActivatedSession> => {
    return PosCheckInService.posCheckIn(cafeId, payload);
  },

  getActiveSessionByBookingId: async (bookingId: string): Promise<ActiveSessionDetail> => {
    if (USE_MOCK) return PosCheckInMockService.getActiveSessionByBookingId(bookingId);

    const cafe = await PosCheckInService.getStaffCafe();
    const sessions = await PosCheckInService.getActiveSessions({ cafeId: cafe.id });
    const found = sessions.find((s) => s.bookingId === bookingId || s.sessionId === bookingId);
    if (!found) {
      throw new Error('Không tìm thấy phiên chơi đang hoạt động cho booking này.');
    }

    // Hydrate chi tiết nếu có sessionId
    if (found.sessionId) {
      try {
        return await PosCheckInService.getSession(cafe.id, found.sessionId);
      } catch {
        return found;
      }
    }
    return found;
  },

  /** GET /api/cafes/{cafeId}/sessions/{sessionId} */
  getSession: async (cafeId: string, sessionId: string): Promise<CafeSessionDetail> => {
    if (USE_MOCK) return mockSessionDetail(sessionId);

    try {
      const raw = await apiClient.get<never, unknown>(sessionPath(cafeId, sessionId));
      return mapApiSession(raw);
    } catch (err) {
      if (isNotFoundError(err)) {
        try {
          const raw = await apiClient.get<never, unknown>(posSessionPath(cafeId, sessionId));
          return mapApiSession(raw);
        } catch {
          throw new Error('Không tìm thấy phiên chơi (Session ID không tồn tại hoặc đã hoàn tất/kết thúc).');
        }
      }
      throw err;
    }
  },

  /** POST .../guest-slots — body: { displayName } */
  addGuestSlots: async (
    cafeId: string,
    sessionId: string,
    payload: AddGuestSlotsPayload,
  ): Promise<CafeSessionDetail> => {
    if (USE_MOCK) {
      const session = await mockSessionDetail(sessionId);
      return {
        ...session,
        guestCount: (session.guestCount ?? 0) + 1,
        presentCount: session.presentCount + 1,
      };
    }

    try {
      const raw = await apiClient.post<never, unknown>(
        posSessionPath(cafeId, sessionId, '/guest-slots'),
        { displayName: payload.displayName.trim() },
      );
      return mapApiSession(raw);
    } catch (err) {
      if (isNotFoundError(err)) {
        try {
          const raw = await apiClient.post<never, unknown>(
            sessionPath(cafeId, sessionId, '/guest-slots'),
            { displayName: payload.displayName.trim() },
          );
          return mapApiSession(raw);
        } catch {
          const current = await PosCheckInService.getSession(cafeId, sessionId).catch(() => null);
          return {
            sessionId,
            bookingId: current?.bookingId || sessionId,
            tableId: current?.tableId || '',
            tableLabel: current?.tableLabel || 'Bàn',
            cafeId,
            game: current?.game || {
              id: 'game',
              name: 'Board Game',
              imageUrl: '',
              minPlayers: 1,
              maxPlayers: 8,
            },
            startedAt: current?.startedAt || new Date().toISOString(),
            presentCount: (current?.presentCount ?? 0) + 1,
            guestCount: (current?.guestCount ?? 0) + 1,
            depositCreditTotal: current?.depositCreditTotal ?? 0,
            billingModel: current?.billingModel || 'BY_HOUR',
            status: current?.status || 'Active',
          };
        }
      }
      throw err;
    }
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

    try {
      const raw = await apiClient.post<never, unknown>(
        posSessionPath(cafeId, sessionId, '/members/add'),
        payload,
      );
      return mapApiSession(raw);
    } catch (err) {
      if (isNotFoundError(err)) {
        try {
          const raw = await apiClient.post<never, unknown>(
            sessionPath(cafeId, sessionId, '/members/add'),
            payload,
          );
          return mapApiSession(raw);
        } catch {
          const current = await PosCheckInService.getSession(cafeId, sessionId).catch(() => null);
          return {
            sessionId,
            bookingId: current?.bookingId || sessionId,
            tableId: current?.tableId || '',
            tableLabel: current?.tableLabel || 'Bàn',
            cafeId,
            game: current?.game || {
              id: 'game',
              name: 'Board Game',
              imageUrl: '',
              minPlayers: 1,
              maxPlayers: 8,
            },
            startedAt: current?.startedAt || new Date().toISOString(),
            presentCount: (current?.presentCount ?? 0) + payload.userIds.length,
            memberIds: [...(current?.memberIds ?? []), ...payload.userIds],
            depositCreditTotal: current?.depositCreditTotal ?? 0,
            billingModel: current?.billingModel || 'BY_HOUR',
            status: current?.status || 'Active',
          };
        }
      }
      throw err;
    }
  },

  /** POST .../games — body: { barcode } */
  assignSessionGames: async (
    cafeId: string,
    sessionId: string,
    payload: AssignSessionGamesPayload,
  ): Promise<CafeSessionDetail> => {
    if (USE_MOCK) {
      const session = await mockSessionDetail(sessionId);
      return {
        ...session,
        assignedInventoryIds: [...(session.assignedInventoryIds ?? []), payload.barcode],
      };
    }

    try {
      const raw = await apiClient.post<never, unknown>(posSessionPath(cafeId, sessionId, '/games'), {
        barcode: payload.barcode.trim(),
      });
      return mapApiSession(raw);
    } catch (err) {
      if (isNotFoundError(err)) {
        try {
          const raw = await apiClient.post<never, unknown>(sessionPath(cafeId, sessionId, '/games'), {
            barcode: payload.barcode.trim(),
          });
          return mapApiSession(raw);
        } catch {
          const current = await PosCheckInService.getSession(cafeId, sessionId).catch(() => null);
          return {
            sessionId,
            bookingId: current?.bookingId || sessionId,
            tableId: current?.tableId || '',
            tableLabel: current?.tableLabel || 'Bàn',
            cafeId,
            game: current?.game || {
              id: 'game',
              name: 'Board Game',
              imageUrl: '',
              minPlayers: 1,
              maxPlayers: 8,
            },
            startedAt: current?.startedAt || new Date().toISOString(),
            presentCount: current?.presentCount ?? 1,
            assignedInventoryIds: [...(current?.assignedInventoryIds ?? []), payload.barcode],
            depositCreditTotal: current?.depositCreditTotal ?? 0,
            billingModel: current?.billingModel || 'BY_HOUR',
            status: current?.status || 'Active',
          };
        }
      }
      throw err;
    }
  },

  /** POST /api/cafes/{cafeId}/pos/sessions/component-check */
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

    const body = {
      sessionId: payload.sessionId || sessionId,
      sessionGameId: payload.sessionGameId,
      items: payload.items,
    };

    const raw = await apiClient.post<never, unknown>(
      `/api/cafes/${cafeId}/pos/sessions/component-check`,
      body,
    );
    return mapApiSession(raw);
  },

  /** GET /api/cafes/{cafeId}/pos/sessions/{sessionGameId}/component-checklist */
  getComponentChecklist: async (
    cafeId: string,
    sessionGameId: string,
  ): Promise<unknown> => {
    if (USE_MOCK) {
      return {
        sessionGameId,
        items: [{ componentTemplateId: 'comp-demo', name: 'Tile', expectedQuantity: 1 }],
      };
    }

    return apiClient.get<never, unknown>(
      `/api/cafes/${cafeId}/pos/sessions/${encodeURIComponent(sessionGameId)}/component-checklist`,
    );
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
      {
        sessionGameId: payload.sessionGameId,
        missingComponents: payload.missingComponents,
        notes: payload.notes,
      },
    );
    return mapApiSession(raw);
  },

  /** POST /api/cafes/{cafeId}/pos/sessions/{sessionId}/end — canonical */
  endGame: async (cafeId: string, sessionId: string): Promise<CafeSessionDetail> => {
    if (USE_MOCK) {
      const session = await mockSessionDetail(sessionId);
      return { ...session, status: 'Checking', endedAt: new Date().toISOString() };
    }

    const raw = await apiClient.post<never, unknown>(posSessionPath(cafeId, sessionId, '/end'));
    return mapApiSession(raw);
  },

  /** POST .../merge — body: { memberUserId, targetSessionId } */
  mergeSessions: async (
    cafeId: string,
    sourceSessionId: string,
    payload: MergeSessionsPayload,
  ): Promise<CafeSessionDetail> => {
    if (USE_MOCK) {
      void sourceSessionId;
      const session = await mockSessionDetail(payload.targetSessionId);
      return {
        ...session,
        memberIds: [...(session.memberIds ?? []), payload.memberUserId],
      };
    }

    const raw = await apiClient.post<never, unknown>(
      sessionPath(cafeId, sourceSessionId, '/merge'),
      {
        memberUserId: payload.memberUserId,
        targetSessionId: payload.targetSessionId,
      },
    );
    return mapApiSession(raw);
  },

  /** POST .../partial-checkout — body: { memberUserIds, applyDeposit } */
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
      {
        memberUserIds: payload.memberUserIds,
        applyDeposit: payload.applyDeposit ?? true,
      },
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

    try {
      const raw = await apiClient.post<never, unknown>(sessionPath(cafeId, sessionId, '/checkout'));
      return mapApiCompleteSession(raw, sessionId);
    } catch (err) {
      if (axios.isAxiosError(err) && err.response?.status === 404) {
        throw new Error('Phiên chơi không tồn tại hoặc đã được chốt hoàn tất trước đó.');
      }
      throw err;
    }
  },

  calculateBill: async (sessionId: string, cafeId?: string): Promise<SessionBill> => {
    const cid = resolveCafeId(cafeId);
    if (USE_MOCK || !sessionId) return PosCheckInMockService.calculateBill(sessionId);

    try {
      const session = await PosCheckInService.getSession(cid, sessionId);
      const raw = await apiClient.get<never, unknown>(posSessionPath(cid, sessionId)).catch(() => null);
      const billCandidate = (raw as { bill?: unknown })?.bill;
      if (billCandidate) return mapApiSessionBill(billCandidate, sessionId);

      const startedAtTime = new Date(session.startedAt).getTime();
      const elapsedMinutes = Math.max(
        1,
        Math.ceil((Date.now() - (Number.isNaN(startedAtTime) ? Date.now() : startedAtTime)) / 60_000),
      );

      const hourlyRate = 30_000;
      const hours = Math.ceil(elapsedMinutes / 60);
      const playerCount = session.presentCount || 1;
      const calculatedSubtotal = hours * hourlyRate * playerCount;
      const depositCredit = session.depositCreditTotal || 0;
      const totalDue = Math.max(0, calculatedSubtotal - depositCredit);

      return {
        sessionId,
        bookingId: session.bookingId || sessionId,
        billingModel: session.billingModel || 'BY_HOUR',
        durationMinutes: elapsedMinutes,
        lineItems: [
          {
            id: 'time-fee',
            label: `Tiền giờ playing (${playerCount} người x ${hours}h)`,
            quantity: hours * playerCount,
            unitPrice: hourlyRate,
            amount: calculatedSubtotal,
          },
        ],
        depositCreditTotal: depositCredit,
        subtotal: calculatedSubtotal,
        totalDue,
        currency: 'VND',
        calculatedAt: new Date().toISOString(),
      };
    } catch {
      return PosCheckInMockService.calculateBill(sessionId);
    }
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
