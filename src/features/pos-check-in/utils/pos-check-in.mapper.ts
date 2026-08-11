import type {
  ActivatedSession,
  ActiveSessionDetail,
  BookedGame,
  BookingSessionStatus,
  CafeSessionDetail,
  CafeTable,
  CompleteSessionResult,
  FloorPlan,
  PaymentCode,
  PosGameBox,
  SessionBill,
  SessionLifecycleStatus,
  TableBooking,
  TableBookingParticipant,
  TableStatus,
} from '../types/pos-check-in.interface';

import { QR_BOOKING_PREFIX } from '@/core/constants/pos-check-in';

export function mapApiBoardGame(raw: unknown, fallbackId = ''): BookedGame {
  const r = asRecord(raw);
  return {
    id: str(r, 'id', 'gameId', 'Id') || fallbackId,
    name: str(r, 'name', 'gameName', 'Name') || 'Chưa có tên game',
    imageUrl:
      str(r, 'thumbnailUrl', 'imageUrl', 'coverUrl', 'ThumbnailUrl', 'ImageUrl') ||
      'https://picsum.photos/seed/game/400/300',
    minPlayers: num(r, 'minPlayers', 'minPlayerCount', 'MinPlayers') || 2,
    maxPlayers: num(r, 'maxPlayers', 'maxPlayerCount', 'MaxPlayers') || 4,
  };
}

function asRecord(value: unknown): Record<string, unknown> {
  return value && typeof value === 'object' ? (value as Record<string, unknown>) : {};
}

function str(raw: Record<string, unknown>, ...keys: string[]): string {
  for (const key of keys) {
    const value = raw[key];
    if (value != null && value !== '') return String(value);
  }
  return '';
}

function num(raw: Record<string, unknown>, ...keys: string[]): number {
  for (const key of keys) {
    const value = raw[key];
    if (typeof value === 'number' && !Number.isNaN(value)) return value;
    if (typeof value === 'string' && value.trim() !== '' && !Number.isNaN(Number(value))) {
      return Number(value);
    }
  }
  return 0;
}

function mapBookedGame(raw: unknown, fallback?: Partial<BookedGame>): BookedGame {
  const r = asRecord(raw);
  return {
    id: str(r, 'id', 'gameId', 'gameTemplateId', 'Id') || fallback?.id || '',
    inventoryId: str(r, 'inventoryId', 'InventoryId') || fallback?.inventoryId,
    name:
      str(r, 'name', 'gameName', 'GameName', 'title', 'Title', 'gameTitle', 'boardGameName', 'templateName') ||
      fallback?.name ||
      'Chưa có tên game',
    imageUrl:
      str(r, 'imageUrl', 'coverUrl', 'ImageUrl', 'thumbnailUrl', 'ThumbnailUrl') ||
      fallback?.imageUrl ||
      'https://picsum.photos/seed/game/400/300',
    minPlayers: num(r, 'minPlayers', 'minPlayerCount', 'playerQuantity') || fallback?.minPlayers || 2,
    maxPlayers: num(r, 'maxPlayers', 'maxPlayerCount', 'playerQuantity') || fallback?.maxPlayers || 4,
  };
}

function mapParticipant(raw: unknown): TableBookingParticipant {
  const r = asRecord(raw);
  const attendance = str(r, 'attendanceStatus', 'AttendanceStatus');
  const isPresent =
    typeof r.isPresent === 'boolean'
      ? r.isPresent
      : attendance
        ? attendance.toLowerCase() === 'present'
        : true;

  return {
    id: str(r, 'id', 'participantId', 'userId', 'Id'),
    userId: str(r, 'userId', 'UserId', 'id'),
    displayName: str(r, 'displayName', 'fullName', 'name', 'DisplayName') || 'Khách',
    depositAmount: num(r, 'depositAmount', 'DepositAmount'),
    isPresent,
    attendanceStatus: isPresent ? 'Present' : 'Absent',
  };
}

/** Map status backend → trạng thái POS nội bộ */
function mapSessionStatus(value: string): BookingSessionStatus {
  const normalized = value.toLowerCase().replace(/[_\s-]/g, '');
  if (normalized.includes('cancel')) return 'Cancelled';
  if (normalized.includes('complete') || normalized.includes('checkout') || normalized.includes('done')) {
    return 'Completed';
  }
  if (normalized === 'checking' || normalized.includes('checking')) return 'Checking';
  if (
    normalized.includes('checkedin') ||
    normalized === 'active' ||
    normalized.includes('playing') ||
    normalized.includes('inprogress')
  ) {
    return 'Active';
  }
  // PendingDeposit, Confirmed, Paid, Ready, Pending...
  return 'Pending';
}

function buildParticipantsFromIds(
  hostId: string,
  memberIds: string[],
  depositAmount: number,
  playerQuantity: number,
): TableBookingParticipant[] {
  const participants: TableBookingParticipant[] = [];
  const seen = new Set<string>();

  if (hostId) {
    seen.add(hostId);
    participants.push({
      id: hostId,
      userId: hostId,
      displayName: 'Host',
      depositAmount,
      isPresent: true,
      attendanceStatus: 'Present',
    });
  }

  for (const memberId of memberIds) {
    if (!memberId || seen.has(memberId)) continue;
    seen.add(memberId);
    participants.push({
      id: memberId,
      userId: memberId,
      displayName: `TV ${memberId.slice(0, 8)}`,
      depositAmount: 0,
      isPresent: true,
      attendanceStatus: 'Present',
    });
  }

  // API chưa trả danh sách member chi tiết — tạo slot theo playerQuantity
  while (participants.length < playerQuantity) {
    const slot = participants.length + 1;
    participants.push({
      id: `guest-slot-${slot}`,
      userId: '',
      displayName: `Khách ${slot}`,
      depositAmount: slot === 1 ? depositAmount : 0,
      isPresent: true,
      attendanceStatus: 'Present',
    });
  }

  return participants;
}

export function mapApiBooking(raw: unknown): TableBooking {
  const r = asRecord(raw);
  const apiStatus = str(r, 'status', 'sessionStatus', 'Status') || 'Pending';
  const playerQuantity = num(r, 'playerQuantity', 'PlayerQuantity');
  const depositAmount = num(r, 'depositAmount', 'DepositAmount');
  const hostId = str(r, 'hostId', 'HostId');
  const memberIds = Array.isArray(r.memberIds)
    ? r.memberIds.map(String)
    : Array.isArray(r.MemberIds)
      ? (r.MemberIds as unknown[]).map(String)
      : [];

  const lobbySummary =
    r.lobbySummary && typeof r.lobbySummary === 'object'
      ? (r.lobbySummary as Record<string, unknown>)
      : r.LobbySummary && typeof r.LobbySummary === 'object'
        ? (r.LobbySummary as Record<string, unknown>)
        : undefined;

  const nestedGame = r.bookedGame ?? r.game ?? r.BookedGame;
  const bookedGame = mapBookedGame(nestedGame ?? {}, {
    id: str(r, 'gameId', 'GameId') || str(lobbySummary ?? {}, 'gameTemplateId', 'gameId'),
    name:
      str(r, 'gameName', 'GameName') ||
      str(lobbySummary ?? {}, 'gameName', 'GameName') ||
      undefined,
    minPlayers: num(lobbySummary ?? {}, 'minPlayers', 'MinPlayers') || playerQuantity || 2,
    maxPlayers: num(lobbySummary ?? {}, 'maxPlayers', 'MaxPlayers') || playerQuantity || 4,
  });

  const participantsRaw = r.participants ?? r.members ?? r.Participants;
  const participants = Array.isArray(participantsRaw) && participantsRaw.length > 0
    ? participantsRaw.map(mapParticipant)
    : buildParticipantsFromIds(hostId, memberIds, depositAmount, playerQuantity);

  return {
    id: str(r, 'id', 'bookingId', 'Id'),
    cafeId: str(r, 'cafeId', 'CafeId'),
    tableId: str(r, 'cafeTableId', 'tableId', 'CafeTableId', 'TableId'),
    tableLabel:
      str(r, 'cafeTableName', 'tableLabel', 'tableName', 'CafeTableName', 'TableLabel') || 'Bàn',
    qrCode: str(
      r,
      'verificationQRCode',
      'qrCode',
      'qrPayload',
      'VerificationQRCode',
      'QrCode',
    ),
    scheduledAt: str(
      r,
      'scheduledStartTime',
      'scheduledAt',
      'startTime',
      'bookedAt',
      'ScheduledStartTime',
      'ScheduledAt',
    ),
    scheduledEndAt:
      str(r, 'scheduleEndTime', 'scheduledEndTime', 'ScheduleEndTime') || undefined,
    bookedGame,
    participants,
    sessionStatus: mapSessionStatus(apiStatus),
    sessionId: str(r, 'sessionId', 'activeSessionId', 'SessionId') || undefined,
    lobbyId: str(r, 'lobbyId', 'LobbyId') || undefined,
    apiStatus,
    statusText: str(r, 'statusText', 'StatusText') || apiStatus,
    playerQuantity: playerQuantity || participants.length || undefined,
    hostId: hostId || undefined,
    depositAmount,
    checkedInAt: (r.checkedInAt as string | null | undefined) ?? null,
  };
}

function extractBookingListItems(raw: unknown): unknown[] {
  if (Array.isArray(raw)) return raw;

  const r = asRecord(raw);
  const level1 = r.data ?? r.items ?? r.bookings ?? r.Bookings;
  if (Array.isArray(level1)) return level1;

  if (level1 && typeof level1 === 'object') {
    const nested = level1 as Record<string, unknown>;
    const level2 = nested.data ?? nested.items ?? nested.bookings ?? nested.Bookings;
    if (Array.isArray(level2)) return level2;
  }

  return [];
}

export function mapApiBookingList(raw: unknown): TableBooking[] {
  return extractBookingListItems(raw)
    .map((item) => {
      try {
        return mapApiBooking(item);
      } catch {
        return null;
      }
    })
    .filter((booking): booking is TableBooking => Boolean(booking?.id));
}

/** Booking còn trên hàng đợi POS (chưa hoàn tất / hủy) */
export function isPosQueueBooking(booking: TableBooking): boolean {
  return booking.sessionStatus === 'Pending' || booking.sessionStatus === 'Active' || booking.sessionStatus === 'Checking';
}

export function isPendingCheckInBooking(booking: TableBooking): boolean {
  return booking.sessionStatus === 'Pending';
}

/** Lấy mã check-in từ booking QR / code (ReservationCode | BookingCode). */
export function resolvePosCheckInCode(booking: TableBooking): string {
  const raw = (booking.qrCode || '').trim();
  if (!raw) return booking.id;
  if (raw.startsWith(QR_BOOKING_PREFIX)) return raw.slice(QR_BOOKING_PREFIX.length).trim();
  if (raw.startsWith('BV:PAY:')) return booking.id;
  return raw;
}

function mapPosTableStatus(value: string): TableStatus {
  const normalized = value.toLowerCase().replace(/[_\s-]/g, '');
  if (normalized.includes('reserve')) return 'Reserved';
  if (
    normalized.includes('inuse') ||
    normalized.includes('occupied') ||
    normalized.includes('event') ||
    normalized.includes('playing') ||
    normalized.includes('active')
  ) {
    return 'Occupied';
  }
  return 'Available';
}

export function mapApiCafeTable(raw: unknown, index = 0): CafeTable {
  const r = asRecord(raw);
  const status = mapPosTableStatus(str(r, 'status', 'tableStatus', 'Status') || 'Available');
  const sortOrder = num(r, 'sortOrder', 'SortOrder');
  const col = sortOrder > 0 ? sortOrder % 4 : index % 4;
  const row = sortOrder > 0 ? Math.floor(sortOrder / 4) : Math.floor(index / 4);

  const membersArray = Array.isArray(r.members) ? r.members : Array.isArray(r.Members) ? r.Members : [];
  const gamesArray = Array.isArray(r.games) ? r.games : Array.isArray(r.Games) ? r.Games : [];
  const firstGameName = gamesArray.length > 0 ? str(asRecord(gamesArray[0]), 'gameName', 'name', 'Title') : '';

  return {
    id: str(r, 'id', 'tableId', 'cafeTableId', 'Id'),
    label: str(r, 'name', 'label', 'tableName', 'cafeTableName', 'Name') || `Bàn ${index + 1}`,
    zone: str(r, 'zone', 'area', 'Zone') || 'Khu chính',
    seats: num(r, 'seatCount', 'seats', 'SeatCount') || 4,
    position: { row, col },
    status,
    bookingId: str(r, 'bookingId', 'currentBookingId', 'BookingId') || undefined,
    sessionId: str(r, 'sessionId', 'activeSessionId', 'SessionId') || undefined,
    startedAt: str(r, 'startedAt', 'checkedInAt', 'StartedAt') || undefined,
    gameName: str(r, 'gameName', 'currentGameName', 'GameName') || firstGameName || undefined,
    presentCount: num(r, 'presentCount', 'playerCount', 'PresentCount') || (membersArray.length > 0 ? membersArray.length : undefined),
  };
}

export function mapApiFloorPlan(raw: unknown, cafeId: string): FloorPlan {
  if (Array.isArray(raw)) {
    return { cafeId, tables: raw.map((item, i) => mapApiCafeTable(item, i)) };
  }
  const r = asRecord(raw);
  const list = r.data ?? r.tables ?? r.items ?? r.Tables;
  const tables = Array.isArray(list) ? list.map((item, i) => mapApiCafeTable(item, i)) : [];
  return { cafeId, tables };
}

/** Fallback: dựng sơ đồ từ danh sách booking khi pos/tables trống / lỗi */
export function buildFloorPlanFromBookings(cafeId: string, bookings: TableBooking[]): FloorPlan {
  const byTable = new Map<string, CafeTable>();

  bookings.forEach((booking, index) => {
    if (!booking.tableId) return;
    const status: TableStatus =
      booking.sessionStatus === 'Active' || booking.sessionStatus === 'Checking'
        ? 'Occupied'
        : booking.sessionStatus === 'Pending'
          ? 'Reserved'
          : 'Available';

    if (status === 'Available') return;

    byTable.set(booking.tableId, {
      id: booking.tableId,
      label: booking.tableLabel || `Bàn ${index + 1}`,
      zone: 'Khu chính',
      seats: booking.playerQuantity ?? booking.participants.length ?? 4,
      position: { row: Math.floor(index / 4), col: index % 4 },
      status,
      bookingId: booking.id,
      sessionId: booking.sessionId,
      startedAt: booking.checkedInAt || undefined,
      gameName: booking.bookedGame.name,
      presentCount: booking.participants.length,
    });
  });

  return { cafeId, tables: Array.from(byTable.values()) };
}

function mapLifecycleStatus(value: string): SessionLifecycleStatus {
  const normalized = value.toLowerCase().replace(/[_\s-]/g, '');
  if (normalized.includes('cancel')) return 'Cancelled';
  if (normalized.includes('complete') || normalized.includes('done')) return 'Completed';
  if (normalized.includes('pay')) return 'Paying';
  if (normalized === 'checking' || normalized.includes('checking')) return 'Checking';
  return 'Active';
}

export function mapApiSession(raw: unknown, fallback?: Partial<ActiveSessionDetail>): CafeSessionDetail {
  const r = asRecord(raw);

  const gamesArray = Array.isArray(r.games) ? r.games : Array.isArray(r.Games) ? r.Games : [];
  const firstGameRaw = gamesArray.length > 0 ? gamesArray[0] : undefined;
  const nestedGame = r.game ?? r.bookedGame ?? r.Game ?? firstGameRaw;

  const game = mapBookedGame(nestedGame ?? {}, {
    id: str(r, 'gameTemplateId', 'GameTemplateId', 'gameId', 'GameId') || fallback?.game?.id,
    inventoryId:
      str(r, 'inventoryId', 'InventoryId', 'cafeGameInventoryId', 'CafeGameInventoryId') ||
      fallback?.game?.inventoryId,
    name: str(r, 'gameName', 'GameName', 'title', 'Title') || fallback?.game?.name,
    imageUrl: str(r, 'gameImageUrl', 'GameImageUrl', 'imageUrl', 'ImageUrl') || fallback?.game?.imageUrl,
    minPlayers: fallback?.game?.minPlayers,
    maxPlayers: fallback?.game?.maxPlayers,
  });

  const membersArray = Array.isArray(r.members) ? r.members : Array.isArray(r.Members) ? r.Members : [];
  const presentCountFromNum = num(r, 'presentCount', 'PresentCount', 'playerCount', 'PlayerCount', 'memberCount', 'MemberCount');
  const presentCount = presentCountFromNum || (membersArray.length > 0 ? membersArray.length : 0) || fallback?.presentCount || 0;

  const guestCountFromNum = num(r, 'guestCount', 'GuestCount');
  const guestCountCalculated = membersArray.length > 0
    ? membersArray.filter((m: unknown) => {
        const mr = asRecord(m);
        return mr.isGuestSlot === true || mr.IsGuestSlot === true || !mr.userId;
      }).length
    : undefined;

  return {
    sessionId: str(r, 'sessionId', 'id', 'SessionId', 'Id') || fallback?.sessionId || '',
    bookingId: str(r, 'bookingId', 'BookingId') || fallback?.bookingId || '',
    cafeId: str(r, 'cafeId', 'CafeId') || fallback?.cafeId || '',
    tableId: str(r, 'tableId', 'TableId', 'cafeTableId', 'CafeTableId') || fallback?.tableId || '',
    tableLabel: str(r, 'tableLabel', 'TableLabel', 'tableName', 'TableName', 'cafeTableName', 'CafeTableName') || fallback?.tableLabel || 'Bàn',
    game,
    startedAt: str(r, 'startedAt', 'StartedAt') || fallback?.startedAt || new Date().toISOString(),
    presentCount,
    depositCreditTotal:
      num(r, 'depositCreditTotal', 'DepositCreditTotal') || fallback?.depositCreditTotal || 0,
    billingModel:
      str(r, 'billingModel', 'BillingModel').toUpperCase() === 'PER_DRINK'
        ? 'PER_DRINK'
        : 'BY_HOUR',
    endedAt: str(r, 'endedAt', 'EndedAt') || undefined,
    status: mapLifecycleStatus(str(r, 'status', 'sessionStatus', 'Status') || 'Active'),
    guestCount: guestCountFromNum || guestCountCalculated || undefined,
    memberIds: membersArray.length > 0
      ? membersArray.map((m: unknown) => str(asRecord(m), 'userId', 'id', 'UserId')).filter(Boolean)
      : Array.isArray(r.memberIds)
        ? r.memberIds.map(String)
        : undefined,
    assignedInventoryIds: Array.isArray(r.assignedInventoryIds)
      ? r.assignedInventoryIds.map(String)
      : gamesArray.length > 0
        ? gamesArray.map((g: unknown) => str(asRecord(g), 'boxBarcode', 'barcode', 'id')).filter(Boolean)
        : undefined,
  };
}

/** GET /api/cafes/{cafeId}/pos/sessions/active */
export function normalizePosActiveSessionsList(raw: unknown): CafeSessionDetail[] {
  if (!raw) return [];
  if (Array.isArray(raw)) return raw.map((item) => mapApiSession(item));

  const r = asRecord(raw);
  const nested =
    r.data ?? r.Data ?? r.items ?? r.Items ?? r.sessions ?? r.Sessions ?? r.activeSessions;
  if (Array.isArray(nested)) return nested.map((item) => mapApiSession(item));
  return [];
}

export function mapApiActivatedSession(raw: unknown): ActivatedSession {
  const session = mapApiSession(raw);
  return {
    sessionId: session.sessionId,
    bookingId: session.bookingId,
    tableId: session.tableId,
    tableLabel: session.tableLabel,
    game: session.game,
    startedAt: session.startedAt,
    presentCount: session.presentCount,
    depositCreditTotal: session.depositCreditTotal,
  };
}

export function mapApiSessionBill(raw: unknown, sessionId = ''): SessionBill {
  const r = asRecord(raw);
  const lineItemsRaw = r.lineItems ?? r.items ?? r.LineItems ?? [];

  return {
    sessionId: str(r, 'sessionId', 'SessionId') || sessionId,
    bookingId: str(r, 'bookingId', 'BookingId'),
    billingModel:
      str(r, 'billingModel', 'BillingModel').toUpperCase() === 'PER_DRINK'
        ? 'PER_DRINK'
        : 'BY_HOUR',
    durationMinutes: num(r, 'durationMinutes', 'DurationMinutes'),
    lineItems: Array.isArray(lineItemsRaw)
      ? lineItemsRaw.map((item, index) => {
          const li = asRecord(item);
          return {
            id: str(li, 'id', 'Id') || `line-${index}`,
            label: str(li, 'label', 'name', 'Label') || 'Hạng mục',
            quantity: num(li, 'quantity', 'Quantity') || 1,
            unitPrice: num(li, 'unitPrice', 'UnitPrice'),
            amount: num(li, 'amount', 'total', 'Amount'),
          };
        })
      : [],
    depositCreditTotal: num(r, 'depositCreditTotal', 'DepositCreditTotal'),
    subtotal: num(r, 'subtotal', 'Subtotal'),
    totalDue: num(r, 'totalDue', 'amountDue', 'TotalDue'),
    currency: 'VND',
    calculatedAt: str(r, 'calculatedAt', 'CalculatedAt') || new Date().toISOString(),
  };
}

export function mapApiPaymentCode(raw: unknown): PaymentCode {
  const r = asRecord(raw);
  const statusRaw = str(r, 'status', 'Status').toLowerCase();
  return {
    code: str(r, 'code', 'paymentCode', 'Code'),
    qrPayload: str(r, 'qrPayload', 'qrCode', 'QrPayload') || str(r, 'code', 'paymentCode'),
    amount: num(r, 'amount', 'totalDue', 'Amount'),
    expiresAt: str(r, 'expiresAt', 'ExpiresAt'),
    status: statusRaw.includes('paid')
      ? 'Paid'
      : statusRaw.includes('expir')
        ? 'Expired'
        : 'Pending',
  };
}

export function mapApiCompleteSession(raw: unknown, sessionId: string): CompleteSessionResult {
  const r = asRecord(raw);
  const billRaw = r.bill ?? r.Bill ?? r;
  const paymentRaw = r.paymentCode ?? r.payment ?? r.PaymentCode ?? {};

  return {
    sessionId: str(r, 'sessionId', 'SessionId') || sessionId,
    bookingId: str(r, 'bookingId', 'BookingId'),
    tableId: str(r, 'tableId', 'TableId'),
    bill: mapApiSessionBill(billRaw, sessionId),
    paymentCode: mapApiPaymentCode(paymentRaw),
    completedAt: str(r, 'completedAt', 'CompletedAt') || new Date().toISOString(),
  };
}

/** CafeInventoryBoxDto — GET /api/cafes/{cafeId}/pos/boxes */
export function mapApiPosGameBox(raw: unknown): PosGameBox {
  const r = asRecord(raw);
  return {
    id: str(
      r,
      'id',
      'Id',
      'cafeInventoryBoxId',
      'CafeInventoryBoxId',
      'boxId',
      'BoxId',
    ),
    barcode: str(r, 'barcode', 'Barcode', 'boxBarcode', 'BoxBarcode'),
    status: str(r, 'status', 'Status', 'boxStatus', 'BoxStatus') || 'Available',
    gameTemplateId:
      str(r, 'gameTemplateId', 'GameTemplateId', 'templateId', 'TemplateId') || null,
    gameName: str(r, 'gameName', 'GameName', 'name', 'Name', 'title', 'Title') || null,
    inventoryId:
      str(
        r,
        'cafeGameInventoryId',
        'CafeGameInventoryId',
        'inventoryId',
        'InventoryId',
        'cafeInventoryId',
        'CafeInventoryId',
      ) || null,
    cafeId: str(r, 'cafeId', 'CafeId') || null,
  };
}

export function normalizePosBoxesList(raw: unknown): PosGameBox[] {
  if (!raw) return [];
  if (Array.isArray(raw)) return raw.map(mapApiPosGameBox);

  const r = asRecord(raw);
  const nested = r.data ?? r.Data ?? r.items ?? r.Items ?? r.boxes ?? r.Boxes;
  if (Array.isArray(nested)) return nested.map(mapApiPosGameBox);
  return [];
}
