"use client";

/**
 * CafeNotActivatedPanel — block trang "không thể dùng" khi manager
 * chưa kích hoạt cơ sở (operationalStatus === "DATA_BLANK" hoặc
 * chưa đủ điều kiện kích hoạt).
 *
 * Mục tiêu: dùng cho các trang manager yêu cầu cơ sở đã ACTIVE
 * (vd: Tournament POS) — thay vì render dashboard trống, hiển thị
 * panel giải thích + dẫn về Hồ sơ vận hành để hoàn tất.
 *
 * Dùng ngôn ngữ + cấu trúc đồng nhất với `cafe-status-header.tsx`:
 *   - "Cơ sở đã được duyệt nhưng chưa công khai trên Boardverse."
 *   - "Cần hoàn tất trước khi kích hoạt"
 *   - Badge: bg-neutral-50 / border-neutral-200 / icon ShieldAlert
 *   - Blocker rows: text-destructive + 1.5pt cinnabar dot
 */

import Link from "next/link";
import { ShieldAlert, ArrowRight } from "lucide-react";
import type { OperationalStatus } from "@/features/partner/types/partner.interface";

export interface CafeNotActivatedPanelProps {
  /** Trạng thái vận hành từ server — null khi đang tải. */
  operationalStatus: OperationalStatus | null | undefined;
  /** Lý do chặn kích hoạt (server-authoritative). */
  activationBlockers: string[];
  /** true ⇔ đã đủ điều kiện kích hoạt. */
  canActivate: boolean;
  /**
   * Href tới Hồ sơ vận hành — mặc định `/manager/operational-profile`.
   * Cho phép override khi trang khác muốn dẫn tới đích khác.
   */
  profileHref?: string;
}

/**
 * Quyết định panel có hiển thị hay không. Một số quán INACTIVE cũng
 * không cho phép chạy tournament — gate luôn cả INACTIVE ở đây.
 */
export function shouldBlockTournamentForStatus(
  status: OperationalStatus | null | undefined,
): boolean {
  return status === "DATA_BLANK" || status === "BANNED" || status === "SUSPENDED";
}

export function CafeNotActivatedPanel({
  operationalStatus,
  activationBlockers,
  canActivate,
  profileHref = "/manager/operational-profile",
}: CafeNotActivatedPanelProps) {
  if (!shouldBlockTournamentForStatus(operationalStatus)) {
    return null;
  }

  // Với BANNED / SUSPENDED, copy khác một chút — manager cần liên hệ hỗ trợ
  // thay vì tự kích hoạt lại.
  const isLockedByPolicy =
    operationalStatus === "BANNED" || operationalStatus === "SUSPENDED";

  return (
    <section
      role="status"
      aria-live="polite"
      className="rounded-2xl border border-neutral-200 bg-white p-6 shadow-[0_1px_2px_rgba(0,0,0,0.04),0_4px_12px_rgba(0,0,0,0.04)] space-y-4"
    >
      {/* Header: badge "CHƯA KÍCH HOẠT" + subtitle */}
      <div className="flex flex-wrap items-start gap-3">
        <span
          className="inline-flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wider px-2.5 py-1 rounded-full border bg-neutral-50 text-neutral-700 border-neutral-200 ring-1 ring-neutral-200"
        >
          <ShieldAlert className="h-3.5 w-3.5" aria-hidden />
          {isLockedByPolicy
            ? operationalStatus === "BANNED"
              ? "Đã bị cấm"
              : "Đang bị tạm khoá"
            : "Chưa kích hoạt"}
        </span>
        <p className="text-sm text-neutral-600 font-medium leading-relaxed">
          {isLockedByPolicy
            ? "Cơ sở đang bị hạn chế bởi Boardverse. Liên hệ hỗ trợ để được hướng dẫn."
            : "Cơ sở đã được duyệt nhưng chưa công khai trên Boardverse."}
        </p>
      </div>

      {/* Body: blocker list — chỉ cho DATA_BLANK + !canActivate */}
      {!isLockedByPolicy &&
        !canActivate &&
        activationBlockers.length > 0 && (
          <div className="rounded-xl border border-neutral-200 bg-neutral-50/60 p-4 space-y-2">
            <p className="text-[11px] font-semibold uppercase tracking-wider text-neutral-700">
              Cần hoàn tất trước khi kích hoạt
            </p>
            <ul className="space-y-1.5">
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

      {/* Footer: CTA dẫn về Hồ sơ vận hành */}
      <div className="flex flex-wrap items-center gap-3 pt-1">
        <Link
          href={profileHref}
          className="inline-flex h-10 items-center gap-2 rounded-lg bg-primary px-4 text-sm font-semibold text-primary-foreground shadow-xs hover:bg-primary/90 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 transition-colors"
        >
          {isLockedByPolicy ? "Mở hỗ trợ" : "Mở hồ sơ vận hành"}
          <ArrowRight className="h-4 w-4" aria-hidden />
        </Link>
        <p className="text-xs text-neutral-500 font-medium">
          Hoàn tất các điều kiện trên rồi quay lại để chạy giải đấu.
        </p>
      </div>
    </section>
  );
}
