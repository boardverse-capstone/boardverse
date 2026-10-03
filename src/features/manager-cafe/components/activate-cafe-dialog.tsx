"use client";

import { useState } from "react";
import { Loader2, Sparkles, AlertTriangle } from "lucide-react";
import {
  AlertDialog,
  AlertDialogContent,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogCancel,
} from "@/components/ui/alert-dialog";
import { Button } from "@/components/ui/button";
import { useActivateCafe } from "../hooks/useCafeMe";

export interface ActivateCafeDialogProps {
  /** Điều khiển mở/đóng từ form. */
  open: boolean;
  onOpenChange: (open: boolean) => void;
  /** Tên cơ sở — dùng trong copy để cá nhân hoá. */
  cafeName: string;
}

/** Inline error message block — remount mỗi lần mở dialog. */
function ErrorBlock({ message }: { message: string | null }) {
  if (!message) return null;
  return (
    <div
      role="alert"
      aria-live="assertive"
      className="flex items-start gap-2 text-xs text-destructive px-3 py-2 rounded-lg border border-destructive/30 bg-destructive/5"
    >
      <AlertTriangle
        className="h-3.5 w-3.5 mt-0.5 shrink-0"
        aria-hidden
      />
      <span className="leading-snug">{message}</span>
    </div>
  );
}

/**
 * ActivateCafeDialog — confirmation dialog cho state-change
 * `DATA_BLANK → ACTIVE`. Kế thừa polished form's world: cinnabar
 * primary, `AlertDialog` (focus-protected), `max-w-md` để chứa
 * body mà không wrap. Dialog này chỉ mở khi `canActivate=true`;
 * nếu bị chặn, form đã hiển thị `activationBlockers` inline.
 */
export function ActivateCafeDialog({
  open,
  onOpenChange,
  cafeName,
}: ActivateCafeDialogProps) {
  const activate = useActivateCafe();
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const isSubmitting = activate.isPending;

  return (
    <AlertDialog open={open} onOpenChange={onOpenChange}>
      <AlertDialogContent
        className="bg-white border border-neutral-200 rounded-xl p-6 shadow-[0px_8px_24px_rgba(0,0,0,0.06)] max-w-md mx-auto text-neutral-900 gap-4"
        onEscapeKeyDown={(e) => {
          if (isSubmitting) e.preventDefault();
        }}
      >
        <AlertDialogHeader className="space-y-0">
          <div className="flex items-start gap-3">
            <span
              aria-hidden
              className="inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-primary/10 text-primary"
            >
              <Sparkles className="h-5 w-5" />
            </span>
            <div className="space-y-1.5">
              <AlertDialogTitle className="text-lg font-bold tracking-tight text-neutral-900 leading-tight">
                Kích hoạt cơ sở?
              </AlertDialogTitle>
              <AlertDialogDescription className="text-sm font-normal text-neutral-600 leading-relaxed">
                {cafeName
                  ? `Cơ sở "${cafeName}" sẽ chuyển sang trạng thái Hoạt động. Khách sẽ thấy quán trên Boardverse và có thể đặt bàn.`
                  : "Cơ sở sẽ chuyển sang trạng thái Hoạt động. Khách sẽ thấy quán trên Boardverse và có thể đặt bàn."}
              </AlertDialogDescription>
            </div>
          </div>
        </AlertDialogHeader>

        {/* key={open}: remount khi đóng/mở → message tự reset. */}
        <ErrorBlock key={String(open)} message={errorMessage} />

        <AlertDialogFooter className="pt-2 sm:flex-row sm:justify-end gap-2">
          <AlertDialogCancel
            disabled={isSubmitting}
            className="text-xs font-semibold rounded-lg px-4 py-2 w-full sm:w-auto"
          >
            Huỷ
          </AlertDialogCancel>
          <Button
            type="button"
            disabled={isSubmitting}
            aria-busy={isSubmitting}
            onClick={() => {
              activate.mutate(undefined, {
                onSuccess: () => {
                  onOpenChange(false);
                  setErrorMessage(null);
                },
                onError: (err: Error) => {
                  setErrorMessage(err.message || "Kích hoạt thất bại.");
                },
              });
            }}
            className="text-xs font-semibold rounded-lg px-4 py-2 w-full sm:w-auto"
          >
            {isSubmitting ? (
              <>
                <Loader2
                  className="h-3.5 w-3.5 mr-1.5 animate-spin"
                  aria-hidden
                />
                Đang kích hoạt…
              </>
            ) : (
              <>
                <Sparkles
                  className="h-3.5 w-3.5 mr-1.5"
                  aria-hidden
                />
                Kích hoạt quán
              </>
            )}
          </Button>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}