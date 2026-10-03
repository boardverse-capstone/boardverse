"use client";

import {
  AlertTriangle,
  ChevronUp,
  ImagePlus,
  Loader2,
  Pencil,
  RefreshCw,
  RotateCcw,
  Save,
  X,
} from "lucide-react";
import { useOperationalProfile } from "../hooks/useOperationalProfile";
import type { OperationalProfileFormState as OpFormState } from "../hooks/useOperationalProfile";
import type { BillingModel } from "../types/partner.interface";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card } from "@/components/ui/card";
import {
  Field,
  FieldDescription,
  FieldLabel,
} from "@/components/ui/field";
import {
  RadioGroup,
  RadioGroupItem,
} from "@/components/ui/radio-group";
import {
  AlertDialog,
  AlertDialogContent,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogAction,
  AlertDialogCancel,
} from "@/components/ui/alert-dialog";
import { cn } from "@/lib/utils";

/** Compact class names used for sub-section labels and section headers.
 *  See globals.css @utility text-sub-label / text-section-header. */
const SUB_LABEL_CLASS = "text-sub-label";
const SECTION_HEADER_CLASS = "text-section-header";

/** Standard numeric input shell, used by every edit field in this form. */
const INPUT_SHELL =
  "w-full h-11 text-base border-neutral-200 rounded-lg focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-0 focus-visible:border-ring bg-white";

/** Wraps a sub-section's title row. */
function SectionHeaderRow({
  id,
  title,
}: {
  id: string;
  title: string;
}) {
  return (
    <div className="pb-1 border-b border-neutral-100">
      <h2 id={id} className={SECTION_HEADER_CLASS}>
        {title}
      </h2>
    </div>
  );
}

/** Inline error summary, role="alert", sits above the form on validation failure. */
function ErrorSummary({ errors }: { errors: Record<string, string> }) {
  const entries = Object.entries(errors);
  if (entries.length === 0) return null;
  return (
    <div
      role="alert"
      aria-live="assertive"
      className="flex items-start gap-2 text-sm text-destructive px-3 py-2.5 rounded-lg border border-destructive/30 bg-destructive/5"
    >
      <AlertTriangle className="h-4 w-4 mt-0.5 shrink-0" aria-hidden />
      <div className="leading-snug">
        <p className="font-medium">
          {entries.length === 1
            ? "1 trường cần chỉnh:"
            : `${entries.length} trường cần chỉnh:`}
        </p>
        <p className="text-xs text-destructive/90 mt-0.5">
          {entries.map(([, msg]) => msg).join(" · ")}
        </p>
      </div>
    </div>
  );
}

/** Compact read-only snapshot of the editable fields, shown when the
 *  panel is collapsed. Inline kế bên nút "Mở rộng" để manager scan
 *  nhanh giá trị hiện tại trước khi quyết định vào edit. */
function CollapsedSnapshot({
  formData,
  cafe,
}: {
  formData: OpFormState;
  cafe: ReturnType<typeof useOperationalProfile>["cafe"];
}) {
  const rooms = formData.numberOfPrivateRooms;
  const isByHour = formData.billingModel === "ByHour";
  const base = formData.basePrice;
  const block = formData.tieredBlockRate;
  const deposit = formData.depositPercentage;
  const hold = formData.defaultHoldDurationMinutes;

  const fmtVnd = (v: number | undefined) =>
    v === undefined ? "—" : new Intl.NumberFormat("vi-VN").format(v) + "đ";

  // 1. Cách tính phí
  const billingLabel = isByHour ? "Tính theo giờ" : "Phí vào cửa";

  // 2. 3 (hoặc 1) field giá tuỳ billing model
  const priceParts: string[] = [];
  if (isByHour) {
    priceParts.push(`giờ đầu ${fmtVnd(base)}`);
    const hours = formData.tieredBlockHours;
    if (hours !== undefined && block !== undefined) {
      // Hiển thị giờ đẹp: 0.25 = 15 phút, 0.5 = 30 phút, 1 = 1 giờ.
      // Dùng Number.isInteger để giữ nguyên (vd 1, 2), thập phân 0.25.
      const hoursLabel = Number.isInteger(hours)
        ? `${hours}`
        : hours.toFixed(2).replace(/0+$/, "").replace(/\.$/, "");
      const minuteLabel = Math.round(hours * 60);
      priceParts.push(
        `khung ${hoursLabel} giờ (${minuteLabel} phút) · ${fmtVnd(block)}`,
      );
    } else if (hours !== undefined) {
      const hoursLabel = Number.isInteger(hours)
        ? `${hours}`
        : hours.toFixed(2).replace(/0+$/, "").replace(/\.$/, "");
      priceParts.push(`mỗi ${hoursLabel} giờ`);
    }
  } else if (deposit !== undefined) {
    priceParts.push(`đặt cọc ${deposit}%`);
  }

  const phone = cafe?.phoneNumber ?? formData.phoneNumber;
  const imageCount = formData.spaceImageUrls.length;
  const gmLabel = formData.hasGameMaster ? "Có Game Master" : "Không có GM";

  return (
    <div className="space-y-1.5 text-helper leading-snug">
      <p>
        <strong className="font-semibold text-neutral-800">
          {cafe?.cafeName || formData.cafeName || "—"}
        </strong>
        {phone ? (
          <span className="text-neutral-500"> · {phone}</span>
        ) : null}
      </p>
      <p>
        <span className="font-medium text-neutral-700">{billingLabel}</span>
        {priceParts.length > 0 ? (
          <span className="text-neutral-500"> · {priceParts.join(" · ")}</span>
        ) : null}
      </p>
      <p className="text-neutral-500">
        {rooms === undefined ? "—" : rooms} phòng riêng ·{" "}
        {imageCount} ảnh không gian · {gmLabel}
        {hold !== undefined ? ` · giữ chỗ ${hold} phút` : ""}
      </p>
    </div>
  );
}

/**
 * PartnerOperationalProfileForm — form PANEL (right column) của trang
 * `/manager/operational-profile`. Trang được compose bởi
 * OperationalProfileShell với layout 2-cột:
 *   - Left: StatusHeader + CafeSummary (read-only)
 *   - Right: form này (editable)
 *
 * Form chỉ giữ những trường manager thực sự chỉnh được:
 *   - Số phòng riêng
 *   - Billing model + pricing numbers
 * Submit luôn là "Lưu hồ sơ vận hành"; status transitions (Activate /
 * Tạm dừng / Ngừng KD / Mở lại) sống trong StatusHeader.
 *
 * Prop `expanded` cho phép shell điều khiển trạng thái collapse/expand:
 *   - `true` (mặc định): hiển thị đầy đủ form. Dùng cho mobile Sheet và
 *     trường hợp manager đã nhấn "Chỉnh sửa".
 *   - `false`: hiển thị compact card (CollapsedSnapshot) + nút
 *     "Chỉnh sửa" để expand.
 */
export interface PartnerOperationalProfileFormProps {
  expanded?: boolean;
  onExpandedChange?: (expanded: boolean) => void;
}

export default function PartnerOperationalProfileForm({
  expanded = true,
  onExpandedChange,
}: PartnerOperationalProfileFormProps = {}) {
  const {
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
    resetToDefaults,
    refetch,
    uploadImageFile,
    uploadingImages,
    imageUploadError,
    removeImageUrl,
    openImage,
    cafe,
  } = useOperationalProfile();

  const isByHour = formData.billingModel === "ByHour";
  const isPerDrink = formData.billingModel === "PerDrink";

  /**
   * Switching billing models stashes the outgoing model's values so the
   * user can swap back without losing their work — `switchBilling` lives
   * in the hook so the per-model cache survives across renders.
   */
  const switchBilling = (value: string) => {
    if (value !== "ByHour" && value !== "PerDrink") return;
    setField("billingModel", value);
  };

  const submitDisabled = submitting || (hydrating && !hydrated);
  const submitHelper = hydrating
    ? "Đang tải cấu hình…"
    : submitting
      ? "Đang lưu…"
      : "Lưu hồ sơ vận hành";

  // ─── Collapsed view ────────────────────────────────────────
  // Manager rarely edits after submit, so by default the right panel
  // collapses into a 1-line snapshot + a single "Chỉnh sửa" CTA.
  if (!expanded) {
    return (
      <Card className="bg-white border border-neutral-200 text-neutral-900 p-5 md:p-6 shadow-[0_1px_2px_rgba(0,0,0,0.04),0_4px_12px_rgba(0,0,0,0.04)] rounded-2xl">
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0 space-y-1">
            <h2 className="text-section-header">Chỉnh sửa hồ sơ vận hành</h2>
            {hydrating ? (
              <div
                role="status"
                aria-live="polite"
                className="flex items-center gap-2 text-helper"
              >
                <Loader2 className="h-3.5 w-3.5 animate-spin" aria-hidden />
                Đang tải cấu hình…
              </div>
            ) : hydratedError ? (
              <p className="text-xs text-destructive leading-snug">
                {hydratedError}
              </p>
            ) : (
              <CollapsedSnapshot formData={formData} cafe={cafe} />
            )}
          </div>
          <Button
            type="button"
            variant="default"
            size="sm"
            disabled={!hydrated || hydrating}
            onClick={() => onExpandedChange?.(true)}
            className="h-9 px-3 text-xs font-medium rounded-lg shrink-0"
          >
            <Pencil className="h-3.5 w-3.5 mr-1.5" aria-hidden />
            Chỉnh sửa
          </Button>
        </div>
      </Card>
    );
  }

  return (
    <Card className="bg-white border border-neutral-200 text-neutral-900 p-5 md:p-6 shadow-[0_1px_2px_rgba(0,0,0,0.04),0_4px_12px_rgba(0,0,0,0.04)] rounded-2xl space-y-5">
      {/* Panel header — title + saved-at timestamp. */}
      <header className="flex items-baseline justify-between gap-3 pb-1 border-b border-neutral-100">
        <div>
          <h1 className="text-section-header">Chỉnh sửa hồ sơ vận hành</h1>
          <p className="text-helper mt-1">
            Chỉ những trường bạn có thể chỉnh trực tiếp. Giờ mở/đóng, ảnh
            không gian, Game Master xem ở cột trái.
          </p>
        </div>
        <div className="flex items-center gap-3 shrink-0">
          {savedAt && !hydrating && (
            <span
              role="status"
              aria-live="polite"
              className="text-[11px] font-medium text-neutral-600 tabular-nums"
            >
              Đã lưu lúc {savedAt}
            </span>
          )}
          {onExpandedChange && (
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={() => onExpandedChange?.(false)}
              className="h-8 px-2 text-xs font-medium text-neutral-600 hover:text-neutral-900"
              aria-label="Thu gọn form"
            >
              <ChevronUp className="h-3.5 w-3.5 mr-1" aria-hidden />
              Thu gọn
            </Button>
          )}
        </div>
      </header>

      {/* Loading / error hydration state. */}
      {hydrating && (
        <div
          role="status"
          aria-live="polite"
          className="flex items-center gap-2 text-helper px-3 py-2 rounded-lg border border-neutral-200 bg-neutral-50"
        >
          <Loader2 className="h-3.5 w-3.5 animate-spin" aria-hidden />
          Đang tải cấu hình đã lưu…
        </div>
      )}

      {hydratedError && !hydrating && (
        <div
          role="alert"
          className="flex flex-wrap items-start gap-3 text-xs text-destructive px-3 py-2 rounded-lg border border-destructive/30 bg-destructive/5"
        >
          <div className="flex items-start gap-2 flex-1 min-w-0">
            <AlertTriangle className="h-3.5 w-3.5 mt-0.5 shrink-0" aria-hidden />
            <span className="leading-snug">{hydratedError}</span>
          </div>
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={() => {
              // Hook sở hữu query `manager-cafe-me`; invalidate là đủ để
              // re-hydrate form mà không cần reload cả trang.
              refetch();
            }}
            className="h-7 text-xs"
          >
            <RefreshCw className="h-3 w-3 mr-1" aria-hidden />
            Thử lại
          </Button>
        </div>
      )}

      <ErrorSummary errors={errors as Record<string, string>} />

      <form onSubmit={handleSubmit} className="space-y-5" noValidate>
        {/* ─── Thông tin cơ bản (editable) ─── */}
        <section
          aria-labelledby="ops-section-basic"
          className="space-y-3"
        >
          <SectionHeaderRow
            id="ops-section-basic"
            title="Thông tin cơ bản"
          />
          {(() => {
            const errMap = errors as Record<string, string>;
            return (
              <>
                <Field>
                  <FieldLabel
                    htmlFor="cafeName"
                    className={SUB_LABEL_CLASS}
                  >
                    Tên quán
                  </FieldLabel>
                  <Input
                    id="cafeName"
                    name="cafeName"
                    type="text"
                    maxLength={200}
                    value={formData.cafeName}
                    onChange={handleChange}
                    placeholder="BoardVerse Boardgame Cafe"
                    aria-invalid={!!errMap.cafeName}
                    aria-describedby={
                      errMap.cafeName ? "ops-err-name" : undefined
                    }
                    className={INPUT_SHELL}
                  />
                  {errMap.cafeName ? (
                    <FieldDescription
                      id="ops-err-name"
                      className="text-xs text-destructive leading-snug"
                    >
                      {errMap.cafeName}
                    </FieldDescription>
                  ) : (
                    <FieldDescription className="text-helper">
                      Tên hiển thị trên Boardverse và các bản đồ.
                    </FieldDescription>
                  )}
                </Field>

                <Field>
                  <FieldLabel
                    htmlFor="address"
                    className={SUB_LABEL_CLASS}
                  >
                    Địa chỉ
                  </FieldLabel>
                  <Input
                    id="address"
                    name="address"
                    type="text"
                    maxLength={500}
                    value={formData.address}
                    onChange={handleChange}
                    placeholder="Số nhà, đường, phường, quận, thành phố"
                    aria-invalid={!!errMap.address}
                    aria-describedby={
                      errMap.address ? "ops-err-addr" : undefined
                    }
                    className={INPUT_SHELL}
                  />
                  {errMap.address ? (
                    <FieldDescription
                      id="ops-err-addr"
                      className="text-xs text-destructive leading-snug"
                    >
                      {errMap.address}
                    </FieldDescription>
                  ) : null}
                </Field>

                <Field>
                  <FieldLabel
                    htmlFor="phoneNumber"
                    className={SUB_LABEL_CLASS}
                  >
                    Số điện thoại hotline
                  </FieldLabel>
                  <Input
                    id="phoneNumber"
                    name="phoneNumber"
                    type="tel"
                    inputMode="numeric"
                    maxLength={10}
                    value={formData.phoneNumber}
                    onChange={handleChange}
                    placeholder="0854315557"
                    aria-invalid={!!errMap.phoneNumber}
                    aria-describedby={
                      errMap.phoneNumber ? "ops-err-phone" : undefined
                    }
                    className={cn(INPUT_SHELL, "tabular-nums")}
                  />
                  {errMap.phoneNumber ? (
                    <FieldDescription
                      id="ops-err-phone"
                      className="text-xs text-destructive leading-snug"
                    >
                      {errMap.phoneNumber}
                    </FieldDescription>
                  ) : (
                    <FieldDescription className="text-helper">
                      Khách dùng số này để liên hệ khi cần.
                    </FieldDescription>
                  )}
                </Field>

                {/* Read-only summary từ đơn đăng ký */}
                {(cafe?.numberOfTables !== undefined ||
                  cafe?.operationalProfile?.numberOfGamesOwned !== undefined ||
                  cafe?.operationalProfile?.applicationStatus) && (
                  <div className="rounded-lg border border-neutral-100 bg-neutral-50/40 p-3 grid grid-cols-1 sm:grid-cols-3 gap-3">
                    {cafe?.operationalProfile?.applicationStatus && (
                      <div className="space-y-0.5">
                        <p className="text-[10px] font-bold uppercase tracking-wider text-neutral-500">
                          Trạng thái đơn
                        </p>
                        <p className="text-sm font-semibold text-neutral-900">
                          {cafe.operationalProfile.applicationStatus}
                        </p>
                      </div>
                    )}
                    {cafe?.numberOfTables !== undefined && (
                      <div className="space-y-0.5">
                        <p className="text-[10px] font-bold uppercase tracking-wider text-neutral-500">
                          Số bàn đăng ký
                        </p>
                        <p className="text-sm font-semibold tabular-nums text-neutral-900">
                          {cafe.numberOfTables.toLocaleString("vi-VN")}
                        </p>
                      </div>
                    )}
                    {cafe?.operationalProfile?.numberOfGamesOwned !==
                      undefined && (
                      <div className="space-y-0.5">
                        <p className="text-[10px] font-bold uppercase tracking-wider text-neutral-500">
                          Số game đang có
                        </p>
                        <p className="text-sm font-semibold tabular-nums text-neutral-900">
                          {cafe.operationalProfile.numberOfGamesOwned.toLocaleString(
                            "vi-VN",
                          )}
                        </p>
                      </div>
                    )}
                  </div>
                )}
              </>
            );
          })()}
        </section>

        {/* ─── Số phòng riêng (editable) ─── */}
        <section
          aria-labelledby="ops-section-rooms"
          className="space-y-3"
        >
          <SectionHeaderRow
            id="ops-section-rooms"
            title="Không gian"
          />
          <Field>
            <FieldLabel
              htmlFor="numberOfPrivateRooms"
              className={SUB_LABEL_CLASS}
            >
              Số phòng riêng
            </FieldLabel>
            <Input
              id="numberOfPrivateRooms"
              type="number"
              name="numberOfPrivateRooms"
              min={0}
              max={500}
              step={1}
              inputMode="numeric"
              value={formData.numberOfPrivateRooms ?? ""}
              onChange={handleChange}
              aria-invalid={!!errors.numberOfPrivateRooms}
              aria-describedby={
                errors.numberOfPrivateRooms ? "ops-err-rooms" : undefined
              }
              className={INPUT_SHELL}
            />
            {errors.numberOfPrivateRooms ? (
              <FieldDescription
                id="ops-err-rooms"
                className="text-xs text-destructive leading-snug"
              >
                {errors.numberOfPrivateRooms}
              </FieldDescription>
            ) : (
              <FieldDescription className="text-helper">
                Phòng kín cho nhóm khách đặt riêng; không tính vào khu vực
                chung.
              </FieldDescription>
            )}
          </Field>
        </section>

        {/* ─── Giờ mở cửa (editable) ─── */}
        <section
          aria-labelledby="ops-section-hours"
          className="space-y-3"
        >
          <SectionHeaderRow
            id="ops-section-hours"
            title="Giờ mở cửa"
          />
          {(() => {
            const errMap = errors as Record<string, string>;
            return (
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <Field>
              <FieldLabel
                htmlFor="weekdayStart"
                className={SUB_LABEL_CLASS}
              >
                Ngày thường — mở cửa
              </FieldLabel>
              <Input
                id="weekdayStart"
                type="time"
                name="workingHours.weekdayStart"
                value={formData.workingHours.weekdayStart}
                onChange={handleChange}
                aria-invalid={!!errMap["workingHours.weekdayStart"]}
                aria-describedby={
                  errMap["workingHours.weekdayStart"]
                    ? "ops-err-wh-ws"
                    : undefined
                }
                className={INPUT_SHELL}
              />
              {errMap["workingHours.weekdayStart"] ? (
                <FieldDescription
                  id="ops-err-wh-ws"
                  className="text-xs text-destructive leading-snug"
                >
                  {errMap["workingHours.weekdayStart"]}
                </FieldDescription>
              ) : null}
            </Field>
            <Field>
              <FieldLabel
                htmlFor="weekdayEnd"
                className={SUB_LABEL_CLASS}
              >
                Ngày thường — đóng cửa
              </FieldLabel>
              <Input
                id="weekdayEnd"
                type="time"
                name="workingHours.weekdayEnd"
                value={formData.workingHours.weekdayEnd}
                onChange={handleChange}
                aria-invalid={!!errMap["workingHours.weekdayEnd"]}
                aria-describedby={
                  errMap["workingHours.weekdayEnd"]
                    ? "ops-err-wh-we"
                    : undefined
                }
                className={INPUT_SHELL}
              />
              {errMap["workingHours.weekdayEnd"] ? (
                <FieldDescription
                  id="ops-err-wh-we"
                  className="text-xs text-destructive leading-snug"
                >
                  {errMap["workingHours.weekdayEnd"]}
                </FieldDescription>
              ) : null}
            </Field>
            <Field>
              <FieldLabel
                htmlFor="weekendStart"
                className={SUB_LABEL_CLASS}
              >
                Cuối tuần — mở cửa
              </FieldLabel>
              <Input
                id="weekendStart"
                type="time"
                name="workingHours.weekendStart"
                value={formData.workingHours.weekendStart}
                onChange={handleChange}
                aria-invalid={!!errMap["workingHours.weekendStart"]}
                aria-describedby={
                  errMap["workingHours.weekendStart"]
                    ? "ops-err-wh-xs"
                    : undefined
                }
                className={INPUT_SHELL}
              />
              {errMap["workingHours.weekendStart"] ? (
                <FieldDescription
                  id="ops-err-wh-xs"
                  className="text-xs text-destructive leading-snug"
                >
                  {errMap["workingHours.weekendStart"]}
                </FieldDescription>
              ) : null}
            </Field>
            <Field>
              <FieldLabel
                htmlFor="weekendEnd"
                className={SUB_LABEL_CLASS}
              >
                Cuối tuần — đóng cửa
              </FieldLabel>
              <Input
                id="weekendEnd"
                type="time"
                name="workingHours.weekendEnd"
                value={formData.workingHours.weekendEnd}
                onChange={handleChange}
                aria-invalid={!!errMap["workingHours.weekendEnd"]}
                aria-describedby={
                  errMap["workingHours.weekendEnd"]
                    ? "ops-err-wh-xe"
                    : undefined
                }
                className={INPUT_SHELL}
              />
              {errMap["workingHours.weekendEnd"] ? (
                <FieldDescription
                  id="ops-err-wh-xe"
                  className="text-xs text-destructive leading-snug"
                >
                  {errMap["workingHours.weekendEnd"]}
                </FieldDescription>
              ) : null}
            </Field>
          </div>
            );
          })()}
          <FieldDescription className="text-helper">
            Định dạng HH:MM (00:00 – 23:59). Giờ mở phải trước giờ đóng.
          </FieldDescription>
        </section>

        {/* ─── Ảnh không gian (upload) ─── */}
        <section
          aria-labelledby="ops-section-images"
          className="space-y-3"
        >
          <SectionHeaderRow
            id="ops-section-images"
            title="Ảnh không gian"
          />
          <p className="text-helper leading-snug">
            Tải lên các ảnh chụp không gian quán (bàn ghế, khu vực chơi, phòng
            riêng). Ảnh giúp khách hình dung trước khi đặt chỗ.
          </p>
          {(() => {
            const errMap = errors as Record<string, string>;
            const imgs = formData.spaceImageUrls;
            return (
              <>
                {/* Grid thumbnail các ảnh đã upload */}
                {imgs.length > 0 ? (
                  <div
                    className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3"
                    role="list"
                    aria-label="Ảnh không gian đã chọn"
                  >
                    {imgs.map((url, idx) => {
                      const errKey = `spaceImageUrls.${idx}`;
                      const slotErr = errMap[errKey];
                      return (
                        <div
                          key={`img-${idx}-${url}`}
                          role="listitem"
                          className="relative group rounded-xl overflow-hidden border border-neutral-200 bg-neutral-50 aspect-[4/3]"
                        >
                          {/* eslint-disable-next-line @next/next/no-img-element */}
                          <img
                            src={url}
                            alt={`Ảnh không gian ${idx + 1}`}
                            className="w-full h-full object-cover"
                            loading="lazy"
                          />
                          <button
                            type="button"
                            onClick={() => openImage(idx)}
                            aria-label={`Phóng to ảnh ${idx + 1}`}
                            className="absolute inset-x-0 top-0 h-3/4 bg-black/0 hover:bg-black/20 transition-colors"
                          />
                          <div className="absolute bottom-0 inset-x-0 flex items-center justify-between px-2 py-1.5 bg-gradient-to-t from-black/70 to-transparent text-white text-[10px] font-medium">
                            <span className="truncate">
                              Ảnh {idx + 1}
                            </span>
                            <Button
                              type="button"
                              variant="ghost"
                              size="icon"
                              onClick={() => removeImageUrl(idx)}
                              aria-label={`Xóa ảnh ${idx + 1}`}
                              className="h-6 w-6 text-white hover:text-destructive hover:bg-white/20"
                            >
                              <X className="h-3.5 w-3.5" aria-hidden />
                            </Button>
                          </div>
                          {slotErr ? (
                            <p className="absolute top-1 left-1 right-1 text-[10px] text-destructive bg-white/90 rounded px-1.5 py-0.5 leading-snug">
                              {slotErr}
                            </p>
                          ) : null}
                        </div>
                      );
                    })}
                  </div>
                ) : null}

                {/* Nút upload + loading indicator */}
                <div className="flex flex-wrap items-center gap-2">
                  <label
                    className={cn(
                      "inline-flex items-center justify-center gap-2 px-4 py-2 border border-dashed border-neutral-300 rounded-lg text-neutral-700 text-xs font-semibold uppercase tracking-wider cursor-pointer hover:bg-white/80 transition-colors",
                      uploadingImages > 0
                        ? "pointer-events-none opacity-60"
                        : "",
                    )}
                  >
                    {uploadingImages > 0 ? (
                      <Loader2 className="h-4 w-4 animate-spin" />
                    ) : (
                      <ImagePlus className="h-4 w-4" />
                    )}
                    {uploadingImages > 0
                      ? `Đang tải lên…`
                      : imgs.length > 0
                        ? "Thêm ảnh khác"
                        : "Chọn ảnh không gian"}
                    <input
                      type="file"
                      accept="image/jpeg,image/png,image/webp"
                      multiple
                      onChange={async (e) => {
                        const files = Array.from(e.target.files ?? []);
                        for (const file of files) {
                          await uploadImageFile(file);
                        }
                        // Reset input để có thể chọn lại cùng file
                        e.target.value = "";
                      }}
                      disabled={uploadingImages > 0}
                      className="hidden"
                      aria-label="Tải ảnh không gian lên"
                    />
                  </label>
                  <span className="text-[10px] text-neutral-500">
                    JPEG, PNG, WEBP — tối đa 5MB mỗi ảnh
                  </span>
                </div>
                {imageUploadError ? (
                  <p
                    role="alert"
                    className="text-xs text-destructive leading-snug"
                  >
                    {imageUploadError}
                  </p>
                ) : null}
              </>
            );
          })()}
        </section>

        {/* ─── Dịch vụ (editable) ─── */}
        <section
          aria-labelledby="ops-section-services"
          className="space-y-3"
        >
          <SectionHeaderRow
            id="ops-section-services"
            title="Dịch vụ"
          />
          <label
            htmlFor="hasGameMaster"
            className={cn(
              "flex items-start gap-3 p-3 rounded-lg border cursor-pointer transition-colors",
              formData.hasGameMaster
                ? "border-primary bg-primary/5"
                : "border-neutral-200 bg-white hover:border-neutral-400",
            )}
          >
            <input
              id="hasGameMaster"
              type="checkbox"
              name="hasGameMaster"
              checked={formData.hasGameMaster}
              onChange={handleChange}
              className="mt-1 h-4 w-4 rounded border-neutral-300 text-primary focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-0"
            />
            <div className="flex flex-col gap-0.5">
              <span className="text-sm font-medium leading-snug text-neutral-900">
                Có Game Master hỗ trợ khách
              </span>
              <span className="text-helper">
                Game Master hướng dẫn luật chơi, sắp xếp bàn, hỗ trợ khách
                trong suốt buổi chơi.
              </span>
            </div>
          </label>
        </section>

        {/* ─── Hoạt động (editable) ─── */}
        <section
          aria-labelledby="ops-section-ops"
          className="space-y-3"
        >
          <SectionHeaderRow
            id="ops-section-ops"
            title="Hoạt động"
          />
          {(() => {
            const errMap = errors as Record<string, string>;
            return (
              <>
                <Field>
                  <FieldLabel
                    htmlFor="popularGamesList"
                    className={SUB_LABEL_CLASS}
                  >
                    Board game phổ biến tại quán
                  </FieldLabel>
                  <Input
                    id="popularGamesList"
                    name="popularGamesList"
                    type="text"
                    maxLength={500}
                    value={formData.popularGamesList}
                    onChange={handleChange}
                    placeholder="Catan, Azul, Ma Sói, ..."
                    aria-invalid={!!errMap.popularGamesList}
                    aria-describedby={
                      errMap.popularGamesList
                        ? "ops-err-games"
                        : undefined
                    }
                    className={INPUT_SHELL}
                  />
                  {errMap.popularGamesList ? (
                    <FieldDescription
                      id="ops-err-games"
                      className="text-xs text-destructive leading-snug"
                    >
                      {errMap.popularGamesList}
                    </FieldDescription>
                  ) : (
                    <FieldDescription className="text-helper">
                      Liệt kê tên các game nổi bật, phân cách bằng dấu phẩy.
                      Giúp khách hình dung trước khi đến.
                    </FieldDescription>
                  )}
                </Field>

                <Field className="max-w-48">
                  <FieldLabel
                    htmlFor="defaultHoldDurationMinutes"
                    className={SUB_LABEL_CLASS}
                  >
                    Thời gian giữ chỗ mặc định
                  </FieldLabel>
                  <div className="relative">
                    <Input
                      id="defaultHoldDurationMinutes"
                      name="defaultHoldDurationMinutes"
                      type="number"
                      min={5}
                      max={240}
                      step={1}
                      inputMode="numeric"
                      value={formData.defaultHoldDurationMinutes ?? ""}
                      onChange={handleChange}
                      placeholder="30"
                      aria-invalid={!!errMap.defaultHoldDurationMinutes}
                      aria-describedby={
                        errMap.defaultHoldDurationMinutes
                          ? "ops-err-hold"
                          : undefined
                      }
                      className={cn(INPUT_SHELL, "pr-14")}
                    />
                    <span className="absolute right-3 top-1/2 -translate-y-1/2 text-unit-suffix">
                      phút
                    </span>
                  </div>
                  {errMap.defaultHoldDurationMinutes ? (
                    <FieldDescription
                      id="ops-err-hold"
                      className="text-xs text-destructive leading-snug"
                    >
                      {errMap.defaultHoldDurationMinutes}
                    </FieldDescription>
                  ) : (
                    <FieldDescription className="text-helper">
                      Sau khi booking, hệ thống giữ chỗ trong khoảng thời
                      gian này trước khi tự động giải phóng.
                    </FieldDescription>
                  )}
                </Field>
              </>
            );
          })()}
        </section>

        {/* ─── Thanh toán (editable) ─── */}
        <section
          aria-labelledby="ops-section-billing"
          className="space-y-4"
        >
          <SectionHeaderRow
            id="ops-section-billing"
            title="Thanh toán"
          />

          <Field>
            <FieldLabel className={SUB_LABEL_CLASS}>
              Cách tính phí cho khách
            </FieldLabel>
            <RadioGroup
              value={formData.billingModel}
              onValueChange={switchBilling}
              aria-labelledby="ops-billing-legend"
              className="flex flex-col gap-3"
            >
              <span id="ops-billing-legend" className="sr-only">
                Chọn cách tính phí cho khách tại cơ sở của bạn.
              </span>
              {BILLING_OPTIONS.map((opt) => (
                <div key={opt.value}>
                  <label
                    htmlFor={`billing-${opt.value}`}
                    className={cn(
                      "flex items-start gap-3 p-4 rounded-xl border cursor-pointer transition-colors",
                      formData.billingModel === opt.value
                        ? "border-primary bg-primary/5"
                        : "border-neutral-200 bg-white hover:border-neutral-400",
                    )}
                  >
                    <RadioGroupItem
                      value={opt.value}
                      id={`billing-${opt.value}`}
                      className="mt-0.5"
                    />
                    <div className="flex flex-col gap-0.5">
                      <span
                        className={cn(
                          "text-sm font-medium leading-snug",
                          formData.billingModel === opt.value
                            ? "text-neutral-900"
                            : "text-neutral-700",
                        )}
                      >
                        {opt.label}
                      </span>
                      <span className="text-helper">
                        {opt.hint}
                      </span>
                    </div>
                  </label>
                </div>
              ))}
            </RadioGroup>
            {errors.billingModel && (
              <FieldDescription className="text-xs text-destructive leading-snug">
                {errors.billingModel}
              </FieldDescription>
            )}
          </Field>

          {isByHour && (
            <div className="space-y-4 pl-1 border-l-2 border-primary/20">
              <p className={SUB_LABEL_CLASS}>Giá theo giờ chơi</p>
              <p className="text-helper">
                Khách trả giờ đầu theo <strong>Giá giờ đầu tiên</strong>. Từ
                giờ thứ 2 trở đi, mỗi <strong>khung giờ</strong> phát
                sinh thêm <strong>Phí khung giờ</strong>. Ví dụ: giờ đầu
                60.000đ, sau đó cứ mỗi 0.25 giờ (15 phút) cộng 20.000đ.
              </p>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <Field>
                  <FieldLabel
                    htmlFor="basePrice"
                    className={SUB_LABEL_CLASS}
                  >
                    Giá giờ đầu tiên
                  </FieldLabel>
                  <div className="relative">
                    <Input
                      id="basePrice"
                      type="number"
                      name="basePrice"
                      min={0}
                      max={1_000_000}
                      step={1000}
                      inputMode="numeric"
                      value={formData.basePrice ?? ""}
                      onChange={handleChange}
                      placeholder="60.000"
                      aria-invalid={!!errors.basePrice}
                      aria-describedby={
                        errors.basePrice ? "ops-err-basePrice" : undefined
                      }
                      className={cn(INPUT_SHELL, "pr-10")}
                    />
                    <span className="absolute right-3 top-1/2 -translate-y-1/2 text-unit-suffix">
                      đ
                    </span>
                  </div>
                  {errors.basePrice ? (
                    <FieldDescription
                      id="ops-err-basePrice"
                      className="text-xs text-destructive leading-snug"
                    >
                      {errors.basePrice}
                    </FieldDescription>
                  ) : (
                    <FieldDescription className="text-helper">
                      Phí cố định cho 60 phút đầu của mỗi lượt chơi.
                    </FieldDescription>
                  )}
                </Field>

                <Field>
                  <FieldLabel
                    htmlFor="tieredBlockHours"
                    className={SUB_LABEL_CLASS}
                  >
                    Độ dài mỗi khung giờ
                  </FieldLabel>
                  <div className="relative">
                    <Input
                      id="tieredBlockHours"
                      type="number"
                      name="tieredBlockHours"
                      min={1 / 60}
                      max={24}
                      step={0.25}
                      inputMode="decimal"
                      value={formData.tieredBlockHours ?? ""}
                      onChange={handleChange}
                      placeholder="0.25"
                      aria-invalid={!!errors.tieredBlockMinutes}
                      aria-describedby={
                        errors.tieredBlockMinutes
                          ? "ops-err-block-min"
                          : undefined
                      }
                      className={cn(INPUT_SHELL, "pr-12")}
                    />
                    <span className="absolute right-3 top-1/2 -translate-y-1/2 text-unit-suffix">
                      giờ
                    </span>
                  </div>
                  {errors.tieredBlockMinutes ? (
                    <FieldDescription
                      id="ops-err-block-min"
                      className="text-xs text-destructive leading-snug"
                    >
                      {errors.tieredBlockMinutes}
                    </FieldDescription>
                  ) : (
                    <FieldDescription className="text-helper">
                      Sau giờ đầu, thời gian được làm tròn theo bội số
                      khung giờ này. Có thể nhập số thập phân (vd 0.25 = 15
                      phút).
                    </FieldDescription>
                  )}
                </Field>

                <Field>
                  <FieldLabel
                    htmlFor="tieredBlockRate"
                    className={SUB_LABEL_CLASS}
                  >
                    Phí mỗi khung giờ
                  </FieldLabel>
                  <div className="relative">
                    <Input
                      id="tieredBlockRate"
                      type="number"
                      name="tieredBlockRate"
                      min={0}
                      step={1000}
                      inputMode="numeric"
                      value={formData.tieredBlockRate ?? ""}
                      onChange={handleChange}
                      placeholder="20.000"
                      aria-invalid={!!errors.tieredBlockRate}
                      aria-describedby={
                        errors.tieredBlockRate
                          ? "ops-err-block-rate"
                          : undefined
                      }
                      className={cn(INPUT_SHELL, "pr-10")}
                    />
                    <span className="absolute right-3 top-1/2 -translate-y-1/2 text-unit-suffix">
                      đ
                    </span>
                  </div>
                  {errors.tieredBlockRate ? (
                    <FieldDescription
                      id="ops-err-block-rate"
                      className="text-xs text-destructive leading-snug"
                    >
                      {errors.tieredBlockRate}
                    </FieldDescription>
                  ) : (
                    <FieldDescription className="text-helper">
                      Cộng thêm cho mỗi khung giờ phát sinh sau giờ đầu.
                    </FieldDescription>
                  )}
                </Field>
              </div>
            </div>
          )}

          {isPerDrink && (
            <div className="space-y-4 pl-1 border-l-2 border-primary/20">
              <p className={SUB_LABEL_CLASS}>Đặt cọc cho đơn đồ uống</p>
              <Field className="max-w-48">
                <FieldLabel
                  htmlFor="depositPercentage"
                  className={SUB_LABEL_CLASS}
                >
                  Tỷ lệ đặt cọc
                </FieldLabel>
                <div className="relative">
                  <Input
                    id="depositPercentage"
                    type="number"
                    name="depositPercentage"
                    min={0}
                    max={100}
                    step={0.5}
                    inputMode="decimal"
                    value={formData.depositPercentage ?? ""}
                    onChange={handleChange}
                    placeholder="0"
                    aria-invalid={!!errors.depositPercentage}
                    aria-describedby={
                      errors.depositPercentage
                        ? "ops-err-deposit"
                        : "ops-hint-deposit"
                    }
                    className={cn(INPUT_SHELL, "pr-10")}
                  />
                  <span className="absolute right-3 top-1/2 -translate-y-1/2 text-unit-suffix">
                    %
                  </span>
                </div>
                {errors.depositPercentage ? (
                  <FieldDescription
                    id="ops-err-deposit"
                    className="text-xs text-destructive leading-snug"
                  >
                    {errors.depositPercentage}
                  </FieldDescription>
                ) : (
                  <FieldDescription
                    id="ops-hint-deposit"
                    className="text-helper"
                  >
                    Phần trăm giá trị đơn hàng khách cần thanh toán trước
                    khi bắt đầu chơi.
                  </FieldDescription>
                )}
              </Field>
            </div>
          )}
        </section>

        {/* ─── Submit row ─── */}
        <div className="pt-2">
          <div className="flex flex-col-reverse sm:flex-row sm:items-center sm:justify-between gap-3">
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={resetToDefaults}
              disabled={submitDisabled}
              className="h-11 text-xs font-medium text-neutral-600 hover:text-neutral-900 self-stretch sm:self-auto sm:w-auto"
            >
              <RotateCcw className="h-3.5 w-3.5 mr-1.5" aria-hidden />
              Đặt lại mặc định
            </Button>
            <Button
              type="submit"
              disabled={submitDisabled}
              aria-busy={submitting}
              className="h-11 px-5 text-sm font-medium rounded-lg flex items-center justify-center gap-2 self-stretch sm:self-auto sm:w-auto sm:min-w-[180px]"
            >
              {submitting ? (
                <>
                  <Loader2
                    className="h-4 w-4 animate-spin"
                    aria-hidden
                  />
                  <span>Đang lưu…</span>
                </>
              ) : (
                <>
                  <Save className="h-4 w-4" aria-hidden />
                  <span>{submitHelper}</span>
                </>
              )}
            </Button>
          </div>
        </div>
      </form>

      {/* Server-error dialog (only for 401/403/422/5xx/network). */}
      <AlertDialog
        open={isServerErrorOpen}
        onOpenChange={setIsServerErrorOpen}
      >
        <AlertDialogContent className="bg-white border border-neutral-200 rounded-xl p-5 shadow-[0px_8px_24px_rgba(0,0,0,0.06)] max-w-sm mx-auto text-neutral-900">
          <AlertDialogHeader className="space-y-1.5">
            <AlertDialogTitle className="text-base font-bold tracking-tight flex items-center gap-2 text-destructive">
              <AlertTriangle className="h-5 w-5" aria-hidden />
              {serverErrorContent.title}
            </AlertDialogTitle>
            <AlertDialogDescription className="text-helper font-medium">
              {serverErrorContent.desc}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter className="pt-3 sm:flex-row sm:justify-end">
            <AlertDialogCancel className="text-xs font-semibold rounded-lg px-4 py-2 w-full sm:w-auto">
              Liên hệ hỗ trợ
            </AlertDialogCancel>
            <AlertDialogAction
              onClick={() => {
                setIsServerErrorOpen(false);
                // The form remains mounted; user can edit and resubmit.
                const firstErrorName = Object.keys(errors)[0];
                if (firstErrorName) {
                  const el = document.querySelector<HTMLElement>(
                    `[name="${firstErrorName}"]`,
                  );
                  el?.focus();
                  el?.scrollIntoView({
                    behavior: "smooth",
                    block: "center",
                  });
                }
              }}
              className="text-xs font-semibold rounded-lg px-4 py-2 w-full sm:w-auto"
            >
              Chỉnh sửa và thử lại
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </Card>
  );
}

const BILLING_OPTIONS: ReadonlyArray<{
  value: BillingModel;
  label: string;
  hint: string;
}> = [
  {
    value: "ByHour",
    label: "Tính phí theo giờ chơi",
    hint: "Khách trả phí theo thời lượng sử dụng phòng và bàn.",
  },
  {
    value: "PerDrink",
    label: "Phí vào cửa",
    hint: "Khách trả phí vào cửa theo đơn đồ uống hoặc vé vào, chơi board game tại khu vực chung của quán.",
  },
];