"use client";

import {
  CheckCircle2,
  Circle,
  Loader2,
  ListChecks,
  type LucideIcon,
} from "lucide-react";
import { cn } from "@/lib/utils";
import type { ManagerCafe } from "../../types/manager-cafe.interface";
import type { DepositRefundPolicy } from "../../types/manager-cafe.interface";
import type { SePayConfig } from "../../types/manager-cafe.interface";

export interface SetupChecklistItem {
  id: string;
  label: string;
  description: string;
  icon: LucideIcon;
  done: boolean;
}

export interface SetupChecklistSectionProps {
  cafe: ManagerCafe;
  sepayConfig: SePayConfig | null;
  sepayLoading: boolean;
  depositPolicy: DepositRefundPolicy | null;
  depositPolicyLoading: boolean;
}

/**
 * Tính trạng thái hoàn tất cho từng mục checklist dựa trên dữ liệu đã
 * load về. Manager quét checklist để biết còn thiếu gì trước khi kích
 * hoạt quán (BR-04).
 */
function buildItems(
  cafe: ManagerCafe,
  sepayConfig: SePayConfig | null,
  sepayLoading: boolean,
  depositPolicy: DepositRefundPolicy | null,
  depositPolicyLoading: boolean,
): SetupChecklistItem[] {
  const p = cafe.operationalProfile;
  const hasPrivateRooms = (p.numberOfPrivateRooms ?? 0) > 0;
  const hasPricing =
    p.billingModel === "BY_HOUR"
      ? p.basePrice !== undefined &&
        p.tieredBlockRate !== undefined &&
        p.tieredBlockMinutes !== undefined
      : p.depositPercentage !== undefined;

  return [
    {
      id: "info",
      label: "Thông tin quán",
      description: "Tên, địa chỉ, hotline đã điền trong đơn đăng ký.",
      icon: CheckCircle2,
      done: !!cafe.cafeName && !!cafe.address,
    },
    {
      id: "hours",
      label: "Giờ mở cửa",
      description: "Đã thiết lập khung giờ hoạt động cho tuần.",
      icon: CheckCircle2,
      done:
        !!cafe.workingHours?.weekdayStart &&
        !!cafe.workingHours?.weekdayEnd &&
        !!cafe.workingHours?.weekendStart &&
        !!cafe.workingHours?.weekendEnd,
    },
    {
      id: "rooms",
      label: "Phòng riêng & cấu hình giá",
      description: hasPrivateRooms
        ? `${p.numberOfPrivateRooms} phòng riêng, biểu phí đã thiết lập.`
        : "Chưa khai báo phòng riêng hoặc biểu phí.",
      icon: hasPrivateRooms ? CheckCircle2 : Circle,
      done: hasPrivateRooms && hasPricing,
    },
    {
      id: "sepay",
      label: "Tài khoản SePay",
      description: sepayLoading
        ? "Đang tải cấu hình SePay…"
        : sepayConfig
          ? `Ngân hàng ${sepayConfig.bankCode}, STK ${maskAccount(sepayConfig.accountNumber)}.`
          : "Chưa cấu hình tài khoản SePay để nhận thanh toán.",
      icon: sepayConfig ? CheckCircle2 : Circle,
      done: !!sepayConfig && !!sepayConfig.bankCode,
    },
    {
      id: "refund",
      label: "Chính sách hoàn cọc",
      description: depositPolicyLoading
        ? "Đang tải chính sách…"
        : depositPolicy
          ? `Chính sách hiện tại: ${depositPolicy.policy}.`
          : "Chưa thiết lập chính sách hoàn cọc cho booking.",
      icon: depositPolicy ? CheckCircle2 : Circle,
      done: !!depositPolicy,
    },
  ];
}

/** Che một phần số tài khoản, giữ 4 số cuối để manager dễ nhận diện. */
function maskAccount(account: string): string {
  if (!account) return "—";
  const digits = account.replace(/\D/g, "");
  if (digits.length <= 4) return digits;
  return `•••• ${digits.slice(-4)}`;
}

export function SetupChecklistSection({
  cafe,
  sepayConfig,
  sepayLoading,
  depositPolicy,
  depositPolicyLoading,
}: SetupChecklistSectionProps) {
  const items = buildItems(
    cafe,
    sepayConfig,
    sepayLoading,
    depositPolicy,
    depositPolicyLoading,
  );
  const completedCount = items.filter((it) => it.done).length;
  const allDone = completedCount === items.length;

  return (
    <section
      aria-labelledby="setup-checklist"
      className={cn(
        "rounded-2xl border p-5 space-y-3",
        allDone
          ? "border-emerald-200 bg-emerald-50/40"
          : "border-neutral-200 bg-white",
      )}
    >
      <div className="pb-1 border-b border-neutral-100 flex items-baseline gap-2">
        <ListChecks
          className={cn(
            "h-4 w-4 shrink-0",
            allDone ? "text-emerald-700" : "text-neutral-600",
          )}
          aria-hidden
        />
        <h2 id="setup-checklist" className="text-section-header">
          Checklist setup
        </h2>
        <span className="ml-auto text-[11px] font-semibold text-neutral-600 tabular-nums">
          {completedCount}/{items.length}
        </span>
      </div>
      <ul className="space-y-1.5">
        {items.map((item) => {
          return (
            <li
              key={item.id}
              className="flex items-start gap-2 text-sm leading-snug"
            >
              {item.done ? (
                <CheckCircle2
                  className="h-4 w-4 mt-0.5 shrink-0 text-emerald-600"
                  aria-hidden
                />
              ) : (
                <Circle
                  className="h-4 w-4 mt-0.5 shrink-0 text-neutral-400"
                  aria-hidden
                />
              )}
              <div className="min-w-0">
                <p
                  className={cn(
                    "font-medium",
                    item.done ? "text-neutral-900" : "text-neutral-700",
                  )}
                >
                  {item.label}
                </p>
                <p className="text-xs text-neutral-600 mt-0.5">
                  {itemLoading(item, sepayLoading, depositPolicyLoading)}
                </p>
              </div>
            </li>
          );
        })}
      </ul>
      {allDone ? (
        <p className="text-xs text-emerald-700 font-medium pt-1">
          Setup hoàn tất — bạn đã sẵn sàng kích hoạt quán.
        </p>
      ) : null}
    </section>
  );
}

/**
 * Phân biệt text "đang tải" với text mô tả tĩnh cho các mục có API call.
 */
function itemLoading(
  item: SetupChecklistItem,
  sepayLoading: boolean,
  depositLoading: boolean,
) {
  if (item.id === "sepay" && sepayLoading) {
    return (
      <span className="inline-flex items-center gap-1.5">
        <Loader2 className="h-3 w-3 animate-spin" aria-hidden />
        {item.description}
      </span>
    );
  }
  if (item.id === "refund" && depositLoading) {
    return (
      <span className="inline-flex items-center gap-1.5">
        <Loader2 className="h-3 w-3 animate-spin" aria-hidden />
        {item.description}
      </span>
    );
  }
  return item.description;
}