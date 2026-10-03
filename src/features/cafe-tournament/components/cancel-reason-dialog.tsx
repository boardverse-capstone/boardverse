"use client";

import { useRef, useState } from "react";
import { XCircle } from "lucide-react";
import { toast } from "sonner";

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
import { cn } from "@/lib/utils";

export interface CancelReasonDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  /**
   * Đối tượng bị hủy — quyết định label nút primary, tiêu đề, mô tả.
   * VD: "giải đấu", "bàn đấu", "tuyển thủ", "vòng đấu"
   */
  scope: "tournament" | "match" | "participant" | "round";
  /** Tên cụ thể (nếu có) để hiện trong mô tả. VD: tên giải, tên bàn. */
  subjectName?: string;
  /** Độ dài tối thiểu của lý do (ký tự đã trim). Mặc định 5. */
  minLength?: number;
  /** Cho phép bỏ trống? Mặc định false. */
  allowEmpty?: boolean;
  /** Đang submit — disable nút primary + textarea. */
  submitting?: boolean;
  /** Được gọi với lý do đã trim khi user xác nhận. */
  onConfirm: (reason: string) => void | Promise<void>;
}

const SCOPE_COPY = {
  tournament: {
    title: "Hủy giải đấu?",
    description:
      "Hành động này sẽ dừng toàn bộ giải và thông báo cho các tuyển thủ đã đăng ký. Không thể khôi phục.",
    confirmLabel: "Hủy giải đấu",
    pendingLabel: "Đang hủy giải…",
  },
  match: {
    title: "Hủy bàn đấu?",
    description:
      "Bàn đấu sẽ bị đánh dấu hủy và không cập nhật điểm Elo/Karma cho ván này.",
    confirmLabel: "Hủy bàn đấu",
    pendingLabel: "Đang hủy bàn…",
  },
  participant: {
    title: "Loại tuyển thủ?",
    description:
      "Tuyển thủ sẽ bị loại khỏi danh sách và không thể tham gia các vòng tiếp theo.",
    confirmLabel: "Loại tuyển thủ",
    pendingLabel: "Đang loại…",
  },
  round: {
    title: "Hủy vòng đấu?",
    description:
      "Toàn bộ bàn đấu trong vòng này sẽ bị hủy theo. Không thể khôi phục.",
    confirmLabel: "Hủy vòng đấu",
    pendingLabel: "Đang hủy vòng…",
  },
} as const;

export function CancelReasonDialog({
  open,
  onOpenChange,
  scope,
  subjectName,
  minLength = 5,
  allowEmpty = false,
  submitting = false,
  onConfirm,
}: CancelReasonDialogProps) {
  const [reason, setReason] = useState("");
  // Guard tránh double-click / Enter liên tục gọi onConfirm 2 lần song song
  const submittingRef = useRef(false);
  const copy = SCOPE_COPY[scope];

  const trimmed = reason.trim();
  const tooShort = !allowEmpty && trimmed.length < minLength;
  const empty = trimmed.length === 0;

  const reset = () => setReason("");

  const handleConfirm = async () => {
    if (tooShort || submittingRef.current) return;
    submittingRef.current = true;
    try {
      await onConfirm(trimmed);
      reset();
      onOpenChange(false);
    } catch (err) {
      const message =
        err instanceof Error ? err.message : "Không thể hoàn tất thao tác.";
      toast.error(message);
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
          <AlertDialogMedia className="bg-destructive/10 text-destructive">
            <XCircle aria-hidden="true" />
          </AlertDialogMedia>
          <div className="flex flex-col gap-1.5">
            <AlertDialogTitle>
              {copy.title}
              {subjectName && (
                <>
                  {" — "}
                  <span className="text-foreground/90">{subjectName}</span>
                </>
              )}
            </AlertDialogTitle>
            <AlertDialogDescription>{copy.description}</AlertDialogDescription>
          </div>
        </AlertDialogHeader>

        <div className="flex flex-col gap-1.5">
          <label
            htmlFor="cancel-reason"
            className="text-xs font-semibold uppercase tracking-wider text-muted-foreground"
          >
            Lý do {allowEmpty ? "(không bắt buộc)" : ""}
          </label>
          <textarea
            id="cancel-reason"
            value={reason}
            onChange={(e) => setReason(e.target.value)}
            disabled={submitting}
            placeholder={
              allowEmpty
                ? "Nhập lý do nếu có…"
                : `Mô tả ngắn (tối thiểu ${minLength} ký tự)…`
            }
            rows={3}
            aria-invalid={!empty && tooShort}
            aria-describedby={tooShort ? "cancel-reason-error" : undefined}
            className={cn(
              "w-full resize-none rounded-md border border-input bg-background px-3 py-2 text-sm text-foreground",
              "placeholder:text-muted-foreground",
              "focus:outline-none focus-visible:ring-[3px] focus-visible:ring-ring/50",
              "disabled:cursor-not-allowed disabled:opacity-60",
              !empty && tooShort && "border-destructive",
            )}
          />
          <p
            id="cancel-reason-error"
            role="alert"
            aria-live="polite"
            className={cn(
              "text-xs font-medium text-destructive",
              (!empty && tooShort) ? "block" : "sr-only",
            )}
          >
            {!empty && tooShort
              ? `Vui lòng nhập ít nhất ${minLength} ký tự để hệ thống ghi log.`
              : ""}
          </p>
        </div>

        <AlertDialogFooter>
          <AlertDialogCancel disabled={submitting}>Đóng</AlertDialogCancel>
          <Button
            type="button"
            variant="destructive"
            disabled={tooShort || submitting}
            aria-busy={submitting || undefined}
            onClick={handleConfirm}
            className="h-9"
          >
            {submitting ? copy.pendingLabel : copy.confirmLabel}
          </Button>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
