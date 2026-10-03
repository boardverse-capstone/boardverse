"use client";

import { useState } from "react";
import {
  Sparkles,
  Pause,
  Power,
  RotateCcw,
  ShieldAlert,
  type LucideIcon,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import type { OperationalStatus } from "@/features/partner/types/partner.interface";
import { ActivateCafeDialog } from "./activate-cafe-dialog";
import { DeactivateCafeDialog } from "./deactivate-cafe-dialog";
import { CloseCafeDialog } from "./close-cafe-dialog";
import { ReopenCafeDialog } from "./reopen-cafe-dialog";

export interface CafeStatusHeaderProps {
  /** Tên cơ sở — dùng cho dialog copy và heading. */
  cafeName: string;
  /** Trạng thái hiện tại từ server. */
  operationalStatus: OperationalStatus | null;
  /** true ⇔ có thể chuyển sang ACTIVE. */
  canActivate: boolean;
  /** Lý do chặn kích hoạt (rỗng khi canActivate=true). */
  activationBlockers: string[];
  /** true ⇔ có thể mở lại từ INACTIVE. */
  canReopen: boolean;
}

/** Status display config — semantically colored, text label always present. */
const STATUS_DISPLAY: Record<
  OperationalStatus,
  {
    label: string;
    description: string;
    badgeClass: string;
    icon: LucideIcon;
  }
> = {
  ACTIVE: {
    label: "Đang hoạt động",
    description: "Khách có thể đặt bàn và xem quán trên Boardverse.",
    badgeClass:
      "bg-emerald-50 text-emerald-700 border-emerald-200 ring-1 ring-emerald-200",
    icon: Sparkles,
  },
  DATA_BLANK: {
    label: "Chưa kích hoạt",
    description: "Cơ sở đã được duyệt nhưng chưa công khai trên Boardverse.",
    badgeClass:
      "bg-neutral-50 text-neutral-700 border-neutral-200 ring-1 ring-neutral-200",
    icon: ShieldAlert,
  },
  INACTIVE: {
    label: "Đã ngừng kinh doanh",
    description: "Cơ sở đã đóng. Mở lại bất kỳ lúc nào nếu muốn hoạt động trở lại.",
    badgeClass:
      "bg-amber-50 text-amber-800 border-amber-200 ring-1 ring-amber-200",
    icon: Pause,
  },
  BANNED: {
    label: "Đã bị cấm",
    description:
      "Cơ sở vi phạm chính sách Boardverse. Liên hệ hỗ trợ để được hướng dẫn.",
    badgeClass:
      "bg-destructive/10 text-destructive border-destructive/30 ring-1 ring-destructive/20",
    icon: Power,
  },
  SUSPENDED: {
    label: "Đang bị tạm khoá",
    description: "Cơ sở tạm thời bị khoá để xác minh. Liên hệ hỗ trợ để biết thêm.",
    badgeClass:
      "bg-amber-50 text-amber-800 border-amber-200 ring-1 ring-amber-200",
    icon: Pause,
  },
};

/**
 * CafeStatusHeader — banner nổi bật ở đầu trang, trả lời câu hỏi
 * "Quán tôi đang mở hay đóng?" trong 1 giây. Kèm:
 *  - Status badge (color + icon + label, không phụ thuộc màu sắc)
 *  - Cafe name (heading)
 *  - Status reason / description
 *  - Transition buttons (chỉ hiện thị các nút hợp lệ với trạng thái)
 *  - Activation blocker list (chỉ khi DATA_BLANK + !canActivate)
 */
export function CafeStatusHeader({
  cafeName,
  operationalStatus,
  canActivate,
  activationBlockers,
  canReopen,
}: CafeStatusHeaderProps) {
  const [activateOpen, setActivateOpen] = useState(false);
  const [deactivateOpen, setDeactivateOpen] = useState(false);
  const [closeOpen, setCloseOpen] = useState(false);
  const [reopenOpen, setReopenOpen] = useState(false);

  if (!operationalStatus) {
    return (
      <header
        role="status"
        aria-live="polite"
        className="rounded-2xl border border-neutral-200 bg-white p-6 shadow-[0_1px_2px_rgba(0,0,0,0.04)]"
      >
        <p className="text-helper">Đang tải trạng thái cơ sở…</p>
      </header>
    );
  }

  const display = STATUS_DISPLAY[operationalStatus];
  const StatusIcon = display.icon;

  return (
    <header
      role="status"
      aria-live="polite"
      className="rounded-2xl border border-neutral-200 bg-white p-5 md:p-6 shadow-[0_1px_2px_rgba(0,0,0,0.04),0_4px_12px_rgba(0,0,0,0.04)] space-y-3"
    >
      <div className="flex flex-wrap items-center gap-3">
        <span
          className={`inline-flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wider px-2.5 py-1 rounded-full border ${display.badgeClass}`}
        >
          <StatusIcon className="h-3.5 w-3.5" aria-hidden />
          {display.label}
        </span>
        <p className="text-helper">{display.description}</p>
      </div>

      {/* Activation blocker list — DATA_BLANK + !canActivate. */}
      {operationalStatus === "DATA_BLANK" &&
        !canActivate &&
        activationBlockers.length > 0 && (
          <div
            role="status"
            aria-live="polite"
            className="rounded-lg border border-neutral-200 bg-neutral-50/60 p-3 space-y-1.5"
          >
            <p className="text-sub-label">Cần hoàn tất trước khi kích hoạt</p>
            <ul className="space-y-1">
              {activationBlockers.map((line) => (
                <li
                  key={line}
                  className="flex items-start gap-2 text-xs text-destructive leading-snug"
                >
                  <span
                    aria-hidden
                    className="mt-1.5 inline-block h-1.5 w-1.5 rounded-full bg-primary shrink-0"
                  />
                  <span>{line}</span>
                </li>
              ))}
            </ul>
          </div>
        )}

      {/* Transition action bar. Each button only renders for the
          states where the transition is valid. */}
      <div
        role="group"
        aria-label="Thay đổi trạng thái cơ sở"
        className="flex flex-wrap items-center gap-2 pt-1"
      >
        {operationalStatus === "DATA_BLANK" && (
          <Button
            type="button"
            disabled={!canActivate}
            aria-disabled={!canActivate}
            onClick={() => setActivateOpen(true)}
            className="h-11 px-5 text-sm font-semibold rounded-lg inline-flex items-center gap-2"
          >
            <Sparkles className="h-4 w-4" aria-hidden />
            Kích hoạt quán
          </Button>
        )}

        {operationalStatus === "ACTIVE" && (
          <>
            <Button
              type="button"
              variant="outline"
              onClick={() => setDeactivateOpen(true)}
              className="h-11 px-5 text-sm font-semibold rounded-lg inline-flex items-center gap-2 border-amber-300 text-amber-800 hover:bg-amber-50"
            >
              <Pause className="h-4 w-4" aria-hidden />
              Tạm dừng
            </Button>
            <Button
              type="button"
              variant="outline"
              onClick={() => setCloseOpen(true)}
              className="h-11 px-5 text-sm font-semibold rounded-lg inline-flex items-center gap-2 border-destructive/30 text-destructive hover:bg-destructive/5"
            >
              <Power className="h-4 w-4" aria-hidden />
              Ngừng kinh doanh
            </Button>
          </>
        )}

        {operationalStatus === "INACTIVE" && (
          <Button
            type="button"
            onClick={() => setReopenOpen(true)}
            disabled={!canReopen}
            aria-disabled={!canReopen}
            className="h-11 px-5 text-sm font-semibold rounded-lg inline-flex items-center gap-2"
          >
            <RotateCcw className="h-4 w-4" aria-hidden />
            Mở lại quán
          </Button>
        )}

        {(operationalStatus === "BANNED" ||
          operationalStatus === "SUSPENDED") && (
          <a
            href="/manager/support"
            className="text-sm font-medium text-neutral-700 hover:text-neutral-900 inline-flex items-center gap-1.5 underline-offset-2 hover:underline"
          >
            Liên hệ hỗ trợ →
          </a>
        )}
      </div>

      {/* Confirmation dialogs — only one is open at a time. */}
      <ActivateCafeDialog
        open={activateOpen}
        onOpenChange={setActivateOpen}
        cafeName={cafeName}
      />
      <DeactivateCafeDialog
        open={deactivateOpen}
        onOpenChange={setDeactivateOpen}
        cafeName={cafeName}
      />
      <CloseCafeDialog
        open={closeOpen}
        onOpenChange={setCloseOpen}
        cafeName={cafeName}
      />
      <ReopenCafeDialog
        open={reopenOpen}
        onOpenChange={setReopenOpen}
        cafeName={cafeName}
      />
    </header>
  );
}
