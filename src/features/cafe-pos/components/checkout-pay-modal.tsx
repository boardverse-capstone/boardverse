/* eslint-disable @typescript-eslint/no-explicit-any */
"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  X,
  CreditCard,
  CheckCircle2,
  Boxes,
  Clock,
  ShieldCheck,
  AlertCircle,
  Tag,
  PenTool,
} from "lucide-react";

export interface PayConfirmModalProps {
  isOpen: boolean;
  onClose: () => void;
  session: any | null;
  onPay: (
    sessionId: string,
    payloadData?: { notes?: string }    
  ) => Promise<any>;
}

const PRESET_NOTES = [
  "Không bị mất đồ",
  "Thiếu Rulebook (Sách hướng dẫn)",
  "Mất / Hỏng lá bài (Cards)",
  "Mất xúc xắc / Quân cờ",
  "Hỏng / Móp hộp game",
];

export function PayConfirmModal({
  isOpen,
  onClose,
  session,
  onPay,
}: PayConfirmModalProps) {
  const [selectedPreset, setSelectedPreset] = useState<string>("Không bị mất đồ");
  const [customNote, setCustomNote] = useState<string>("");
  const [loading, setLoading] = useState(false);

  if (!isOpen || !session) return null;

  // 1. TIỀN GIỜ CHƠI
  const rawSubtotal = Number(session.subtotal ?? session.data?.subtotal ?? 0);
  const elapsedMinutes = Number(session.elapsedMinutes || 0);
  const PRICE_PER_MINUTE = 500;
  const subtotal = rawSubtotal > 0 ? rawSubtotal : elapsedMinutes * PRICE_PER_MINUTE;

  // 2. LINH KIỆN MẤT/HỎNG
  const damagedOrMissingComponents: Array<{
    componentId: string;
    componentName: string;
    quantity: number;
    penaltyFee: number;
    reason: string;
  }> =
    session.games?.flatMap((game: any) =>
      (game.components || game.missingComponents || [])
        .filter(
          (c: any) =>
            c.isMissing ||
            c.isDamaged ||
            (c.missingQuantity && c.missingQuantity > 0) ||
            (c.penaltyFee && c.penaltyFee > 0) ||
            (c.penaltyAmount && c.penaltyAmount > 0)
        )
        .map((c: any) => ({
          componentId: c.componentId || c.id || "N/A",
          componentName: c.componentName || c.name || "Linh kiện",
          quantity: c.missingQuantity || c.quantity || 1,
          penaltyFee: Number(c.penaltyFee || c.penaltyAmount || 0),
          reason: c.isMissing ? "Mất" : c.isDamaged ? "Hỏng" : "Thiếu/Hỏng",
        }))
    ) || [];

  // 3. TIỀN PHẠT
  const calculatedPenalty = damagedOrMissingComponents.reduce(
    (sum, item) => sum + item.penaltyFee,
    0
  );
  const penaltyAmount = Number(
    session.penaltyAmount ??
      session.data?.penaltyAmount ??
      session.totalPenaltyAmount ??
      calculatedPenalty
  );

  // 4. CẤN TRỪ CỌC (BR-09)
  const depositApplied = Number(
    session.depositAppliedAmount ?? session.data?.depositAppliedAmount ?? 0
  );

  // 5. TỔNG THANH TOÁN (BR-15)
  const finalTotalAmount = Math.max(0, subtotal + penaltyAmount - depositApplied);

  // CHỈ THỰC HIỆN DUY NHẤT API POST /pay
  const handleExecutePayOnly = async () => {
    setLoading(true);

    const finalNotes =
      selectedPreset === "OTHER"
        ? customNote.trim() || "Thanh toán thành công tại quầy POS"
        : selectedPreset;

    const result = await onPay(session.id, { notes: finalNotes });

    setLoading(false);
    if (result) {
      onClose();
    }
  };

  return (
    <div className="fixed inset-0 bg-neutral-950/40 backdrop-blur-xs z-50 flex items-center justify-center p-4">
      <div className="bg-white border border-neutral-200 rounded-2xl max-w-md w-full p-6 space-y-4 shadow-xl animate-in fade-in-50 duration-150">
        {/* HEADER MODAL */}
        <div className="flex items-center justify-between border-b border-neutral-100 pb-3">
          <div className="flex items-center gap-2">
            <div className="p-2 rounded-lg bg-emerald-50 text-emerald-700 border border-emerald-200">
              <CreditCard className="w-4 h-4" />
            </div>
            <div>
              <h3 className="font-bold text-base text-neutral-950">
                Thu Tiền Hóa Đơn (Pay)
              </h3>
              <p className="text-[11px] text-neutral-500 font-medium">
                Bàn: <strong className="text-neutral-900">{session.tableName || "Bàn POS"}</strong> • Trạng thái:{" "}
                <span className="font-bold uppercase text-amber-600 font-mono">
                  {session.status || "UNPAID"}
                </span>
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

        {/* TÍNH TIỀN HÓA ĐƠN BR-15 */}
        <div className="p-4 bg-neutral-50 border border-neutral-200 rounded-xl space-y-2.5 text-xs">
          <div className="flex justify-between items-center text-neutral-600">
            <span className="flex items-center gap-1 font-medium">
              <Clock className="w-3.5 h-3.5 text-neutral-400" />
              Tiền giờ chơi ({elapsedMinutes} phút):
            </span>
            <span className="font-mono font-bold text-neutral-900">
              {subtotal.toLocaleString("vi-VN")}đ
            </span>
          </div>

          <div className="space-y-1.5 pt-1.5 border-t border-neutral-200/60">
            <div className="flex justify-between items-center text-neutral-600">
              <span className="flex items-center gap-1 font-semibold">
                <Boxes className="w-3.5 h-3.5 text-neutral-500" />
                Phạt hỏng/thiếu đồ:
              </span>
              <span
                className={`font-mono font-bold ${
                  penaltyAmount > 0 ? "text-rose-600" : "text-neutral-900"
                }`}
              >
                +{penaltyAmount.toLocaleString("vi-VN")}đ
              </span>
            </div>

            {damagedOrMissingComponents.length > 0 && (
              <div className="bg-white border border-rose-100 rounded-lg p-2 space-y-1">
                <div className="text-[10px] font-bold text-rose-700 uppercase flex items-center gap-1">
                  <AlertCircle className="w-3 h-3 text-rose-500" />
                  Mảnh ghi nhận sự cố:
                </div>
                {damagedOrMissingComponents.map((item, idx) => (
                  <div
                    key={`${item.componentId}-${idx}`}
                    className="flex items-center justify-between text-[11px] bg-rose-50/50 p-1 rounded border border-rose-100/50"
                  >
                    <span className="font-bold text-neutral-800 truncate">
                      {item.componentName} (x{item.quantity} {item.reason})
                    </span>
                    <span className="font-mono font-bold text-rose-600">
                      +{item.penaltyFee.toLocaleString("vi-VN")}đ
                    </span>
                  </div>
                ))}
              </div>
            )}
          </div>

          {depositApplied > 0 && (
            <div className="flex justify-between items-center text-neutral-600">
              <span className="flex items-center gap-1">
                <ShieldCheck className="w-3.5 h-3.5 text-emerald-600" />
                Tiền cọc cấn trừ (BR-09):
              </span>
              <span className="font-mono font-bold text-emerald-600">
                -{depositApplied.toLocaleString("vi-VN")}đ
              </span>
            </div>
          )}

          <div className="pt-2 border-t border-neutral-200 flex justify-between items-center text-sm font-extrabold text-neutral-950">
            <span>TỔNG THANH TOÁN (BR-15):</span>
            <span className="font-mono text-emerald-600 text-lg">
              {finalTotalAmount.toLocaleString("vi-VN")}đ
            </span>
          </div>
        </div>

        {/* GHI CHÚ THU TIỀN */}
        <div className="space-y-2">
          <label className="text-xs font-bold text-neutral-800 flex items-center gap-1">
            <Tag className="w-3.5 h-3.5 text-neutral-500" /> Ghi chú trường hợp thu tiền:
          </label>

          <div className="flex flex-wrap gap-1.5">
            {PRESET_NOTES.map((preset) => {
              const isSelected = selectedPreset === preset;
              return (
                <button
                  key={preset}
                  type="button"
                  onClick={() => setSelectedPreset(preset)}
                  className={`px-2.5 py-1 rounded-lg text-[11px] font-semibold transition-all border ${
                    isSelected
                      ? "bg-emerald-50 border-emerald-500 text-emerald-800 shadow-2xs"
                      : "bg-neutral-50 border-neutral-200 text-neutral-600 hover:bg-neutral-100"
                  }`}
                >
                  {preset}
                </button>
              );
            })}

            <button
              type="button"
              onClick={() => setSelectedPreset("OTHER")}
              className={`px-2.5 py-1 rounded-lg text-[11px] font-semibold transition-all border flex items-center gap-1 ${
                selectedPreset === "OTHER"
                  ? "bg-emerald-50 border-emerald-500 text-emerald-800 shadow-2xs"
                  : "bg-neutral-50 border-neutral-200 text-neutral-600 hover:bg-neutral-100"
              }`}
            >
              <PenTool className="w-3 h-3" />
              <span>Tự nhập khác...</span>
            </button>
          </div>

          {selectedPreset === "OTHER" && (
            <div className="pt-1">
              <Input
                type="text"
                autoFocus
                placeholder="Nhập ghi chú chi tiết..."
                value={customNote}
                onChange={(e) => setCustomNote(e.target.value)}
                className="h-9 text-xs bg-white border-neutral-300 focus:border-emerald-500 rounded-lg"
              />
            </div>
          )}
        </div>

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
            disabled={loading}
            onClick={handleExecutePayOnly}
            className="h-9 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold rounded-lg px-4 flex items-center gap-1.5 shadow-2xs"
          >
            <CheckCircle2 className="w-4 h-4" />
            <span>{loading ? "Đang thu tiền..." : "Xác Nhận Đã Thu Tiền"}</span>
          </Button>
        </div>
      </div>
    </div>
  );
}