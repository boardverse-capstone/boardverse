import type { OperationalStatus, WorkingHours, BillingModel } from "@/features/partner/types/partner.interface";

/** GET /api/manager/cafes/me — full cafe aggregate for the signed-in manager. */
export interface ManagerCafe {
  /** UUID của cơ sở. */
  id: string;
  /** Tên hiển thị trên Boardverse. */
  cafeName: string;
  /** Địa chỉ cơ sở (từ đơn đăng ký). */
  address?: string;
  /** Hotline cơ sở (từ đơn đăng ký). */
  phoneNumber?: string;
  /** Số bàn đã đăng ký (read-only từ đơn). */
  numberOfTables?: number;
  /** Số game đang sở hữu (read-only từ đơn). */
  numberOfGamesOwned?: number;
  /** true ⇔ đã cấu hình layout bàn trên POS. */
  isTableLayoutConfigured?: boolean;
  /** Lý do dẫn đến trạng thái hiện tại (server-authoritative). */
  operationalStatusReason?: string | null;
  /** Trạng thái vận hành hiện tại của cơ sở. */
  operationalStatus: OperationalStatus;
  /** Tóm tắt giờ mở cửa đã được thiết lập khi đăng ký. */
  workingHours: WorkingHours;
  /** Sub-aggregate: hồ sơ vận hành (cùng shape với GET /partner/me/operational-profile). */
  operationalProfile: ManagerCafeOperationalProfile;
  /** ISO timestamp từ lần PUT profile gần nhất (server-authoritative). */
  operationalProfileUpdatedAt: string | null;
  /** true ⇔ cơ sở đủ điều kiện kích hoạt (server check). */
  canActivate: boolean;
  /** true ⇔ cơ sở INACTIVE đủ điều kiện mở lại (server check). */
  canReopen?: boolean;
  /** Lý do chặn kích hoạt (server-authoritative; rỗng khi canActivate=true). */
  activationBlockers: string[];
}

/**
 * Sub-aggregate trong `ManagerCafe` — đồng nhất với
 * `OperationalProfileResponse` của PartnerService để form vận hành
 * có thể hydrate mà không cần gọi GET /partner/me/operational-profile.
 */
export interface ManagerCafeOperationalProfile {
  workingHours?: WorkingHours;
  numberOfPrivateRooms: number;
  spaceImageUrls: string[];
  hasGameMaster: boolean;
  billingModel: BillingModel;
  basePrice?: number;
  tieredBlockRate?: number;
  tieredBlockMinutes?: number;
  depositPercentage?: number;
}

/** POST /api/manager/cafes/me/activate — phản hồi. */
export interface ActivateCafeResponse {
  /** Cafe aggregate đã cập nhật (status mới). */
  cafe: ManagerCafe;
  /** ISO timestamp của lần kích hoạt. */
  activatedAt: string;
}

/* ──────────────────────────────────────────────────────────────────────
 * SePay config — PUT /api/cafes/{id}/sepay-config
 * Cấu hình tài khoản ngân hàng nhận thanh toán từ khách.
 * ────────────────────────────────────────────────────────────────────── */

export interface SePayConfig {
  /** Mã ngân hàng (vd: VCB, MB, TCB...). */
  bankCode: string;
  /** Số tài khoản nhận tiền. */
  accountNumber: string;
  /** Tên chủ tài khoản (optional, dùng để verify). */
  accountHolder?: string | null;
  /** ISO timestamp lần cập nhật gần nhất. */
  updatedAt?: string | null;
}

export interface UpdateSePayConfigInput {
  bankCode: string;
  accountNumber: string;
  accountHolder?: string | null;
}

/**
 * POST /api/sepay-accounts/my-cafe — Manager tạo SePay account cho
 * quán của mình. Gửi full payload (bank info + SePay credentials
 * optional) theo spec của backend.
 */
export interface CreateSePayAccountInput {
  bankCode: string;
  accountNumber: string;
  accountHolder: string;
  environment: "Production" | "Sandbox";
  secretKey?: string;
  webhookToken?: string;
  webhookAuthType?: "None" | "Bearer" | "ApiKey";
  merchantId?: string;
  apiBaseUrl?: string;
}

/* ──────────────────────────────────────────────────────────────────────
 * Deposit refund policy — PATCH /api/cafes/{id}/deposit-refund-policy
 * BR-18 / Task #12: Manager chọn 1 trong 3 chính sách khi booking hủy.
 * ────────────────────────────────────────────────────────────────────── */

export type RefundPolicy = "Full" | "Partial" | "None";

export interface DepositRefundPolicy {
  /** Chính sách hiện tại. */
  policy: RefundPolicy;
  /** Bậc thang hoàn (chỉ dùng cho Partial). Mảng tier { afterHours, refundPercentage }. */
  tiers?: RefundTier[];
  /** ISO timestamp lần cập nhật gần nhất. */
  updatedAt?: string | null;
}

export interface RefundTier {
  /** Sau khi booking bị hủy quá N giờ trước giờ chơi. */
  afterHours: number;
  /** Phần trăm tiền cọc hoàn lại (0–100). */
  refundPercentage: number;
}

export interface UpdateDepositRefundPolicyInput {
  policy: RefundPolicy;
  tiers?: RefundTier[];
}

/* ──────────────────────────────────────────────────────────────────────
 * Pricing config — PUT /api/cafes/{id}/pricing-config
 * BR-04: Chỉ cho phép khi quán đóng cửa (IsPricingLocked=false).
 * ────────────────────────────────────────────────────────────────────── */

export interface PricingConfig {
  /** Cách tính phí (TIME_BASED | BY_HOUR | PER_DRINK). */
  billingModel: BillingModel;
  /** Giá giờ đầu (BY_HOUR only). */
  basePrice?: number;
  /** Phí mỗi khung giờ (BY_HOUR only). */
  tieredBlockRate?: number;
  /** Độ dài khung giờ (BY_HOUR only, phút). */
  tieredBlockMinutes?: number;
  /** Tỷ lệ đặt cọc (PER_DRINK only, 0–1). */
  depositPercentage?: number;
  /** Số phòng riêng. */
  numberOfPrivateRooms: number;
  /** true ⇔ đang khóa (chỉ sửa khi đóng cửa). */
  isPricingLocked: boolean;
  /** Số phút giữ chỗ mặc định khi booking. */
  defaultHoldDurationMinutes?: number;
  updatedAt?: string | null;
}

export interface UpdatePricingConfigInput {
  billingModel: BillingModel;
  basePrice?: number;
  tieredBlockRate?: number;
  tieredBlockMinutes?: number;
  depositPercentage?: number;
  numberOfPrivateRooms: number;
  defaultHoldDurationMinutes?: number;
}

/* ──────────────────────────────────────────────────────────────────────
 * Staff — GET/POST/DELETE /api/cafes/{cafeId}/staff
 * Manager (chủ quán) quản lý staff làm việc tại quán của mình.
 * ────────────────────────────────────────────────────────────────────── */

export type CafeStaffRole = "CafeStaff" | "ShiftLeader";

export interface CafeStaff {
  /** UUID của staff assignment. */
  id: string;
  /** User ID của staff. */
  userId: string;
  /** Email đăng nhập (BE trả về để manager dễ nhận diện). */
  email?: string;
  /** Họ tên hiển thị. */
  fullName?: string;
  /** Số điện thoại (optional). */
  phoneNumber?: string | null;
  /** Vai trò tại quán. */
  role: CafeStaffRole;
  /** ISO timestamp khi gán vào quán. */
  assignedAt: string;
}

export interface AddCafeStaffInput {
  email: string;
  role: CafeStaffRole;
}

/* ──────────────────────────────────────────────────────────────────────
 * Tables — tổng quan bàn đã cấu hình.
 * BE không có endpoint GET summary; UI dùng số liệu từ ManagerCafe.
 * ────────────────────────────────────────────────────────────────────── */

export interface TableSummary {
  /** Tổng số bàn (từ đơn đăng ký). */
  totalTables: number;
  /** Số bàn đã cấu hình trong POS. */
  configuredTables: number;
  /** true ⇔ layout đã được cấu hình. */
  isLayoutConfigured: boolean;
}

/* ──────────────────────────────────────────────────────────────────────
 * Games — tổng quan board game đã đăng ký.
 * UI dùng số liệu từ ManagerCafe + danh sách từ
 * GET /api/cafes/{cafeId}/inventory (đã có).
 * ────────────────────────────────────────────────────────────────────── */

export interface InventorySummary {
  /** Tổng số board game đang có. */
  totalGames: number;
  /** Số tên games unique. */
  totalUniqueGames: number;
}