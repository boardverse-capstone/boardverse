export interface BookedGame {
  id: string;
  inventoryId?: string;
  name: string;
  imageUrl: string;
  minPlayers: number;
  maxPlayers: number;
}

export interface TableBookingParticipant {
  id: string;
  userId: string;
  displayName: string;
  depositAmount: number;
  isPresent: boolean;
  attendanceStatus: 'Present' | 'Absent';
}

export type BookingSessionStatus = 'Pending' | 'Active' | 'Checking' | 'Completed' | 'Cancelled';

/** Status gốc từ backend (vd: PendingDeposit) */
export type CafeBookingApiStatus =
  | 'PendingDeposit'
  | 'Confirmed'
  | 'CheckedIn'
  | 'Active'
  | 'Checking'
  | 'Completed'
  | 'Cancelled'
  | string;

export interface TableBooking {
  id: string;
  cafeId: string;
  tableId: string;
  tableLabel: string;
  qrCode: string;
  scheduledAt: string;
  bookedGame: BookedGame;
  participants: TableBookingParticipant[];
  sessionStatus: BookingSessionStatus;
  /** Có khi booking đã check-in / đang chơi */
  sessionId?: string;
  /** Fields từ GET /api/bookings/cafe/{cafeId} */
  lobbyId?: string;
  scheduledEndAt?: string;
  apiStatus?: CafeBookingApiStatus;
  statusText?: string;
  playerQuantity?: number;
  hostId?: string;
  depositAmount?: number;
  checkedInAt?: string | null;
}

export type TableStatus = 'Available' | 'Reserved' | 'Occupied';

export interface CafeTable {
  id: string;
  label: string;
  zone: string;
  seats: number;
  position: { row: number; col: number };
  status: TableStatus;
  bookingId?: string;
  sessionId?: string;
  startedAt?: string;
  gameName?: string;
  presentCount?: number;
}

export interface FloorPlan {
  cafeId: string;
  tables: CafeTable[];
}

export interface QrResolveResult {
  booking: TableBooking;
  table: CafeTable;
}

export interface AlternativeGame {
  inventoryId: string;
  gameTemplateId: string;
  name: string;
  imageUrl: string;
  minPlayers: number;
  maxPlayers: number;
  boxQuantity: number;
  status: string;
}

export interface MarkAbsentPayload {
  bookingId: string;
  participantIds: string[];
}

export interface MarkAbsentResult {
  processed: number;
  karmaPenalty: number;
  depositForfeitedTotal: number;
}

export interface ActivateSessionPayload {
  bookingId: string;
  game: BookedGame;
  presentParticipantIds: string[];
}

export interface ActivatedSession {
  sessionId: string;
  bookingId: string;
  tableId: string;
  tableLabel: string;
  game: BookedGame;
  startedAt: string;
  presentCount: number;
  depositCreditTotal: number;
}

export type BillingModel = 'BY_HOUR' | 'PER_DRINK';

export interface BillLineItem {
  id: string;
  label: string;
  quantity: number;
  unitPrice: number;
  amount: number;
}

export interface SessionBill {
  sessionId: string;
  bookingId: string;
  billingModel: BillingModel;
  durationMinutes: number;
  lineItems: BillLineItem[];
  depositCreditTotal: number;
  subtotal: number;
  totalDue: number;
  currency: 'VND';
  calculatedAt: string;
}

export type PaymentCodeStatus = 'Pending' | 'Paid' | 'Expired';

export interface PaymentCode {
  code: string;
  qrPayload: string;
  amount: number;
  expiresAt: string;
  status: PaymentCodeStatus;
}

export interface ActiveSessionDetail extends ActivatedSession {
  cafeId: string;
  billingModel: BillingModel;
  endedAt?: string;
}

export interface CompleteSessionResult {
  sessionId: string;
  bookingId: string;
  tableId: string;
  bill: SessionBill;
  paymentCode: PaymentCode;
  completedAt: string;
}

export interface StaffCafe {
  id: string;
  name: string;
  address?: string;
}

// ─── CafeStaff API payloads (Booking + Active Session) ───────────────────────

/** POST /api/bookings/{bookingId}/check-in */
export interface CheckInBookingPayload {
  presentParticipantIds: string[];
  /** Game thay thế khi thiếu người / đổi game */
  inventoryId?: string;
}

/** POST /api/cafes/{cafeId}/sessions/{sessionId}/guest-slots */
export interface AddGuestSlotsPayload {
  guestCount: number;
}

/** POST /api/cafes/{cafeId}/sessions/{sessionId}/members/add */
export interface AddSessionMembersPayload {
  userIds: string[];
}

/** POST /api/cafes/{cafeId}/sessions/{sessionId}/games */
export interface AssignSessionGamesPayload {
  inventoryIds: string[];
}

/** POST /api/cafes/{cafeId}/sessions/{sessionId}/games/check */
export interface SessionGameCheckItem {
  inventoryId: string;
  componentId?: string;
  expectedQuantity: number;
  actualQuantity: number;
}

export interface CheckSessionGamesPayload {
  items: SessionGameCheckItem[];
}

/** POST /api/cafes/{cafeId}/sessions/{sessionId}/inventory-loss */
export type InventoryLossType = 'Lost' | 'Damaged';

export interface ReportInventoryLossPayload {
  inventoryId: string;
  componentId?: string;
  quantity: number;
  lossType: InventoryLossType;
  note?: string;
}

/** POST /api/cafes/{cafeId}/sessions/{sourceSessionId}/merge */
export interface MergeSessionsPayload {
  targetSessionId: string;
  memberIds: string[];
}

/** POST /api/cafes/{cafeId}/sessions/{sessionId}/partial-checkout */
export interface PartialCheckoutPayload {
  memberIds: string[];
  amount?: number;
}

/** POST /api/cafes/{cafeId}/sessions/{sessionId}/pay */
export interface PaySessionPayload {
  paymentMethod?: 'QR' | 'Cash' | 'Card';
}

export type SessionLifecycleStatus =
  | 'Active'
  | 'Checking'
  | 'Paying'
  | 'Completed'
  | 'Cancelled';

export interface CafeSessionDetail extends ActiveSessionDetail {
  status: SessionLifecycleStatus;
  guestCount?: number;
  memberIds?: string[];
  assignedInventoryIds?: string[];
}
