"use client";

import { useState } from "react";
import {
  X,
  ClipboardCheck,
  CheckCircle2,
  AlertTriangle,
  Boxes,
  Zap,
} from "lucide-react";
import { NumberStepper } from "./number-stepper";
import {
  backdropCloseHandler,
  useDismissOnBackdrop,
} from "../lib/use-dismiss-on-backdrop";

export interface ComponentCheckItem {
  componentId: string;
  componentName: string;
  componentKind?: string | null;
  expectedQuantity: number;
  actualQuantity: number;
  penaltyFee?: number;
}

interface ComponentChecklistModalProps {
  isOpen: boolean;
  onClose: () => void;
  sessionGameData: {
    sessionGameId: string;
    gameName: string;
    components: Array<{
      componentId: string;
      componentName: string;
      componentKind?: string | null;
      expectedQuantity: number;
    }>;
  } | null;
  onSubmitCheck: (payload: {
    sessionGameId: string;
    markAllValid: boolean;
    results: ComponentCheckItem[];
  }) => Promise<boolean>;
}

export function ComponentChecklistModal({
  isOpen,
  onClose,
  sessionGameData,
  onSubmitCheck,
}: ComponentChecklistModalProps) {
  const [prevSessionGameId, setPrevSessionGameId] = useState<string | null>(
    null,
  );
  const [items, setItems] = useState<ComponentCheckItem[]>([]);
  const [markAllValid, setMarkAllValid] = useState<boolean>(true);
  const [submitting, setSubmitting] = useState<boolean>(false);

  const currentId = sessionGameData?.sessionGameId || null;

  useDismissOnBackdrop(
    isOpen,
    () => {
      if (submitting) return;
      onClose();
    },
    { busy: submitting },
  );

  if (isOpen && currentId !== prevSessionGameId) {
    setPrevSessionGameId(currentId);
    if (sessionGameData) {
      setItems(
        sessionGameData.components.map((c) => ({
          componentId: c.componentId,
          componentName: c.componentName,
          componentKind: c.componentKind,
          expectedQuantity: c.expectedQuantity,
          actualQuantity: c.expectedQuantity,
          penaltyFee: 0,
        })),
      );
      setMarkAllValid(true);
    }
  }

  if (!isOpen || !sessionGameData) return null;

  const handleQuantityChange = (index: number, val: number) => {
    setMarkAllValid(false);
    setItems((prev) =>
      prev.map((item, i) =>
        i === index
          ? {
              ...item,
              actualQuantity: Math.max(0, val),
            }
          : item,
      ),
    );
  };

  const handleSetAllValid = () => {
    setMarkAllValid(true);
    setItems((prev) =>
      prev.map((item) => ({
        ...item,
        actualQuantity: item.expectedQuantity,
      })),
    );
  };

  const handleSubmit = async () => {
    setSubmitting(true);
    const success = await onSubmitCheck({
      sessionGameId: sessionGameData.sessionGameId,
      markAllValid,
      results: items,
    });
    setSubmitting(false);
    if (success) onClose();
  };

  const totalMissing = items.reduce(
    (sum, item) =>
      sum + Math.max(0, item.expectedQuantity - item.actualQuantity),
    0,
  );

  return (
    <div
      className="fixed inset-0 bg-neutral-950/70 backdrop-blur-xs z-[70] flex items-center justify-center p-4"
      onClick={backdropCloseHandler(
        () => {
          if (submitting) return;
          onClose();
        },
        submitting,
      )}
    >
      {/* MODAL CONTAINER */}
      <div
        className="relative max-w-lg w-full overflow-hidden rounded-2xl border-2 border-amber-400 bg-gradient-to-br from-amber-50 via-yellow-50 to-orange-50 shadow-[6px_6px_0_rgba(234,179,8,0.4)]"
        onClick={(event) => event.stopPropagation()}
      >
        {/* CRT scanlines */}
        <div className="pointer-events-none absolute inset-0 bg-[repeating-linear-gradient(0deg,transparent_0,transparent_3px,rgba(255,255,255,0.05)_3px,rgba(255,255,255,0.05)_4px)]" />
        {/* LED corners */}
        <span className="pointer-events-none absolute -left-0.5 -top-0.5 size-2 animate-pulse rounded-full bg-amber-500 shadow-[0_0_10px_currentColor]" />
        <span className="pointer-events-none absolute -right-0.5 -bottom-0.5 size-2 animate-pulse rounded-full bg-orange-500 shadow-[0_0_10px_currentColor] [animation-delay:0.4s]" />
        <span className="pointer-events-none absolute -right-0.5 -top-0.5 size-1.5 animate-pulse rounded-full bg-yellow-400 shadow-[0_0_8px_currentColor]" />
        <span className="pointer-events-none absolute -left-0.5 -bottom-0.5 size-1.5 animate-pulse rounded-full bg-amber-500 shadow-[0_0_8px_currentColor] [animation-delay:0.2s]" />

        {/* HEADER */}
        <div className="relative flex items-center justify-between border-b-2 border-amber-300/70 bg-gradient-to-r from-amber-100 via-yellow-100 to-orange-100 px-5 py-3">
          <div className="flex items-center gap-3">
            {/* Icon với glow */}
            <div className="relative p-2.5 rounded-xl border-2 border-amber-400 bg-gradient-to-br from-amber-400 to-orange-500 shadow-[inset_0_-2px_0_rgba(0,0,0,0.2),0_0_12px_rgba(234,179,8,0.5)]">
              <ClipboardCheck className="w-5 h-5 text-white" />
              <span className="absolute -right-1 -top-1 size-2 animate-pulse rounded-full bg-yellow-400 shadow-[0_0_8px_currentColor]" />
            </div>
            <div>
              <h3 className="font-mono text-sm font-extrabold uppercase tracking-widest text-amber-950">
                ► Kiểm Kê Linh Kiện
              </h3>
              <p className="font-mono text-[10px] font-bold uppercase tracking-widest text-amber-700">
                <span className="text-amber-400">▸</span> Game:{" "}
                <strong className="text-amber-900">
                  {sessionGameData.gameName}
                </strong>
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="rounded-xl border-2 border-amber-300 bg-white p-1.5 font-mono text-amber-500 shadow-[2px_2px_0_rgba(234,179,8,0.3)] transition-all hover:border-amber-500 hover:bg-amber-50"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* TOOLBAR */}
        <div className="relative flex items-center justify-between p-3 border-b-2 border-amber-200/60 bg-gradient-to-r from-amber-50/80 to-yellow-50/80">
          <div className="flex items-center gap-2 font-mono text-[11px] font-bold uppercase tracking-widest text-amber-700">
            <span className="size-1.5 rounded-full bg-amber-500 shadow-[0_0_6px_currentColor] animate-pulse" />
            <Boxes className="w-3.5 h-3.5" />
            <span>
              Tổng: <strong className="text-amber-950">{items.length}</strong> loại linh kiện
            </span>
          </div>

          <button
            type="button"
            onClick={handleSetAllValid}
            className="inline-flex h-8 items-center gap-1.5 rounded-xl border-2 border-orange-600 bg-gradient-to-b from-orange-500 to-orange-700 px-3 font-mono text-[11px] font-extrabold uppercase tracking-widest text-white shadow-[inset_0_-2px_0_rgba(0,0,0,0.2),2px_2px_0_rgba(0,0,0,0.15)] transition-all hover:from-orange-400 hover:to-orange-600"
          >
            <Zap className="w-3 h-3 text-yellow-300" />
            Đủ Tất Cả
          </button>
        </div>

        {/* DANH SÁCH LINH KIỆN */}
        <div className="relative max-h-64 overflow-y-auto space-y-2 px-4 py-3 scrollbar-thin">
          {items.map((item, index) => {
            const isMissing = item.actualQuantity < item.expectedQuantity;

            return (
              <div
                key={item.componentId}
                className={[
                  "relative overflow-hidden rounded-xl border-2 p-3 shadow-[2px_2px_0_rgba(0,0,0,0.15)] transition-all",
                  isMissing
                    ? "border-orange-400 bg-gradient-to-br from-orange-50 via-orange-50 to-amber-50 shadow-[2px_2px_0_rgba(249,115,22,0.3)]"
                    : "border-orange-400 bg-gradient-to-br from-orange-50 via-white to-amber-50 shadow-[2px_2px_0_rgba(249,115,22,0.25)]",
                ].join(" ")}
              >
                {/* LED dot */}
                <span className={[
                  "pointer-events-none absolute right-3 top-3 size-1.5 animate-pulse rounded-full shadow-[0_0_6px_currentColor]",
                  isMissing ? "bg-orange-500" : "bg-orange-500",
                ].join(" ")} />

                <div className="flex items-center justify-between gap-3 pr-5">
                  <div className="space-y-0.5 min-w-0 flex-1">
                    <div className="truncate font-mono text-xs font-extrabold uppercase tracking-wide text-amber-950">
                      ► {item.componentName}
                    </div>
                    <div className="flex items-center gap-3 font-mono text-[10px] font-bold uppercase tracking-widest text-amber-600">
                      <span>
                        <span className="text-amber-400">▸</span> Chuẩn:{" "}
                        <strong className="text-amber-900">
                          {item.expectedQuantity}
                        </strong>
                      </span>
                      {item.componentKind && (
                        <span className="inline-flex items-center gap-1 rounded border border-amber-300 bg-amber-50 px-1.5 py-0.5 text-[9px] text-amber-700 shadow-[inset_0_-1px_0_rgba(0,0,0,0.06)]">
                          {item.componentKind}
                        </span>
                      )}
                    </div>
                  </div>

                  <div className="flex items-center gap-2 shrink-0">
                    <span className="font-mono text-[10px] font-bold uppercase tracking-widest text-amber-600">
                      Thực tế:
                    </span>
                    <NumberStepper
                      value={item.actualQuantity}
                      onChange={(next) => handleQuantityChange(index, next)}
                      min={0}
                      max={Math.max(item.expectedQuantity, item.actualQuantity)}
                      size="sm"
                      ariaLabelDec={`Giảm ${item.componentName}`}
                      ariaLabelInc={`Tăng ${item.componentName}`}
                    />

                    {isMissing ? (
                      <span className="inline-flex items-center gap-1 rounded-lg border-2 border-orange-400 bg-gradient-to-b from-orange-400 to-orange-600 px-2 py-1 font-mono text-[10px] font-extrabold uppercase tracking-widest text-white shadow-[inset_0_-1px_0_rgba(0,0,0,0.2),1px_1px_0_rgba(0,0,0,0.15)]">
                        <AlertTriangle className="w-3 h-3 text-yellow-300" />
                        -{item.expectedQuantity - item.actualQuantity}
                      </span>
                    ) : (
                      <CheckCircle2 className="w-5 h-5 text-orange-600 shrink-0 drop-shadow-[0_0_4px_rgba(249,115,22,0.6)]" />
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </div>

        {/* ALERT THIẾU LINH KIỆN */}
        {totalMissing > 0 && (
          <div className="relative mx-4 mb-2 flex items-start gap-3 rounded-xl border-2 border-orange-400 bg-gradient-to-r from-orange-100 via-orange-50 to-amber-100 p-3 shadow-[3px_3px_0_rgba(249,115,22,0.35)]">
            <div className="relative shrink-0">
              <AlertTriangle className="w-5 h-5 text-orange-600" />
              <span className="absolute -right-0.5 -top-0.5 size-1.5 animate-pulse rounded-full bg-orange-400 shadow-[0_0_6px_currentColor]" />
            </div>
            <p className="font-mono text-[11px] font-bold leading-relaxed tracking-wide text-orange-900">
              Phát hiện <strong className="text-orange-700">{totalMissing}</strong> linh kiện bị thiếu/hỏng.
              Hệ thống sẽ tự động tính phí phạt linh kiện.
            </p>
          </div>
        )}

        {/* FOOTER ACTIONS */}
        <div className="relative flex justify-end gap-2 border-t-2 border-amber-300/70 bg-gradient-to-r from-amber-100/60 to-orange-100/60 px-5 py-3">
          <button
            type="button"
            onClick={onClose}
            className="inline-flex h-9 items-center justify-center gap-1.5 rounded-xl border-2 border-neutral-400 bg-gradient-to-b from-neutral-100 to-neutral-200 px-5 font-mono text-[11px] font-extrabold uppercase tracking-widest text-neutral-700 shadow-[inset_0_-2px_0_rgba(0,0,0,0.1),2px_2px_0_rgba(0,0,0,0.1)] transition-all hover:from-neutral-200 hover:to-neutral-300"
          >
            ✕ Hủy
          </button>

          <button
            type="button"
            disabled={submitting}
            onClick={handleSubmit}
            className="relative inline-flex h-9 items-center justify-center gap-1.5 rounded-xl border-2 border-neutral-800 bg-gradient-to-b from-neutral-700 to-neutral-950 px-4 font-mono text-[11px] font-extrabold uppercase tracking-widest text-white shadow-[inset_0_-2px_0_rgba(0,0,0,0.3),3px_3px_0_rgba(0,0,0,0.2)] transition-all hover:from-neutral-600 hover:to-neutral-900 disabled:cursor-not-allowed disabled:from-gray-400 disabled:to-gray-500 disabled:shadow-[inset_0_-2px_0_rgba(0,0,0,0.2)]"
          >
            {submitting ? (
              <>
                <span className="size-1.5 animate-pulse rounded-full bg-white shadow-[0_0_6px_currentColor]" />
                Đang xử lý...
              </>
            ) : (
              <>
                <Zap className="w-3.5 h-3.5 text-yellow-400" />
                Xác Nhận & Mở Khóa In Hóa Đơn
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
}
