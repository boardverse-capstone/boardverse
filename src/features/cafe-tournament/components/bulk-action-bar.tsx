"use client";

import * as React from "react";
import { CheckCircle2, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

interface Props {
  /** Tổng số VĐV có thể chọn (đã lọc + chưa check-in). */
  total: number;
  /** Số VĐV đang chọn. */
  selected: number;
  /** Đang submit → disable mọi nút. */
  submitting?: boolean;
  /** Có phải "select all across filter" — mở rộng ngoài danh sách hiện tại. */
  onSelectAllAcross?: (() => void) | undefined;
  onClear: () => void;
  onConfirm: () => void;
  /** Số VĐV thất bại (nếu bulk action đã chạy nhưng có lỗi). */
  failedCount?: number;
  /** Label cho action chính. */
  confirmLabel?: string;
  /** Test id. */
  "data-testid"?: string;
}

/**
 * Floating action bar hiện khi staff chọn ≥1 VĐV. Nằm dưới table, sticky
 * bottom, có shadow + border để tách khỏi nội dung. Có 2 nút:
 *  - "Hủy chọn" (đóng bar, clear selection)
 *  - "Check-in N VĐV" (gọi onConfirm)
 *
 * Tuân thủ a11y: role="region", aria-live="polite" để screen reader
 * thông báo khi số lượng chọn thay đổi.
 */
export function BulkActionBar({
  total,
  selected,
  submitting,
  onSelectAllAcross,
  onClear,
  onConfirm,
  failedCount = 0,
  confirmLabel = "Check-in hàng loạt",
  "data-testid": testId = "bulk-action-bar",
}: Props) {
  if (selected === 0) return null;

  return (
    <div
      role="region"
      aria-live="polite"
      data-testid={testId}
      className={cn(
        "sticky bottom-3 z-20 mx-auto mt-3 flex w-fit max-w-[calc(100%-1.5rem)] items-center gap-2 sm:gap-3",
        "rounded-2xl border border-emerald-200 bg-white/95 backdrop-blur-md px-3 py-2.5 sm:px-4 sm:py-3",
        "shadow-lg shadow-emerald-900/10 ring-1 ring-emerald-100/50",
        "animate-in fade-in-50 slide-in-from-bottom-2 duration-200",
      )}
    >
      <div className="flex items-center gap-2 pr-1">
        <div className="flex h-7 w-7 sm:h-8 sm:w-8 shrink-0 items-center justify-center rounded-full bg-emerald-100 text-emerald-700">
          <CheckCircle2 className="h-3.5 w-3.5 sm:h-4 sm:w-4" />
        </div>
        <div className="text-[11px] sm:text-xs">
          <div className="font-black text-neutral-900 tabular-nums" data-testid="bulk-selected-count" data-count={selected}>
            Đã chọn {selected}
            <span className="hidden sm:inline text-neutral-500 font-bold">
              {total > selected ? ` / ${total}` : ""}
            </span>{" "}
            VĐV
          </div>
          {onSelectAllAcross && selected < total && (
            <button
              type="button"
              onClick={onSelectAllAcross}
              className="text-[10px] font-bold text-emerald-700 hover:text-emerald-800 hover:underline"
              data-testid="bulk-select-all"
            >
              Chọn tất cả {total} VĐV
            </button>
          )}
        </div>
      </div>

      {failedCount > 0 && (
        <div
          className="hidden sm:flex items-center gap-1 rounded-lg border border-amber-200 bg-amber-50 px-2 py-1 text-[10px] font-bold text-amber-800"
          data-testid="bulk-failed-warning"
          data-failed-count={failedCount}
          role="status"
        >
          {failedCount} lỗi — thử lại
        </div>
      )}

      <div className="h-6 w-px bg-neutral-200 hidden sm:block" />

      <Button
        type="button"
        variant="ghost"
        onClick={onClear}
        disabled={submitting}
        className="h-8 rounded-xl px-2.5 text-xs font-bold text-neutral-600 hover:bg-neutral-100"
        data-testid="bulk-clear"
      >
        <X className="h-3.5 w-3.5 sm:mr-1" />
        <span className="hidden sm:inline">Hủy chọn</span>
      </Button>

      <Button
        type="button"
        onClick={onConfirm}
        disabled={submitting}
        data-testid="bulk-confirm"
        className={cn(
          "h-8 rounded-xl px-3 sm:px-4 text-xs font-bold shadow-sm transition-all",
          "bg-emerald-600 text-white hover:bg-emerald-700 active:scale-[0.98]",
          submitting && "opacity-70",
        )}
      >
        {submitting ? (
          <>
            <span className="inline-block h-3 w-3 mr-1.5 rounded-full border-2 border-white/40 border-t-white animate-spin" />
            Đang check-in...
          </>
        ) : (
          <>
            <CheckCircle2 className="h-3.5 w-3.5 sm:mr-1.5" />
            <span className="tabular-nums">{confirmLabel} ({selected})</span>
          </>
        )}
      </Button>
    </div>
  );
}
