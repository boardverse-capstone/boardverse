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
  workingHours?: ManagerCafe["workingHours"];
  operationalStatusReason?: string | null;
  isTableLayoutConfigured?: boolean;
}

/**
 * BE đang trả `billingModel: "TIME_BASED"` cho flow quản lý (trong khi
 * flow Partner vẫn dùng "BY_HOUR"). Chuẩn hoá về `BY_HOUR` để form
 * hồ sơ vận hành có thể render đúng nhánh giá theo giờ.
 */
function normalizeBillingModel(
  raw: string | undefined,
): ManagerCafeOperationalProfile["billingModel"] {
  if (!raw) return "BY_HOUR";
  if (raw === "TIME_BASED" || raw === "BY_HOUR") return "BY_HOUR";
  if (raw === "PER_DRINK") return "PER_DRINK";
  return "BY_HOUR";
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
        billingModel: "BY_HOUR",
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
  const profile =
    data.profile ?? data.operationalProfile ?? {
      numberOfPrivateRooms: 0,
      spaceImageUrls: [],
      hasGameMaster: false,
      billingModel: "BY_HOUR" as const,
    };
  return {
    id: "",
    cafeName: data.cafeName ?? "",
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
      ...profile,
      billingModel: normalizeBillingModel(profile.billingModel),
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
    accountNumber: inner.accountNumber ?? "",
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

function normalizeStaffList(raw: unknown): CafeStaff[] {
  const data = (raw ?? {}) as {
    data?: CafeStaff[] | null;
  } & { items?: CafeStaff[] };
  const list = Array.isArray(data.data)
    ? data.data
    : Array.isArray(data.items)
      ? data.items
      : [];
  return list.filter(
    (s): s is CafeStaff =>
      !!s &&
      typeof s.id === "string" &&
      typeof s.userId === "string" &&
      typeof s.role === "string",
  );
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

  /** PUT /api/cafes/{id}/sepay-config — lấy cấu hình SePay hiện tại. */
  getSePayConfig: async (cafeId: string): Promise<SePayConfig | null> => {
    const raw = await apiClient.get(`/api/cafes/${cafeId}/sepay-config`);
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