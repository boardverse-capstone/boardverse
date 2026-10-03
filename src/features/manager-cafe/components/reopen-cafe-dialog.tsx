"use client";

import { useState } from "react";
import { Loader2, RotateCcw, AlertTriangle } from "lucide-react";
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
import { useReopenCafe } from "../hooks/useCafeMe";

export interface ReopenCafeDialogProps {
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
 * ReopenCafeDialog — confirmation dialog cho state-change
 * `INACTIVE → ACTIVE`. Cùng shape với ActivateCafeDialog
 * (Sparkles-tone, cinnabar primary) nhưng icon RotateCcw và
 * copy "Mở lại". Có thể mở lại bất kỳ lúc nào nếu cơ sở đang
 * INACTIVE và đủ điều kiện ràng buộc.
 */
export function ReopenCafeDialog({
  open,
  onOpenChange,
  cafeName,
}: ReopenCafeDialogProps) {
  const reopen = useReopenCafe();
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const isSubmitting = reopen.isPending;

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
              <RotateCcw className="h-5 w-5" aria-hidden />
            </span>
            <div className="space-y-1.5">
              <AlertDialogTitle className="text-lg font-bold tracking-tight text-neutral-900 leading-tight">
                Mở lại cơ sở?
              </AlertDialogTitle>
              <AlertDialogDescription className="text-helper font-normal leading-relaxed">
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
              reopen.mutate(undefined, {
                onSuccess: () => {
                  onOpenChange(false);
                  setErrorMessage(null);
                },
                onError: (err: Error) => {
                  setErrorMessage(err.message || "Mở lại cơ sở thất bại.");
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
                Đang mở lại…
              </>
            ) : (
              <>
                <RotateCcw
                  className="h-3.5 w-3.5 mr-1.5"
                  aria-hidden
                />
                Mở lại quán
              </>
            )}
          </Button>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}