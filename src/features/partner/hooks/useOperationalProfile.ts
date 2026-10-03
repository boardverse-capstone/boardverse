"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { PartnerService } from "../services/partner.service";
import type {
  BillingModel,
  OperationalStatus,
  WorkingHours,
} from "../types/partner.interface";
import { MANAGER_CAFE_QUERY_KEYS } from "@/features/manager-cafe/services/manager-cafe.service";
import { useCafeMe, useActivateCafe } from "@/features/manager-cafe/hooks/useCafeMe";
import type { ManagerCafe } from "@/features/manager-cafe/types/manager-cafe.interface";

/** Editable view of the operational profile. The hook owns transient
 *  NaN-in-progress numbers so `submit` can reject them with messages. */
export interface OperationalProfileFormState {
  workingHours: WorkingHours;
  numberOfPrivateRooms: number | undefined;
  spaceImageUrls: string[];
  hasGameMaster: boolean;
  billingModel: BillingModel;
  basePrice: number | undefined;
  tieredBlockRate: number | undefined;
  tieredBlockMinutes: number | undefined;
  depositPercentage: number | undefined;
}

export type FieldKey = keyof OperationalProfileFormState;

export type FieldErrors = Partial<Record<FieldKey, string>>;

/** Cached pricing values per billing model so swapping the radio
 *  doesn't destroy the manager's in-progress work. */
interface BillingCache {
  basePrice?: number;
  tieredBlockRate?: number;
  tieredBlockMinutes?: number;
  depositPercentage?: number;
}

const DEFAULT_FORM: OperationalProfileFormState = {
  workingHours: {
    weekdayStart: "08:00",
    weekendStart: "08:00",
    weekdayEnd: "22:00",
    weekendEnd: "22:00",
  },
  numberOfPrivateRooms: undefined,
  spaceImageUrls: [],
  hasGameMaster: true,
  billingModel: "BY_HOUR",
  basePrice: undefined,
  tieredBlockRate: undefined,
  tieredBlockMinutes: undefined,
  depositPercentage: undefined,
};

const EMPTY_BILLING_CACHE: BillingCache = {
  basePrice: undefined,
  tieredBlockRate: undefined,
  tieredBlockMinutes: undefined,
  depositPercentage: undefined,
};

/** Map ManagerCafe aggregate → form state. Sub-aggregate
 *  `operationalProfile` đã có cùng shape với OperationalProfileResponse. */
function hydrateFromCafe(cafe: ManagerCafe | undefined): OperationalProfileFormState {
  if (!cafe) return { ...DEFAULT_FORM };
  const p = cafe.operationalProfile;
  return {
    workingHours: cafe.workingHours ?? DEFAULT_FORM.workingHours,
    numberOfPrivateRooms: p.numberOfPrivateRooms,
    spaceImageUrls: p.spaceImageUrls ?? [],
    hasGameMaster: p.hasGameMaster,
    billingModel: p.billingModel,
    basePrice: p.basePrice,
    tieredBlockRate: p.tieredBlockRate,
    tieredBlockMinutes: p.tieredBlockMinutes,
    depositPercentage: p.depositPercentage,
  };
}

function isSameFormState(
  a: OperationalProfileFormState,
  b: OperationalProfileFormState,
): boolean {
  return (
    a.workingHours.weekdayStart === b.workingHours.weekdayStart &&
    a.workingHours.weekdayEnd === b.workingHours.weekdayEnd &&
    a.workingHours.weekendStart === b.workingHours.weekendStart &&
    a.workingHours.weekendEnd === b.workingHours.weekendEnd &&
    a.numberOfPrivateRooms === b.numberOfPrivateRooms &&
    a.spaceImageUrls.length === b.spaceImageUrls.length &&
    a.spaceImageUrls.every((url, i) => url === b.spaceImageUrls[i]) &&
    a.hasGameMaster === b.hasGameMaster &&
    a.billingModel === b.billingModel &&
    a.basePrice === b.basePrice &&
    a.tieredBlockRate === b.tieredBlockRate &&
    a.tieredBlockMinutes === b.tieredBlockMinutes &&
    a.depositPercentage === b.depositPercentage
  );
}

/** Validate the editable form state. Returns an error map; empty map = OK. */
export function validateOperationalProfile(
  data: OperationalProfileFormState,
): FieldErrors {
  const out: FieldErrors = {};

  const rooms = data.numberOfPrivateRooms;
  if (rooms === undefined || !Number.isFinite(rooms) || rooms < 0) {
    out.numberOfPrivateRooms = "Nhập số phòng riêng từ 0 đến 500.";
  } else if (rooms > 500) {
    out.numberOfPrivateRooms = "Tối đa 500 phòng riêng.";
  }

  if (data.billingModel === "BY_HOUR") {
    const base = data.basePrice;
    if (base === undefined || !Number.isFinite(base) || base < 0) {
      out.basePrice = "Nhập giá giờ đầu từ 0 đến 1.000.000đ.";
    } else if (base > 1_000_000) {
      out.basePrice = "Giá giờ đầu tối đa 1.000.000đ.";
    }

    const rate = data.tieredBlockRate;
    if (rate === undefined || !Number.isFinite(rate) || rate < 0) {
      out.tieredBlockRate = "Nhập phí mỗi khung giờ từ 0đ trở lên.";
    }

    const minutes = data.tieredBlockMinutes;
    if (
      minutes === undefined ||
      !Number.isFinite(minutes) ||
      minutes < 1
    ) {
      out.tieredBlockMinutes = "Độ dài khung giờ phải từ 1 phút trở lên.";
    } else if (minutes > 480) {
      out.tieredBlockMinutes = "Độ dài khung giờ tối đa 480 phút (8 giờ).";
    }
  }

  if (data.billingModel === "PER_DRINK") {
    const pct = data.depositPercentage;
    if (pct === undefined || !Number.isFinite(pct) || pct < 0) {
      out.depositPercentage = "Nhập tỷ lệ đặt cọc từ 0% đến 100%.";
    } else if (pct > 100) {
      out.depositPercentage = "Tỷ lệ đặt cọc tối đa 100%.";
    }
  }

  return out;
}

const isEmptyErrors = (e: FieldErrors) => Object.keys(e).length === 0;

function describeError(err: unknown): string {
  const message =
    err instanceof Error
      ? err.message
      : typeof err === "string"
        ? err
        : "Cập nhật thất bại. Vui lòng thử lại.";

  if (/401|unauthor/i.test(message)) {
    return "Phiên đăng nhập đã hết hạn. Vui lòng đăng nhập lại rồi tiếp tục.";
  }
  if (/403|forbidden/i.test(message)) {
    return "Tài khoản của bạn không có quyền chỉnh sửa hồ sơ vận hành này.";
  }
  if (/422|validation|invalid/i.test(message)) {
    return "Máy chủ không chấp nhận một số trường. Kiểm tra các giá trị và thử lại.";
  }
  if (/5\d\d|server/i.test(message)) {
    return "Máy chủ đang gặp sự cố. Vui lòng thử lại sau ít phút.";
  }
  if (/network|fetch|offline/i.test(message)) {
    return "Mất kết nối mạng. Kiểm tra kết nối và thử lại.";
  }
  return message;
}

function formatSavedAt(d: Date | string | null | undefined): string {
  const date = d ? new Date(d) : new Date();
  if (Number.isNaN(date.getTime())) {
    return date.toLocaleTimeString("vi-VN", {
      hour: "2-digit",
      minute: "2-digit",
      hour12: false,
    });
  }
  return date.toLocaleTimeString("vi-VN", {
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  });
}

export function useOperationalProfile() {
  const queryClient = useQueryClient();
  const cafeQuery = useCafeMe();
  const activateMutation = useActivateCafe();

  const cafe = cafeQuery.data;
  const hydrated = !!cafe;
  const hydrating = cafeQuery.isLoading;
  const hydratedError = cafeQuery.error
    ? describeError(cafeQuery.error)
    : null;

  // ─── Form state ────────────────────────────────────────────
  const [formData, setFormData] = useState<OperationalProfileFormState>(
    DEFAULT_FORM,
  );
  const [savedSnapshot, setSavedSnapshot] =
    useState<OperationalProfileFormState>(DEFAULT_FORM);
  const [errors, setErrors] = useState<FieldErrors>({});
  const [submitting, setSubmitting] = useState(false);
  const [savedAt, setSavedAt] = useState<string | null>(null);
  const [isServerErrorOpen, setIsServerErrorOpen] = useState(false);
  const [serverErrorContent, setServerErrorContent] = useState<{
    title: string;
    desc: string;
  }>({ title: "", desc: "" });
  const [activeImage, setActiveImage] = useState<number | null>(null);

  const [billingCache, setBillingCache] = useState<{
    BY_HOUR: BillingCache;
    PER_DRINK: BillingCache;
  }>({
    BY_HOUR: { ...EMPTY_BILLING_CACHE },
    PER_DRINK: { ...EMPTY_BILLING_CACHE },
  });

  // Re-hydrate form từ cafe aggregate mỗi khi cache thay đổi.
  // Tránh overwrite khi user đang chỉnh sửa — dùng savedSnapshot để so sánh.
  useEffect(() => {
    if (!cafe) return;
    const next = hydrateFromCafe(cafe);
    setFormData(next);
    setSavedSnapshot(next);
    setBillingCache({
      BY_HOUR: {
        basePrice: next.basePrice,
        tieredBlockRate: next.tieredBlockRate,
        tieredBlockMinutes: next.tieredBlockMinutes,
        depositPercentage: undefined,
      },
      PER_DRINK: {
        basePrice: undefined,
        tieredBlockRate: undefined,
        tieredBlockMinutes: undefined,
        depositPercentage: next.depositPercentage,
      },
    });
    if (cafe.operationalProfileUpdatedAt) {
      setSavedAt(formatSavedAt(cafe.operationalProfileUpdatedAt));
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [cafe?.id, cafe?.operationalProfileUpdatedAt]);

  // ─── Field setters ──────────────────────────────────────────
  const setField = useCallback(
    (name: FieldKey, value: OperationalProfileFormState[FieldKey]) => {
      setErrors((prev) => {
        if (!prev[name]) return prev;
        const next = { ...prev };
        delete next[name];
        return next;
      });
      setFormData((prev) => {
        const next = { ...prev, [name]: value };
        if (
          name === "billingModel" &&
          (value === "BY_HOUR" || value === "PER_DRINK")
        ) {
          const previousModel: BillingModel =
            prev.billingModel === "BY_HOUR" ? "BY_HOUR" : "PER_DRINK";
          if (previousModel !== value) {
            setBillingCache((cache) => ({
              ...cache,
              [previousModel]: {
                basePrice: prev.basePrice,
                tieredBlockRate: prev.tieredBlockRate,
                tieredBlockMinutes: prev.tieredBlockMinutes,
                depositPercentage: prev.depositPercentage,
              },
              [value]: { ...cache[value] },
            }));
            const restored = billingCache[value];
            if (value === "BY_HOUR") {
              return {
                ...next,
                basePrice: restored.basePrice,
                tieredBlockRate: restored.tieredBlockRate,
                tieredBlockMinutes: restored.tieredBlockMinutes,
                depositPercentage: undefined,
              };
            }
            return {
              ...next,
              basePrice: undefined,
              tieredBlockRate: undefined,
              tieredBlockMinutes: undefined,
              depositPercentage: restored.depositPercentage,
            };
          }
        }
        return next;
      });
    },
    [billingCache],
  );

  const handleChange = useCallback(
    (
      e: React.ChangeEvent<
        HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement
      >,
    ) => {
      const target = e.target;
      if (
        target instanceof HTMLInputElement &&
        target.type === "checkbox"
      ) {
        setField("hasGameMaster", target.checked);
        return;
      }
      if (target instanceof HTMLInputElement && target.type === "number") {
        const raw = target.value.trim();
        setField(
          target.name as FieldKey,
          (raw === "" ? undefined : Number(raw)) as never,
        );
        return;
      }
      setField(target.name as FieldKey, target.value as never);
    },
    [setField],
  );

  // ─── Reset to defaults ──────────────────────────────────────
  const resetToDefaults = useCallback(() => {
    setFormData({
      ...DEFAULT_FORM,
      workingHours: { ...DEFAULT_FORM.workingHours },
    });
    setBillingCache({
      BY_HOUR: { ...EMPTY_BILLING_CACHE },
      PER_DRINK: { ...EMPTY_BILLING_CACHE },
    });
    setErrors({});
  }, []);

  // ─── Image lightbox ─────────────────────────────────────────
  const openImage = useCallback((idx: number) => {
    setActiveImage(idx);
  }, []);

  // ─── Submit ─────────────────────────────────────────────────
  const submittingRef = useRef(false);
  useEffect(() => {
    submittingRef.current = submitting;
  }, [submitting]);

  const handleSubmit = useCallback(
    async (e: React.FormEvent) => {
      e.preventDefault();
      if (submittingRef.current) return;

      const fieldErrors = validateOperationalProfile(formData);
      if (!isEmptyErrors(fieldErrors)) {
        setErrors(fieldErrors);
        const firstName = Object.keys(fieldErrors)[0];
        if (firstName) {
          requestAnimationFrame(() => {
            const el = document.querySelector<HTMLElement>(
              `[name="${firstName}"]`,
            );
            el?.focus();
            el?.scrollIntoView({ behavior: "smooth", block: "center" });
          });
        }
        return;
      }

      if (isSameFormState(formData, savedSnapshot)) {
        setServerErrorContent({
          title: "Chưa có thay đổi nào để lưu",
          desc: "Bạn chưa chỉnh sửa trường nào kể từ lần lưu trước. Hãy điền ít nhất một giá trị rồi bấm Lưu.",
        });
        setIsServerErrorOpen(true);
        return;
      }

      setSubmitting(true);
      setErrors({});

      try {
        await PartnerService.updateOperationalProfile({
          workingHours: formData.workingHours,
          numberOfPrivateRooms: formData.numberOfPrivateRooms ?? 0,
          spaceImageUrls: formData.spaceImageUrls,
          hasGameMaster: formData.hasGameMaster,
          billingModel: formData.billingModel,
          basePrice: formData.basePrice,
          tieredBlockRate: formData.tieredBlockRate,
          tieredBlockMinutes: formData.tieredBlockMinutes,
          depositPercentage: formData.depositPercentage,
        });
        setSavedSnapshot(formData);
        setSavedAt(formatSavedAt(new Date()));
        // Invalidate cafe aggregate để form và dialog re-hydrate.
        void queryClient.invalidateQueries({
          queryKey: [MANAGER_CAFE_QUERY_KEYS.me],
        });
      } catch (err) {
        setServerErrorContent({
          title: "Không lưu được hồ sơ vận hành",
          desc: describeError(err),
        });
        setIsServerErrorOpen(true);
      } finally {
        setSubmitting(false);
      }
    },
    [formData, savedSnapshot, queryClient],
  );

  const hasErrors = useMemo(() => (e: FieldErrors) => !isEmptyErrors(e), []);

  // ─── Derived state for the form ─────────────────────────────
  const operationalStatus: OperationalStatus | null =
    cafe?.operationalStatus ?? null;
  const canActivate = !!cafe?.canActivate;
  const activationBlockers = cafe?.activationBlockers ?? [];
  const isActivating = activateMutation.isPending;
  /** Bật dialog activate: chỉ khi status=DATA_BLANK + canActivate=true. */
  const activateEligible =
    operationalStatus === "DATA_BLANK" && canActivate && !isActivating;

  return {
    formData,
    errors,
    hydrated,
    hydrating,
    hydratedError,
    submitting,
    savedAt,
    isServerErrorOpen,
    serverErrorContent,
    setIsServerErrorOpen,
    setField,
    handleChange,
    handleSubmit,
    hasErrors,
    resetToDefaults,
    refetch: () => {
      void queryClient.invalidateQueries({
        queryKey: [MANAGER_CAFE_QUERY_KEYS.me],
      });
    },
    activeImage,
    setActiveImage,
    openImage,
    operationalStatus,
    canActivate,
    canReopen: !!cafe?.canReopen,
    activationBlockers,
    activateEligible,
    activateCafe: activateMutation,
    cafe,
  };
}

// Re-export hook types the form needs.
export { useCafeMe, useActivateCafe } from "@/features/manager-cafe/hooks/useCafeMe";
