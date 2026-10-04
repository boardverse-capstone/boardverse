"use client";

import { useRef, useState } from "react";
import { Sparkles, AlertTriangle } from "lucide-react";

import {
  AlertDialog,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogMedia,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";

export interface StartWithOptionsDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  /** Tên giải đấu — hiển thị trong tiêu đề. */
  tournamentTitle: string;
  /** Số VĐV hiện tại đã đăng ký / check-in (tùy context). */
  currentParticipants: number;
  /** Ngưỡng tối thiểu mà Manager muốn biết để ra quyết định. */
  minParticipants: number;
  /** Message lỗi gốc từ `/start` để Manager hiểu vì sao bị chặn. */
  reasonFromBackend?: string;
  /** Đang submit — disable nút primary + textarea. */
  submitting?: boolean;
  /**
   * Được gọi với:
   *  - reducedRounds: 0 = giữ nguyên, >0 = giảm số vòng Swiss
   *  - reason: lý do Manager muốn bắt đầu dù chưa đủ VĐV (bắt buộc)
   */
  onConfirm: (dto: {
    reducedRounds: number;
    reason: string;
  }) => void | Promise<void>;
}

/**
 * Dialog đề xuất Manager dùng POST `/start-with-options` khi:
 *  - `/start` fail vì không đủ VĐV (MinParticipants)
 *  - Manager muốn vẫn tiến hành giải (vd: VĐV vẫn đang trên đường tới)
 *
 * Khác với CancelReasonDialog:
 *  - Có thêm field "Số vòng muốn rút gọn" (mặc định 0 = giữ nguyên)
 *  - Tone: cảnh báo amber (không phải destructive)
 */
export function StartWithOptionsDialog({
  open,
  onOpenChange,
  tournamentTitle,
  currentParticipants,
  minParticipants,
  reasonFromBackend,
  submitting = false,
  onConfirm,
}: StartWithOptionsDialogProps) {
  const [reason, setReason] = useState("");
  const [reducedRounds, setReducedRounds] = useState<number>(0);
  // Guard tránh double-click / Enter liên tục gọi onConfirm 2 lần song song
  const submittingRef = useRef(false);

  const trimmed = reason.trim();
  const reasonTooShort = trimmed.length < 5;
  const reducedInvalid = reducedRounds < 0 || reducedRounds > 10;
  const canConfirm = !reasonTooShort && !reducedInvalid && !submitting;

  const reset = () => {
    setReason("");
    setReducedRounds(0);
  };

  const handleConfirm = async () => {
    if (!canConfirm || submittingRef.current) return;
    submittingRef.current = true;
    try {
      await onConfirm({ reducedRounds, reason: trimmed });
      reset();
      onOpenChange(false);
    } finally {
      submittingRef.current = false;
    }
  };

  return (
    <AlertDialog
      open={open}
      onOpenChange={(next) => {
        if (!next) reset();
        onOpenChange(next);
      }}
    >
      <AlertDialogContent size="default">
        <AlertDialogHeader>
          <AlertDialogMedia className="bg-amber-500/10 text-amber-600">
            <Sparkles aria-hidden="true" />
          </AlertDialogMedia>
          <div className="flex flex-col gap-1.5">
            <AlertDialogTitle>
              Bắt đầu với tùy chọn — {tournamentTitle}
            </AlertDialogTitle>
            <AlertDialogDescription>
              Số VĐV hiện tại <strong>{currentParticipants}</strong>{" "}
              {currentParticipants < minParticipants ? (
                <span className="text-amber-700">
                  dưới ngưỡng tối thiểu {minParticipants}
                </span>
              ) : (
                <span>(đủ điều kiện)</span>
              )}
              . Manager có thể vẫn tiến hành bằng endpoint{" "}
              <code className="rounded bg-muted px-1 py-0.5 text-[11px]">
                POST /start-with-options
              </code>
              .
            </AlertDialogDescription>
          </div>
        </AlertDialogHeader>

        {/* Hiển thị lỗi gốc từ /start để Manager hiểu vì sao bị chặn */}
        {reasonFromBackend && (
          <div className="flex items-start gap-2 rounded-md border border-amber-200 bg-amber-50 px-3 py-2 text-xs text-amber-900">
            <AlertTriangle className="mt-0.5 h-3.5 w-3.5 shrink-0" />
            <span className="font-medium">{reasonFromBackend}</span>
          </div>
        )}

        <div className="flex flex-col gap-3">
          {/* Field 1: Số vòng muốn rút gọn */}
          <div className="flex flex-col gap-1.5">
            <label
              htmlFor="reduced-rounds"
              className="text-xs font-semibold uppercase tracking-wider text-muted-foreground"
            >
              Số vòng muốn rút gọn
              <span className="ml-1 text-[10px] font-medium text-muted-foreground/80 normal-case">
                (0 = giữ nguyên, tối đa 10)
              </span>
            </label>
            <Input
              id="reduced-rounds"
              type="number"
              min={0}
              max={10}
              value={reducedRounds}
              disabled={submitting}
              onChange={(e) => {
                const v = Number.parseInt(e.target.value, 10);
                setReducedRounds(Number.isNaN(v) ? 0 : v);
              }}
              className={cn(
                "h-9",
                reducedInvalid && "border-destructive",
              )}
              aria-invalid={reducedInvalid}
            />
            {reducedInvalid && (
              <p
                role="alert"
                aria-live="polite"
                className="text-xs font-medium text-destructive"
              >
                Số vòng phải từ 0 đến 10.
              </p>
            )}
          </div>

          {/* Field 2: Lý do — bắt buộc để log audit */}
          <div className="flex flex-col gap-1.5">
            <label
              htmlFor="start-with-options-reason"
              className="text-xs font-semibold uppercase tracking-wider text-muted-foreground"
            >
              Lý do bắt đầu dù chưa đủ VĐV
              <span className="ml-1 text-[10px] font-medium text-destructive normal-case">
                * bắt buộc
              </span>
            </label>
            <textarea
              id="start-with-options-reason"
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              disabled={submitting}
              placeholder="Vd: 2 VĐV đang trên đường tới, dời 15 phút được…"
              rows={3}
              aria-invalid={reasonTooShort && trimmed.length > 0}
              className={cn(
                "w-full resize-none rounded-md border border-input bg-background px-3 py-2 text-sm text-foreground",
                "placeholder:text-muted-foreground",
                "focus:outline-none focus-visible:ring-[3px] focus-visible:ring-ring/50",
                "disabled:cursor-not-allowed disabled:opacity-60",
                reasonTooShort && trimmed.length > 0 && "border-destructive",
              )}
            />
            <p
              role="alert"
              aria-live="polite"
              className={cn(
                "text-xs font-medium text-destructive",
                reasonTooShort && trimmed.length > 0 ? "block" : "sr-only",
              )}
            >
              Vui lòng nhập ít nhất 5 ký tự để hệ thống ghi log.
            </p>
          </div>
        </div>

        <AlertDialogFooter>
          <AlertDialogCancel disabled={submitting}>Đóng</AlertDialogCancel>
          <Button
            type="button"
            disabled={!canConfirm}
            aria-busy={submitting || undefined}
            onClick={handleConfirm}
            className="h-9 bg-amber-600 text-white hover:bg-amber-700"
          >
            {submitting ? "Đang bắt đầu…" : "Bắt đầu với tùy chọn"}
          </Button>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}