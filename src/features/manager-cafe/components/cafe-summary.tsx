"use client";

import { useState } from "react";
import {
  Image as ImageIcon,
  MapPin,
  Phone,
  Clock,
  Gamepad2,
  Receipt,
  Users as UsersIcon,
  type LucideIcon,
} from "lucide-react";
import { cn } from "@/lib/utils";
import {
  Dialog,
  DialogContent,
  DialogTitle,
} from "@/components/ui/dialog";
import type { BillingModel, OperationalStatus, WorkingHours } from "@/features/partner/types/partner.interface";

export interface CafeSummaryProps {
  cafeName: string;
  address: string;
  phoneNumber: string;
  workingHours: WorkingHours;
  /** Số bàn (từ registration, read-only). */
  numberOfTables: number;
  /** Số phòng riêng — từ operationalProfile (mirror form). */
  numberOfPrivateRooms: number;
  /** Hình ảnh không gian — từ registration (read-only). */
  spaceImageUrls: string[];
  /** Có Game Master — từ registration (read-only). */
  hasGameMaster: boolean;
  /** Cách tính phí — từ operationalProfile (mirror form). */
  billingModel: BillingModel;
  /** Giá giờ đầu (BY_HOUR only). */
  basePrice?: number;
  /** Phí mỗi khung giờ (BY_HOUR only). */
  tieredBlockRate?: number;
  /** Độ dài khung giờ (BY_HOUR only). */
  tieredBlockMinutes?: number;
  /** Tỷ lệ đặt cọc (PER_DRINK only). */
  depositPercentage?: number;
  /** Status hiện tại — show "Đang hoạt động" pill cạnh cafe name trong card. */
  operationalStatus: OperationalStatus | null;
}

const isHttpUrl = (url: string) => /^https?:\/\//i.test(url);

const CURRENCY_FORMATTER = new Intl.NumberFormat("vi-VN", {
  style: "currency",
  currency: "VND",
  maximumFractionDigits: 0,
});

function formatVnd(value: number | undefined): string {
  if (value === undefined || !Number.isFinite(value)) return "—";
  return CURRENCY_FORMATTER.format(value);
}

function formatHoursWindow(
  start: string,
  end: string,
): string {
  return `${start} – ${end}`;
}

const SUB_LABEL_CLASS = "text-sub-label";

/** Sub-section heading with thin underline divider. */
function SectionHeader({
  id,
  title,
  icon: Icon,
}: {
  id: string;
  title: string;
  icon: LucideIcon;
}) {
  return (
    <div className="pb-1 border-b border-neutral-100 flex items-baseline gap-2">
      <Icon className="h-4 w-4 text-neutral-600 shrink-0" aria-hidden />
      <h2 id={id} className="text-section-header">
        {title}
      </h2>
    </div>
  );
}

/** Compact "field : value" row, label-mono-meta on the left, value on right. */
function KVRow({
  label,
  value,
  valueClassName,
}: {
  label: string;
  value: React.ReactNode;
  valueClassName?: string;
}) {
  return (
    <div className="flex items-baseline justify-between gap-3 py-1.5">
      <span className="text-xs font-medium text-neutral-600 tracking-tight">
        {label}
      </span>
      <span
        className={cn(
          "text-sm font-medium text-neutral-900 text-right truncate",
          valueClassName,
        )}
      >
        {value}
      </span>
    </div>
  );
}

const STATUS_BADGE_TEXT: Record<OperationalStatus, string> = {
  ACTIVE: "Đang hoạt động",
  DATA_BLANK: "Chưa kích hoạt",
  INACTIVE: "Đã ngừng KD",
  BANNED: "Đã bị cấm",
  SUSPENDED: "Tạm khoá",
};

const STATUS_BADGE_CLASS: Record<OperationalStatus, string> = {
  ACTIVE: "bg-emerald-50 text-emerald-700 border-emerald-200",
  DATA_BLANK: "bg-neutral-100 text-neutral-600 border-neutral-200",
  INACTIVE: "bg-amber-50 text-amber-800 border-amber-200",
  BANNED: "bg-destructive/10 text-destructive border-destructive/30",
  SUSPENDED: "bg-amber-50 text-amber-800 border-amber-200",
};

export function CafeSummary(props: CafeSummaryProps) {
  const {
    cafeName,
    address,
    phoneNumber,
    workingHours,
    numberOfTables,
    numberOfPrivateRooms,
    spaceImageUrls,
    hasGameMaster,
    billingModel,
    basePrice,
    tieredBlockRate,
    tieredBlockMinutes,
    depositPercentage,
    operationalStatus,
  } = props;

  const [activeImage, setActiveImage] = useState<number | null>(null);

  return (
    <div className="space-y-4">
      {/* ─── I. Thông tin quán ─── */}
      <section
        aria-labelledby="summary-section-info"
        className="rounded-2xl border border-neutral-200 bg-white p-5 shadow-[0_1px_2px_rgba(0,0,0,0.04)] space-y-3"
      >
        <SectionHeader
          id="summary-section-info"
          title="I. Thông tin quán"
          icon={MapPin}
        />
        <div className="space-y-0">
          <div className="flex items-baseline justify-between gap-3 py-1.5">
            <span className="text-xs font-medium text-neutral-600 tracking-tight">
              Tên quán
            </span>
            <div className="flex items-center gap-2 min-w-0">
              <span className="text-sm font-semibold text-neutral-900 truncate">
                {cafeName || "—"}
              </span>
              {operationalStatus && (
                <span
                  className={cn(
                    "text-[10px] font-semibold uppercase tracking-wider px-1.5 py-0.5 rounded border",
                    STATUS_BADGE_CLASS[operationalStatus],
                  )}
                >
                  {STATUS_BADGE_TEXT[operationalStatus]}
                </span>
              )}
            </div>
          </div>
          <KVRow
            label="Địa chỉ"
            value={
              <span className="text-sm text-neutral-900 line-clamp-2 max-w-xs">
                {address || "—"}
              </span>
            }
          />
          <KVRow
            label="Hotline"
            value={
              <a
                href={`tel:${phoneNumber}`}
                className="inline-flex items-center gap-1.5 text-sm font-medium text-neutral-900 hover:text-primary"
              >
                <Phone className="h-3.5 w-3.5" aria-hidden />
                {phoneNumber || "—"}
              </a>
            }
          />
          <div className="py-1.5 space-y-1.5">
            <div className="flex items-center gap-1.5 text-xs font-medium text-neutral-600 tracking-tight">
              <Clock className="h-3.5 w-3.5" aria-hidden />
              Giờ hoạt động
            </div>
            <div className="rounded-lg bg-neutral-50/60 border border-neutral-100 p-3 space-y-1 text-sm text-neutral-800">
              <div className="flex items-baseline justify-between gap-3">
                <span className="text-xs text-neutral-600">Thứ 2 – Thứ 6</span>
                <span className="font-medium tabular-nums">
                  {formatHoursWindow(
                    workingHours.weekdayStart,
                    workingHours.weekdayEnd,
                  )}
                </span>
              </div>
              <div className="flex items-baseline justify-between gap-3">
                <span className="text-xs text-neutral-600">Thứ 7 – CN</span>
                <span className="font-medium tabular-nums">
                  {formatHoursWindow(
                    workingHours.weekendStart,
                    workingHours.weekendEnd,
                  )}
                </span>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ─── II. Không gian & dịch vụ ─── */}
      <section
        aria-labelledby="summary-section-space"
        className="rounded-2xl border border-neutral-200 bg-white p-5 shadow-[0_1px_2px_rgba(0,0,0,0.04)] space-y-3"
      >
        <SectionHeader
          id="summary-section-space"
          title="II. Không gian & dịch vụ"
          icon={Gamepad2}
        />
        <div className="grid grid-cols-2 gap-x-4 gap-y-0">
          <KVRow
            label="Số bàn"
            value={
              <span className="tabular-nums">
                {numberOfTables.toLocaleString("vi-VN")}
              </span>
            }
          />
          <KVRow
            label="Phòng riêng"
            value={
              <span className="tabular-nums">
                {numberOfPrivateRooms.toLocaleString("vi-VN")}
              </span>
            }
          />
        </div>
        <div className="pt-2 space-y-1.5">
          <div className="flex items-center gap-1.5 text-xs font-medium text-neutral-600 tracking-tight">
            <ImageIcon className="h-3.5 w-3.5" aria-hidden />
            Hình ảnh không gian
          </div>
          {spaceImageUrls.length === 0 ? (
            <p className="text-helper py-3">
              Chưa có hình ảnh — tải lên trong bước đăng ký cơ sở.
            </p>
          ) : (
            <div className="flex flex-wrap gap-2">
              {spaceImageUrls.map((url, idx) => {
                const usable = isHttpUrl(url);
                return (
                  <button
                    key={`${url}-${idx}`}
                    type="button"
                    onClick={() => usable && setActiveImage(idx)}
                    disabled={!usable}
                    aria-label={
                      usable
                        ? `Phóng to hình ảnh không gian ${idx + 1}`
                        : `Hình ảnh ${idx + 1} không hợp lệ`
                    }
                    className={cn(
                      "relative h-20 w-20 rounded-lg border border-neutral-200 bg-neutral-50 overflow-hidden flex items-center justify-center",
                      usable &&
                        "cursor-zoom-in hover:border-neutral-400 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2",
                      !usable && "cursor-default",
                    )}
                    title={url}
                  >
                    {usable ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img
                        src={url}
                        alt={`Hình ảnh không gian ${idx + 1}`}
                        className="h-full w-full object-cover"
                      />
                    ) : (
                      <ImageIcon
                        className="h-5 w-5 text-neutral-400"
                        aria-hidden
                      />
                    )}
                  </button>
                );
              })}
            </div>
          )}
        </div>
        <div className="pt-1 flex items-center gap-2 border-t border-neutral-100">
          <UsersIcon
            className={cn(
              "h-4 w-4",
              hasGameMaster ? "text-emerald-600" : "text-neutral-400",
            )}
            aria-hidden
          />
          <span className="text-sm font-medium text-neutral-800">
            {hasGameMaster
              ? "Có nhân viên hỗ trợ (Game Master) tại quán"
              : "Chưa có nhân viên hỗ trợ"}
          </span>
        </div>
      </section>

      {/* ─── III. Thanh toán ─── */}
      <section
        aria-labelledby="summary-section-billing"
        className="rounded-2xl border border-neutral-200 bg-white p-5 shadow-[0_1px_2px_rgba(0,0,0,0.04)] space-y-3"
      >
        <SectionHeader
          id="summary-section-billing"
          title="III. Thanh toán"
          icon={Receipt}
        />
        <div>
          <p className={SUB_LABEL_CLASS}>Cách tính phí</p>
          <p className="text-base font-semibold text-neutral-900 mt-1">
            {billingModel === "BY_HOUR"
              ? "Theo giờ chơi"
              : "Theo đơn đồ uống"}
          </p>
        </div>
        {billingModel === "BY_HOUR" ? (
          <div className="rounded-lg bg-neutral-50/60 border border-neutral-100 p-3 space-y-1 text-sm text-neutral-800">
            <KVRow
              label="Giá giờ đầu"
              value={
                <span className="font-semibold tabular-nums">
                  {formatVnd(basePrice)}
                </span>
              }
            />
            <KVRow
              label="Phí mỗi khung giờ"
              value={
                <span className="font-semibold tabular-nums">
                  {formatVnd(tieredBlockRate)}
                </span>
              }
            />
            <KVRow
              label="Độ dài khung giờ"
              value={
                <span className="font-semibold tabular-nums">
                  {tieredBlockMinutes !== undefined
                    ? `${tieredBlockMinutes} phút`
                    : "—"}
                </span>
              }
            />
          </div>
        ) : (
          <div className="rounded-lg bg-neutral-50/60 border border-neutral-100 p-3 space-y-1 text-sm text-neutral-800">
            <KVRow
              label="Tỷ lệ đặt cọc"
              value={
                <span className="font-semibold tabular-nums">
                  {depositPercentage !== undefined
                    ? `${(depositPercentage * 100).toLocaleString("vi-VN")}%`
                    : "—"}
                </span>
              }
            />
          </div>
        )}
      </section>

      {/* Lightbox dialog cho hình ảnh không gian. */}
      <Dialog
        open={activeImage !== null}
        onOpenChange={(open) => !open && setActiveImage(null)}
      >
        <DialogContent className="max-w-4xl w-full bg-black/95 border-0 p-2 rounded-xl">
          <DialogTitle className="sr-only">Phóng to hình ảnh không gian</DialogTitle>
          {activeImage !== null && isHttpUrl(spaceImageUrls[activeImage]) && (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={spaceImageUrls[activeImage]}
              alt={`Hình ảnh không gian ${activeImage + 1}`}
              className="w-full h-auto max-h-[85vh] object-contain rounded-lg"
            />
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}