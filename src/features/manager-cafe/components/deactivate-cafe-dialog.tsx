"use client";

import { useState } from "react";
import { Loader2, Pause, AlertTriangle } from "lucide-react";
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
import { useDeactivateCafe } from "../hooks/useCafeMe";

export interface DeactivateCafeDialogProps {
  /** Điều khiển mở/đóng từ status header. */
  open: boolean;
  onOpenChange: (open: boolean) => void;
  /** Tên cơ sở — dùng trong copy để cá nhân hoá. */
  cafeName: string;
}

/**
 * Inline error message block — remount mỗi lần mở dialog (key={open})
 * để message tự reset về null, tránh cascading renders.
 */
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
 * DeactivateCafeDialog — confirmation dialog cho state-change
 * `ACTIVE → DATA_BLANK`. Cùng vocabulary với ActivateCafeDialog
 * (focus-protected AlertDialog, max-w-md, h-10 h-px-4 h-py-2 buttons)
 * nhưng đổi icon sang Pause và copy sang "tạm dừng".
 */
export function DeactivateCafeDialog({
  open,
  onOpenChange,
  cafeName,
}: DeactivateCafeDialogProps) {
  const deactivate = useDeactivateCafe();
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const isSubmitting = deactivate.isPending;

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
              className="inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-amber-50 text-amber-700"
            >
              <Pause className="h-5 w-5" aria-hidden />
            </span>
            <div className="space-y-1.5">
              <AlertDialogTitle className="text-lg font-bold tracking-tight text-neutral-900 leading-tight">
                Tạm dừng cơ sở?
              </AlertDialogTitle>
              <AlertDialogDescription className="text-helper font-normal leading-relaxed">
                {cafeName
                  ? `Cơ sở "${cafeName}" sẽ tạm dừng hoạt động. Khách sẽ không thấy quán trên Boardverse cho đến khi bạn kích hoạt lại.`
                  : "Cơ sở sẽ tạm dừng hoạt động. Khách sẽ không thấy quán trên Boardverse cho đến khi bạn kích hoạt lại."}
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
              deactivate.mutate(undefined, {
                onSuccess: () => {
                  onOpenChange(false);
                  setErrorMessage(null);
                },
                onError: (err: Error) => {
                  setErrorMessage(err.message || "Tạm dừng thất bại.");
                },
              });
            }}
            className="text-xs font-semibold rounded-lg px-4 py-2 w-full sm:w-auto bg-amber-600 text-white hover:bg-amber-700"
          >
            {isSubmitting ? (
              <>
                <Loader2
                  className="h-3.5 w-3.5 mr-1.5 animate-spin"
                  aria-hidden
                />
                Đang tạm dừng…
              </>
            ) : (
              <>
                <Pause className="h-3.5 w-3.5 mr-1.5" aria-hidden />
                Tạm dừng quán
              </>
            )}
          </Button>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}