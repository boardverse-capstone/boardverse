"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { PartnerService } from "../services/partner.service";
import { uploadToCloudinary } from "./useCloudinaryUpload";
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
  /** Tên quán (cho sửa). */
  cafeName: string;
  /** Địa chỉ quán. */
  address: string;
  /** Số điện thoại hotline. */
  phoneNumber: string;
  /** Danh sách board game phổ biến (chuỗi tự do). */
  popularGamesList: string;
  /** Số phút giữ chỗ mặc định khi booking. */
  defaultHoldDurationMinutes: number | undefined;
}

export type FieldKey =
  | keyof OperationalProfileFormState
  | `workingHours.${keyof WorkingHours}`
  | `spaceImageUrls.${number}`;

/** Error map keyed by FieldKey. We type as `Record<string, string>` for
 *  ergonomic access in components (dot-notation indexes become plain
 *  string lookups). Each write is constrained at the validate site. */
export type FieldErrors = Record<string, string>;

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
  numberOfPrivateRooms: 10,
  spaceImageUrls: [],
  hasGameMaster: true,
  billingModel: "ByHour",
  basePrice: 100_000,
  tieredBlockRate: 12_000,
  tieredBlockMinutes: 120,
  depositPercentage: 0.15,
  cafeName: "",
  address: "",
  phoneNumber: "",
  popularGamesList: "",
  defaultHoldDurationMinutes: 30,
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
    cafeName: p.cafeName ?? cafe.cafeName ?? "",
    address: p.address ?? cafe.address ?? "",
    phoneNumber: p.phoneNumber ?? cafe.phoneNumber ?? "",
    popularGamesList: p.popularGamesList ?? "",
    defaultHoldDurationMinutes:
      p.defaultHoldDurationMinutes ?? DEFAULT_FORM.defaultHoldDurationMinutes,
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
    a.depositPercentage === b.depositPercentage &&
    a.cafeName === b.cafeName &&
    a.address === b.address &&
    a.phoneNumber === b.phoneNumber &&
    a.popularGamesList === b.popularGamesList &&
    a.defaultHoldDurationMinutes === b.defaultHoldDurationMinutes
  );
}

/** Validate the editable form state. Returns an error map; empty map = OK. */
export function validateOperationalProfile(
  data: OperationalProfileFormState,
): FieldErrors {
  const out: FieldErrors = {};

  // Thông tin cơ bản
  if (!data.cafeName || data.cafeName.trim().length < 2) {
    out.cafeName = "Nhập tên quán từ 2 ký tự trở lên.";
  } else if (data.cafeName.length > 200) {
    out.cafeName = "Tên quán tối đa 200 ký tự.";
  }

  if (!data.address || data.address.trim().length < 5) {
    out.address = "Nhập địa chỉ quán từ 5 ký tự trở lên.";
  } else if (data.address.length > 500) {
    out.address = "Địa chỉ tối đa 500 ký tự.";
  }

  // SĐT Việt Nam: 10 chữ số, bắt đầu bằng 0
  const phone = data.phoneNumber.trim();
  if (!phone) {
    out.phoneNumber = "Nhập số điện thoại hotline.";
  } else if (!/^0\d{9}$/.test(phone)) {
    out.phoneNumber = "Số điện thoại phải gồm 10 chữ số và bắt đầu bằng 0.";
  }

  if (data.popularGamesList && data.popularGamesList.length > 500) {
    out.popularGamesList = "Danh sách game phổ biến tối đa 500 ký tự.";
  }

  // Hold duration: 5–240 phút (4 giờ)
  const hold = data.defaultHoldDurationMinutes;
  if (hold === undefined || !Number.isFinite(hold) || hold < 5) {
    out.defaultHoldDurationMinutes = "Thời gian giữ chỗ tối thiểu 5 phút.";
  } else if (hold > 240) {
    out.defaultHoldDurationMinutes = "Thời gian giữ chỗ tối đa 240 phút (4 giờ).";
  }

  const rooms = data.numberOfPrivateRooms;
  if (rooms === undefined || !Number.isFinite(rooms) || rooms < 0) {
    out.numberOfPrivateRooms = "Nhập số phòng riêng từ 0 đến 500.";
  } else if (rooms > 500) {
    out.numberOfPrivateRooms = "Tối đa 500 phòng riêng.";
  }

  // Validate workingHours (HH:MM, 00:00–23:59)
  const wh = data.workingHours;
  const TIME_RE = /^([01]\d|2[0-3]):[0-5]\d$/;
  const validateTime = (value: string | undefined, label: string): string | null => {
    if (!value || !TIME_RE.test(value)) return `${label} phải có dạng HH:MM (00:00–23:59).`;
    return null;
  };
  const whFields: Array<[keyof WorkingHours, string]> = [
    ["weekdayStart", "Giờ mở cửa ngày thường"],
    ["weekdayEnd", "Giờ đóng cửa ngày thường"],
    ["weekendStart", "Giờ mở cửa cuối tuần"],
    ["weekendEnd", "Giờ đóng cửa cuối tuần"],
  ];
  for (const [key, label] of whFields) {
    const err = validateTime(wh[key], label);
    if (err) {
      (out as Record<string, string>)[`workingHours.${key}`] = err;
    }
  }
  // Mở phải trước đóng (cùng loại ngày)
  const toMinutes = (s: string) => {
    const [h, m] = s.split(":").map(Number);
    return h * 60 + m;
  };
  const errStore = out as Record<string, string>;
  if (
    !errStore["workingHours.weekdayStart"] &&
    !errStore["workingHours.weekdayEnd"] &&
    wh.weekdayStart &&
    wh.weekdayEnd &&
    toMinutes(wh.weekdayStart) >= toMinutes(wh.weekdayEnd)
  ) {
    errStore["workingHours.weekdayEnd"] =
      "Giờ đóng phải sau giờ mở (ngày thường).";
  }
  if (
    !errStore["workingHours.weekendStart"] &&
    !errStore["workingHours.weekendEnd"] &&
    wh.weekendStart &&
    wh.weekendEnd &&
    toMinutes(wh.weekendStart) >= toMinutes(wh.weekendEnd)
  ) {
    errStore["workingHours.weekendEnd"] =
      "Giờ đóng phải sau giờ mở (cuối tuần).";
  }

  if (data.billingModel === "ByHour") {
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

  if (data.billingModel === "PerDrink") {
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
    ByHour: BillingCache;
    PerDrink: BillingCache;
  }>({
    ByHour: { ...EMPTY_BILLING_CACHE },
    PerDrink: { ...EMPTY_BILLING_CACHE },
  });

  // Re-hydrate form từ cafe aggregate mỗi khi cache thay đổi.
  // Tránh overwrite khi user đang chỉnh sửa — dùng savedSnapshot để so sánh.
  useEffect(() => {
    if (!cafe) return;
    const next = hydrateFromCafe(cafe);
    setFormData(next);
    setSavedSnapshot(next);
    setBillingCache({
      ByHour: {
        basePrice: next.basePrice,
        tieredBlockRate: next.tieredBlockRate,
        tieredBlockMinutes: next.tieredBlockMinutes,
        depositPercentage: undefined,
      },
      PerDrink: {
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
    (
      name: keyof OperationalProfileFormState,
      value: OperationalProfileFormState[typeof name],
    ) => {
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
          (value === "ByHour" || value === "PerDrink")
        ) {
          const previousModel: BillingModel =
            prev.billingModel === "ByHour" ? "ByHour" : "PerDrink";
          const nextModel = value;
          if (previousModel !== nextModel) {
            setBillingCache((cache) => ({
              ...cache,
              [previousModel]: {
                basePrice: prev.basePrice,
                tieredBlockRate: prev.tieredBlockRate,
                tieredBlockMinutes: prev.tieredBlockMinutes,
                depositPercentage: prev.depositPercentage,
              },
              [nextModel]: { ...cache[nextModel] },
            }));
            const restored = billingCache[nextModel];
            if (nextModel === "ByHour") {
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
      const name = target.name;
      if (
        target instanceof HTMLInputElement &&
        target.type === "checkbox"
      ) {
        setField("hasGameMaster", target.checked as never);
        return;
      }
      // WorkingHours sub-fields: e.g. name="workingHours.weekdayStart"
      if (name.startsWith("workingHours.")) {
        const key = name.slice("workingHours.".length) as keyof WorkingHours;
        const value = target.value;
        setFormData((prev) => ({
          ...prev,
          workingHours: { ...prev.workingHours, [key]: value },
        }));
        setErrors((prev) => {
          const errKey = `workingHours.${key}`;
          if (!prev[errKey]) return prev;
          const next = { ...prev };
          delete next[errKey];
          return next;
        });
        return;
      }
      // spaceImageUrls.N — set one slot to the input value
      if (name.startsWith("spaceImageUrls.")) {
        const idx = Number(name.slice("spaceImageUrls.".length));
        if (!Number.isFinite(idx)) return;
        const value = target.value;
        setFormData((prev) => {
          const next = [...prev.spaceImageUrls];
          next[idx] = value;
          return { ...prev, spaceImageUrls: next };
        });
        setErrors((prev) => {
          const errKey = `spaceImageUrls.${idx}`;
          if (!prev[errKey]) return prev;
          const next = { ...prev };
          delete next[errKey];
          return next;
        });
        return;
      }
      if (target instanceof HTMLInputElement && target.type === "number") {
        const raw = target.value.trim();
        setField(
          name as keyof OperationalProfileFormState,
          (raw === "" ? undefined : Number(raw)) as never,
        );
        return;
      }
      setField(
        name as keyof OperationalProfileFormState,
        target.value as never,
      );
    },
    [setField],
  );

  // ─── Image-list helpers ─────────────────────────────────────
  const [uploadingImages, setUploadingImages] = useState(0);
  const [imageUploadError, setImageUploadError] = useState<string | null>(null);

  const MAX_IMAGE_SIZE = 5 * 1024 * 1024; // 5 MB
  const IMAGE_MIME_TYPES = ["image/jpeg", "image/png", "image/webp"] as const;

  function validateImageFile(file: File): string | null {
    if (file.size === 0) return "File ảnh rỗng.";
    if (file.size > MAX_IMAGE_SIZE) {
      return "Ảnh vượt quá 5MB. Vui lòng chọn ảnh nhỏ hơn.";
    }
    if (
      !IMAGE_MIME_TYPES.includes(
        file.type as (typeof IMAGE_MIME_TYPES)[number],
      )
    ) {
      return "Định dạng ảnh phải là JPEG, PNG hoặc WEBP.";
    }
    return null;
  }

  /**
   * Upload 1 ảnh lên Cloudinary rồi push `secure_url` vào
   * `spaceImageUrls`. Trả về URL mới (hoặc null nếu thất bại).
   * Caller hiển thị spinner / error ở UI tương ứng.
   */
  const uploadImageFile = useCallback(
    async (file: File): Promise<string | null> => {
      const err = validateImageFile(file);
      if (err) {
        setImageUploadError(err);
        return null;
      }
      setImageUploadError(null);
      setUploadingImages((n) => n + 1);
      try {
        const uploaded = await uploadToCloudinary({ file });
        setFormData((prev) => ({
          ...prev,
          spaceImageUrls: [...prev.spaceImageUrls, uploaded.secure_url],
        }));
        return uploaded.secure_url;
      } catch (e) {
        const message =
          e instanceof Error ? e.message : "Upload ảnh thất bại.";
        setImageUploadError(message);
        return null;
      } finally {
        setUploadingImages((n) => Math.max(0, n - 1));
      }
    },
    [],
  );

  const removeImageUrl = useCallback((idx: number) => {
    setFormData((prev) => ({
      ...prev,
      spaceImageUrls: prev.spaceImageUrls.filter((_, i) => i !== idx),
    }));
  }, []);

  // ─── Reset to defaults ──────────────────────────────────────
  const resetToDefaults = useCallback(() => {
    setFormData({
      ...DEFAULT_FORM,
      workingHours: { ...DEFAULT_FORM.workingHours },
    });
    setBillingCache({
      ByHour: { ...EMPTY_BILLING_CACHE },
      PerDrink: { ...EMPTY_BILLING_CACHE },
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
          cafeName: formData.cafeName.trim(),
          address: formData.address.trim(),
          phoneNumber: formData.phoneNumber.trim(),
          workingHours: formData.workingHours,
          numberOfPrivateRooms: formData.numberOfPrivateRooms ?? 0,
          spaceImageUrls: formData.spaceImageUrls,
          hasGameMaster: formData.hasGameMaster,
          billingModel: formData.billingModel,
          basePrice: formData.basePrice,
          tieredBlockRate: formData.tieredBlockRate,
          tieredBlockMinutes: formData.tieredBlockMinutes,
          depositPercentage: formData.depositPercentage,
          popularGamesList: formData.popularGamesList.trim(),
          defaultHoldDurationMinutes: formData.defaultHoldDurationMinutes,
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
    uploadImageFile,
    uploadingImages,
    imageUploadError,
    clearImageUploadError: () => setImageUploadError(null),
    removeImageUrl,
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
