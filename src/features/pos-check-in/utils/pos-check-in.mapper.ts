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
  SessionBill,
  SessionLifecycleStatus,
  TableBooking,
  TableBookingParticipant,
  TableStatus,
} from '../types/pos-check-in.interface';

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
    name: str(r, 'name', 'gameName', 'Name') || fallback?.name || 'Chưa có tên game',
    imageUrl:
      str(r, 'imageUrl', 'coverUrl', 'ImageUrl') ||
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

  const nestedGame = r.bookedGame ?? r.game ?? r.BookedGame;
  const bookedGame = mapBookedGame(nestedGame ?? {}, {
    id: str(r, 'gameId', 'GameId'),
    name: str(r, 'gameName', 'GameName') || undefined,
    minPlayers: playerQuantity || 2,
    maxPlayers: playerQuantity || 4,
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

export function mapApiBookingList(raw: unknown): TableBooking[] {
  if (Array.isArray(raw)) return raw.map(mapApiBooking);
  const r = asRecord(raw);
  const list = r.data ?? r.items ?? r.bookings ?? r.Bookings;
  return Array.isArray(list) ? list.map(mapApiBooking) : [];
}

/** Booking còn trên hàng đợi POS (chưa hoàn tất / hủy) */
export function isPosQueueBooking(booking: TableBooking): boolean {
  return booking.sessionStatus === 'Pending' || booking.sessionStatus === 'Active' || booking.sessionStatus === 'Checking';
}

export function isPendingCheckInBooking(booking: TableBooking): boolean {
  return booking.sessionStatus === 'Pending';
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
    gameName: str(r, 'gameName', 'currentGameName', 'GameName') || undefined,
    presentCount: num(r, 'presentCount', 'playerCount', 'PresentCount') || undefined,
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
  const game = mapBookedGame(r.game ?? r.bookedGame ?? r.Game ?? fallback?.game ?? {});

  return {
    sessionId: str(r, 'sessionId', 'id', 'SessionId') || fallback?.sessionId || '',
    bookingId: str(r, 'bookingId', 'BookingId') || fallback?.bookingId || '',
    cafeId: str(r, 'cafeId', 'CafeId') || fallback?.cafeId || '',
    tableId: str(r, 'tableId', 'TableId') || fallback?.tableId || '',
    tableLabel: str(r, 'tableLabel', 'TableLabel') || fallback?.tableLabel || 'Bàn',
    game,
    startedAt: str(r, 'startedAt', 'StartedAt') || fallback?.startedAt || new Date().toISOString(),
    presentCount: num(r, 'presentCount', 'PresentCount') || fallback?.presentCount || 0,
    depositCreditTotal:
      num(r, 'depositCreditTotal', 'DepositCreditTotal') || fallback?.depositCreditTotal || 0,
    billingModel:
      str(r, 'billingModel', 'BillingModel').toUpperCase() === 'PER_DRINK'
        ? 'PER_DRINK'
        : 'BY_HOUR',
    endedAt: str(r, 'endedAt', 'EndedAt') || undefined,
    status: mapLifecycleStatus(str(r, 'status', 'sessionStatus', 'Status') || 'Active'),
    guestCount: num(r, 'guestCount', 'GuestCount') || undefined,
    memberIds: Array.isArray(r.memberIds) ? r.memberIds.map(String) : undefined,
    assignedInventoryIds: Array.isArray(r.assignedInventoryIds)
      ? r.assignedInventoryIds.map(String)
      : undefined,
  };
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
