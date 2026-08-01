import type {
  ActivatedSession,
  ActiveSessionDetail,
  BookedGame,
  BookingSessionStatus,
  CafeSessionDetail,
  CompleteSessionResult,
  PaymentCode,
  SessionBill,
  SessionLifecycleStatus,
  TableBooking,
  TableBookingParticipant,
} from '../types/pos-check-in.interface';

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

function mapBookedGame(raw: unknown): BookedGame {
  const r = asRecord(raw);
  return {
    id: str(r, 'id', 'gameId', 'gameTemplateId', 'Id'),
    inventoryId: str(r, 'inventoryId', 'InventoryId') || undefined,
    name: str(r, 'name', 'gameName', 'Name') || 'Unknown',
    imageUrl:
      str(r, 'imageUrl', 'coverUrl', 'ImageUrl') ||
      'https://picsum.photos/seed/game/400/300',
    minPlayers: num(r, 'minPlayers', 'minPlayerCount') || 2,
    maxPlayers: num(r, 'maxPlayers', 'maxPlayerCount') || 4,
  };
}

function mapParticipant(raw: unknown): TableBookingParticipant {
  const r = asRecord(raw);
  const attendance = str(r, 'attendanceStatus', 'AttendanceStatus');
  const isPresent =
    typeof r.isPresent === 'boolean'
      ? r.isPresent
      : attendance.toLowerCase() === 'present';

  return {
    id: str(r, 'id', 'participantId', 'Id'),
    userId: str(r, 'userId', 'UserId'),
    displayName: str(r, 'displayName', 'fullName', 'name', 'DisplayName') || 'Khách',
    depositAmount: num(r, 'depositAmount', 'DepositAmount'),
    isPresent,
    attendanceStatus: isPresent ? 'Present' : 'Absent',
  };
}

function mapSessionStatus(value: string): BookingSessionStatus {
  const normalized = value.toLowerCase();
  if (normalized.includes('check')) return 'Checking';
  if (normalized.includes('active') || normalized.includes('playing')) return 'Active';
  if (normalized.includes('complete') || normalized.includes('done')) return 'Completed';
  if (normalized.includes('cancel')) return 'Cancelled';
  return 'Pending';
}

export function mapApiBooking(raw: unknown): TableBooking {
  const r = asRecord(raw);
  const gameRaw = r.bookedGame ?? r.game ?? r.BookedGame ?? {};
  const participantsRaw = r.participants ?? r.members ?? r.Participants ?? [];

  return {
    id: str(r, 'id', 'bookingId', 'Id'),
    cafeId: str(r, 'cafeId', 'CafeId'),
    tableId: str(r, 'tableId', 'TableId'),
    tableLabel: str(r, 'tableLabel', 'tableName', 'TableLabel') || 'Bàn',
    qrCode: str(r, 'qrCode', 'qrPayload', 'QrCode'),
    scheduledAt: str(r, 'scheduledAt', 'startTime', 'bookedAt', 'ScheduledAt'),
    bookedGame: mapBookedGame(gameRaw),
    participants: Array.isArray(participantsRaw)
      ? participantsRaw.map(mapParticipant)
      : [],
    sessionStatus: mapSessionStatus(str(r, 'sessionStatus', 'status', 'Status') || 'Pending'),
    sessionId: str(r, 'sessionId', 'activeSessionId', 'SessionId') || undefined,
  };
}

export function mapApiBookingList(raw: unknown): TableBooking[] {
  if (Array.isArray(raw)) return raw.map(mapApiBooking);
  const r = asRecord(raw);
  const list = r.data ?? r.items ?? r.bookings ?? r.Bookings;
  return Array.isArray(list) ? list.map(mapApiBooking) : [];
}

function mapLifecycleStatus(value: string): SessionLifecycleStatus {
  const normalized = value.toLowerCase();
  if (normalized.includes('check')) return 'Checking';
  if (normalized.includes('pay')) return 'Paying';
  if (normalized.includes('complete') || normalized.includes('done')) return 'Completed';
  if (normalized.includes('cancel')) return 'Cancelled';
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
