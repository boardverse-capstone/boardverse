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
  /** Fields từ GET /api/cafes/{cafeId}/reservations */
  lobbyId?: string;
  scheduledEndAt?: string;
  apiStatus?: CafeBookingApiStatus;
  statusText?: string;
  playerQuantity?: number;
  hostId?: string;
  depositAmount?: number;
  checkedInAt?: string | null;
  /** ReservationCode 8 ký tự (BVC) — dùng cho POST /pos/check-in */
  reservationCode?: string;
  /** BookingCode / OrderId legacy (BV12345678) */
  bookingCode?: string;
  orderId?: string;
  paymentRef?: string | null;
}

export type TableStatus = 'Available' | 'Reserved' | 'Occupied';

export interface CafeTable {
  id: string;
  label: string;
  zone: string;
  seats: number;
  position: { row: number; col: number };
  sortOrder?: number;
  status: TableStatus;
  bookingId?: string;
  sessionId?: string;
  startedAt?: string;
  gameName?: string;
  presentCount?: number;
}

/** PATCH /api/cafes/{cafeId}/pos/tables/{tableId} */
export interface UpdatePosTablePayload {
  name?: string;
  seatCount?: number;
  sortOrder?: number;
}

export interface FloorPlan {
  cafeId: string;
  tables: CafeTable[];
}

/** GET /api/cafes/{cafeId}/pos/tables */
export type FloorPlanStatusFilter = 'all' | 'Available' | 'Reserved' | 'Occupied';

export interface FloorPlanQueryParams {
  /** Mặc định API true; POS monitor dùng false để lấy cả InUse/Reserved */
  includeOnlyAvailable?: boolean;
  /** true = gồm bàn soft-deleted (IsActive=false) */
  includeInactive?: boolean;
  /**
   * CSV status backend — ghi đè includeOnlyAvailable.
   * vd: InUse,Reserved,EventInProgress,Available
   */
  statuses?: string;
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

export interface CreateCheckInTokenPayload {
  reservationId?: string;
  ttlMinutes?: number;
}

export interface PosCheckInTokenDto {
  id: string;
  cafeId: string;
  reservationId?: string | null;
  token: string;
  qrPayload: string;
  createdAt: string;
  expiresAt: string;
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
  status?: SessionLifecycleStatus;
  /** Thành viên / guest-slot từ GET session */
  members?: SessionMemberRef[];
}

export interface SessionMemberRef {
  id: string;
  userId?: string;
  displayName: string;
  isGuestSlot?: boolean;
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

/** POST /api/cafes/{cafeId}/pos/check-in */
export interface CheckInBookingPayload {
  presentParticipantIds: string[];
  /** Game thay thế khi thiếu người / đổi game */
  inventoryId?: string;
}

/** POST /api/cafes/{cafeId}/pos/check-in (canonical) */
export interface PosCheckInPayload {
  /** ReservationCode (ABC234XY) hoặc BookingCode legacy (BV…) */
  code: string;
  cafeTableId: string;
  /** Barcode hộp game vật lý giao ra */
  barcode: string;
  idempotencyKey?: string;
  nonce?: string;
  /** Giúp resolve ReservationCode khi `code` là verificationQR ảo */
  bookingId?: string;
  lobbyId?: string;
}

/** POST /api/cafes/{cafeId}/pos/sessions/{sessionId}/guest-slots */
export interface AddGuestSlotsPayload {
  /** Tên hiển thị khách vô danh */
  displayName: string;
  /** Alias cũ — BE ưu tiên displayName nếu gửi cả hai */
  username?: string;
  /** SĐT liên hệ (Swagger AddGuestSlotRequestDto) */
  phoneNumber?: string;
}

/** POST /api/cafes/{cafeId}/sessions/{sessionId}/members/add */
export interface AddSessionMembersPayload {
  userIds: string[];
}

/** POST .../pos/sessions/{sessionId}/games — AttachGameRequestDto.gameBarcode */
export interface AssignSessionGamesPayload {
  /** Map sang `gameBarcode` khi gọi API */
  barcode: string;
}

/** POST /api/cafes/{cafeId}/pos/sessions/component-check */
export interface ComponentCheckResultItem {
  componentId: string;
  actualQuantity: number;
  responsibleMemberId?: string | null;
}

export interface CheckSessionGamesPayload {
  sessionGameId: string;
  markAllValid?: boolean;
  results?: ComponentCheckResultItem[];
}

/** GET /api/cafes/{cafeId}/pos/sessions/{sessionGameId}/component-checklist */
export interface ComponentChecklistItem {
  componentId: string;
  componentName: string;
  componentKind?: number;
  expectedQuantity: number;
}

export interface ComponentChecklist {
  sessionGameId: string;
  gameTemplateId?: string;
  gameName?: string;
  components: ComponentChecklistItem[];
}

export interface SessionGameRef {
  sessionGameId: string;
  gameTemplateId?: string;
  gameName?: string;
  barcode?: string;
}

/** POST /api/cafes/{cafeId}/sessions/{sessionId}/inventory-loss */
export type InventoryLossType = 'Lost' | 'Damaged';

export interface InventoryLossComponent {
  componentTemplateId: string;
  missingQuantity: number;
}

export interface ReportInventoryLossPayload {
  sessionGameId: string;
  missingComponents: InventoryLossComponent[];
  notes?: string;
}

/** POST /api/cafes/{cafeId}/sessions/{sourceSessionId}/merge */
export interface MergeSessionsPayload {
  targetSessionId: string;
  memberUserId: string;
}

/** POST /api/cafes/{cafeId}/sessions/{sessionId}/partial-checkout */
export interface PartialCheckoutPayload {
  memberUserIds: string[];
  applyDeposit?: boolean;
}

/** POST /api/cafes/{cafeId}/pos/sessions/{sessionId}/checkout — CheckoutRequestDto */
export interface CheckoutComponentItem {
  componentId: string;
  isMissing: boolean;
  isDamaged: boolean;
  penaltyFee: number;
}

export interface CheckoutSessionPayload {
  componentsVerified: boolean;
  components: CheckoutComponentItem[];
}

/** POST /api/cafes/{cafeId}/sessions/{sessionId}/pay */
export interface PaySessionPenaltyItem {
  sessionMemberId: string;
  componentTemplateId: string;
  penaltyFee: number;
}

export interface PaySessionPayload {
  paymentMethod?: 'SePay' | 'QR' | 'Cash' | 'Card';
  notes?: string;
  penaltyItems?: PaySessionPenaltyItem[];
}

/** GET /api/cafes/{cafeId}/pos/bookings/{bookingCode} */
export interface PosBookingPreview {
  bookingCode: string;
  depositStatus: string | null;
  depositAmount: number;
  scheduledStartTime: string | null;
  registeredMemberCount: number;
  canCheckIn: boolean;
  hostName: string | null;
  gameName: string | null;
  lobbyId: string | null;
  raw?: unknown;
}

/** GET /api/cafes/{cafeId}/reservations — Manager / CafeStaff */
export interface CafeReservationListItem {
  id: string;
  cafeId: string;
  gameId: string;
  gameName: string;
  playDate: string;
  timeSlot: string;
  currentPlayers: number;
  maxPlayers: number;
  status: string;
  depositAmount: number;
  lobbyId: string | null;
  lobbyStatus: string | null;
  reservationCode: string;
  scheduledStartTime: string | null;
  scheduledEndTime: string | null;
  tableNumber: string | null;
}

/** POST /api/cafes/{cafeId}/pos/sessions — walk-in / giao hộp */
export interface CreatePosSessionPayload {
  cafeTableId: string;
  barcode: string;
  bookingId?: string;
  lobbyId?: string;
  initialMemberUserIds?: string[];
}

/** GET /api/cafes/{cafeId}/settlements/pending */
export interface CafeSettlementPending {
  id: string;
  status: string;
  depositAmount: number;
  netTransferAmount: number;
  createdAt: string;
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
  /** ActiveSessionGame[] — id dùng cho component-check */
  sessionGames?: SessionGameRef[];
  totalAmount?: number;
}

/** Trạng thái hộp vật lý — CafeGameInventoryStatus */
export type PosBoxStatus =
  | 'Available'
  | 'InUse'
  | 'Damaged'
  | 'Maintenance'
  | 'Retired'
  | string;

/** CafeInventoryBoxDto — GET /api/cafes/{cafeId}/pos/boxes */
export interface PosGameBox {
  id: string;
  barcode: string;
  status: PosBoxStatus;
  gameTemplateId: string | null;
  gameName: string | null;
  inventoryId: string | null;
  cafeId: string | null;
  imageUrl?: string | null;
}

export interface PosBoxesParams {
  cafeId: string;
  gameTemplateId?: string;
}

/** GET /api/cafes/{cafeId}/pos/sessions/active */
export interface PosActiveSessionsParams {
  cafeId: string;
  gameTemplateId?: string;
}
