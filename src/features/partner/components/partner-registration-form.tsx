"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { useSubmitPartnerRegistration } from "../hooks/useSubmitPartnerRegistration";
import { useCurrentLocation } from "../hooks/useCurrentLocation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Field } from "@/components/ui/field";
import { Spinner } from "@/components/ui/spinner";
import {
  Dialog,
  DialogContent,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import {
  AlertDialog,
  AlertDialogContent,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogAction,
} from "@/components/ui/alert-dialog";
import {
  Crosshair,
  FileText,
  ImagePlus,
  Mail,
  MapPin,
  Maximize2,
  Phone,
  ShieldCheck,
  Store,
  X,
} from "lucide-react";
import Image from "next/image";

/**
 * Mỗi mục = 1 bento card với tone trung tính (đen-trắng-xám).
 * Đồng bộ với landing: rounded-3xl, border mảnh.
 */
const STEPS = [
  {
    num: "I",
    title: "Thông tin cá nhân & Liên hệ",
    desc: "Email đại diện và hotline",
    hint: "Đây là thông tin admin dùng để liên lạc với bạn trong quá trình duyệt đơn.",
    icon: Mail,
    card: "bg-white border-neutral-200",
    iconWrap: "bg-neutral-100 text-neutral-700 border-neutral-200",
    numBg: "bg-neutral-950",
  },
  {
    num: "II",
    title: "Thông tin & Địa chỉ doanh nghiệp",
    desc: "Tên quán, địa chỉ và tọa độ GPS",
    hint: "Tên quán hiển thị công khai và địa chỉ để khách hàng tìm đến.",
    icon: Store,
    card: "bg-neutral-50 border-neutral-200",
    iconWrap: "bg-white text-neutral-700 border-neutral-200",
    numBg: "bg-neutral-950",
  },
  {
    num: "III",
    title: "Giấy tờ pháp lý hợp tác",
    desc: "Mã số kinh doanh + ảnh giấy phép",
    hint: "Dùng để xác minh quán hoạt động hợp pháp. Mã số sẽ được che khi hiển thị công khai.",
    icon: ShieldCheck,
    card: "bg-white border-neutral-200",
    iconWrap: "bg-neutral-100 text-neutral-700 border-neutral-200",
    numBg: "bg-neutral-950",
  },
] as const;

// =================================================================
// Validation regex — dùng chung cho cả HTML5 `pattern` và JS validate
// để tránh mismatch UX (browser nói OK, server nói lỗi / ngược lại).
// =================================================================
const VIETNAM_PHONE_REGEX = /^(0)(3|5|7|8|9)[0-9]{8}$/;
const BUSINESS_LICENSE_REGEX = /^[a-zA-Z0-9-]+$/;
const CAFE_NAME_MAX = 100;
const ADDRESS_MAX = 500;
const LICENSE_MAX = 32;

export default function PartnerRegistrationForm() {
  const router = useRouter();
  const {
    formData,
    loading,
    uploadingFile,
    isPopupOpen,
    popupContent,
    shouldRedirect,
    setIsPopupOpen,
    handleChange,
    handleFileChange,
    clearLicenseFile,
    handleLocationCaptured,
    clearLocation,
    submitForm,
  } = useSubmitPartnerRegistration();

  const { loading: locating, error: locationError, fetchLocation } =
    useCurrentLocation();

  const handleFetchLocation = async () => {
    try {
      const coords = await fetchLocation();
      handleLocationCaptured(coords.latitude, coords.longitude);
    } catch {
      // Lỗi đã được set vào state locationError trong hook
    }
  };

  // ===============================================================
  // FIX A2: Tạo URL.createObjectURL() trong useMemo + revoke khi đổi
  // file / unmount để tránh memory leak.
  // ===============================================================
  const filePreviewUrl = useMemo(() => {
    const file = formData.businessLicenseFile;
    if (file && file instanceof File) return URL.createObjectURL(file);
    return null;
  }, [formData.businessLicenseFile]);

  useEffect(() => {
    return () => {
      if (filePreviewUrl) URL.revokeObjectURL(filePreviewUrl);
    };
  }, [filePreviewUrl]);

  const [isPreviewOpen, setIsPreviewOpen] = useState(false);
  const canPreviewImage =
    !!formData.businessLicenseFile &&
    formData.businessLicenseFile.type.startsWith("image/");

  // ===============================================================
  // FIX H3: Ref guard để chặn double-submit race condition khi user
  // click liên tục trước khi React re-render.
  // ===============================================================
  const isSubmittingRef = useRef(false);
  const guardedSubmit = async (e: React.FormEvent) => {
    if (isSubmittingRef.current) {
      e.preventDefault();
      return;
    }
    isSubmittingRef.current = true;
    try {
      await submitForm(e);
    } finally {
      // Release guard sau khi hook đã clear loading state.
      // Hook xử lý `loading` qua React state, nhưng ref cần reset ngay
      // để không block submission hợp lệ tiếp theo sau error.
      setTimeout(() => {
        isSubmittingRef.current = false;
      }, 0);
    }
  };

  const stepI = STEPS[0];
  const stepII = STEPS[1];
  const stepIII = STEPS[2];

  return (
    <>
      <main className="max-w-5xl mx-auto px-6 pt-8 pb-2">
        <header className="mb-6">
          <h1 className="text-3xl md:text-5xl font-bold tracking-tight leading-[1.05] text-neutral-950">
            Đăng ký đối tác Cafe.
          </h1>
          <p className="mt-3 text-neutral-600 text-sm md:text-base max-w-2xl leading-relaxed">
            Hoàn thiện thông tin bắt buộc để tham gia mạng lưới BoardVerse. Đơn
            đăng ký sẽ được gán trạng thái{" "}
            <strong className="text-neutral-900">Chờ duyệt</strong> sau khi gửi.
          </p>
        </header>
        <form onSubmit={guardedSubmit} className="space-y-5">
          {/* ─── MỤC I — BENTO CARD ─────────────────────────── */}
          <section className={`reveal rounded-3xl border ${stepI.card} p-6 md:p-8`}>
            <BentoSectionHeader
              step={stepI}
              rightSlot={
                <span className="hidden md:inline-flex text-[10px] font-semibold uppercase tracking-[0.18em] text-neutral-400">
                  Bắt buộc
                </span>
              }
            />
            <div className="mt-6 grid grid-cols-1 md:grid-cols-2 gap-4">
              <Field>
                <FieldLabel icon={Mail}>
                  <span>
                    Email người đại diện{" "}
                    <span className="text-red-600">*</span>
                  </span>
                </FieldLabel>
                <Input
                  type="email"
                  name="representativeEmail"
                  required
                  value={formData.representativeEmail}
                  onChange={handleChange("representativeEmail")}
                  placeholder="Ví dụ: hanphamviet@gmail.com"
                  className="w-full border-neutral-200 rounded-lg focus-visible:ring-2 focus-visible:ring-neutral-950 focus-visible:ring-offset-0 bg-white text-sm"
                />
              </Field>
              <Field>
                <FieldLabel icon={Phone}>
                  <span>
                    Số điện thoại hotline{" "}
                    <span className="text-red-600">*</span>
                  </span>
                </FieldLabel>
                <Input
                  type="text"
                  name="phoneNumber"
                  required
                  minLength={10}
                  maxLength={10}
                  pattern={VIETNAM_PHONE_REGEX.source.replace(/^\^|\$$/g, "")}
                  value={formData.phoneNumber}
                  onChange={handleChange("phoneNumber")}
                  placeholder="Ví dụ: 0854316662"
                  className="w-full border-neutral-200 rounded-lg focus-visible:ring-2 focus-visible:ring-neutral-950 focus-visible:ring-offset-0 bg-white text-sm"
                />
              </Field>
            </div>
          </section>

          {/* ─── MỤC II — BENTO CARD ────────────────────────── */}
          <section className={`reveal rounded-3xl border ${stepII.card} p-6 md:p-8`}>
            <BentoSectionHeader step={stepII} />
            <div className="mt-6 grid grid-cols-1 gap-4">
              <Field>
                <FieldLabel icon={Store}>
                  <span>
                    Tên quán cafe{" "}
                    <span className="text-red-600">*</span>
                  </span>
                </FieldLabel>
                <Input
                  type="text"
                  name="cafeName"
                  required
                  minLength={5}
                  maxLength={CAFE_NAME_MAX}
                  value={formData.cafeName}
                  onChange={handleChange("cafeName")}
                  placeholder="Ví dụ: Boardverse Premium Cafe"
                  className="w-full border-neutral-200 rounded-lg focus-visible:ring-2 focus-visible:ring-neutral-950 focus-visible:ring-offset-0 bg-white text-sm"
                />
                <p
                  className="mt-1 text-[10px] text-neutral-400 text-right tabular-nums"
                  aria-live="polite"
                >
                  {formData.cafeName.length}/{CAFE_NAME_MAX}
                </p>
              </Field>
              <Field>
                <FieldLabel icon={MapPin}>
                  <span>
                    Địa chỉ chi tiết của quán{" "}
                    <span className="text-red-600">*</span>
                  </span>
                </FieldLabel>
                <Input
                  type="text"
                  name="address"
                  required
                  minLength={10}
                  maxLength={ADDRESS_MAX}
                  value={formData.address}
                  onChange={handleChange("address")}
                  placeholder="Ví dụ: Số 123 Đường Nguyễn Trãi, Quận 5, TP. HCM"
                  className="w-full border-neutral-200 rounded-lg focus-visible:ring-2 focus-visible:ring-neutral-950 focus-visible:ring-offset-0 bg-white text-sm"
                />
              </Field>
            </div>

            {/* VỊ TRÍ HIỆN TẠI */}
            <div className="mt-4 border border-neutral-200 bg-white p-5 rounded-2xl space-y-3">
              <div className="flex items-center justify-between gap-3 flex-wrap">
                <div className="flex items-center gap-2">
                  <MapPin className="h-4 w-4 text-neutral-700" />
                  <span className="text-xs font-bold text-neutral-800 uppercase tracking-[0.12em]">
                    Vị trí hiện tại của quán{" "}
                    <span className="text-red-600">*</span>
                  </span>
                </div>
                <div className="flex items-center gap-2">
                  {formData.latitude != null && formData.longitude != null && (
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      // impeccable-disable-next-line gray-on-color: button text is neutral at rest, rose-700 on hover; the bg-rose-50 only renders alongside hover:text-rose-700.
                      className="shrink-0 text-neutral-500 hover:text-rose-700 hover:bg-rose-50"
                      onClick={clearLocation}
                    >
                      <X className="mr-1.5 h-3.5 w-3.5" />
                      Xóa tọa độ
                    </Button>
                  )}
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    className="shrink-0"
                    disabled={locating || loading}
                    onClick={handleFetchLocation}
                  >
                    {locating ? (
                      <Spinner className="mr-1.5 h-3.5 w-3.5" />
                    ) : (
                      <Crosshair className="mr-1.5 h-3.5 w-3.5" />
                    )}
                    {formData.latitude != null && formData.longitude != null
                      ? "Cập nhật lại"
                      : "Lấy vị trí hiện tại"}
                  </Button>
                </div>
              </div>

              {formData.latitude != null && formData.longitude != null ? (
                <div className="grid grid-cols-2 gap-3 text-xs">
                  <div className="rounded-lg border border-neutral-200 bg-neutral-50 px-3 py-2">
                    <p className="text-[10px] uppercase tracking-wider text-neutral-500 font-semibold">
                      Vĩ độ (Latitude)
                    </p>
                    <p className="font-mono text-sm text-neutral-900">
                      {formData.latitude.toFixed(6)}
                    </p>
                  </div>
                  <div className="rounded-lg border border-neutral-200 bg-neutral-50 px-3 py-2">
                    <p className="text-[10px] uppercase tracking-wider text-neutral-500 font-semibold">
                      Kinh độ (Longitude)
                    </p>
                    <p className="font-mono text-sm text-neutral-900">
                      {formData.longitude.toFixed(6)}
                    </p>
                  </div>
                </div>
              ) : (
                <p className="text-xs text-amber-700">
                  Chưa có tọa độ. Hãy bấm nút trên để trình duyệt lấy vị trí GPS
                  hiện tại của quán.
                </p>
              )}

              {locationError && (
                <p className="text-xs text-rose-600">{locationError}</p>
              )}
            </div>
          </section>

          {/* ─── MỤC III — BENTO CARD ───────────────────────── */}
          <section className={`reveal rounded-3xl border ${stepIII.card} p-6 md:p-8`}>
            <BentoSectionHeader step={stepIII} />
            <div className="mt-6 grid grid-cols-1 gap-4">
              <Field>
                <FieldLabel icon={FileText}>
                  <span>
                    Mã số giấy phép đăng ký kinh doanh{" "}
                    <span className="text-red-600">*</span>
                  </span>
                </FieldLabel>
                <Input
                  type="text"
                  name="businessLicense"
                  required
                  minLength={5}
                  maxLength={LICENSE_MAX}
                  pattern={BUSINESS_LICENSE_REGEX.source.replace(/^\^|\$$/g, "")}
                  value={formData.businessLicense}
                  onChange={handleChange("businessLicense")}
                  placeholder="Nhập mã số thuế hoặc số giấy phép kinh doanh"
                  className="w-full border-neutral-200 rounded-lg focus-visible:ring-2 focus-visible:ring-neutral-950 focus-visible:ring-offset-0 bg-white text-sm"
                />
              </Field>
              <Field>
                <FieldLabel icon={ImagePlus}>
                  <span>
                    Ảnh chụp / file PDF giấy phép kinh doanh{" "}
                    <span className="text-red-600">*</span>
                  </span>
                  <span className="ml-1 normal-case font-normal text-neutral-500">
                    (JPEG, PNG, WEBP, PDF — tối đa 5MB)
                  </span>
                </FieldLabel>
                <div className="flex items-start gap-4">
                  <label className="inline-flex items-center justify-center gap-2 px-4 py-2 border border-dashed border-neutral-300 rounded-lg text-neutral-700 text-xs font-semibold uppercase tracking-wider cursor-pointer hover:bg-white/80 transition-colors">
                    <ImagePlus className="h-4 w-4" />
                    {formData.businessLicenseFile
                      ? "Đổi ảnh khác"
                      : "Chọn ảnh giấy phép"}
                    <input
                      type="file"
                      name="businessLicenseFile"
                      accept="image/jpeg,image/png,image/webp,application/pdf"
                      required
                      onChange={handleFileChange}
                      className="hidden"
                    />
                  </label>

                  <div className="flex-1 min-h-[5rem]">
                    {filePreviewUrl ? (
                      <div className="flex items-center gap-3 rounded-lg border border-neutral-200 bg-neutral-50 px-3 py-2">
                        {canPreviewImage ? (
                          <button
                            type="button"
                            onClick={() => setIsPreviewOpen(true)}
                            className="relative h-14 w-14 shrink-0 rounded-md border border-neutral-200 overflow-hidden group focus:outline-none focus:ring-2 focus:ring-neutral-950 focus:ring-offset-1"
                            aria-label="Xem lại ảnh giấy phép"
                          >
                            <Image
                              src={filePreviewUrl}
                              alt="Preview giấy phép"
                              width={56}
                              height={56}
                              unoptimized
                              className="h-14 w-14 object-cover"
                            />
                            <span className="absolute inset-0 bg-black/0 group-hover:bg-black/40 transition-colors flex items-center justify-center">
                              <Maximize2 className="h-4 w-4 text-white opacity-0 group-hover:opacity-100 transition-opacity" />
                            </span>
                          </button>
                        ) : (
                          <div className="h-14 w-14 shrink-0 rounded-md border border-neutral-200 bg-white flex items-center justify-center text-[10px] font-bold text-neutral-500">
                            <FileText className="h-5 w-5" />
                          </div>
                        )}
                        <div className="flex-1 min-w-0">
                          <p className="text-xs font-semibold text-neutral-900 truncate">
                            {formData.businessLicenseFile?.name}
                          </p>
                          <p className="text-[10px] text-neutral-500 mt-0.5">
                            {(
                              (formData.businessLicenseFile?.size ?? 0) /
                              1024
                            ).toFixed(1)}{" "}
                            KB · {formData.businessLicenseFile?.type}
                          </p>
                          {canPreviewImage && (
                            <button
                              type="button"
                              onClick={() => setIsPreviewOpen(true)}
                              className="mt-1 text-[10px] font-semibold text-neutral-700 hover:text-neutral-950 uppercase tracking-wider underline-offset-2 hover:underline"
                            >
                              Xem lại toàn ảnh
                            </button>
                          )}
                        </div>
                        <button
                          type="button"
                          aria-label="Xóa ảnh"
                          className="text-neutral-400 hover:text-rose-600"
                          onClick={clearLicenseFile}
                        >
                          <X className="h-4 w-4" />
                        </button>
                      </div>
                    ) : (
                      <p className="text-helper">
                        Hỗ trợ JPEG, PNG, WEBP, PDF — tối đa 5MB.
                      </p>
                    )}
                  </div>
                </div>
              </Field>
            </div>
          </section>

          {/* ─── NÚT SUBMIT — Bento submit card ─────────────── */}
          <section className="reveal rounded-3xl border border-neutral-200 bg-white p-6 md:p-8 flex items-center justify-between gap-4 flex-wrap shadow-[0_1px_2px_rgba(0,0,0,0.04),0_4px_12px_rgba(0,0,0,0.04)]">
            <p className="text-[11px] text-neutral-500 max-w-md">
              Bằng việc gửi đơn, bạn đồng ý với{" "}
              <span className="underline underline-offset-2 text-neutral-950">
                điều khoản hợp tác
              </span>{" "}
              của BoardVerse.
            </p>
            <Button
              type="submit"
              disabled={loading || uploadingFile}
              className="h-11 px-6 bg-gradient-to-b from-[#2A2A2A] to-[#1A1A1A] text-white font-semibold text-sm rounded-lg border border-neutral-950 border-t-neutral-700 shadow-[0px_1px_2px_rgba(0,0,0,0.2),inset_0px_1px_0px_rgba(255,255,255,0.1)] hover:from-[#333333] hover:to-[#222222] active:from-[#1A1A1A] active:to-[#111111] disabled:from-neutral-200 disabled:to-neutral-200 disabled:text-neutral-400 disabled:border-neutral-200 disabled:shadow-none transition-all duration-150 inline-flex items-center justify-center"
            >
              {loading || uploadingFile ? (
                <span className="flex items-center gap-2">
                  <span className="w-4 h-4 border-2 border-white/20 border-t-white rounded-full animate-spin" />
                  {uploadingFile
                    ? "Đang upload ảnh giấy phép..."
                    : "Đang xử lý dữ liệu..."}
                </span>
              ) : (
                "Gửi đơn đăng ký hợp tác"
              )}
            </Button>
          </section>
        </form>
      </main>

      {/* DIALOG XEM LẠI TOÀN ẢNH GIẤY PHÉP */}
      <Dialog open={isPreviewOpen} onOpenChange={setIsPreviewOpen}>
        <DialogContent className="bg-white border border-neutral-100 rounded-xl p-4 sm:max-w-3xl max-h-[90vh]">
          <DialogTitle className="text-sm font-bold tracking-tight text-neutral-950">
            Xem lại ảnh giấy phép kinh doanh
          </DialogTitle>
          <DialogDescription className="text-helper">
            Vui lòng kiểm tra kỹ nội dung trước khi gửi đơn lên hệ thống.
          </DialogDescription>
          {filePreviewUrl && canPreviewImage && (
            <div className="relative w-full max-h-[70vh] overflow-auto rounded-lg border border-neutral-200 bg-neutral-50">
              <Image
                src={filePreviewUrl}
                alt="Preview toàn ảnh giấy phép"
                width={1200}
                height={900}
                unoptimized
                className="w-full h-auto object-contain"
              />
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* POPUP THÔNG BÁO KẾT QUẢ */}
      <AlertDialog open={isPopupOpen} onOpenChange={setIsPopupOpen}>
        <AlertDialogContent className="bg-white border border-neutral-100 rounded-xl p-6 shadow-[0px_8px_32px_rgba(0,0,0,0.08)] max-w-sm mx-auto text-neutral-900">
          <AlertDialogHeader className="space-y-2">
            <AlertDialogTitle
              className={`text-base font-bold tracking-tight flex items-center gap-2 ${
                popupContent.status === "success"
                  ? "text-neutral-950"
                  : "text-red-600"
              }`}
            >
              <span className="text-lg">
                {popupContent.status === "success" ? "✓" : "⚠️"}
              </span>
              {popupContent.title}
            </AlertDialogTitle>
            <AlertDialogDescription className="text-helper font-medium">
              {popupContent.desc}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter className="pt-4">
            <AlertDialogAction
              onClick={() => {
                setIsPopupOpen(false);
                if (shouldRedirect) router.push("/login");
              }}
              className="bg-neutral-950 text-white hover:bg-neutral-800 text-xs font-bold uppercase tracking-wider rounded-lg px-4 py-2.5 w-full sm:w-auto transition-colors"
            >
              Xác Nhận
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}

/* ──────────────────────────────────────────────────────────────── */
/* Sub-component: Bento section header                              */
/* ──────────────────────────────────────────────────────────────── */
function BentoSectionHeader({
  step,
  rightSlot,
}: {
  step: (typeof STEPS)[number];
  rightSlot?: React.ReactNode;
}) {
  const Icon = step.icon;
  return (
    <div className="flex items-start gap-3">
      <span
        className={`shrink-0 h-9 w-9 rounded-xl border grid place-items-center ${step.iconWrap}`}
      >
        <Icon className="h-4 w-4" />
      </span>
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 flex-wrap">
          <span
            className={`shrink-0 h-6 px-2 rounded-md text-white text-[10px] font-bold grid place-items-center ${step.numBg}`}
          >
            MỤC {step.num}
          </span>
          <h3 className="text-base md:text-lg font-bold text-neutral-950 tracking-tight">
            {step.title}
          </h3>
        </div>
        <p className="text-helper mt-1.5">
          {step.hint}
        </p>
      </div>
      {rightSlot && <div className="shrink-0">{rightSlot}</div>}
    </div>
  );
}

/* ──────────────────────────────────────────────────────────────── */
/* Sub-component: Field label với icon                            */
/* ──────────────────────────────────────────────────────────────── */
function FieldLabel({
  icon: Icon,
  children,
}: {
  icon: React.ComponentType<{ className?: string }>;
  children: React.ReactNode;
}) {
  return (
    <label className="flex items-center gap-1.5 text-xs font-semibold text-neutral-700 uppercase tracking-wider mb-1.5">
      <Icon className="h-3.5 w-3.5 text-neutral-400" />
      <span>{children}</span>
    </label>
  );
}