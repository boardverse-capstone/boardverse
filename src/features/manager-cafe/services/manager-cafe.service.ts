import apiClient from "@/core/api/client";
import type {
  ActivateCafeResponse,
  AddCafeStaffInput,
  CafeStaff,
  CreateSePayAccountInput,
  DepositRefundPolicy,
  ManagerCafe,
  ManagerCafeOperationalProfile,
  PricingConfig,
  RefundPolicy,
  SePayConfig,
  UpdateDepositRefundPolicyInput,
  UpdatePricingConfigInput,
  UpdateSePayConfigInput,
} from "../types/manager-cafe.interface";

/** Query keys cho manager-cafe — export để các hook ở feature khác invalid khi cần. */
export const MANAGER_CAFE_QUERY_KEYS = {
  me: "manager-cafe-me",
  sepayConfig: (cafeId: string) => `manager-cafe-${cafeId}-sepay-config`,
  depositRefund: (cafeId: string) =>
    `manager-cafe-${cafeId}-deposit-refund-policy`,
  pricingConfig: (cafeId: string) => `manager-cafe-${cafeId}-pricing-config`,
  staff: (cafeId: string) => `manager-cafe-${cafeId}-staff`,
} as const;

interface ManagerCafeMeResponse {
  cafe?: ManagerCafe;
  /** Một số phiên bản BE trả cafeId ở top-level (vd: "bd21e50b-…")
   *  thay vì wrap trong `cafe: {...}`. Phải đọc ở đây để
   *  normalizeMeResponse có thể fallback sang UUID này khi
   *  `data.cafe` không tồn tại — nếu không nút "+ Thêm Game Mới"
   *  trên /manager/inventory sẽ bị disabled vĩnh viễn. */
  cafeId?: string;
  profile?: ManagerCafeOperationalProfile;
  operationalProfile?: ManagerCafeOperationalProfile;
  operationalStatus?: ManagerCafe["operationalStatus"];
  canActivate?: boolean;
  canReopen?: boolean;
  activationBlockers?: string[];
  operationalProfileUpdatedAt?: string | null;
  /** Một số field BE trả phẳng ở top-level (thay vì trong `cafe`). */
  cafeName?: string;
  address?: string;
  phoneNumber?: string;
  numberOfTables?: number;
  numberOfGamesOwned?: number;
  popularGamesList?: string;
  defaultHoldDurationMinutes?: number;
  applicationStatus?: string;
  workingHours?: ManagerCafe["workingHours"];
  operationalStatusReason?: string | null;
  isTableLayoutConfigured?: boolean;
  /** BE mới trả phẳng toàn bộ profile ở top-level (không wrap trong
   *  `cafe`/`profile`/`operationalProfile`) — các field dưới đây nằm
   *  cùng cấp với `cafeId`. Phải đọc trực tiếp để hydrate form. */
  numberOfPrivateRooms?: number;
  spaceImageUrls?: string[];
  hasGameMaster?: boolean;
  billingModel?: string;
  basePrice?: number;
  tieredBlockRate?: number;
  tieredBlockMinutes?: number;
  depositPercentage?: number;
  /** `name` thay vì `cafeName` trong một số phiên bản BE. */
  name?: string;
}

/**
 * BE trả `billingModel: "ByHour"` (camelCase) trong API vận hành.
 * Giữ nguyên giá trị từ BE — FE dùng cùng convention.
 */
function normalizeBillingModel(raw: string | undefined): ManagerCafeOperationalProfile["billingModel"] {
  if (!raw) return "ByHour";
  if (raw === "ByHour" || raw === "TIME_BASED" || raw === "BY_HOUR") return "ByHour";
  if (raw === "PerDrink" || raw === "PER_DRINK") return "PerDrink";
  return "ByHour";
}

interface ActivateApiResponse {
  cafe?: ManagerCafe;
  status?: ManagerCafe["operationalStatus"];
  activatedAt?: string;
  canActivate?: boolean;
  canReopen?: boolean;
}

/**
 * POST /api/manager/cafes/me/activate — trả về cafe aggregate đã cập nhật.
 * BE cần confirm response shape (đề xuất: { cafe, activatedAt }).
 */
function normalizeActivateResponse(raw: unknown): ActivateCafeResponse {
  const data = (raw ?? {}) as ActivateApiResponse;
  if (data.cafe) {
    return {
      cafe: {
        ...data.cafe,
        operationalProfile: {
          ...data.cafe.operationalProfile,
          billingModel: normalizeBillingModel(
            data.cafe.operationalProfile.billingModel,
          ),
        },
      },
      activatedAt: data.activatedAt ?? new Date().toISOString(),
    };
  }
  // Fallback: BE trả về status thay vì full cafe — synthesize một cafe
  // tối thiểu để hook có thể cập nhật query cache.
  return {
    cafe: {
      id: "",
      cafeName: "",
      operationalStatus: data.status ?? "ACTIVE",
      workingHours: {
        weekdayStart: "08:00",
        weekdayEnd: "22:00",
        weekendStart: "08:00",
        weekendEnd: "22:00",
      },
      operationalProfile: {
        numberOfPrivateRooms: 0,
        spaceImageUrls: [],
        hasGameMaster: false,
        billingModel: "ByHour",
      },
      operationalProfileUpdatedAt: null,
      canActivate: data.canActivate ?? false,
      canReopen: data.canReopen ?? false,
      activationBlockers: [],
    },
    activatedAt: data.activatedAt ?? new Date().toISOString(),
  };
}

/** GET /api/manager/cafes/me — full cafe aggregate cho manager hiện tại. */
function normalizeMeResponse(raw: unknown): ManagerCafe {
  const data = (raw ?? {}) as ManagerCafeMeResponse;
  if (data.cafe) {
    return {
      ...data.cafe,
      operationalProfile: {
        ...data.cafe.operationalProfile,
        billingModel: normalizeBillingModel(
          data.cafe.operationalProfile.billingModel,
        ),
      },
    };
  }
  // Fallback: BE trả về phẳng (profile + status + canActivate) — synthesize.
  // Phải đọc `cafeId` từ top-level vì response thật của BE không wrap
  // cafe aggregate trong `cafe: {...}` mà để id trần ở ngoài
  // (vd: data.cafeId = "bd21e50b-…"). Nếu không pick được, throw để
  // hook bắt error thay vì render với id rỗng — nút "+ Thêm Game Mới"
  // trên /manager/inventory phụ thuộc vào `cafeId` để bật.
  const flatCafeId = data.cafeId;
  if (!flatCafeId) {
    throw new Error(
      "Không tìm thấy cafeId trong phản hồi /api/manager/cafes/me — vui lòng đăng nhập lại hoặc liên hệ hỗ trợ.",
    );
  }
  const profile =
    data.profile ?? data.operationalProfile ?? {
      numberOfPrivateRooms: 0,
      spaceImageUrls: [],
      hasGameMaster: false,
      billingModel: "ByHour" as const,
    };
  // Một số phiên bản BE trả `name` thay vì `cafeName` ở top-level
  // (vd: data.name = "lenguyedangkhoa cafe"). Pick cả 2 để tương thích
  // ngược với shape cũ.
  const flatCafeName = data.cafeName ?? (raw as { name?: string } | null)?.name ?? "";
  return {
    id: flatCafeId,
    cafeName: flatCafeName,
    address: data.address,
    phoneNumber: data.phoneNumber,
    numberOfTables: data.numberOfTables,
    operationalStatusReason: data.operationalStatusReason ?? null,
    isTableLayoutConfigured: data.isTableLayoutConfigured,
    operationalStatus: data.operationalStatus ?? "DATA_BLANK",
    workingHours: data.workingHours ?? profile.workingHours ?? {
      weekdayStart: "08:00",
      weekdayEnd: "22:00",
      weekendStart: "08:00",
      weekendEnd: "22:00",
    },
    operationalProfile: {
      // BE trả phẳng (không có profile/operationalProfile wrapper), nên
      // đọc trực tiếp các field từ `data` thay vì `profile` rỗng.
      // Fallback về `profile` cho các phiên bản BE cũ wrap trong
      // `profile: {...}` hoặc `operationalProfile: {...}`.
      ...profile,
      ...(data.numberOfPrivateRooms !== undefined
        ? { numberOfPrivateRooms: data.numberOfPrivateRooms }
        : null),
      ...(data.spaceImageUrls !== undefined
        ? { spaceImageUrls: data.spaceImageUrls }
        : null),
      ...(data.hasGameMaster !== undefined
        ? { hasGameMaster: data.hasGameMaster }
        : null),
      ...(data.billingModel !== undefined
        ? { billingModel: normalizeBillingModel(data.billingModel) }
        : { billingModel: normalizeBillingModel(profile.billingModel) }),
      ...(data.basePrice !== undefined ? { basePrice: data.basePrice } : null),
      ...(data.tieredBlockRate !== undefined
        ? { tieredBlockRate: data.tieredBlockRate }
        : null),
      ...(data.tieredBlockMinutes !== undefined
        ? { tieredBlockMinutes: data.tieredBlockMinutes }
        : null),
      ...(data.depositPercentage !== undefined
        ? { depositPercentage: data.depositPercentage }
        : null),
      // Mirror các field flat từ BE vào operationalProfile để form
      // chỉnh sửa có thể hydrate mà không cần gọi endpoint riêng.
      cafeName: flatCafeName,
      address: data.address,
      phoneNumber: data.phoneNumber,
      popularGamesList: data.popularGamesList ?? "",
      defaultHoldDurationMinutes: data.defaultHoldDurationMinutes,
      applicationStatus: data.applicationStatus,
      numberOfTables: data.numberOfTables,
      numberOfGamesOwned: data.numberOfGamesOwned,
    },
    operationalProfileUpdatedAt: data.operationalProfileUpdatedAt ?? null,
    canActivate: data.canActivate ?? false,
    canReopen: data.canReopen ?? false,
    activationBlockers: data.activationBlockers ?? [],
  };
}

/* ──────────────────────────────────────────────────────────────────────
 * SePay config endpoints
 * ────────────────────────────────────────────────────────────────────── */

function normalizeSePayConfig(raw: unknown): SePayConfig | null {
  const data = (raw ?? {}) as { data?: SePayConfig | null } & Partial<SePayConfig>;
  const inner = data.data ?? data;
  if (!inner || typeof inner !== "object") return null;
  if (!("bankCode" in inner) || !inner.bankCode) return null;
  return {
    bankCode: inner.bankCode,
    // BE mặc định trả `maskedAccountNumber`; fallback `accountNumber` raw
    // (một số endpoint phiên bản cũ có thể chỉ trả raw).
    accountNumber: inner.accountNumber ?? inner.maskedAccountNumber ?? "",
    maskedAccountNumber: inner.maskedAccountNumber ?? null,
    accountHolder: inner.accountHolder ?? null,
    updatedAt: inner.updatedAt ?? null,
  };
}

function normalizeDepositRefundPolicy(
  raw: unknown,
): DepositRefundPolicy | null {
  const data = (raw ?? {}) as {
    data?: Partial<DepositRefundPolicy> | null;
  } & Partial<DepositRefundPolicy>;
  const inner = data.data ?? data;
  if (!inner || typeof inner !== "object") return null;
  if (!("policy" in inner) || !inner.policy) return null;
  return {
    policy: inner.policy as RefundPolicy,
    tiers: Array.isArray(inner.tiers) ? inner.tiers : [],
    updatedAt: inner.updatedAt ?? null,
  };
}

function normalizePricingConfig(raw: unknown): PricingConfig | null {
  const data = (raw ?? {}) as {
    data?: Partial<PricingConfig> | null;
  } & Partial<PricingConfig>;
  const inner = data.data ?? data;
  if (!inner || typeof inner !== "object") return null;
  if (!("billingModel" in inner)) return null;
  return {
    billingModel: normalizeBillingModel(inner.billingModel),
    basePrice: inner.basePrice,
    tieredBlockRate: inner.tieredBlockRate,
    tieredBlockMinutes: inner.tieredBlockMinutes,
    depositPercentage: inner.depositPercentage,
    numberOfPrivateRooms: inner.numberOfPrivateRooms ?? 0,
    isPricingLocked: !!inner.isPricingLocked,
    defaultHoldDurationMinutes: inner.defaultHoldDurationMinutes,
    updatedAt: inner.updatedAt ?? null,
  };
}

/**
 * BE trả: `{ data: [...], meta: {...} }` (apiClient đã unwrap envelope
 * `statusCode/message/data` trước khi gọi). Mỗi phần tử chỉ có
 * `userId`, `email`, `username`, `joinedAt` — không còn `id`
 * assignment hay `role`. Tương thích ngược với shape cũ.
 */
function normalizeStaffList(raw: unknown): CafeStaff[] {
  const data = (raw ?? {}) as { data?: unknown };
  const list = Array.isArray(data.data) ? data.data : [];
  return list.filter(
    (s): s is CafeStaff =>
      !!s &&
      typeof s === "object" &&
      typeof (s as { userId?: unknown }).userId === "string" &&
      typeof (s as { joinedAt?: unknown }).joinedAt === "string",
  ) as CafeStaff[];
}

export const ManagerCafeService = {
  getMe: async (): Promise<ManagerCafe> => {
    const raw = await apiClient.get("/api/manager/cafes/me");
    return normalizeMeResponse(raw);
  },

  activate: async (): Promise<ActivateCafeResponse> => {
    const raw = await apiClient.post("/api/manager/cafes/me/activate");
    return normalizeActivateResponse(raw);
  },

  deactivate: async (): Promise<ActivateCafeResponse> => {
    const raw = await apiClient.post("/api/manager/cafes/me/deactivate");
    return normalizeActivateResponse(raw);
  },

  close: async (): Promise<ActivateCafeResponse> => {
    const raw = await apiClient.post("/api/manager/cafes/me/close");
    return normalizeActivateResponse(raw);
  },

  reopen: async (): Promise<ActivateCafeResponse> => {
    const raw = await apiClient.post("/api/manager/cafes/me/reopen");
    return normalizeActivateResponse(raw);
  },

  /**
   * GET /api/sepay-accounts/my-cafe — lấy cấu hình SePay hiện tại của quán
   * đang đăng nhập. Backend tự derive cafeId từ token, không cần truyền.
   * Trả về `null` nếu manager chưa từng tạo tài khoản SePay (404).
   */
  getSePayConfig: async (): Promise<SePayConfig | null> => {
    const raw = await apiClient.get(`/api/sepay-accounts/my-cafe`);
    return normalizeSePayConfig(raw);
  },

  /** PUT /api/cafes/{id}/sepay-config — cập nhật cấu hình SePay. */
  updateSePayConfig: async (
    cafeId: string,
    input: UpdateSePayConfigInput,
  ): Promise<SePayConfig | null> => {
    const raw = await apiClient.put(
      `/api/cafes/${cafeId}/sepay-config`,
      input,
    );
    return normalizeSePayConfig(raw);
  },

  /**
   * POST /api/sepay-accounts/my-cafe — Manager tạo SePay account cho
   * quán của mình (lần đầu tiên). Backend tự derive cafeId từ token.
   * Sau khi tạo, GET /api/cafes/{id}/sepay-config sẽ trả về config.
   */
  createSePayAccount: async (
    input: CreateSePayAccountInput,
  ): Promise<SePayConfig | null> => {
    const raw = await apiClient.post(
      `/api/sepay-accounts/my-cafe`,
      input,
    );
    return normalizeSePayConfig(raw);
  },

  /** PATCH /api/cafes/{id}/deposit-refund-policy — lấy chính sách hoàn cọc. */
  getDepositRefundPolicy: async (
    cafeId: string,
  ): Promise<DepositRefundPolicy | null> => {
    const raw = await apiClient.get(
      `/api/cafes/${cafeId}/deposit-refund-policy`,
    );
    return normalizeDepositRefundPolicy(raw);
  },

  /** PATCH /api/cafes/{id}/deposit-refund-policy — cập nhật chính sách. */
  updateDepositRefundPolicy: async (
    cafeId: string,
    input: UpdateDepositRefundPolicyInput,
  ): Promise<DepositRefundPolicy | null> => {
    const raw = await apiClient.patch(
      `/api/cafes/${cafeId}/deposit-refund-policy`,
      input,
    );
    return normalizeDepositRefundPolicy(raw);
  },

  /** PUT /api/cafes/{id}/pricing-config — lấy biểu phí hiện tại. */
  getPricingConfig: async (cafeId: string): Promise<PricingConfig | null> => {
    const raw = await apiClient.get(`/api/cafes/${cafeId}/pricing-config`);
    return normalizePricingConfig(raw);
  },

  /** PUT /api/cafes/{id}/pricing-config — cập nhật biểu phí. */
  updatePricingConfig: async (
    cafeId: string,
    input: UpdatePricingConfigInput,
  ): Promise<PricingConfig | null> => {
    const raw = await apiClient.put(
      `/api/cafes/${cafeId}/pricing-config`,
      input,
    );
    return normalizePricingConfig(raw);
  },

  /** GET /api/cafes/{cafeId}/staff — liệt kê staff. */
  listStaff: async (cafeId: string): Promise<CafeStaff[]> => {
    const raw = await apiClient.get(`/api/cafes/${cafeId}/staff`);
    return normalizeStaffList(raw);
  },

  /** POST /api/cafes/{cafeId}/staff — thêm staff mới (chưa có trên quán). */
  addStaff: async (
    cafeId: string,
    input: AddCafeStaffInput,
  ): Promise<CafeStaff | null> => {
    const raw = await apiClient.post(`/api/cafes/${cafeId}/staff`, input);
    const data = (raw ?? {}) as { data?: CafeStaff | null } & Partial<CafeStaff>;
    const inner = data.data ?? data;
    if (!inner || typeof inner !== "object" || !("id" in inner)) return null;
    return inner as CafeStaff;
  },

  /** DELETE /api/cafes/{cafeId}/staff/{staffId} — gỡ staff khỏi quán. */
  removeStaff: async (cafeId: string, staffId: string): Promise<void> => {
    await apiClient.delete(`/api/cafes/${cafeId}/staff/${staffId}`);
  },
} as const;