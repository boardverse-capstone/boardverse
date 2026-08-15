"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  X,
  ClipboardCheck,
  CheckCircle2,
  AlertTriangle,
  Boxes,
  Zap,
} from "lucide-react";

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

// ĐẢM BẢO CÓ DÒNG EXPORT FUNCTION NÀY:
export function ComponentChecklistModal({
  isOpen,
  onClose,
  sessionGameData,
  onSubmitCheck,
}: ComponentChecklistModalProps) {
  // State quản lý đồng bộ
  const [prevSessionGameId, setPrevSessionGameId] = useState<string | null>(
    null,
  );
  const [items, setItems] = useState<ComponentCheckItem[]>([]);
  const [markAllValid, setMarkAllValid] = useState<boolean>(true);
  const [submitting, setSubmitting] = useState<boolean>(false);

  const currentId = sessionGameData?.sessionGameId || null;

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
    <div className="fixed inset-0 bg-neutral-950/40 backdrop-blur-xs z-50 flex items-center justify-center p-4">
      <div className="bg-white border border-neutral-200 rounded-2xl max-w-lg w-full p-6 space-y-4 shadow-xl">
        {/* HEADER MODAL */}
        <div className="flex items-center justify-between border-b border-neutral-100 pb-3">
          <div className="flex items-center gap-2">
            <div className="p-2 rounded-lg bg-amber-50 text-amber-700 border border-amber-200">
              <ClipboardCheck className="w-4 h-4 text-amber-600" />
            </div>
            <div>
              <h3 className="font-bold text-base text-neutral-950">
                Kiểm Kê Linh Kiện
              </h3>
              <p className="text-[11px] text-neutral-500 font-medium">
                Game:{" "}
                <strong className="text-neutral-900">
                  {sessionGameData.gameName}
                </strong>
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="text-neutral-400 hover:text-neutral-950 p-1 rounded-lg"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* TOOLBAR TÁC VỤ */}
        <div className="flex items-center justify-between p-3 bg-neutral-50 border border-neutral-200 rounded-xl">
          <div className="flex items-center gap-2 text-xs text-neutral-600 font-medium">
            <Boxes className="w-4 h-4 text-neutral-400" />
            <span>
              Tổng cộng <strong>{items.length}</strong> loại linh kiện
            </span>
          </div>

          <Button
            type="button"
            size="sm"
            onClick={handleSetAllValid}
            className="h-7 px-2.5 bg-emerald-600 hover:bg-emerald-700 text-white text-[11px] font-bold rounded-lg flex items-center gap-1 shadow-2xs"
          >
            <Zap className="w-3 h-3" /> Đủ Tất Cả
          </Button>
        </div>

        {/* DANH SÁCH LINH KIỆN */}
        <div className="max-h-64 overflow-y-auto space-y-2 pr-1 scrollbar-thin">
          {items.map((item, index) => {
            const isMissing = item.actualQuantity < item.expectedQuantity;

            return (
              <div
                key={item.componentId}
                className={`p-3 rounded-xl border transition-colors flex items-center justify-between gap-3 ${
                  isMissing
                    ? "bg-rose-50/60 border-rose-200"
                    : "bg-white border-neutral-200"
                }`}
              >
                <div className="space-y-0.5 min-w-0 flex-1">
                  <div className="font-bold text-xs text-neutral-950 truncate">
                    {item.componentName}
                  </div>
                  <div className="text-[10px] text-neutral-400 font-medium">
                    Số lượng chuẩn:{" "}
                    <strong className="text-neutral-700">
                      {item.expectedQuantity}
                    </strong>
                  </div>
                </div>

                <div className="flex items-center gap-2 shrink-0">
                  <span className="text-[10px] text-neutral-500 font-bold uppercase">
                    Thực tế:
                  </span>
                  <Input
                    type="number"
                    min={0}
                    max={item.expectedQuantity}
                    value={item.actualQuantity}
                    onChange={(e) =>
                      handleQuantityChange(index, parseInt(e.target.value) || 0)
                    }
                    className="w-16 h-8 text-xs font-mono font-bold text-center bg-white border-neutral-200 rounded-lg"
                  />

                  {isMissing ? (
                    <span className="px-1.5 py-0.5 rounded text-[9px] font-bold uppercase bg-rose-100 text-rose-700 border border-rose-200">
                      Thiếu {item.expectedQuantity - item.actualQuantity}
                    </span>
                  ) : (
                    <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                  )}
                </div>
              </div>
            );
          })}
        </div>

        {totalMissing > 0 && (
          <div className="flex items-center gap-2 p-3 bg-amber-50 border border-amber-200 rounded-xl text-xs text-amber-900 font-medium">
            <AlertTriangle className="w-4 h-4 text-amber-600 shrink-0" />
            <span>
              Phát hiện <strong>{totalMissing}</strong> linh kiện bị thiếu/hỏng.
              Hệ thống sẽ tự động tính phí phạt linh kiện.
            </span>
          </div>
        )}

        {/* FOOTER ACTIONS */}
        <div className="pt-3 border-t border-neutral-100 flex justify-end gap-2">
          <Button
            type="button"
            variant="outline"
            onClick={onClose}
            className="h-9 text-xs rounded-lg border-neutral-200"
          >
            Hủy
          </Button>

          <Button
            type="button"
            disabled={submitting}
            onClick={handleSubmit}
            className="h-9 bg-neutral-950 text-white text-xs font-bold rounded-lg px-4 hover:bg-neutral-800 disabled:opacity-50"
          >
            {submitting ? "Đang xử lý..." : "Xác Nhận & Mở Khóa In Hóa Đơn"}
          </Button>
        </div>
      </div>
    </div>
  );
}
