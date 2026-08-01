import { QR_BOOKING_PREFIX, QR_PAYMENT_PREFIX, DEFAULT_HOURLY_RATE_VND, BILLING_BLOCK_MINUTES } from '@/core/constants/pos-check-in';
import type {
  ActiveSessionDetail,
  AlternativeGame,
  CafeTable,
  CompleteSessionResult,
  FloorPlan,
  PaymentCode,
  QrResolveResult,
  SessionBill,
  StaffCafe,
  TableBooking,
} from '../types/pos-check-in.interface';

const delay = (ms = 300) => new Promise((resolve) => setTimeout(resolve, ms));

const MOCK_CAFE: StaffCafe = {
  id: 'cafe-demo-001',
  name: 'BoardVerse Cafe — Quận 1',
  address: '123 Nguyễn Huệ, Q.1, TP.HCM',
};

const INVENTORY: AlternativeGame[] = [
  {
    inventoryId: 'inv-001',
    gameTemplateId: 'game-catan',
    name: 'Catan',
    imageUrl: 'https://picsum.photos/seed/catan/400/300',
    minPlayers: 3,
    maxPlayers: 4,
    boxQuantity: 2,
    status: 'Available',
  },
  {
    inventoryId: 'inv-002',
    gameTemplateId: 'game-azul',
    name: 'Azul',
    imageUrl: 'https://picsum.photos/seed/azul/400/300',
    minPlayers: 2,
    maxPlayers: 4,
    boxQuantity: 3,
    status: 'Available',
  },
  {
    inventoryId: 'inv-003',
    gameTemplateId: 'game-love-letter',
    name: 'Love Letter',
    imageUrl: 'https://picsum.photos/seed/loveletter/400/300',
    minPlayers: 2,
    maxPlayers: 4,
    boxQuantity: 1,
    status: 'Available',
  },
  {
    inventoryId: 'inv-004',
    gameTemplateId: 'game-ticket',
    name: 'Ticket to Ride',
    imageUrl: 'https://picsum.photos/seed/ticket/400/300',
    minPlayers: 2,
    maxPlayers: 5,
    boxQuantity: 2,
    status: 'Available',
  },
  {
    inventoryId: 'inv-005',
    gameTemplateId: 'game-codenames',
    name: 'Codenames',
    imageUrl: 'https://picsum.photos/seed/codenames/400/300',
    minPlayers: 4,
    maxPlayers: 8,
    boxQuantity: 1,
    status: 'Available',
  },
  {
    inventoryId: 'inv-006',
    gameTemplateId: 'game-scythe',
    name: 'Scythe',
    imageUrl: 'https://picsum.photos/seed/scythe/400/300',
    minPlayers: 4,
    maxPlayers: 5,
    boxQuantity: 1,
    status: 'Available',
  },
];

interface StoredSession extends ActiveSessionDetail {
  bill?: SessionBill;
  paymentCode?: PaymentCode;
}

const DEMO_SESSION_STARTED_AT = new Date(Date.now() - 95 * 60_000).toISOString();

let activeSessions: Record<string, StoredSession> = {
  'session-demo-001': {
    sessionId: 'session-demo-001',
    bookingId: 'booking-003',
    tableId: 'table-t01',
    tableLabel: 'Bàn T-01',
    cafeId: MOCK_CAFE.id,
    game: {
      id: 'game-catan',
      inventoryId: 'inv-001',
      name: 'Catan',
      imageUrl: 'https://picsum.photos/seed/catan/400/300',
      minPlayers: 3,
      maxPlayers: 4,
    },
    startedAt: DEMO_SESSION_STARTED_AT,
    presentCount: 3,
    depositCreditTotal: 120_000,
    billingModel: 'BY_HOUR',
  },
};

let tables: CafeTable[] = [
  {
    id: 'table-t01',
    label: 'T-01',
    zone: 'Khu A',
    seats: 4,
    position: { row: 0, col: 0 },
    status: 'Occupied',
    bookingId: 'booking-003',
    sessionId: 'session-demo-001',
    startedAt: DEMO_SESSION_STARTED_AT,
    gameName: 'Catan',
    presentCount: 3,
  },
  { id: 'table-t02', label: 'T-02', zone: 'Khu A', seats: 4, position: { row: 0, col: 1 }, status: 'Available' },
  { id: 'table-t03', label: 'T-03', zone: 'Khu A', seats: 6, position: { row: 0, col: 2 }, status: 'Available' },
  { id: 'table-t04', label: 'T-04', zone: 'Khu A', seats: 4, position: { row: 0, col: 3 }, status: 'Available' },
  {
    id: 'table-t05',
    label: 'T-05',
    zone: 'Khu B',
    seats: 4,
    position: { row: 1, col: 0 },
    status: 'Reserved',
    bookingId: 'booking-002',
  },
  { id: 'table-t06', label: 'T-06', zone: 'Khu B', seats: 4, position: { row: 1, col: 1 }, status: 'Available' },
  { id: 'table-t07', label: 'T-07', zone: 'Khu B', seats: 6, position: { row: 1, col: 2 }, status: 'Available' },
  { id: 'table-t08', label: 'T-08', zone: 'Khu B', seats: 4, position: { row: 1, col: 3 }, status: 'Available' },
  { id: 'table-t09', label: 'T-09', zone: 'Khu C', seats: 8, position: { row: 2, col: 0 }, status: 'Available' },
  { id: 'table-t10', label: 'T-10', zone: 'Khu C', seats: 4, position: { row: 2, col: 1 }, status: 'Available' },
  { id: 'table-t11', label: 'T-11', zone: 'Khu C', seats: 4, position: { row: 2, col: 2 }, status: 'Available' },
  {
    id: 'table-t12',
    label: 'T-12',
    zone: 'Khu C',
    seats: 6,
    position: { row: 2, col: 3 },
    status: 'Reserved',
    bookingId: 'booking-001',
  },
];

let bookings: TableBooking[] = [
  {
    id: 'booking-001',
    cafeId: MOCK_CAFE.id,
    tableId: 'table-t12',
    tableLabel: 'Bàn T-12',
    qrCode: `${QR_BOOKING_PREFIX}booking-001`,
    scheduledAt: new Date().toISOString(),
    bookedGame: {
      id: 'game-scythe',
      inventoryId: 'inv-006',
      name: 'Scythe',
      imageUrl: 'https://picsum.photos/seed/scythe/400/300',
      minPlayers: 4,
      maxPlayers: 5,
    },
    participants: [
      { id: 'p1', userId: 'u1', displayName: 'Minh Anh', depositAmount: 50000, isPresent: true, attendanceStatus: 'Present' },
      { id: 'p2', userId: 'u2', displayName: 'Hoàng Long', depositAmount: 50000, isPresent: true, attendanceStatus: 'Present' },
      { id: 'p3', userId: 'u3', displayName: 'Thu Hà', depositAmount: 50000, isPresent: true, attendanceStatus: 'Present' },
      { id: 'p4', userId: 'u4', displayName: 'Quốc Bảo', depositAmount: 50000, isPresent: true, attendanceStatus: 'Present' },
      { id: 'p5', userId: 'u5', displayName: 'Lan Chi', depositAmount: 50000, isPresent: true, attendanceStatus: 'Present' },
    ],
    sessionStatus: 'Pending',
  },
  {
    id: 'booking-002',
    cafeId: MOCK_CAFE.id,
    tableId: 'table-t05',
    tableLabel: 'Bàn T-05',
    qrCode: `${QR_BOOKING_PREFIX}booking-002`,
    scheduledAt: new Date(Date.now() + 3600000).toISOString(),
    bookedGame: {
      id: 'game-azul',
      inventoryId: 'inv-002',
      name: 'Azul',
      imageUrl: 'https://picsum.photos/seed/azul/400/300',
      minPlayers: 2,
      maxPlayers: 4,
    },
    participants: [
      { id: 'p6', userId: 'u6', displayName: 'Đức Phú', depositAmount: 30000, isPresent: true, attendanceStatus: 'Present' },
      { id: 'p7', userId: 'u7', displayName: 'Ngọc Linh', depositAmount: 30000, isPresent: true, attendanceStatus: 'Present' },
    ],
    sessionStatus: 'Pending',
  },
  {
    id: 'booking-003',
    cafeId: MOCK_CAFE.id,
    tableId: 'table-t01',
    tableLabel: 'Bàn T-01',
    qrCode: `${QR_BOOKING_PREFIX}booking-003`,
    scheduledAt: new Date(Date.now() - 120 * 60_000).toISOString(),
    bookedGame: {
      id: 'game-catan',
      inventoryId: 'inv-001',
      name: 'Catan',
      imageUrl: 'https://picsum.photos/seed/catan/400/300',
      minPlayers: 3,
      maxPlayers: 4,
    },
    participants: [
      { id: 'p8', userId: 'u8', displayName: 'Huyền Trang', depositAmount: 40000, isPresent: true, attendanceStatus: 'Present' },
      { id: 'p9', userId: 'u9', displayName: 'Văn Kiệt', depositAmount: 40000, isPresent: true, attendanceStatus: 'Present' },
      { id: 'p10', userId: 'u10', displayName: 'Mai Phương', depositAmount: 40000, isPresent: true, attendanceStatus: 'Present' },
    ],
    sessionStatus: 'Active',
    sessionId: 'session-demo-001',
  },
];

function parseQrPayload(raw: string): string | null {
  const trimmed = raw.trim();
  if (!trimmed) return null;

  if (trimmed.startsWith(QR_BOOKING_PREFIX)) {
    return trimmed.slice(QR_BOOKING_PREFIX.length);
  }

  if (trimmed.startsWith('booking-')) return trimmed;

  try {
    const json = JSON.parse(trimmed) as { bookingId?: string };
    if (json.bookingId) return json.bookingId;
  } catch {
    // not JSON
  }

  const booking = bookings.find((b) => b.qrCode === trimmed || b.id === trimmed);
  return booking?.id ?? null;
}

function syncTableFromBooking(booking: TableBooking) {
  const table = tables.find((t) => t.id === booking.tableId);
  if (!table) return;

  if (booking.sessionStatus === 'Active' || booking.sessionStatus === 'Checking') {
    table.status = 'Occupied';
    table.bookingId = booking.id;
    if (booking.sessionId) table.sessionId = booking.sessionId;
  } else if (booking.sessionStatus === 'Completed') {
    table.status = 'Available';
    table.bookingId = undefined;
    table.sessionId = undefined;
    table.startedAt = undefined;
    table.gameName = undefined;
    table.presentCount = undefined;
  } else if (booking.sessionStatus === 'Pending') {
    table.status = 'Reserved';
    table.bookingId = booking.id;
    table.sessionId = undefined;
    table.startedAt = undefined;
    table.gameName = undefined;
    table.presentCount = undefined;
  }
}

function findSessionByBookingId(bookingId: string): StoredSession | undefined {
  return Object.values(activeSessions).find((session) => session.bookingId === bookingId);
}

function findSessionById(sessionId: string): StoredSession | undefined {
  return activeSessions[sessionId];
}

function roundBillableHours(durationMinutes: number): number {
  const blocks = Math.max(1, Math.ceil(durationMinutes / BILLING_BLOCK_MINUTES));
  return (blocks * BILLING_BLOCK_MINUTES) / 60;
}

function buildHourlyBill(session: StoredSession, endedAt = new Date()): SessionBill {
  const startedMs = new Date(session.startedAt).getTime();
  const durationMinutes = Math.max(1, Math.round((endedAt.getTime() - startedMs) / 60_000));
  const billableHours = roundBillableHours(durationMinutes);
  const playAmount = Math.round(billableHours * DEFAULT_HOURLY_RATE_VND);

  const lineItems: SessionBill['lineItems'] = [
    {
      id: 'play-fee',
      label: `Phí chơi (${billableHours} giờ × ${DEFAULT_HOURLY_RATE_VND.toLocaleString('vi-VN')}đ)`,
      quantity: billableHours,
      unitPrice: DEFAULT_HOURLY_RATE_VND,
      amount: playAmount,
    },
  ];

  const subtotal = playAmount;
  const totalDue = Math.max(0, subtotal - session.depositCreditTotal);

  return {
    sessionId: session.sessionId,
    bookingId: session.bookingId,
    billingModel: session.billingModel,
    durationMinutes,
    lineItems,
    depositCreditTotal: session.depositCreditTotal,
    subtotal,
    totalDue,
    currency: 'VND',
    calculatedAt: endedAt.toISOString(),
  };
}

function buildDrinkBill(session: StoredSession, endedAt = new Date()): SessionBill {
  const startedMs = new Date(session.startedAt).getTime();
  const durationMinutes = Math.max(1, Math.round((endedAt.getTime() - startedMs) / 60_000));

  const lineItems: SessionBill['lineItems'] = [
    { id: 'drink-1', label: 'Trà đào', quantity: 2, unitPrice: 35_000, amount: 70_000 },
    { id: 'drink-2', label: 'Cà phê sữa', quantity: 1, unitPrice: 40_000, amount: 40_000 },
    { id: 'drink-3', label: 'Nước suối', quantity: 3, unitPrice: 15_000, amount: 45_000 },
  ];

  const subtotal = lineItems.reduce((sum, item) => sum + item.amount, 0);
  const totalDue = Math.max(0, subtotal - session.depositCreditTotal);

  return {
    sessionId: session.sessionId,
    bookingId: session.bookingId,
    billingModel: session.billingModel,
    durationMinutes,
    lineItems,
    depositCreditTotal: session.depositCreditTotal,
    subtotal,
    totalDue,
    currency: 'VND',
    calculatedAt: endedAt.toISOString(),
  };
}

function createPaymentCode(session: StoredSession, bill: SessionBill): PaymentCode {
  const suffix = Math.random().toString(36).slice(2, 8).toUpperCase();
  const code = `BV-PAY-${suffix}`;
  const expiresAt = new Date(Date.now() + 15 * 60_000).toISOString();

  return {
    code,
    qrPayload: `${QR_PAYMENT_PREFIX}${session.sessionId}:${code}`,
    amount: bill.totalDue,
    expiresAt,
    status: 'Pending',
  };
}

function getTableForBooking(bookingId: string): CafeTable | undefined {
  return tables.find((t) => t.bookingId === bookingId);
}

export const PosCheckInMockService = {
  getStaffCafe: async (): Promise<StaffCafe> => {
    await delay();
    return MOCK_CAFE;
  },

  getFloorPlan: async (cafeId: string): Promise<FloorPlan> => {
    await delay(200);
    if (cafeId !== MOCK_CAFE.id) return { cafeId, tables: [] };
    return { cafeId, tables: structuredClone(tables) };
  },

  resolveQrOrBookingId: async (payload: string): Promise<QrResolveResult> => {
    await delay(350);
    const bookingId = parseQrPayload(payload);
    if (!bookingId) throw new Error('Mã QR hoặc mã phòng không hợp lệ.');

    const booking = bookings.find((b) => b.id === bookingId);
    if (!booking) throw new Error('Không tìm thấy lịch đặt tương ứng với mã này.');

    const table = tables.find((t) => t.id === booking.tableId);
    if (!table) throw new Error('Không tìm thấy bàn trên sơ đồ mặt bằng.');

    return {
      booking: structuredClone(booking),
      table: structuredClone(table),
    };
  },

  getPendingBookings: async (): Promise<TableBooking[]> => {
    await delay();
    return bookings.filter((b) => b.sessionStatus === 'Pending').map((b) => structuredClone(b));
  },

  getBookingById: async (id: string): Promise<TableBooking> => {
    await delay();
    const booking = bookings.find((b) => b.id === id);
    if (!booking) throw new Error('Không tìm thấy đơn đặt bàn.');
    return structuredClone(booking);
  },

  getAlternativeGames: async (cafeId: string, playerCount: number): Promise<AlternativeGame[]> => {
    await delay();
    if (cafeId !== MOCK_CAFE.id) return [];
    return INVENTORY.filter(
      (game) =>
        game.status === 'Available' &&
        game.minPlayers <= playerCount &&
        game.maxPlayers >= playerCount,
    );
  },

  markAbsent: async (
    bookingId: string,
    participantIds: string[],
  ): Promise<{ processed: number; depositForfeitedTotal: number }> => {
    await delay(400);
    const booking = bookings.find((b) => b.id === bookingId);
    if (!booking) throw new Error('Không tìm thấy đơn đặt bàn.');

    let depositForfeitedTotal = 0;
    booking.participants.forEach((p) => {
      if (participantIds.includes(p.id)) {
        p.isPresent = false;
        p.attendanceStatus = 'Absent';
        depositForfeitedTotal += p.depositAmount;
      }
    });

    return { processed: participantIds.length, depositForfeitedTotal };
  },

  activateSession: async (
    bookingId: string,
    game: TableBooking['bookedGame'],
    presentParticipantIds: string[],
  ) => {
    await delay(500);
    const index = bookings.findIndex((b) => b.id === bookingId);
    if (index === -1) throw new Error('Không tìm thấy đơn đặt bàn.');

    const startedAt = new Date().toISOString();
    const sessionId = `session-${Date.now()}`;
    const presentParticipants = bookings[index].participants.filter((p) =>
      presentParticipantIds.includes(p.id),
    );
    const depositCreditTotal = presentParticipants.reduce((sum, p) => sum + p.depositAmount, 0);

    bookings[index] = {
      ...bookings[index],
      bookedGame: game,
      sessionStatus: 'Active',
      sessionId,
      participants: bookings[index].participants.map((p) => ({
        ...p,
        isPresent: presentParticipantIds.includes(p.id),
        attendanceStatus: presentParticipantIds.includes(p.id) ? 'Present' : 'Absent',
      })),
    };

    syncTableFromBooking(bookings[index]);

    const table = tables.find((t) => t.id === bookings[index].tableId);
    if (table) {
      table.status = 'Occupied';
      table.sessionId = sessionId;
      table.startedAt = startedAt;
      table.gameName = game.name;
      table.presentCount = presentParticipantIds.length;
    }

    activeSessions[sessionId] = {
      sessionId,
      bookingId,
      tableId: bookings[index].tableId,
      tableLabel: bookings[index].tableLabel,
      cafeId: bookings[index].cafeId,
      game,
      startedAt,
      presentCount: presentParticipantIds.length,
      depositCreditTotal,
      billingModel: 'BY_HOUR',
    };

    return {
      sessionId,
      bookingId,
      tableId: bookings[index].tableId,
      tableLabel: bookings[index].tableLabel,
      game,
      startedAt,
      presentCount: presentParticipantIds.length,
      depositCreditTotal,
    };
  },

  /** Demo helper — mã QR mẫu cho nhân viên test */
  getSampleQrCodes: () =>
    bookings
      .filter((b) => b.sessionStatus === 'Pending')
      .map((b) => ({ bookingId: b.id, qrCode: b.qrCode, tableLabel: b.tableLabel })),

  getActiveSessionByBookingId: async (bookingId: string): Promise<ActiveSessionDetail> => {
    await delay(200);
    const session = findSessionByBookingId(bookingId);
    if (!session) throw new Error('Không tìm thấy phiên chơi đang hoạt động.');
    return structuredClone(session);
  },

  getSessionById: async (sessionId: string): Promise<ActiveSessionDetail> => {
    await delay(200);
    const session = findSessionById(sessionId);
    if (!session) throw new Error('Không tìm thấy phiên chơi.');
    return structuredClone(session);
  },

  calculateBill: async (sessionId: string): Promise<SessionBill> => {
    await delay(400);
    const session = findSessionById(sessionId);
    if (!session) throw new Error('Không tìm thấy phiên chơi.');

    const bill =
      session.billingModel === 'PER_DRINK'
        ? buildDrinkBill(session)
        : buildHourlyBill(session);

    session.bill = bill;
    return structuredClone(bill);
  },

  generatePaymentCode: async (sessionId: string): Promise<PaymentCode> => {
    await delay(350);
    const session = findSessionById(sessionId);
    if (!session) throw new Error('Không tìm thấy phiên chơi.');

    const bill = session.bill ?? (session.billingModel === 'PER_DRINK' ? buildDrinkBill(session) : buildHourlyBill(session));
    session.bill = bill;

    const paymentCode = createPaymentCode(session, bill);
    session.paymentCode = paymentCode;
    return structuredClone(paymentCode);
  },

  completeSession: async (sessionId: string): Promise<CompleteSessionResult> => {
    await delay(500);
    const session = findSessionById(sessionId);
    if (!session) throw new Error('Không tìm thấy phiên chơi.');

    const bill = session.bill ?? (session.billingModel === 'PER_DRINK' ? buildDrinkBill(session) : buildHourlyBill(session));
    const paymentCode =
      session.paymentCode ?? createPaymentCode(session, bill);

    const completedAt = new Date().toISOString();
    const bookingIndex = bookings.findIndex((b) => b.id === session.bookingId);
    if (bookingIndex !== -1) {
      bookings[bookingIndex] = {
        ...bookings[bookingIndex],
        sessionStatus: 'Completed',
      };
      syncTableFromBooking(bookings[bookingIndex]);
    }

    delete activeSessions[sessionId];

    return {
      sessionId,
      bookingId: session.bookingId,
      tableId: session.tableId,
      bill,
      paymentCode: { ...paymentCode, status: 'Paid' },
      completedAt,
    };
  },
};

export { getTableForBooking, MOCK_CAFE };
