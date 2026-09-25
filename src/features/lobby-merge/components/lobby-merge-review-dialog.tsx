"use client";

// src/features/lobby-merge/components/lobby-merge-review-dialog.tsx

import { useEffect, useState } from "react";
import { Check, X } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Spinner } from "@/components/ui/spinner";
import { Badge } from "@/components/ui/badge";
import { useApproveMergeRequest, useRejectMergeRequest } from "../hooks/useMergeRequestMutations";
import type { LobbyMergeRequestDto } from "../types/lobby-merge.interface";

export interface LobbyMergeReviewDialogProps {
  cafeId: string;
  request: LobbyMergeRequestDto | null;
  mode: "approve" | "reject";
  isOpen: boolean;
  onClose: () => void;
  /**
   * Demo bypass — bỏ qua BR-USER-LIMIT-02/03.
   * Mặc định BẬT cho khớp với rule `lobby-merge.md` (mục Demo mode).
   */
  bypassDemoLocks?: boolean;
}

export function LobbyMergeReviewDialog({
  cafeId,
  request,
  mode,
  isOpen,
  onClose,
  bypassDemoLocks = true,
}: LobbyMergeReviewDialogProps) {
  const [note, setNote] = useState("");

  const approve = useApproveMergeRequest();
  const reject = useRejectMergeRequest();
  const mutation = mode === "approve" ? approve : reject;
  const busy = mutation.isPending;

  useEffect(() => {
    if (isOpen) setNote("");
  }, [isOpen, request?.id]);

  if (!request) return null;

  const handleSubmit = () => {
    if (note.length > 500) {
      return;
    }
    const trimmed = note.trim() || undefined;
    if (mode === "approve") {
      approve.mutate(
        {
          cafeId,
          requestId: request.id,
          payload: trimmed ? { reviewNote: trimmed } : undefined,
          opts: { bypassDemoLocks },
        },
        { onSuccess: () => onClose() },
      );
    } else {
      reject.mutate(
        {
          cafeId,
          requestId: request.id,
          payload: trimmed ? { reviewNote: trimmed } : undefined,
        },
        { onSuccess: () => onClose() },
      );
    }
  };

  const title =
    mode === "approve" ? "Duyệt yêu cầu ghép nhóm" : "Từ chối yêu cầu ghép nhóm";

  const description =
    mode === "approve"
      ? "BE sẽ thực hiện atomic transaction: khóa ActiveSession đích, validate ghế / lịch / cap deposit, chuyển member sang lobby đích."
      : "Từ chối yêu cầu — lobby / session / reservation không thay đổi.";

  return (
    <Dialog open={isOpen} onOpenChange={(open) => (!open && !busy ? onClose() : null)}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            {mode === "approve" ? (
              <Check className="size-4 text-emerald-600" />
            ) : (
              <X className="size-4 text-rose-600" />
            )}
            {title}
          </DialogTitle>
          <DialogDescription>{description}</DialogDescription>
        </DialogHeader>

        <div className="space-y-3 text-sm">
          <div className="grid grid-cols-2 gap-3 rounded-md border border-neutral-200 bg-neutral-50/60 p-3">
            <div>
              <p className="text-xs font-medium text-neutral-500">Lobby nguồn</p>
              <p className="font-semibold text-neutral-900">
                {request.sourceLobbyName || request.sourceLobbyId.slice(0, 8)}
              </p>
              <p className="text-xs text-neutral-600">
                {request.sourceMembersCount} thành viên · active{" "}
                {request.sourceActiveMembersAtRequest}
              </p>
            </div>
            <div>
              <p className="text-xs font-medium text-neutral-500">Lobby đích</p>
              <p className="font-semibold text-neutral-900">
                {request.targetLobbyName || request.targetLobbyId.slice(0, 8)}
              </p>
              <p className="text-xs text-neutral-600">
                {request.combinedCount != null
                  ? `Tổng ${request.combinedCount} người`
                  : ""}{" "}
                {request.seatCapacity != null
                  ? `· ghế ${request.seatCapacity}`
                  : ""}
              </p>
            </div>
          </div>

          {request.fitsCapacity === false ? (
            <div className="rounded-md border border-amber-300 bg-amber-50 p-2 text-xs text-amber-900">
              ⚠ Ghế khả dụng có thể đã thay đổi — BE sẽ validate lại trước khi duyệt.
            </div>
          ) : null}

          {request.reason ? (
            <div>
              <p className="text-xs font-medium text-neutral-500">Lý do tạo yêu cầu</p>
              <p className="rounded-md border bg-white p-2 text-sm">{request.reason}</p>
            </div>
          ) : null}

          <div className="flex flex-wrap items-center gap-2 text-xs text-neutral-600">
            <Badge variant="outline">Hết hạn {new Date(request.expiresAt).toLocaleString("vi-VN")}</Badge>
            {bypassDemoLocks && mode === "approve" ? (
              <Badge variant="outline" className="border-orange-200 bg-orange-50 text-orange-700">
                Demo bypass BR-USER-LIMIT-02/03
              </Badge>
            ) : null}
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="merge-review-note">Ghi chú (tuỳ chọn)</Label>
            <Textarea
              id="merge-review-note"
              value={note}
              onChange={(e) => setNote(e.target.value)}
              placeholder={
                mode === "approve"
                  ? "Ví dụ: Đã xác nhận đủ chỗ, cho ghép."
                  : "Ví dụ: Lobby đích không còn active."
              }
              rows={2}
              maxLength={500}
            />
            <p className="text-right text-xs text-neutral-500">{note.length}/500</p>
          </div>
        </div>

        <DialogFooter>
          <Button type="button" variant="outline" onClick={onClose} disabled={busy}>
            Đóng
          </Button>
          <Button
            type="button"
            onClick={() => void handleSubmit()}
            disabled={busy}
            variant={mode === "approve" ? "default" : "destructive"}
            className="min-w-32"
          >
            {busy ? <Spinner className="size-4" /> : null}
            {busy ? "Đang xử lý…" : mode === "approve" ? "Duyệt" : "Từ chối"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
