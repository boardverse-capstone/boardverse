import type {
  ActivatedSession,
  ActiveSessionDetail,
  BookedGame,
  BookingSessionStatus,
  CafeSessionDetail,
  CafeTable,
  CompleteSessionResult,
  ComponentChecklist,
  FloorPlan,
  PaymentCode,
  PosGameBox,
  SessionBill,
  SessionLifecycleStatus,
  SessionMemberRef,
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

/** BR-15: cộng theo từng member khi DTO không có totalAmount ở root. */
export function sumSessionTotalFromMembers(members: unknown[]): number {
  if (!members.length) return 0;
  return members.reduce((sum: number, m: unknown) => {
    const mr = asRecord(m);
    const explicit = num(mr, 'totalAmount', 'TotalAmount', 'amountDue', 'AmountDue');
    if (explicit > 0) return sum + explicit;
    const subtotal = num(mr, 'subtotal', 'Subtotal');
    const penalty = num(mr, 'penaltyAmount', 'PenaltyAmount');
    const deposit = num(
      mr,
      'depositAppliedAmount',
      'DepositAppliedAmount',
      'depositApplied',
      'DepositApplied',
    );
    return sum + Math.max(0, subtotal + penalty - deposit);
  }, 0);
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
      'playDate',
      'PlayDate',
    ),
    scheduledEndAt:
      str(
        r,
        'scheduleEndTime',
        'scheduledEndTime',
        'ScheduleEndTime',
        'ScheduledEndTime',
      ) || undefined,
    bookedGame,
    participants,
    sessionStatus: mapSessionStatus(apiStatus),
    sessionId: str(r, 'sessionId', 'activeSessionId', 'SessionId') || undefined,
    lobbyId: str(r, 'lobbyId', 'LobbyId') || str(lobbySummary ?? {}, 'lobbyId', 'LobbyId') || undefined,
    reservationCode:
      str(
        r,
        'reservationCode',
        'ReservationCode',
        'lobbyShareCode',
        'LobbyShareCode',
      ) ||
      str(lobbySummary ?? {}, 'reservationCode', 'lobbyShareCode', 'shareCode') ||
      undefined,
    bookingCode: str(r, 'bookingCode', 'BookingCode', 'orderId', 'OrderId') || undefined,
    orderId: str(r, 'orderId', 'OrderId') || undefined,
    paymentRef: str(r, 'paymentRef', 'PaymentRef') || null,
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

/** ReservationCode (8 ký tự) hoặc BookingCode legacy BV+số */
export function isLikelyValidPosCheckInCode(code: string): boolean {
  const c = code.trim();
  if (!c) return false;
  // ReservationCode / lobbyShareCode
  if (/^[A-Za-z2-9]{8}$/.test(c)) return true;
  // BookingCode legacy: BV12345678 (không có dấu gạch)
  if (/^BV\d{4,}$/i.test(c)) return true;
  // BVC order id
  if (/^BVC-[A-Z0-9]+$/i.test(c)) return true;
  return false;
}

function normalizeCheckInCandidate(raw: string): string {
  let code = raw.trim();
  if (code.startsWith(QR_BOOKING_PREFIX)) code = code.slice(QR_BOOKING_PREFIX.length).trim();
  if (code.startsWith('BV:PAY:')) return '';
  return code;
}

/** Lấy mã check-in từ booking — ưu tiên ReservationCode / BookingCode, không dùng verificationQR ảo. */
export function resolvePosCheckInCode(booking: TableBooking): string {
  const candidates = [
    booking.reservationCode,
    booking.bookingCode,
    booking.orderId,
    booking.paymentRef || '',
    booking.qrCode,
    booking.id,
  ];

  for (const raw of candidates) {
    if (!raw) continue;
    const code = normalizeCheckInCandidate(String(raw));
    if (!code) continue;
    if (isLikelyValidPosCheckInCode(code)) return code;
  }

  for (const raw of candidates) {
    if (!raw) continue;
    const code = normalizeCheckInCandidate(String(raw));
    if (code) return code;
  }

  return booking.id;
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
    sortOrder: sortOrder || index,
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

function mapLifecycleStatus(value: string | number): SessionLifecycleStatus {
  if (typeof value === 'number' || (/^\d+$/.test(String(value)))) {
    const n = Number(value);
    // ActiveSessionStatus: Active=0, Checking=1, Unpaid=2, Paid=3 (phổ biến trên backend)
    // Bỏ qua số kiểu HTTP (200…) — không phải enum lifecycle
    if (n >= 0 && n <= 3) {
      if (n === 1) return 'Checking';
      if (n === 2) return 'Paying';
      if (n === 3) return 'Completed';
      return 'Active';
    }
  }

  const normalized = String(value).toLowerCase().replace(/[_\s-]/g, '');
  if (!normalized || normalized === 'success' || normalized === 'ok') return 'Active';
  if (normalized.includes('cancel')) return 'Cancelled';
  if (normalized.includes('unpaid')) return 'Paying';
  if (
    (normalized.includes('paid') && !normalized.includes('unpaid')) ||
    normalized.includes('complete') ||
    normalized.includes('done')
  ) {
    return 'Completed';
  }
  if (normalized.includes('pay')) return 'Paying';
  if (normalized === 'checking' || normalized.includes('checking')) return 'Checking';
  return 'Active';
}

/** Ưu tiên field lifecycle rõ ràng; hỗ trợ IsCheckingInventory từ POS End */
function pickSessionLifecycleStatus(
  r: Record<string, unknown>,
  fallback?: SessionLifecycleStatus,
): SessionLifecycleStatus {
  if (r.isCheckingInventory === true || r.IsCheckingInventory === true) {
    return 'Checking';
  }

  const dedicated = [
    r.sessionStatus,
    r.SessionStatus,
    r.activeSessionStatus,
    r.ActiveSessionStatus,
    r.lifecycleStatus,
    r.LifecycleStatus,
  ];

  for (const value of dedicated) {
    if (value == null || value === '') continue;
    return mapLifecycleStatus(value as string | number);
  }

  // `Status` PascalCase thường là domain; `status` có thể lẫn envelope
  if (r.Status != null && r.Status !== '') {
    return mapLifecycleStatus(r.Status as string | number);
  }
  if (r.status != null && r.status !== '') {
    const mapped = mapLifecycleStatus(r.status as string | number);
    const raw = String(r.status).toLowerCase();
    if (raw !== 'success' && raw !== 'ok') return mapped;
  }

  return fallback ?? 'Active';
}

export function mapApiSession(raw: unknown, fallback?: Partial<ActiveSessionDetail>): CafeSessionDetail {
  const root = asRecord(raw);
  // Envelope chưa unwrap / nested DTO
  const nested = root.data ?? root.Data ?? root.session ?? root.Session;
  const r =
    nested && typeof nested === 'object' && !Array.isArray(nested)
      ? { ...root, ...asRecord(nested) }
      : root;

  const gamesArray = Array.isArray(r.games)
    ? r.games
    : Array.isArray(r.Games)
      ? r.Games
      : Array.isArray(r.sessionGames)
        ? r.sessionGames
        : Array.isArray(r.SessionGames)
          ? r.SessionGames
          : [];
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
  // Chỉ PresentCount — không map memberCount/playerCount (hay = sức chứa bàn/max game → 4)
  const presentCountFromNum = num(r, 'presentCount', 'PresentCount');

  const guestCountFromNum = num(r, 'guestCount', 'GuestCount');
  const guestCountCalculated = membersArray.length > 0
    ? membersArray.filter((m: unknown) => {
        const mr = asRecord(m);
        return mr.isGuestSlot === true || mr.IsGuestSlot === true || !mr.userId;
      }).length
    : undefined;

  const sessionGames = gamesArray
    .map((g: unknown) => {
      const gr = asRecord(g);
      const sessionGameId = str(
        gr,
        'sessionGameId',
        'SessionGameId',
        'activeSessionGameId',
        'ActiveSessionGameId',
        'id',
        'Id',
      );
      if (!sessionGameId) return null;
      return {
        sessionGameId,
        gameTemplateId: str(gr, 'gameTemplateId', 'GameTemplateId') || undefined,
        gameName: str(gr, 'gameName', 'name', 'GameName', 'Name') || undefined,
        barcode: str(gr, 'boxBarcode', 'barcode', 'Barcode') || undefined,
      };
    })
    .filter((g): g is NonNullable<typeof g> => Boolean(g));

  // Chỉ member API — không pad guest-slot giả theo PresentCount
  const sessionMembers: SessionMemberRef[] = membersArray.map((m: unknown, index: number) => {
    const mr = asRecord(m);
    const userId = str(mr, 'userId', 'UserId') || undefined;
    return {
      id:
        str(mr, 'id', 'memberId', 'sessionMemberId', 'Id', 'MemberId', 'SessionMemberId') ||
        `member-${index}`,
      userId,
      displayName:
        str(mr, 'displayName', 'DisplayName', 'fullName', 'name', 'Name') ||
        (index === 0 ? 'Chủ bàn (Host)' : `Khách ${index + 1}`),
      isGuestSlot:
        mr.isGuestSlot === true ||
        mr.IsGuestSlot === true ||
        Boolean(!userId && index > 0),
    };
  });

  const presentCount =
    sessionMembers.length > 0
      ? sessionMembers.length
      : presentCountFromNum || fallback?.presentCount || 0;

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
    status: pickSessionLifecycleStatus(r, fallback?.status),
    guestCount: guestCountFromNum || guestCountCalculated || undefined,
    members: sessionMembers.length > 0 ? sessionMembers : undefined,
    memberIds: membersArray.length > 0
      ? membersArray.map((m: unknown) => str(asRecord(m), 'userId', 'id', 'UserId')).filter(Boolean)
      : Array.isArray(r.memberIds)
        ? r.memberIds.map(String)
        : undefined,
    assignedInventoryIds: (() => {
      const fromField = Array.isArray(r.assignedInventoryIds)
        ? r.assignedInventoryIds.map(String)
        : Array.isArray(r.AssignedInventoryIds)
          ? (r.AssignedInventoryIds as unknown[]).map(String)
          : [];
      const fromSessionGames = sessionGames
        .map((g) => g.barcode)
        .filter((b): b is string => Boolean(b));
      const fromGamesRaw = gamesArray
        .map((g: unknown) => str(asRecord(g), 'boxBarcode', 'barcode', 'Barcode'))
        .filter(Boolean);
      const merged = Array.from(new Set([...fromField, ...fromSessionGames, ...fromGamesRaw]));
      return merged.length > 0 ? merged : undefined;
    })(),
    sessionGames: sessionGames.length > 0 ? sessionGames : undefined,
    totalAmount:
      num(r, 'totalAmount', 'TotalAmount', 'amountDue', 'AmountDue') ||
      sumSessionTotalFromMembers(membersArray) ||
      undefined,
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
    totalDue: num(r, 'totalDue', 'amountDue', 'TotalDue', 'totalAmount', 'TotalAmount'),
    currency: 'VND',
    calculatedAt: str(r, 'calculatedAt', 'CalculatedAt') || new Date().toISOString(),
  };
}

export function mapApiComponentChecklist(raw: unknown, fallbackSessionGameId = ''): ComponentChecklist {
  const r = asRecord(raw);
  const componentsRaw = r.components ?? r.Components ?? r.items ?? [];
  return {
    sessionGameId: str(r, 'sessionGameId', 'SessionGameId') || fallbackSessionGameId,
    gameTemplateId: str(r, 'gameTemplateId', 'GameTemplateId') || undefined,
    gameName: str(r, 'gameName', 'GameName') || undefined,
    components: Array.isArray(componentsRaw)
      ? componentsRaw
          .map((item) => {
            const c = asRecord(item);
            return {
              componentId: str(c, 'componentId', 'ComponentId', 'id', 'Id'),
              componentName: str(c, 'componentName', 'ComponentName', 'name', 'Name') || 'Linh kiện',
              componentKind: num(c, 'componentKind', 'ComponentKind') || undefined,
              expectedQuantity: num(c, 'expectedQuantity', 'ExpectedQuantity') || 0,
            };
          })
          .filter((c) => Boolean(c.componentId))
      : [],
  };
}

export function mapApiPaymentCode(raw: unknown): PaymentCode {
  const r = asRecord(raw);
  const nested =
    r.data && typeof r.data === 'object' ? asRecord(r.data) : r;
  const statusRaw = str(nested, 'status', 'Status').toLowerCase();
  return {
    code: str(
      nested,
      'orderId',
      'OrderId',
      'transferContent',
      'TransferContent',
      'code',
      'paymentCode',
      'Code',
    ),
    qrPayload:
      str(
        nested,
        'qrImageUrl',
        'QrImageUrl',
        'qrImage',
        'paymentUrl',
        'PaymentUrl',
        'qrUrl',
        'QrUrl',
        'qrPayload',
        'qrCode',
        'QrPayload',
      ) || str(nested, 'orderId', 'code', 'paymentCode'),
    amount: num(nested, 'amount', 'totalAmount', 'TotalAmount', 'totalDue', 'Amount'),
    expiresAt: str(nested, 'expiresAt', 'ExpiresAt'),
    status: statusRaw.includes('paid')
      ? 'Paid'
      : statusRaw.includes('expir')
        ? 'Expired'
        : 'Pending',
  };
}

export function mapApiCompleteSession(raw: unknown, sessionId: string): CompleteSessionResult {
  const r = asRecord(raw);
  const billRaw = r.bill ?? r.Bill ?? r.invoice ?? r.Invoice;
  const paymentRaw = r.paymentCode ?? r.payment ?? r.PaymentCode ?? {};

  let bill = mapApiSessionBill(billRaw ?? {}, sessionId);

  // Checkout thường trả ActiveSessionDto — lấy totalAmount trên root nếu bill trống
  if (!bill.totalDue) {
    const total = num(r, 'totalAmount', 'TotalAmount', 'amountDue', 'AmountDue');
    if (total > 0) {
      bill = {
        ...bill,
        sessionId: bill.sessionId || sessionId,
        bookingId: bill.bookingId || str(r, 'bookingId', 'BookingId'),
        totalDue: total,
        subtotal: total + num(r, 'depositCreditTotal', 'DepositCreditTotal'),
        depositCreditTotal: num(r, 'depositCreditTotal', 'DepositCreditTotal'),
        lineItems:
          bill.lineItems.length > 0
            ? bill.lineItems
            : [
                {
                  id: 'session-total',
                  label: 'Tổng hóa đơn phiên chơi',
                  quantity: 1,
                  unitPrice: total,
                  amount: total,
                },
              ],
      };
    }
  }

  return {
    sessionId: str(r, 'sessionId', 'SessionId', 'id', 'Id') || sessionId,
    bookingId: str(r, 'bookingId', 'BookingId') || bill.bookingId,
    tableId: str(r, 'tableId', 'TableId', 'cafeTableId'),
    bill,
    paymentCode: mapApiPaymentCode(paymentRaw),
    completedAt: str(r, 'completedAt', 'CompletedAt') || new Date().toISOString(),
  };
}

/** CafeInventoryBoxDto — GET /api/cafes/{cafeId}/pos/boxes */
export function mapApiPosGameBox(raw: unknown): PosGameBox {
  const r = asRecord(raw);
  const nestedGame = asRecord(
    r.game ?? r.Game ?? r.gameTemplate ?? r.GameTemplate ?? r.template ?? r.Template,
  );
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
    imageUrl:
      str(
        r,
        'imageUrl',
        'ImageUrl',
        'thumbnailUrl',
        'ThumbnailUrl',
        'coverUrl',
        'CoverUrl',
        'gameImageUrl',
        'GameImageUrl',
      ) ||
      str(
        nestedGame,
        'imageUrl',
        'ImageUrl',
        'thumbnailUrl',
        'ThumbnailUrl',
        'coverUrl',
        'CoverUrl',
      ) ||
      null,
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
