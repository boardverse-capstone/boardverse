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
  ComponentChecklist,
  FloorPlan,
  FloorPlanQueryParams,
  MarkAbsentResult,
  MergeSessionsPayload,
  PartialCheckoutPayload,
  PaySessionPayload,
  PaymentCode,
  PosActiveSessionsParams,
  PosBookingPreview,
  CafeReservationListItem,
  PosBoxesParams,
  PosCheckInPayload,
  CafeSettlementPending,
  CheckoutComponentItem,
  CheckoutSessionPayload,
  ComponentChecklistItem,
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
  SessionPaymentStatus,
  SessionPaymentMemberStatus,
  MemberPaymentResult,
} from '../types/pos-check-in.interface';
import {
  mapApiActivatedSession,
  mapApiBoardGame,
  mapApiCompleteSession,
  mapApiComponentChecklist,
  mapApiFloorPlan,
  mapApiPaymentCode,
  mapApiSession,
  mapApiSessionBill,
  isPosQueueBooking,
  isLikelyValidPosCheckInCode,
  mapApiPosGameBox,
  normalizePosActiveSessionsList,
  normalizePosBoxesList,
  sumSessionTotalFromMembers,
} from '../utils/pos-check-in.mapper';
import { StaffCafeService } from '@/features/staff-cafe/services/staff-cafe.service';

const boardGameCache = new Map<string, BookedGame>();

/** Lấy ReservationCode / lobbyShareCode / paymentRef khi QR booking không dùng được. */
async function resolveReservationCheckInCode(params: {
  bookingId?: string;
  lobbyId?: string;
  cafeId?: string;
  fallbackCode: string;
}): Promise<string> {
  const candidates: string[] = [];
  const push = (c?: string | null) => {
    const v = (c || '').trim();
    if (v && !candidates.includes(v)) candidates.push(v);
  };

  // Chi tiết reservation của quán — không dùng /api/bookings
  if (params.cafeId && params.bookingId) {
    try {
      const raw = await apiClient.get<never, unknown>(
        `/api/cafes/${params.cafeId}/reservations`,
        {
          params: { pageNumber: 1, Page: 1, pageSize: 50, PageSize: 50 },
        },
      );
      const items = parseCafeReservationList(raw);
      const found = items.find(
        (item) =>
          item.id === params.bookingId ||
          item.lobbyId === params.bookingId ||
          item.reservationCode.toUpperCase() === params.fallbackCode.toUpperCase(),
      );
      if (found) {
        push(found.reservationCode);
        if (found.lobbyId && !params.lobbyId) params.lobbyId = found.lobbyId;
      }
    } catch {
      // ignore
    }
  }

  const ids = [params.bookingId, params.lobbyId].filter(Boolean) as string[];
  for (const id of ids) {
    try {
      const raw = await apiClient.get<never, unknown>(`/api/v1/reservations/${encodeURIComponent(id)}`);
      const r = raw && typeof raw === 'object' ? (raw as Record<string, unknown>) : {};
      const nested =
        r.data && typeof r.data === 'object' ? (r.data as Record<string, unknown>) : r;
      push(
        String(
          nested.reservationCode ??
            nested.ReservationCode ??
            nested.lobbyShareCode ??
            nested.LobbyShareCode ??
            nested.shareCode ??
            '',
        ),
      );
    } catch {
      // thử id tiếp theo
    }
  }

  if (params.cafeId) {
    try {
      const raw = await apiClient.get<never, unknown>(
        `/api/v1/reservations/pending-cafe-approval`,
        { params: { cafeId: params.cafeId, page: 1, pageSize: 50 } },
      );
      const root = raw && typeof raw === 'object' ? (raw as Record<string, unknown>) : {};
      const data =
        root.data && typeof root.data === 'object' ? (root.data as Record<string, unknown>) : root;
      const items = Array.isArray(data.items)
        ? data.items
        : Array.isArray(data.Items)
          ? data.Items
          : Array.isArray(raw)
            ? raw
            : [];
      for (const item of items) {
        const ir = item && typeof item === 'object' ? (item as Record<string, unknown>) : {};
        const rid = String(ir.reservationId ?? ir.id ?? ir.ReservationId ?? '');
        const lid = String(ir.lobbyId ?? ir.LobbyId ?? '');
        if (
          (params.bookingId && (rid === params.bookingId || lid === params.bookingId)) ||
          (params.lobbyId && (lid === params.lobbyId || rid === params.lobbyId))
        ) {
          push(
            String(
              ir.reservationCode ?? ir.ReservationCode ?? ir.lobbyShareCode ?? ir.shareCode ?? '',
            ),
          );
        }
      }
    } catch {
      // ignore
    }
  }

  for (const c of candidates) {
    if (isLikelyValidPosCheckInCode(c)) return c;
  }
  // paymentRef / orderId có thể là BV-… mà detector legacy vẫn nhận
  for (const c of candidates) {
    if (/^BV/i.test(c) && c.length >= 4 && c.length <= 20) return c;
  }
  return params.fallbackCode;
}

async function buildCheckInCodeCandidates(params: {
  cafeId: string;
  code: string;
  bookingId?: string;
  lobbyId?: string;
}): Promise<string[]> {
  const out: string[] = [];
  const add = (raw?: string) => {
    let c = (raw || '').trim();
    if (c.toUpperCase().startsWith('BV:')) c = c.slice(3).trim();
    if (!c || out.includes(c)) return;
    out.push(c);
  };

  add(params.code);
  const resolved = await resolveReservationCheckInCode({
    bookingId: params.bookingId,
    lobbyId: params.lobbyId,
    cafeId: params.cafeId,
    fallbackCode: params.code,
  });
  add(resolved);
  add(params.bookingId);

  // Ưu tiên mã hợp lệ lên đầu
  return out.sort((a, b) => {
    const av = isLikelyValidPosCheckInCode(a) ? 0 : 1;
    const bv = isLikelyValidPosCheckInCode(b) ? 0 : 1;
    return av - bv;
  });
}

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
  return StaffCafeService.getCachedCafeId();
}

function sessionPath(cafeId: string, sessionId: string, suffix = '') {
  return posSessionPath(cafeId, sessionId, suffix);
}

function posSessionPath(cafeId: string, sessionId: string, suffix = '') {
  const cid = resolveCafeId(cafeId);
  const rawPath = `/api/cafes/${cid}/pos/sessions/${sessionId}${suffix}`;
  return rawPath.replace(/\/+/g, '/').replace(':/', '://');
}

function buildFallbackBill(
  session: CafeSessionDetail | null,
  sessionId: string,
  amount = 0,
): SessionBill {
  const total = session?.totalAmount || amount || 0;
  return {
    sessionId,
    bookingId: session?.bookingId || sessionId,
    billingModel: session?.billingModel || 'BY_HOUR',
    durationMinutes: session?.startedAt
      ? Math.max(1, Math.ceil((Date.now() - new Date(session.startedAt).getTime()) / 60_000))
      : 0,
    lineItems:
      total > 0
        ? [
            {
              id: 'session-total',
              label: 'Tổng hóa đơn phiên chơi',
              quantity: 1,
              unitPrice: total,
              amount: total,
            },
          ]
        : [],
    depositCreditTotal: session?.depositCreditTotal ?? 0,
    subtotal: total + (session?.depositCreditTotal ?? 0),
    totalDue: total,
    currency: 'VND',
    calculatedAt: new Date().toISOString(),
  };
}

/** Đào số tiền từ payload session/invoice (khi DTO thiếu totalAmount). */
function extractAmountFromUnknown(raw: unknown): number {
  if (raw == null) return 0;
  if (typeof raw === 'number' && raw > 0) return raw;

  const preferred =
    /^(totalamount|amountdue|grandtotal|totaldue|payableamount|netamount)$/i;
  const stack: unknown[] = [raw];
  const seen = new Set<unknown>();
  let best = 0;

  while (stack.length > 0) {
    const cur = stack.pop();
    if (!cur || typeof cur !== 'object' || seen.has(cur)) continue;
    seen.add(cur);

    if (Array.isArray(cur)) {
      for (const item of cur) stack.push(item);
      continue;
    }

    for (const [key, value] of Object.entries(cur as Record<string, unknown>)) {
      const norm = key.replace(/[_\s-]/g, '');
      if (typeof value === 'number' && value > 0 && preferred.test(norm)) {
        best = Math.max(best, value);
      } else if (value && typeof value === 'object') {
        stack.push(value);
      }
    }
  }

  return best;
}

function computeTimeBasedSubtotal(
  durationMinutes: number,
  basePrice: number,
  tieredBlockRate: number,
  tieredBlockMinutes: number,
): number {
  if (basePrice <= 0) return 0;
  if (durationMinutes <= 60 || tieredBlockRate <= 0 || tieredBlockMinutes <= 0) {
    return basePrice;
  }
  const extra = durationMinutes - 60;
  const blocks = Math.ceil(extra / tieredBlockMinutes);
  return basePrice + blocks * tieredBlockRate;
}

async function fetchCafePricing(cafeId: string): Promise<{
  basePrice: number;
  tieredBlockRate: number;
  tieredBlockMinutes: number;
  billingModel: string;
} | null> {
  try {
    const raw = await apiClient.get<never, unknown>(`/api/cafes/${cafeId}`);
    const r =
      raw && typeof raw === 'object'
        ? (raw as Record<string, unknown>)
        : ({} as Record<string, unknown>);
    const nested =
      r.data && typeof r.data === 'object'
        ? { ...r, ...(r.data as Record<string, unknown>) }
        : r;
    const basePrice = Number(
      nested.basePrice ?? nested.BasePrice ?? nested.pricePerHour ?? nested.PricePerHour ?? 0,
    );
    if (basePrice <= 0) return null;
    return {
      basePrice,
      tieredBlockRate: Number(nested.tieredBlockRate ?? nested.TieredBlockRate ?? 0),
      tieredBlockMinutes: Number(nested.tieredBlockMinutes ?? nested.TieredBlockMinutes ?? 15),
      billingModel: String(nested.billingModel ?? nested.BillingModel ?? 'TimeBased'),
    };
  } catch {
    return null;
  }
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

function unwrapData(raw: unknown): unknown {
  if (raw && typeof raw === 'object' && 'data' in raw) {
    return (raw as { data: unknown }).data;
  }
  return raw;
}

function mapOneMemberPayment(r: Record<string, unknown>): MemberPaymentResult {
  return {
    memberId: String(r.memberId ?? r.MemberId ?? ''),
    displayName: String(r.displayName ?? r.DisplayName ?? 'Khách'),
    amountDue: Number(r.amountDue ?? r.AmountDue ?? 0),
    amountPaid: Number(r.amountPaid ?? r.AmountPaid ?? 0),
    paymentMethod: String(r.paymentMethod ?? r.PaymentMethod ?? ''),
    status: String(r.status ?? r.Status ?? 'NotPaid'),
    paidAt:
      r.paidAt != null
        ? String(r.paidAt)
        : r.PaidAt != null
          ? String(r.PaidAt)
          : null,
    orderId:
      r.orderId != null
        ? String(r.orderId)
        : r.OrderId != null
          ? String(r.OrderId)
          : null,
    qrImageUrl:
      r.qrImageUrl != null
        ? String(r.qrImageUrl)
        : r.QrImageUrl != null
          ? String(r.QrImageUrl)
          : null,
    paymentUrl:
      r.paymentUrl != null
        ? String(r.paymentUrl)
        : r.PaymentUrl != null
          ? String(r.PaymentUrl)
          : null,
    transferContent:
      r.transferContent != null
        ? String(r.transferContent)
        : r.TransferContent != null
          ? String(r.TransferContent)
          : null,
  };
}

function mapMemberPaymentResults(raw: unknown): MemberPaymentResult[] {
  const data = unwrapData(raw);
  const list = Array.isArray(data)
    ? data
    : data && typeof data === 'object' && Array.isArray((data as { items?: unknown }).items)
      ? ((data as { items: unknown[] }).items)
      : data && typeof data === 'object'
        ? [data]
        : [];
  return list
    .map((item) =>
      item && typeof item === 'object'
        ? mapOneMemberPayment(item as Record<string, unknown>)
        : null,
    )
    .filter((m): m is MemberPaymentResult => !!m?.memberId);
}

function mapSessionPaymentStatus(
  raw: unknown,
  fallbackSessionId: string,
): SessionPaymentStatus {
  const data = unwrapData(raw);
  const r =
    data && typeof data === 'object' ? (data as Record<string, unknown>) : {};
  const membersRaw = Array.isArray(r.members)
    ? r.members
    : Array.isArray(r.Members)
      ? r.Members
      : [];
  const members: SessionPaymentMemberStatus[] = membersRaw
    .map((item) => {
      if (!item || typeof item !== 'object') return null;
      const m = item as Record<string, unknown>;
      const memberId = String(m.memberId ?? m.MemberId ?? m.id ?? '');
      if (!memberId) return null;
      return {
        memberId,
        displayName: String(m.displayName ?? m.DisplayName ?? 'Khách'),
        totalAmount: Number(m.totalAmount ?? m.TotalAmount ?? 0),
        amountPaid: Number(m.amountPaid ?? m.AmountPaid ?? 0),
        status: String(m.status ?? m.Status ?? 'NotPaid'),
        paymentMethod:
          m.paymentMethod != null
            ? String(m.paymentMethod)
            : m.PaymentMethod != null
              ? String(m.PaymentMethod)
              : null,
      };
    })
    .filter((m): m is SessionPaymentMemberStatus => !!m);

  return {
    sessionId: String(r.sessionId ?? r.SessionId ?? fallbackSessionId),
    totalAmount: Number(r.totalAmount ?? r.TotalAmount ?? 0),
    totalPaid: Number(r.totalPaid ?? r.TotalPaid ?? 0),
    totalRemaining: Number(r.totalRemaining ?? r.TotalRemaining ?? 0),
    members,
  };
}

function mapCafeReservationListItem(raw: unknown): CafeReservationListItem | null {
  const r = raw && typeof raw === 'object' ? (raw as Record<string, unknown>) : null;
  if (!r) return null;
  const id = String(r.id ?? r.Id ?? r.reservationId ?? r.ReservationId ?? '');
  const reservationCode = String(r.reservationCode ?? r.ReservationCode ?? '').trim();
  if (!id) return null;
  return {
    id,
    cafeId: String(r.cafeId ?? r.CafeId ?? ''),
    gameId: String(r.gameId ?? r.GameId ?? r.gameTemplateId ?? r.GameTemplateId ?? ''),
    gameName: String(r.gameName ?? r.GameName ?? 'Game'),
    playDate: String(r.playDate ?? r.PlayDate ?? ''),
    timeSlot: String(r.timeSlot ?? r.TimeSlot ?? ''),
    currentPlayers: Number(r.currentPlayers ?? r.CurrentPlayers ?? 0),
    maxPlayers: Number(r.maxPlayers ?? r.MaxPlayers ?? 0),
    status: String(r.status ?? r.Status ?? ''),
    depositAmount: Number(
      r.depositAmount ?? r.DepositAmount ?? r.depositAmountBvc ?? r.DepositAmountBvc ?? 0,
    ),
    lobbyId: r.lobbyId != null ? String(r.lobbyId) : r.LobbyId != null ? String(r.LobbyId) : null,
    lobbyStatus:
      r.lobbyStatus != null
        ? String(r.lobbyStatus)
        : r.LobbyStatus != null
          ? String(r.LobbyStatus)
          : null,
    reservationCode,
    scheduledStartTime:
      r.scheduledStartTime != null
        ? String(r.scheduledStartTime)
        : r.ScheduledStartTime != null
          ? String(r.ScheduledStartTime)
          : null,
    scheduledEndTime:
      r.scheduledEndTime != null
        ? String(r.scheduledEndTime)
        : r.ScheduledEndTime != null
          ? String(r.ScheduledEndTime)
          : null,
    tableNumber:
      r.tableNumber != null
        ? String(r.tableNumber)
        : r.TableNumber != null
          ? String(r.TableNumber)
          : null,
  };
}

function parseCafeReservationList(raw: unknown): CafeReservationListItem[] {
  const root = raw && typeof raw === 'object' ? (raw as Record<string, unknown>) : {};
  const nested =
    root.items == null &&
    root.Items == null &&
    !Array.isArray(root.data) &&
    root.data &&
    typeof root.data === 'object'
      ? (root.data as Record<string, unknown>)
      : root;
  const items = Array.isArray(nested.items)
    ? nested.items
    : Array.isArray(nested.Items)
      ? nested.Items
      : Array.isArray(nested.data)
        ? nested.data
        : Array.isArray(raw)
          ? raw
          : [];
  return items
    .map(mapCafeReservationListItem)
    .filter((item): item is CafeReservationListItem => Boolean(item));
}

function cafeReservationToTableBooking(item: CafeReservationListItem): TableBooking {
  const status = item.status.toLowerCase();
  const sessionStatus: TableBooking['sessionStatus'] =
    status.includes('check')
      ? 'Active'
      : status.includes('cancel') || status.includes('noshow')
        ? 'Cancelled'
        : status.includes('complete')
          ? 'Completed'
          : 'Pending';
  return {
    id: item.id,
    cafeId: item.cafeId,
    tableId: '',
    tableLabel: item.tableNumber || '',
    qrCode: item.reservationCode,
    scheduledAt: item.scheduledStartTime || item.playDate,
    bookedGame: {
      id: item.gameId,
      name: item.gameName,
      imageUrl: '',
      minPlayers: 0,
      maxPlayers: item.maxPlayers,
    },
    participants: [],
    sessionStatus,
    lobbyId: item.lobbyId || undefined,
    scheduledEndAt: item.scheduledEndTime || undefined,
    apiStatus: item.status,
    playerQuantity: item.currentPlayers,
    depositAmount: item.depositAmount,
    reservationCode: item.reservationCode,
  };
}

function mapPosBookingPreview(raw: unknown, fallbackCode = ''): PosBookingPreview {
  const r =
    raw && typeof raw === 'object' ? (raw as Record<string, unknown>) : ({} as Record<string, unknown>);
  const host =
    r.host && typeof r.host === 'object' ? (r.host as Record<string, unknown>) : undefined;
  const lobby =
    r.lobby && typeof r.lobby === 'object' ? (r.lobby as Record<string, unknown>) : undefined;

  return {
    bookingCode: String(
      r.bookingCode ?? r.code ?? r.BookingCode ?? r.reservationCode ?? r.ReservationCode ?? fallbackCode,
    ),
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

function componentCheckResultsKey(sessionId: string) {
  return `pos_component_check_results_${sessionId}`;
}

/** Map checklist → CheckoutRequestDto.components (Swagger BE). */
export function buildCheckoutComponentsFromChecklist(
  components: ComponentChecklistItem[],
  actualByComponent: Record<string, number>,
  markAllValid: boolean,
): CheckoutComponentItem[] {
  return components.map((c) => {
    if (markAllValid) {
      return {
        componentId: c.componentId,
        isMissing: false,
        isDamaged: false,
        penaltyFee: 0,
      };
    }
    const actual = actualByComponent[c.componentId] ?? c.expectedQuantity;
    const isMissing = actual < c.expectedQuantity;
    return {
      componentId: c.componentId,
      isMissing,
      isDamaged: false,
      penaltyFee: 0,
    };
  });
}

function readStoredCheckoutComponents(sessionId: string): CheckoutComponentItem[] {
  if (typeof window === 'undefined' || !sessionId) return [];
  try {
    const raw = localStorage.getItem(componentCheckResultsKey(sessionId));
    if (!raw) return [];
    const parsed = JSON.parse(raw) as { components?: CheckoutComponentItem[] };
    return Array.isArray(parsed.components) ? parsed.components : [];
  } catch {
    return [];
  }
}

/** Lưu kết quả kiểm kê để gửi kèm POST /checkout */
export function saveCheckoutComponentResults(
  sessionId: string,
  sessionGameId: string,
  gameComponents: CheckoutComponentItem[],
) {
  if (typeof window === 'undefined' || !sessionId || !sessionGameId) return;
  try {
    const key = componentCheckResultsKey(sessionId);
    const raw = localStorage.getItem(key);
    const stored = raw
      ? (JSON.parse(raw) as { games?: Record<string, CheckoutComponentItem[]> })
      : { games: {} as Record<string, CheckoutComponentItem[]> };
    const games = stored.games ?? {};
    games[sessionGameId] = gameComponents;
    const components = Object.values(games).flat();
    localStorage.setItem(key, JSON.stringify({ games, components }));
  } catch {
    // ignore
  }
}

export function clearCheckoutComponentResults(sessionId: string) {
  if (typeof window === 'undefined' || !sessionId) return;
  try {
    localStorage.removeItem(componentCheckResultsKey(sessionId));
  } catch {
    // ignore
  }
}

function serverTotalStorageKey(sessionId: string) {
  return `pos_server_total_${sessionId}`;
}

/** Lưu TotalAmount từ response checkout (khi GET session DTO thiếu field). */
export function writeServerCheckoutTotal(sessionId: string, total: number) {
  if (typeof window === 'undefined' || !sessionId) return;
  const n = Math.round(Number(total));
  if (!Number.isFinite(n) || n <= 0) return;
  try {
    localStorage.setItem(serverTotalStorageKey(sessionId), String(n));
  } catch {
    // ignore
  }
}

function readServerCheckoutTotal(sessionId: string): number {
  if (typeof window === 'undefined' || !sessionId) return 0;
  try {
    const n = Number(localStorage.getItem(serverTotalStorageKey(sessionId)));
    return Number.isFinite(n) && n > 0 ? n : 0;
  } catch {
    return 0;
  }
}

export function clearServerCheckoutTotal(sessionId: string) {
  if (typeof window === 'undefined' || !sessionId) return;
  try {
    localStorage.removeItem(serverTotalStorageKey(sessionId));
  } catch {
    // ignore
  }
}

async function resolveCheckoutPayload(
  cafeId: string,
  sessionId: string,
): Promise<CheckoutSessionPayload> {
  const stored = readStoredCheckoutComponents(sessionId);
  const componentsChecked =
    typeof window !== 'undefined' &&
    localStorage.getItem(`pos_components_checked_${sessionId}`) === 'true';

  if (stored.length > 0 || componentsChecked) {
    return { componentsVerified: true, components: stored };
  }

  const session = await PosCheckInService.getSession(cafeId, sessionId);
  const gameIds =
    session.sessionGames?.map((g) => g.sessionGameId).filter(Boolean) ?? [];
  const components: CheckoutComponentItem[] = [];

  for (const sessionGameId of gameIds) {
    try {
      const checklist = await PosCheckInService.getComponentChecklist(cafeId, sessionGameId);
      components.push(
        ...buildCheckoutComponentsFromChecklist(checklist.components, {}, true),
      );
    } catch {
      // ignore
    }
  }

  if (components.length === 0 && gameIds.length > 0) {
    throw new Error(
      'Chưa kiểm kê linh kiện. Sang tab Game, bấm Đủ hết, rồi mới chốt hóa đơn.',
    );
  }

  return { componentsVerified: true, components };
}

export const PosCheckInService = {
  getStaffCafe: async (): Promise<StaffCafe> => {
    
    const cafe = await StaffCafeService.getStaffWorkingCafe();
    return {
      id: cafe.id,
      name: cafe.name,
      address: cafe.address ?? undefined,
    };
  },

  /** GET /api/cafes/{cafeId}/pos/tables — hỗ trợ includeOnlyAvailable / includeInactive / statuses */
  getFloorPlan: async (cafeId: string, params?: FloorPlanQueryParams): Promise<FloorPlan> => {
    
    const includeOnlyAvailable = params?.includeOnlyAvailable ?? false;
    const includeInactive = params?.includeInactive ?? false;
    const statuses = params?.statuses?.trim() || undefined;

    try {
      const raw = await apiClient.get<never, unknown>(`/api/cafes/${cafeId}/pos/tables`, {
        params: {
          includeOnlyAvailable: statuses ? undefined : includeOnlyAvailable,
          includeInactive: includeInactive || undefined,
          statuses,
        },
      });
      const plan = mapApiFloorPlan(raw, cafeId);
      return plan;
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
    
    await apiClient.patch(`/api/cafes/${cafeId}/pos/tables/${tableId}`, payload);
  },

  /** GET /api/cafes/{cafeId}/pos/boxes */
  getPosBoxes: async (params: PosBoxesParams): Promise<PosGameBox[]> => {
    
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
    
    try {
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
    } catch {
      return [];
    }
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

    

    const raw = await apiClient.post<never, unknown>(`/api/cafes/${cafeId}/pos/sessions`, {
      cafeTableId,
      barcode,
      reservationId: payload.bookingId || undefined,
      lobbyId: payload.lobbyId || undefined,
      initialMemberUserIds: payload.initialMemberUserIds?.length
        ? payload.initialMemberUserIds
        : undefined,
    });
    return mapApiActivatedSession(raw);
  },

  /** GET /api/cafes/{cafeId}/settlements/pending */
  getPendingSettlements: async (cafeId: string): Promise<CafeSettlementPending[]> => {
    
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

    

    const raw = await apiClient.get<never, unknown>(
      `/api/cafes/${cafeId}/pos/bookings/${encodeURIComponent(code)}`,
    );
    return mapPosBookingPreview(raw, code);
  },

  /**
   * GET /api/cafes/{cafeId}/reservations
   * Danh sách reservation của quán — Manager / CafeStaff.
   */
  getCafeReservations: async (params: {
    cafeId: string;
    playDate?: string;
    statuses?: string[];
    page?: number;
    pageSize?: number;
  }): Promise<CafeReservationListItem[]> => {
    const raw = await apiClient.get<never, unknown>(
      `/api/cafes/${params.cafeId}/reservations`,
      {
        params: {
          playDate: params.playDate || undefined,
          PlayDate: params.playDate || undefined,
          pageNumber: params.page ?? 1,
          Page: params.page ?? 1,
          pageSize: params.pageSize ?? 50,
          PageSize: params.pageSize ?? 50,
          status: params.statuses?.[0],
          Statuses: params.statuses?.length ? params.statuses : undefined,
        },
        paramsSerializer: {
          indexes: null,
        },
      },
    );
    return parseCafeReservationList(raw);
  },

  /** Tra cứu reservation theo mã — ưu tiên ngày chọn, fallback toàn quán. */
  findCafeReservationByCode: async (params: {
    cafeId: string;
    code: string;
    playDate?: string;
  }): Promise<CafeReservationListItem | null> => {
    const normalized = params.code.trim().toUpperCase();
    if (!normalized) return null;

    const match = (items: CafeReservationListItem[]) =>
      items.find((item) => item.reservationCode.toUpperCase() === normalized) ?? null;

    if (params.playDate) {
      const onDate = await PosCheckInService.getCafeReservations({
        cafeId: params.cafeId,
        playDate: params.playDate,
        page: 1,
        pageSize: 100,
      });
      const foundOnDate = match(onDate);
      if (foundOnDate) return foundOnDate;
    }

    const all = await PosCheckInService.getCafeReservations({
      cafeId: params.cafeId,
      page: 1,
      pageSize: 100,
    });
    return match(all);
  },

  resolveQrOrBookingId: async (payload: string): Promise<QrResolveResult> => {
    
    const cafe = await PosCheckInService.getStaffCafe();
    const trimmed = payload.trim().replace(/^BV:/i, '');

    const reservations = await PosCheckInService.getCafeReservations({
      cafeId: cafe.id,
      page: 1,
      pageSize: 50,
    });
    const foundItem = reservations.find((item) => {
      const code = item.reservationCode.toUpperCase();
      const needle = trimmed.toUpperCase();
      return (
        item.id === trimmed ||
        item.id === payload.trim() ||
        code === needle ||
        item.lobbyId === trimmed
      );
    });
    if (!foundItem) throw new Error('Không tìm thấy reservation từ mã QR.');

    const found = cafeReservationToTableBooking(foundItem);
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

  /** GET /api/cafes/{cafeId}/reservations — hàng đợi POS (không còn /api/bookings/cafe). */
  getCafeBookings: async (cafeId: string): Promise<TableBooking[]> => {
    const items = await PosCheckInService.getCafeReservations({
      cafeId,
      page: 1,
      pageSize: 50,
    });
    return items.map(cafeReservationToTableBooking);
  },

  getPendingBookings: async (cafeId: string): Promise<TableBooking[]> => {
    
    const bookings = await PosCheckInService.getCafeBookings(cafeId);
    return bookings.filter(isPosQueueBooking);
  },

  getBookingById: async (id: string, cafeId?: string): Promise<TableBooking> => {
    const resolvedCafeId = cafeId ?? (await PosCheckInService.getStaffCafe()).id;
    const bookings = await PosCheckInService.getCafeBookings(resolvedCafeId);
    const found = bookings.find((b) => b.id === id || b.reservationCode === id || b.lobbyId === id);
    if (found) return found;
    throw new Error('Không tìm thấy reservation.');
  },

  getAlternativeGames: async (cafeId: string, playerCount: number): Promise<AlternativeGame[]> => {
    
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
    

    void bookingId;
    return {
      processed: participantIds.length,
      depositForfeitedTotal: 0,
      karmaPenalty: 0,
    };
  },

  /** Đã bỏ POST /api/bookings/{id}/check-in — dùng posCheckIn. */
  checkInBooking: async (
    bookingId: string,
    _payload: CheckInBookingPayload,
    _game?: BookedGame,
  ): Promise<ActivatedSession> => {
    void bookingId;
    void _payload;
    void _game;
    throw new Error(
      'Check-in reservation dùng POST /api/cafes/{cafeId}/pos/check-in (ReservationCode + bàn + barcode).',
    );
  },

  /**
   * POST /api/cafes/{cafeId}/pos/check-in
   * Canonical POS check-in — ReservationCode | BookingCode + bàn + barcode hộp.
   * verificationQR (BV-a6c1…) thường không lookup được → thử paymentRef / reservationCode.
   */
  posCheckIn: async (cafeId: string, payload: PosCheckInPayload): Promise<ActivatedSession> => {
    const barcode = payload.barcode.trim();
    const cafeTableId = payload.cafeTableId.trim();
    if (!cafeTableId) throw new Error('Chưa chọn bàn.');
    if (!barcode) throw new Error('Vui lòng quét barcode hộp game.');

    

    const candidates = await buildCheckInCodeCandidates({
      cafeId,
      code: payload.code,
      bookingId: payload.bookingId,
      lobbyId: payload.lobbyId,
    });

    if (candidates.length === 0) {
      throw new Error('Thiếu mã check-in (ReservationCode / BookingCode).');
    }

    let lastError: Error | null = null;
    for (const code of candidates) {
      try {
        const raw = await apiClient.post<never, unknown>(
          `/api/cafes/${cafeId}/pos/check-in`,
          {
            code,
            cafeTableId,
            barcode,
            idempotencyKey: payload.idempotencyKey || `pos-checkin:${code}`,
            ...(payload.nonce ? { nonce: payload.nonce } : {}),
          },
        );
        return mapApiActivatedSession(raw);
      } catch (err) {
        lastError = err instanceof Error ? err : new Error(String(err));
        const msg = lastError.message || '';
        // Thử mã kế tiếp khi mã không tìm thấy / không hợp lệ
        if (/không tìm thấy|not found|404|không hợp lệ|invalid|400/i.test(msg)) {
          continue;
        }
        throw lastError;
      }
    }

    // Fallback cuối: walk-in session trên bàn (khi booking không có ReservationCode/BookingCode)
    if (payload.bookingId) {
      try {
        const raw = await apiClient.post<never, unknown>(`/api/cafes/${cafeId}/pos/sessions`, {
          cafeTableId,
          barcode,
        });
        return mapApiActivatedSession(raw);
      } catch {
        // giữ lỗi check-in gốc
      }
    }

    throw (
      lastError ||
      new Error(
        `Không check-in được với mã "${payload.code}". Booking thiếu ReservationCode/BookingCode hợp lệ.`,
      )
    );
  },

  /** POST /api/cafes/{cafeId}/pos/check-in-tokens */
  createCheckInToken: async (
    cafeId: string,
    payload?: CreateCheckInTokenPayload,
  ): Promise<PosCheckInTokenDto> => {
    

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

  /** Kết phiên POS — không còn POST /api/bookings/{id}/check-out. */
  checkOutBooking: async (bookingId: string): Promise<void> => {
    const cafe = await PosCheckInService.getStaffCafe();
    const session = await PosCheckInService.getActiveSessionByBookingId(bookingId);
    const sessionId = session.sessionId;
    if (!sessionId) throw new Error('Không tìm thấy phiên POS để kết thúc.');
    await apiClient.post(`/api/cafes/${cafe.id}/pos/sessions/${sessionId}/end`);
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
    
    const cafe = await PosCheckInService.getStaffCafe();
    const sessions = await PosCheckInService.getActiveSessions({ cafeId: cafe.id });
    let found = sessions.find((s) => s.bookingId === bookingId || s.sessionId === bookingId);

    // Walk-in fallback / session chưa gắn bookingId → khớp theo bàn của booking
    if (!found) {
      try {
        const booking = await PosCheckInService.getBookingById(bookingId, cafe.id);
        if (booking.tableId) {
          found = sessions.find((s) => s.tableId === booking.tableId);
        }
      } catch {
        // ignore
      }
    }

    if (!found) {
      throw new Error('Không tìm thấy phiên chơi đang hoạt động cho booking này.');
    }

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
    let sessionResult: CafeSessionDetail;
    try {
      const raw = await apiClient.get<never, unknown>(sessionPath(cafeId, sessionId));
      sessionResult = mapApiSession(raw);
    } catch (err) {
      if (isNotFoundError(err)) {
        try {
          const raw = await apiClient.get<never, unknown>(posSessionPath(cafeId, sessionId));
          sessionResult = mapApiSession(raw);
        } catch {
          throw new Error('Không tìm thấy phiên chơi (Session ID không tồn tại hoặc đã hoàn tất/kết thúc).');
        }
      } else {
        throw err;
      }
    }

    if (typeof window !== 'undefined') {
      try {
        const stored = localStorage.getItem(`pos_added_members_${sessionId}`);
        if (stored) {
          const extraMembers = JSON.parse(stored) as { id: string; displayName: string }[];
          if (Array.isArray(extraMembers) && extraMembers.length > 0) {
            const extraIds = extraMembers.map((m) => m.id);
            const mergedMemberIds = Array.from(new Set([...(sessionResult.memberIds || []), ...extraIds]));
            sessionResult = {
              ...sessionResult,
              memberIds: mergedMemberIds,
              presentCount: Math.max(sessionResult.presentCount || 0, mergedMemberIds.length),
            };
          }
        }
      } catch {
        // ignore
      }
    }

    return sessionResult;
  },

  /** POST .../guest-slots — body: displayName + phoneNumber (Swagger) */
  addGuestSlots: async (
    cafeId: string,
    sessionId: string,
    payload: AddGuestSlotsPayload,
  ): Promise<CafeSessionDetail> => {
    const displayName = payload.displayName.trim();
    const phoneNumber = payload.phoneNumber?.replace(/\s/g, "") || "";
    const body: Record<string, string> = { displayName };
    if (phoneNumber) body.phoneNumber = phoneNumber;
    if (payload.username?.trim() && !displayName) {
      body.username = payload.username.trim();
    }

    try {
      const raw = await apiClient.post<never, unknown>(
        posSessionPath(cafeId, sessionId, '/guest-slots'),
        body,
      );
      return mapApiSession(raw);
    } catch (err) {
      if (isNotFoundError(err)) {
        try {
          const raw = await apiClient.post<never, unknown>(
            sessionPath(cafeId, sessionId, '/guest-slots'),
            body,
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
    const guidRe =
      /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
    const userIds = (payload.userIds || [])
      .map((id) => String(id ?? '').trim())
      .filter((id) => guidRe.test(id));
    if (userIds.length === 0) {
      throw new Error('Cần chọn user có mã hệ thống (GUID) để thêm vào phiên.');
    }

    const raw = await apiClient.post<never, unknown>(
      posSessionPath(cafeId, sessionId, '/members/add'),
      {
        userIds,
        memberUserIds: userIds,
      },
    );
    return mapApiSession(raw);
  },

  /** POST .../games — body: AttachGameRequestDto { gameBarcode } */
  assignSessionGames: async (
    cafeId: string,
    sessionId: string,
    payload: AssignSessionGamesPayload,
  ): Promise<CafeSessionDetail> => {
    

    const barcode = payload.barcode.trim();
    if (!barcode) throw new Error('Thiếu barcode hộp game.');

    const raw = await apiClient.post<never, unknown>(posSessionPath(cafeId, sessionId, '/games'), {
      gameBarcode: barcode,
    });
    const mapped = mapApiSession(raw, { sessionId, cafeId } as Partial<CafeSessionDetail>);
    const ids = new Set([...(mapped.assignedInventoryIds ?? []), barcode]);
    return {
      ...mapped,
      assignedInventoryIds: Array.from(ids),
    };
  },

  /** POST /api/cafes/{cafeId}/pos/sessions/component-check */
  checkSessionGames: async (
    cafeId: string,
    sessionId: string,
    payload: CheckSessionGamesPayload,
  ): Promise<CafeSessionDetail> => {
    

    const sessionGameId = payload.sessionGameId?.trim();
    if (!sessionGameId) {
      throw new Error('Thiếu sessionGameId để kiểm kê linh kiện.');
    }

    const body = {
      sessionGameId,
      markAllValid: Boolean(payload.markAllValid),
      results: payload.markAllValid
        ? []
        : (payload.results ?? []).map((item) => ({
            componentId: item.componentId,
            actualQuantity: item.actualQuantity,
            responsibleMemberId: item.responsibleMemberId ?? null,
          })),
    };

    await apiClient.post<never, unknown>(
      `/api/cafes/${cafeId}/pos/sessions/component-check`,
      body,
    );

    // Response là ComponentCheckResultDto — hydrate lại session sau kiểm kê
    return PosCheckInService.getSession(cafeId, sessionId);
  },

  /** GET /api/cafes/{cafeId}/pos/sessions/{sessionGameId}/component-checklist */
  getComponentChecklist: async (
    cafeId: string,
    sessionGameId: string,
  ): Promise<ComponentChecklist> => {
    

    const raw = await apiClient.get<never, unknown>(
      `/api/cafes/${cafeId}/pos/sessions/${encodeURIComponent(sessionGameId)}/component-checklist`,
    );
    return mapApiComponentChecklist(raw, sessionGameId);
  },

  /** POST .../inventory-loss */
  reportInventoryLoss: async (
    cafeId: string,
    sessionId: string,
    payload: ReportInventoryLossPayload,
  ): Promise<CafeSessionDetail> => {
    

    try {
      const raw = await apiClient.post<never, unknown>(
        sessionPath(cafeId, sessionId, '/inventory-loss'),
        {
          sessionGameId: payload.sessionGameId,
          missingComponents: payload.missingComponents,
          notes: payload.notes,
        },
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
        presentCount: current?.presentCount ?? 1,
        depositCreditTotal: current?.depositCreditTotal ?? 0,
        billingModel: current?.billingModel || 'BY_HOUR',
        status: current?.status || 'Active',
      };
    }
  },

  /** POST /api/cafes/{cafeId}/pos/sessions/{sessionId}/end — canonical */
  endGame: async (cafeId: string, sessionId: string): Promise<CafeSessionDetail> => {
    const isTerminal = (s?: string) =>
      s === 'Checking' || s === 'Paying' || s === 'Completed';

    const postEnd = async () => {
      const raw = await apiClient.post<never, unknown>(
        posSessionPath(cafeId, sessionId, '/end'),
        {},
      );
      return mapApiSession(raw, { sessionId, cafeId });
    };

    let fromEnd = await postEnd();
    let verified = await PosCheckInService.getSession(cafeId, sessionId).catch(() => null);

    // Ưu tiên GET; nếu GET còn Active mà body /end đã Checking thì dùng body
    let status = isTerminal(verified?.status)
      ? verified!.status
      : isTerminal(fromEnd.status)
        ? fromEnd.status
        : verified?.status || fromEnd.status || 'Active';

    // Retry 1 lần nếu vẫn Active
    if (!isTerminal(status)) {
      fromEnd = await postEnd().catch(() => fromEnd);
      verified = await PosCheckInService.getSession(cafeId, sessionId).catch(() => verified);
      status = isTerminal(verified?.status)
        ? verified!.status
        : isTerminal(fromEnd.status)
          ? fromEnd.status
          : verified?.status || 'Active';
    }

    if (!isTerminal(status)) {
      throw new Error(
        `Không kết thúc được phiên (trạng thái hiện tại: ${status}). Thử lại hoặc liên hệ kỹ thuật.`,
      );
    }

    if (typeof window !== 'undefined') {
      try {
        localStorage.setItem(`pos_checking_${sessionId}`, 'true');
      } catch {
        // ignore
      }
    }

    return {
      ...(verified || fromEnd),
      sessionId,
      cafeId,
      status,
      endedAt: verified?.endedAt || fromEnd.endedAt || new Date().toISOString(),
    };
  },

  /** POST .../merge — body: { memberId, targetSessionId } (memberId = ActiveSessionMember.Id) */
  mergeSessions: async (
    cafeId: string,
    sourceSessionId: string,
    payload: MergeSessionsPayload,
  ): Promise<CafeSessionDetail> => {
    const memberId = String(payload.memberUserId ?? '').trim();
    if (!memberId) {
      throw new Error('Thiếu mã thành viên trong phiên để ghép.');
    }

    const raw = await apiClient.post<never, unknown>(
      sessionPath(cafeId, sourceSessionId, '/merge'),
      {
        memberId,
        targetSessionId: payload.targetSessionId,
      },
    );
    return mapApiSession(raw);
  },

  /** POST .../partial-checkout — body: { memberIds } = ActiveSessionMember.Id[] */
  partialCheckout: async (
    cafeId: string,
    sessionId: string,
    payload: PartialCheckoutPayload,
  ): Promise<SessionBill> => {
    const guidRe =
      /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
    const memberIds = (payload.memberUserIds || [])
      .map((id) => String(id ?? '').trim())
      .filter((id) => guidRe.test(id));
    if (memberIds.length === 0) {
      throw new Error('Cần chọn ít nhất 1 thành viên (memberId) để đánh dấu về sớm.');
    }

    const raw = await apiClient.post<never, unknown>(
      sessionPath(cafeId, sessionId, '/partial-checkout'),
      {
        memberIds,
        applyDeposit: payload.applyDeposit ?? true,
      },
    );
    return mapApiSessionBill(raw, sessionId);
  },

  /** GET session — lấy TotalAmount thật từ BE (không dùng ước tính POS). */
  getServerSessionTotalAmount: async (
    cafeId: string,
    sessionId: string,
    opts?: { pollAttempts?: number; pollIntervalMs?: number },
  ): Promise<number> => {
    

    const attempts = Math.max(1, opts?.pollAttempts ?? 1);
    const intervalMs = opts?.pollIntervalMs ?? 500;

    for (let i = 0; i < attempts; i++) {
      const session = await PosCheckInService.getSession(cafeId, sessionId).catch(() => null);
      const mapped = session?.totalAmount ?? 0;
      if (mapped > 0) return mapped;

      try {
        const raw = await apiClient.get<never, unknown>(sessionPath(cafeId, sessionId));
        const dug = extractAmountFromUnknown(raw);
        if (dug > 0) return dug;

        const root = raw && typeof raw === 'object' ? (raw as Record<string, unknown>) : {};
        const nested = root.data ?? root.Data;
        const data =
          nested && typeof nested === 'object' && !Array.isArray(nested)
            ? (nested as Record<string, unknown>)
            : root;
        const members = Array.isArray(data.members)
          ? data.members
          : Array.isArray(data.Members)
            ? data.Members
            : [];
        const fromMembers = sumSessionTotalFromMembers(members);
        if (fromMembers > 0) return fromMembers;
      } catch {
        // ignore
      }

      if (i < attempts - 1) {
        await new Promise((r) => setTimeout(r, intervalMs));
      }
    }

    const cachedCheckout = readServerCheckoutTotal(sessionId);
    if (cachedCheckout > 0) return cachedCheckout;

    return 0;
  },

  /** POST .../pay */
  /**
   * POST .../pos/sessions/{id}/pay — UNPAID → PAID.
   * Swagger PaySessionRequestDto: chỉ `notes` + `penaltyItems` (additionalProperties: false).
   */
  paySession: async (
    cafeId: string,
    sessionId: string,
    payload: PaySessionPayload = { paymentMethod: 'SePay' },
  ): Promise<PaymentCode> => {
    

    const body: { notes?: string; penaltyItems?: PaySessionPayload['penaltyItems'] } = {
      notes: payload.notes || `POS pay · ${payload.paymentMethod || 'Cash'}`,
    };
    if (payload.penaltyItems?.length) {
      body.penaltyItems = payload.penaltyItems;
    }

    const raw = await apiClient.post<never, unknown>(
      posSessionPath(cafeId, sessionId, '/pay'),
      body,
    );
    return mapApiPaymentCode(raw);
  },

  /** GET .../payment-status — Split Bill: ai đã trả / còn nợ */
  getSessionPaymentStatus: async (
    cafeId: string,
    sessionId: string,
  ): Promise<SessionPaymentStatus> => {
    const raw = await apiClient.get<never, unknown>(
      posSessionPath(cafeId, sessionId, '/payment-status'),
    );
    return mapSessionPaymentStatus(raw, sessionId);
  },

  /**
   * POST .../pay-member — Split Bill: thu 1+ member (CASH | QR_CODE).
   */
  payMembers: async (
    cafeId: string,
    sessionId: string,
    payload: {
      memberIds: string[];
      paymentMethod: 'CASH' | 'QR_CODE';
      notes?: string;
    },
  ): Promise<MemberPaymentResult[]> => {
    const raw = await apiClient.post<never, unknown>(
      posSessionPath(cafeId, sessionId, '/pay-member'),
      {
        memberIds: payload.memberIds,
        paymentMethod: payload.paymentMethod,
        notes: payload.notes || undefined,
      },
    );
    return mapMemberPaymentResults(raw);
  },

  /** POST .../members/{memberId}/confirm-cash */
  confirmMemberCash: async (
    cafeId: string,
    sessionId: string,
    memberId: string,
    notes?: string,
  ): Promise<MemberPaymentResult | null> => {
    const raw = await apiClient.post<never, unknown>(
      posSessionPath(
        cafeId,
        sessionId,
        `/members/${encodeURIComponent(memberId)}/confirm-cash`,
      ),
      notes ? { notes } : {},
    );
    const list = mapMemberPaymentResults(raw);
    return list[0] ?? (raw && typeof raw === 'object' ? mapOneMemberPayment(raw as Record<string, unknown>) : null);
  },

  /** POST .../members/{memberId}/regenerate-qr */
  regenerateMemberQr: async (
    cafeId: string,
    sessionId: string,
    memberId: string,
  ): Promise<MemberPaymentResult | null> => {
    const raw = await apiClient.post<never, unknown>(
      posSessionPath(
        cafeId,
        sessionId,
        `/members/${encodeURIComponent(memberId)}/regenerate-qr`,
      ),
      {},
    );
    const list = mapMemberPaymentResults(raw);
    return list[0] ?? (raw && typeof raw === 'object' ? mapOneMemberPayment(raw as Record<string, unknown>) : null);
  },

  /**
   * POST /api/payments/session-payment
   * Body sống (Swagger): sessionId + notes (+ customerEmail). BE lấy TotalAmount từ session UNPAID.
   */
  createSessionPayment: async (
    cafeId: string,
    sessionId: string,
    params: {
      totalAmount?: number;
      depositAppliedAmount?: number;
      notes?: string;
      customerEmail?: string;
    },
  ): Promise<PaymentCode> => {
    void cafeId;
    void params.depositAppliedAmount;

    const body: Record<string, unknown> = { sessionId };
    if (params.notes?.trim()) body.notes = params.notes.trim();
    if (params.customerEmail?.includes('@')) {
      body.customerEmail = params.customerEmail.trim();
    }

    try {
      const raw = await apiClient.post<never, unknown>('/api/payments/session-payment', body);
      const code = mapApiPaymentCode(raw);
      if (!code.qrPayload) {
        throw new Error('BE không trả qrImageUrl / paymentUrl.');
      }
      if (code.amount > 0) writeServerCheckoutTotal(sessionId, code.amount);
      return code;
    } catch (err) {
      const msg = (err as Error)?.message || '';
      if (/unpaid|trạng thái|status/i.test(msg)) {
        throw new Error(
          'Chưa chốt hóa đơn. Sang tab Game → Nhận lại game → Đủ hết → Chốt hóa đơn, rồi tạo QR.',
        );
      }
      if (/totalamount|amount|0đ|lớn hơn 0/i.test(msg)) {
        throw new Error(
          `Không tạo được QR: ${msg}. Thử chốt hóa đơn lại.`,
        );
      }
      throw err instanceof Error ? err : new Error(msg || 'Không tạo được mã thanh toán.');
    }
  },

  /** POST /api/payments/session-payment/{sessionId}/regenerate-qr */
  regenerateSessionPaymentQr: async (sessionId: string): Promise<PaymentCode> => {
    const raw = await apiClient.post<never, unknown>(
      `/api/payments/session-payment/${encodeURIComponent(sessionId)}/regenerate-qr`,
    );
    const code = mapApiPaymentCode(raw);
    if (!code.qrPayload) {
      throw new Error('BE không trả qrImageUrl / paymentUrl.');
    }
    if (code.amount > 0) writeServerCheckoutTotal(sessionId, code.amount);
    return code;
  },

  /** POST /api/payments/manual-confirm — ManualPaymentConfirmRequestDto */
  manualConfirmPayment: async (params: {
    sessionId: string;
    amount: number;
    notes?: string;
    cafeId?: string;
  }): Promise<void> => {
    const cafeId = resolveCafeId(params.cafeId);
    if (!cafeId) throw new Error('Thiếu mã quán để xác nhận thanh toán.');

    const amount = Math.round(Number(params.amount));
    if (!Number.isFinite(amount) || amount <= 0) {
      throw new Error('Hóa đơn phải > 0đ.');
    }

    const alreadyUnpaidMsg = (msg: string) =>
      /unpaid/i.test(msg) &&
      !/chưa|phải|must be|require|not\s+(in\s+)?unpaid|expected/i.test(msg);

    const isUnpaidStatus = (status?: string) =>
      status === 'Paying' || status === 'Completed';

    /** Đưa session sang UNPAID thật trên BE — phải verify GET, không tin bill ước tính */
    const ensureUnpaidOnServer = async () => {
      let session = await PosCheckInService.getSession(cafeId, params.sessionId).catch(() => null);
      if (isUnpaidStatus(session?.status)) return;

      try {
        await PosCheckInService.calculateBill(params.sessionId, cafeId);
      } catch (billErr) {
        const billMsg = (billErr as Error)?.message || '';
        if (!alreadyUnpaidMsg(billMsg) && /kiểm kê/i.test(billMsg)) {
          // sẽ markAllValid bên dưới
        }
      }

      session = await PosCheckInService.getSession(cafeId, params.sessionId).catch(() => null);
      if (isUnpaidStatus(session?.status)) return;

      // GET còn Active/Checking — ép End → Đủ hết → checkout
      try {
        await PosCheckInService.endGame(cafeId, params.sessionId);
      } catch (endErr) {
        const endMsg = (endErr as Error)?.message || '';
        if (alreadyUnpaidMsg(endMsg)) {
          session = await PosCheckInService.getSession(cafeId, params.sessionId).catch(() => null);
          if (isUnpaidStatus(session?.status)) return;
          // End bảo unpaid nhưng GET vẫn Active → vẫn thử checkout bên dưới
        }
      }

      session = await PosCheckInService.getSession(cafeId, params.sessionId).catch(() => null);
      if (isUnpaidStatus(session?.status)) return;

      const sgid = session?.sessionGames?.[0]?.sessionGameId;
      if (sgid) {
        try {
          await PosCheckInService.checkSessionGames(cafeId, params.sessionId, {
            sessionGameId: sgid,
            markAllValid: true,
          });
          if (typeof window !== 'undefined') {
            localStorage.setItem(`pos_components_checked_${params.sessionId}`, 'true');
          }
        } catch {
          // đã kiểm kê trước đó — bỏ qua
        }
      }

      try {
        await PosCheckInService.checkoutSession(cafeId, params.sessionId);
      } catch (checkoutErr) {
        const cMsg = (checkoutErr as Error)?.message || '';
        if (!alreadyUnpaidMsg(cMsg)) {
          throw new Error(
            cMsg ||
              'Chưa chốt được hóa đơn. Sang tab Game → Nhận lại game → Đủ hết → Chốt hóa đơn, rồi thu tiền mặt.',
          );
        }
      }

      session = await PosCheckInService.getSession(cafeId, params.sessionId).catch(() => null);
      if (!isUnpaidStatus(session?.status)) {
        throw new Error(
          `Chưa chốt được hóa đơn (trạng thái: ${session?.status || 'Active'}). Thử lại hoặc liên hệ kỹ thuật.`,
        );
      }
    };

    // Swagger: sessionId + amount + collectedByStaff (không dùng orderId/paymentType)
    const body = {
      sessionId: params.sessionId,
      amount,
      collectedByStaff: true,
      notes: params.notes || `Staff thu tiền mặt tại POS · ${amount.toLocaleString('vi-VN')} VND`,
    };

    const postConfirm = (payAmount: number, notes: string) =>
      apiClient.post('/api/payments/manual-confirm', {
        ...body,
        amount: payAmount,
        notes,
      });

    await ensureUnpaidOnServer();

    const markPaidLocal = (paidAmount: number) => {
      writeServerCheckoutTotal(params.sessionId, paidAmount);
      if (typeof window !== 'undefined') {
        try {
          localStorage.setItem(`pos_unpaid_${params.sessionId}`, 'true');
        } catch {
          // ignore
        }
      }
    };

    /** Lệch lifecycle thật — không khớp nhầm "status code 400" */
    const isLifecycleErr = (msg: string) =>
      !/status code/i.test(msg) &&
      (/unpaid|trạng thái|CHECKING|\bActive\b|must be|phải (ở|là)/i.test(msg) ||
        /session.*(paid|unpaid|checking)/i.test(msg));

    try {
      await postConfirm(amount, body.notes);
      markPaidLocal(amount);
      return;
    } catch (err) {
      const msg = (err as Error)?.message || '';

      const orderMatch = msg.match(/đơn hàng\s*\(([\d.,\s]+)\s*VND\)/i);
      const serverAmount = orderMatch
        ? Math.round(Number(String(orderMatch[1]).replace(/[.,\s]/g, '')))
        : NaN;

      if (Number.isFinite(serverAmount) && serverAmount > 0 && serverAmount !== amount) {
        await postConfirm(serverAmount, `${body.notes} · khớp server ${serverAmount} VND`);
        markPaidLocal(serverAmount);
        return;
      }

      // Fallback POS /pay (Cash) khi đã UNPAID nhưng manual-confirm 400
      const sessionNow = await PosCheckInService.getSession(cafeId, params.sessionId).catch(
        () => null,
      );
      if (isUnpaidStatus(sessionNow?.status)) {
        try {
          await PosCheckInService.paySession(cafeId, params.sessionId, {
            paymentMethod: 'Cash',
            notes: body.notes,
          });
          markPaidLocal(amount);
          return;
        } catch {
          // fallthrough
        }
      }

      if (isLifecycleErr(msg)) {
        throw new Error(
          `Thu tiền mặt thất bại: ${msg}`,
        );
      }

      throw err instanceof Error
        ? err
        : new Error(msg || 'Không xác nhận được thanh toán tiền mặt.');
    }
  },

  /** POST .../checkout — CHECKING → UNPAID (CheckoutRequestDto) */
  checkoutSession: async (
    cafeId: string,
    sessionId: string,
    payload?: CheckoutSessionPayload,
  ): Promise<CompleteSessionResult> => {
    

    const body = payload ?? (await resolveCheckoutPayload(cafeId, sessionId));

    const raw = await apiClient.post<never, unknown>(
      posSessionPath(cafeId, sessionId, '/checkout'),
      body,
    );
    const result = mapApiCompleteSession(raw, sessionId);
    const dug = extractAmountFromUnknown(raw);
    const checkoutTotal =
      result.bill.totalDue > 0 ? result.bill.totalDue : dug > 0 ? dug : 0;
    if (checkoutTotal > 0) writeServerCheckoutTotal(sessionId, checkoutTotal);
    return result;
  },

  calculateBill: async (sessionId: string, cafeId?: string): Promise<SessionBill> => {
    const cid = resolveCafeId(cafeId);
    if (!sessionId) throw new Error('Thiếu sessionId để tính hóa đơn.');
    if (!cid) throw new Error('Thiếu mã quán để tính hóa đơn.');

    const buildBillFromSession = (session: CafeSessionDetail): SessionBill | null => {
      const total = session.totalAmount ?? 0;
      if (total <= 0) return null;
      const durationMinutes = Math.max(
        1,
        Math.ceil((Date.now() - new Date(session.startedAt).getTime()) / 60_000),
      );
      return {
        sessionId,
        bookingId: session.bookingId || sessionId,
        billingModel: session.billingModel || 'BY_HOUR',
        durationMinutes,
        lineItems: [
          {
            id: 'session-total',
            label: 'Tổng hóa đơn phiên chơi',
            quantity: 1,
            unitPrice: total,
            amount: total,
          },
        ],
        depositCreditTotal: session.depositCreditTotal || 0,
        subtotal: total + (session.depositCreditTotal || 0),
        totalDue: total,
        currency: 'VND',
        calculatedAt: new Date().toISOString(),
      };
    };

    const isUnpaidMsg = (msg: string) => /unpaid/i.test(msg);
    const isAlreadyCheckingMsg = (msg: string) =>
      /current.*['"]?checking|đang.*checking|status.*['"]?checking|hiện tại.*['"]?checking/i.test(
        msg,
      );
    const needsCheckingMsg = (msg: string) =>
      /kiểm kê linh kiện|trả game|must be checking|SessionMustBeChecking/i.test(msg);
    const alreadyCheckedMsg = (msg: string) =>
      /đã được kiểm tra|already.*check|ComponentCheckAlreadyDone/i.test(msg);

    const billFromUnpaidOrThrow = async (hint?: string): Promise<SessionBill> => {
      const s = await PosCheckInService.getSession(cid, sessionId);
      const mapped = buildBillFromSession({ ...s, status: 'Paying' });
      if (mapped) return mapped;

      // 0) TotalAmount đã lưu từ checkout / session-payment (BE)
      const cachedServerTotal = readServerCheckoutTotal(sessionId);
      if (cachedServerTotal > 0) {
        return buildFallbackBill({ ...s, status: 'Paying' }, sessionId, cachedServerTotal);
      }

      // 1) Đào raw GET session
      try {
        const raw = await apiClient.get<never, unknown>(sessionPath(cid, sessionId));
        const dug = extractAmountFromUnknown(raw);
        if (dug > 0) return buildFallbackBill({ ...s, status: 'Paying' }, sessionId, dug);
      } catch {
        // ignore
      }

      // 2) Thử receipt (có thể chỉ có khi Paid — bỏ qua nếu lỗi)
      try {
        const receipt = await apiClient.get<never, unknown>(
          `/api/v1/sessions/${encodeURIComponent(sessionId)}/receipt`,
        );
        const dug = extractAmountFromUnknown(receipt);
        if (dug > 0) return buildFallbackBill({ ...s, status: 'Paying' }, sessionId, dug);
      } catch {
        // ignore
      }

      // 2b) Poll TotalAmount — UNPAID thường có số thật, tránh bill "ước tính" chặn thu tiền
      const polled = await PosCheckInService.getServerSessionTotalAmount(cid, sessionId, {
        pollAttempts: 6,
        pollIntervalMs: 400,
      });
      if (polled > 0) {
        return buildFallbackBill({ ...s, status: 'Paying', totalAmount: polled }, sessionId, polled);
      }

      // 3) Ước tính theo giá quán (BR-16) khi DTO thiếu totalAmount
      const durationMinutes = Math.max(
        1,
        Math.ceil((Date.now() - new Date(s.startedAt).getTime()) / 60_000),
      );
      const memberCount = Math.max(1, s.presentCount || s.memberIds?.length || 1);
      const pricing = await fetchCafePricing(cid);

      if (pricing) {
        const flat = /flat/i.test(pricing.billingModel);
        const perMember = flat
          ? pricing.basePrice
          : computeTimeBasedSubtotal(
              durationMinutes,
              pricing.basePrice,
              pricing.tieredBlockRate,
              pricing.tieredBlockMinutes,
            );
        const estimated = Math.max(0, perMember * memberCount);
        if (estimated > 0) {
          return {
            ...buildFallbackBill({ ...s, status: 'Paying' }, sessionId, estimated),
            durationMinutes,
            lineItems: [
              {
                id: 'session-estimated',
                label: `Ước tính (${flat ? 'flat' : 'theo giờ'} × ${memberCount} người)`,
                quantity: 1,
                unitPrice: estimated,
                amount: estimated,
              },
            ],
          };
        }
      }

      // 4) Fallback flat khi GET cafe không có basePrice (DTO public thường thiếu)
      const fallbackFlat = 50_000 * memberCount;
      return {
        ...buildFallbackBill({ ...s, status: 'Paying' }, sessionId, fallbackFlat),
        durationMinutes,
        lineItems: [
          {
            id: 'session-estimated-fallback',
            label: `Ước tính tạm (50.000đ × ${memberCount} người) — chỉnh lại nếu sai`,
            quantity: 1,
            unitPrice: fallbackFlat,
            amount: fallbackFlat,
          },
        ],
      };
    };

    /** Chỉ End → CHECKING. Không tự markAllValid — staff phải bấm Đủ hết ở tab Game. */
    const probeAndPrepare = async (): Promise<'unpaid' | 'ready'> => {
      try {
        await PosCheckInService.endGame(cid, sessionId);
      } catch (err) {
        const msg = (err as Error)?.message || '';
        if (isUnpaidMsg(msg)) return 'unpaid';
        if (!isAlreadyCheckingMsg(msg) && !/\bchecking\b/i.test(msg)) {
          throw err;
        }
      }
      return 'ready';
    };

    const requireComponentCheckError = () =>
      new Error(
        'Chưa kiểm kê linh kiện. Sang tab Game, bấm “Đủ hết”, rồi mới chốt hóa đơn.',
      );

    const hasLocalComponentsChecked = () => {
      if (typeof window === 'undefined') return false;
      try {
        return localStorage.getItem(`pos_components_checked_${sessionId}`) === 'true';
      } catch {
        return false;
      }
    };

    try {
      // Đã UNPAID từ lần chốt trước — không probe End/checkout lại
      const current = await PosCheckInService.getSession(cid, sessionId).catch(() => null);
      if (current?.status === 'Paying' || current?.status === 'Completed') {
        return billFromUnpaidOrThrow();
      }
      // End báo UNPAID nhưng GET còn Active — vẫn lấy bill UNPAID, không bắt kiểm kê lại
      if (typeof window !== 'undefined') {
        try {
          if (localStorage.getItem(`pos_unpaid_${sessionId}`) === 'true') {
            return billFromUnpaidOrThrow();
          }
        } catch {
          // ignore
        }
      }

      // Bắt buộc Đủ hết trước checkout (không tự markAllValid)
      if (!hasLocalComponentsChecked()) {
        throw requireComponentCheckError();
      }

      const phase = await probeAndPrepare();

      // Đã UNPAID — tuyệt đối không gọi /checkout (server báo "phải kiểm kê" gây hiểu nhầm)
      if (phase === 'unpaid') {
        return billFromUnpaidOrThrow();
      }

      try {
        const result = await PosCheckInService.checkoutSession(cid, sessionId);
        if (result.bill.totalDue > 0) return result.bill;
      } catch (checkoutErr) {
        const msg = (checkoutErr as Error)?.message || '';
        if (isUnpaidMsg(msg)) {
          return billFromUnpaidOrThrow();
        }
        // Chưa End / chưa Checking
        if (/must be checking|SessionMustBeChecking|trả game/i.test(msg) && !/kiểm kê|component/i.test(msg)) {
          const retryPhase = await probeAndPrepare();
          if (retryPhase === 'unpaid') return billFromUnpaidOrThrow();
          try {
            const result = await PosCheckInService.checkoutSession(cid, sessionId);
            if (result.bill.totalDue > 0) return result.bill;
          } catch (retryErr) {
            const retryMsg = (retryErr as Error)?.message || '';
            if (isUnpaidMsg(retryMsg)) return billFromUnpaidOrThrow();
            if (needsCheckingMsg(retryMsg) || /component|kiểm kê|NotChecked|chưa.*kiểm/i.test(retryMsg)) {
              throw requireComponentCheckError();
            }
            throw retryErr;
          }
        } else if (needsCheckingMsg(msg) || /component|NotChecked|chưa.*kiểm/i.test(msg)) {
          throw requireComponentCheckError();
        } else {
          throw checkoutErr;
        }
      }

      // Checkout 200 — đợi BE ghi TotalAmount (poll GET session)
      const serverTotal = await PosCheckInService.getServerSessionTotalAmount(cid, sessionId, {
        pollAttempts: 6,
        pollIntervalMs: 500,
      });
      if (serverTotal > 0) {
        const fresh = await PosCheckInService.getSession(cid, sessionId);
        const fromSession = buildBillFromSession({ ...fresh, totalAmount: serverTotal });
        if (fromSession) return fromSession;
      }

      return billFromUnpaidOrThrow();
    } catch (err) {
      const msg = err instanceof Error ? err.message : '';
      if (/Chưa kiểm kê linh kiện/i.test(msg)) throw err;
      if (isUnpaidMsg(msg) || /hóa đơn 0đ/i.test(msg)) {
        try {
          return await billFromUnpaidOrThrow(msg);
        } catch {
          // fallthrough
        }
      }
      throw err instanceof Error ? err : new Error('Không thể tính / chốt hóa đơn.');
    }
  },

  generatePaymentCode: async (
    sessionId: string,
    cafeId?: string,
    bill?: SessionBill,
  ): Promise<PaymentCode> => {
    if (!cafeId) throw new Error('Thiếu mã quán để tạo mã thanh toán.');

    const totalAmount = Math.round(Number(bill?.totalDue ?? 0));
    if (!Number.isFinite(totalAmount) || totalAmount <= 0) {
      throw new Error('Hóa đơn phải > 0đ. Hãy chốt hóa đơn (Checkout) thành công trước.');
    }

    // Chỉ tạo QR — KHÔNG gọi /pay (pay = xác nhận đã thu tiền → PAID)
    // depositAppliedAmount = 0: tránh server trừ cọc làm còn 0đ
    return PosCheckInService.createSessionPayment(cafeId, sessionId, {
      totalAmount,
      depositAppliedAmount: 0,
      notes: `POS VietQR · hóa đơn ${totalAmount} VND`,
    });
  },

  completeSession: async (
    sessionId: string,
    cafeId?: string,
    bill?: SessionBill,
  ): Promise<CompleteSessionResult> => {
    const cid = resolveCafeId(cafeId);
    if (!cid) throw new Error('Thiếu mã quán để hoàn tất phiên.');

    // Đảm bảo UNPAID trước khi pay: Active → End → CHECKING → checkout → UNPAID
    let session = await PosCheckInService.getSession(cid, sessionId);

    // End đã báo UNPAID trước đó nhưng GET còn Active — tin tín hiệu End/local
    if (session.status === 'Active' && typeof window !== 'undefined') {
      try {
        if (localStorage.getItem(`pos_unpaid_${sessionId}`) === 'true') {
          session = { ...session, status: 'Paying' };
        }
      } catch {
        // ignore
      }
    }

    if (session.status === 'Active') {
      try {
        const ended = await PosCheckInService.endGame(cid, sessionId);
        // Ưu tiên body /end (terminal) — GET sau End đôi khi vẫn Active lệch
        session = ended.status !== 'Active' ? ended : await PosCheckInService.getSession(cid, sessionId);
        if (session.status === 'Active' && ended.status !== 'Active') {
          session = ended;
        }
      } catch (err) {
        const msg = (err as Error)?.message || '';
        if (/unpaid/i.test(msg)) {
          // Server đã UNPAID — GET có thể vẫn Active; tiếp tục pay
          session = { ...session, status: 'Paying' };
          if (typeof window !== 'undefined') {
            try {
              localStorage.setItem(`pos_unpaid_${sessionId}`, 'true');
            } catch {
              // ignore
            }
          }
        } else {
          throw new Error(
            msg ||
              'Chưa nhận lại game xong. Sang tab Game, bấm “Nhận lại game” lại.',
          );
        }
      }
      if (session.status === 'Active') {
        session = await PosCheckInService.getSession(cid, sessionId).catch(() => session);
      }
    }

    if (session.status === 'Active') {
      throw new Error(
        'Chưa nhận lại game xong. Sang tab Game, bấm “Nhận lại game” lại.',
      );
    }

    if (session.status === 'Checking') {
      try {
        await PosCheckInService.checkoutSession(cid, sessionId);
        session = await PosCheckInService.getSession(cid, sessionId);
      } catch (err) {
        const msg = (err as Error)?.message || '';
        if (/kiểm kê linh kiện|trả game|must be checking|SessionMustBeChecking/i.test(msg)) {
          throw new Error(
            'Chưa nhận lại game xong. Sang tab Game, bấm “Nhận lại game” lại.',
          );
        }
        if (/component|NotChecked|chưa.*kiểm|markAllValid/i.test(msg)) {
          throw new Error(
            'Chưa kiểm kê linh kiện. Sang tab Game, bấm “Đủ hết”, rồi chốt hóa đơn.',
          );
        }
        throw new Error(
          msg || 'Chưa chốt được hóa đơn. Hãy nhận lại game, kiểm kê rồi chốt hóa đơn.',
        );
      }
    }

    if (session.status !== 'Paying' && session.status !== 'Completed') {
      throw new Error(
        'Chưa chốt hóa đơn. Hãy bấm Chốt hóa đơn trước khi thanh toán.',
      );
    }

    const payment = await PosCheckInService.paySession(cid, sessionId, { paymentMethod: 'SePay' });
    const finalBill =
      bill && bill.totalDue > 0
        ? bill
        : buildFallbackBill(session, sessionId, payment.amount);

    return {
      sessionId,
      bookingId: session.bookingId || finalBill.bookingId || sessionId,
      tableId: session.tableId || '',
      bill: finalBill,
      paymentCode: payment,
      completedAt: new Date().toISOString(),
    };
  },

  searchCustomerUsers: async (query: string): Promise<{ id: string; username: string; fullName?: string; email?: string; phone?: string; avatarUrl?: string }[]> => {
    const q = query.trim();
    if (q.length < 2) return [];

    const mapUser = (u: Record<string, unknown>) => {
      const nested =
        u.user && typeof u.user === 'object'
          ? (u.user as Record<string, unknown>)
          : null;
      const id = String(
        u.userId ??
          u.UserId ??
          u.id ??
          u.Id ??
          nested?.userId ??
          nested?.UserId ??
          nested?.id ??
          nested?.Id ??
          '',
      ).trim();
      const guidRe =
        /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
      if (!guidRe.test(id)) return null;
      const username = String(
        u.username ??
          u.Username ??
          nested?.username ??
          u.fullName ??
          u.FullName ??
          'Khách hàng',
      );
      return {
        id,
        username,
        fullName: u.fullName || u.FullName ? String(u.fullName ?? u.FullName) : undefined,
        email: u.email || u.Email ? String(u.email ?? u.Email) : undefined,
        phone: u.phone || u.Phone || u.phoneNumber || u.PhoneNumber
          ? String(u.phone ?? u.Phone ?? u.phoneNumber ?? u.PhoneNumber)
          : undefined,
        avatarUrl: u.avatarUrl || u.AvatarUrl ? String(u.avatarUrl ?? u.AvatarUrl) : undefined,
      };
    };

    const unwrapUsers = (raw: unknown): Record<string, unknown>[] => {
      if (Array.isArray(raw)) return raw as Record<string, unknown>[];
      if (!raw || typeof raw !== 'object') return [];
      const r = raw as Record<string, unknown>;
      const nested = r.items ?? r.Items ?? r.data ?? r.Data;
      if (Array.isArray(nested)) return nested as Record<string, unknown>[];
      return [];
    };

    let friends: ReturnType<typeof mapUser>[] = [];
    try {
      friends = unwrapUsers(
        await apiClient.get<never, unknown>(`/api/v1/friends/search`, {
          params: { q, limit: 20 },
        }),
      )
        .map(mapUser)
        .filter((u): u is NonNullable<typeof u> => Boolean(u));
    } catch {
      friends = [];
    }
    if (friends.length > 0) return friends;

    try {
      return unwrapUsers(
        await apiClient.get<never, unknown>(`/api/usermanagement/users`, {
          params: { search: q, pageSize: 8 },
        }),
      )
        .map(mapUser)
        .filter((u): u is NonNullable<typeof u> => Boolean(u));
    } catch {
      return [];
    }
  },
};
