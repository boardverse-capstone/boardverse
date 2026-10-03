"use client";

import { useState } from "react";
import { Loader2, Power, AlertTriangle } from "lucide-react";
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
import { useCloseCafe } from "../hooks/useCafeMe";

export interface CloseCafeDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
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
 * CloseCafeDialog — confirmation dialog cho state-change
 * `ACTIVE/DATA_BLANK → INACTIVE`. Destructive tone (Power icon,
 * destructive button). Khi đã INACTIVE, có thể mở lại bằng reopen.
 */
export function CloseCafeDialog({
  open,
  onOpenChange,
  cafeName,
}: CloseCafeDialogProps) {
  const close = useCloseCafe();
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const isSubmitting = close.isPending;

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
              className="inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-destructive/10 text-destructive"
            >
              <Power className="h-5 w-5" aria-hidden />
            </span>
            <div className="space-y-1.5">
              <AlertDialogTitle className="text-lg font-bold tracking-tight text-neutral-900 leading-tight">
                Ngừng kinh doanh cơ sở?
              </AlertDialogTitle>
              <AlertDialogDescription className="text-helper font-normal leading-relaxed">
                {cafeName
                  ? `Cơ sở "${cafeName}" sẽ ngừng kinh doanh. Khách sẽ không thấy quán trên Boardverse. Bạn vẫn có thể mở lại bằng nút "Mở lại quán" ở trang này.`
                  : "Cơ sở sẽ ngừng kinh doanh. Bạn vẫn có thể mở lại bằng nút Mở lại quán ở trang này."}
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
              close.mutate(undefined, {
                onSuccess: () => {
                  onOpenChange(false);
                  setErrorMessage(null);
                },
                onError: (err: Error) => {
                  setErrorMessage(err.message || "Ngừng kinh doanh thất bại.");
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
                Đang xử lý…
              </>
            ) : (
              <>
                <Power className="h-3.5 w-3.5 mr-1.5" aria-hidden />
                Ngừng kinh doanh
              </>
            )}
          </Button>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}