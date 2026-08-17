/* eslint-disable @typescript-eslint/no-explicit-any */
"use client";

import { useEffect, useState } from "react";
import QRCode from "react-qr-code";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { PosCheckInService } from "@/features/pos-check-in/services/pos-check-in.service";
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
  QrCode,
  RefreshCw,
} from "lucide-react";

function pickAmount(source: any, ...keys: string[]): number {
  if (!source) return 0;
  for (const key of keys) {
    const n = Number(source[key]);
    if (Number.isFinite(n) && n > 0) return n;
  }
  return 0;
}

function memberTotals(session: any): number {
  const list = session?.members || session?.Members || [];
  if (!Array.isArray(list)) return 0;
  return list.reduce(
    (sum: number, m: any) =>
      sum + pickAmount(m, "totalAmount", "TotalAmount", "amountDue", "AmountDue"),
    0,
  );
}

export interface CheckoutPayModalProps {
  isOpen: boolean;
  onClose: () => void;
  session: any | null;
  cafeId?: string | null;
  onCheckout?: (sessionId: string) => Promise<any>;
  onPay: (
    sessionId: string,
    payloadData?: { notes?: string }    
  ) => Promise<any>;
  /** Xác nhận tiền mặt qua staff flow (manual-confirm) — port từ pos-check-in */
  onManualConfirmCash?: (
    sessionId: string,
    amount: number,
    notes?: string,
  ) => Promise<boolean>;
  /** GET session lại sau khi khách CK (không có webhook). */
  onRefreshPayment?: (sessionId: string) => Promise<any | null>;
}

// Danh sách các trường hợp ghi chú phổ biến
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
  cafeId,
  onCheckout,
  onPay,
  onRefreshPayment,
}: CheckoutPayModalProps) {
  const [selectedPreset, setSelectedPreset] =
    useState<string>("Không bị mất đồ");
  const [customNote, setCustomNote] = useState<string>("");
  const [loading, setLoading] = useState(false);
  const [qrPayload, setQrPayload] = useState<string | null>(null);
  const [qrAmount, setQrAmount] = useState(0);
  const [qrOrderId, setQrOrderId] = useState("");

  useEffect(() => {
    if (!isOpen || !session?.id || !onCheckout) return;
    const status = String(session.status || session.Status || "").toLowerCase();
    const alreadyBilled =
      status === "unpaid" &&
      pickAmount(
        session,
        "totalAmount",
        "TotalAmount",
        "subtotal",
        "Subtotal",
      ) + memberTotals(session) >
        0;
    if (status === "paid" || alreadyBilled) return;

    let cancelled = false;
    setLoading(true);
    void onCheckout(session.id).finally(() => {
      if (!cancelled) setLoading(false);
    });
    return () => {
      cancelled = true;
    };
    // Chỉ chốt hóa đơn một lần khi mở modal
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isOpen, session?.id]);

  useEffect(() => {
    if (!isOpen) {
      setQrPayload(null);
      setQrAmount(0);
      setQrOrderId("");
    }
  }, [isOpen]);

  useEffect(() => {
    if (!isOpen || !qrPayload || !onRefreshPayment || !session?.id) return;
    let stopped = false;
    const tick = async () => {
      if (stopped) return;
      const fresh = await onRefreshPayment(session.id);
      const status = String(fresh?.status || fresh?.Status || "").toLowerCase();
      if (status === "paid") {
        toast.success("Đã nhận chuyển khoản QR. Bàn đã giải phóng.");
        onClose();
      }
    };
    const id = window.setInterval(() => void tick(), 5000);
    return () => {
      stopped = true;
      window.clearInterval(id);
    };
  }, [isOpen, qrPayload, onRefreshPayment, session?.id, onClose]);

  if (!isOpen || !session) return null;

  // 1. TÍNH TIỀN GIỜ CHƠI (SUBTOTAL) — sau POST checkout BE mới có số
  const subtotal = pickAmount(
    session,
    "subtotal",
    "Subtotal",
    "playTimeAmount",
    "PlayTimeAmount",
  );

  // 2. TRÍCH XUẤT DANH SÁCH LINH KIỆN MẤT/HỎNG TỪ NHIỀU CẤU TRÚC RESPONSE KHÁC NHAU
  const hostMemberId = session.members?.[0]?.id || session.hostId || null;

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

  const penaltyAmount =
    pickAmount(
      session,
      "penaltyAmount",
      "PenaltyAmount",
      "totalPenaltyAmount",
      "TotalPenaltyAmount",
    ) ||
    (session.games || session.Games || []).reduce(
      (sum: number, g: any) =>
        sum + Number(g.totalPenaltyAmount || g.penaltyFee || 0),
      0,
    ) ||
    calculatedPenalty;

  // 4. TIỀN CỌC CẤN TRỪ (BR-09)
  const depositApplied = pickAmount(
    session,
    "depositAppliedAmount",
    "DepositAppliedAmount",
  );

  // 5. TỔNG THANH TOÁN (BR-15) — ưu tiên số BE sau checkout
  const calculatedTotal = subtotal + penaltyAmount - depositApplied;
  const finalTotalAmount =
    pickAmount(session, "totalAmount", "TotalAmount", "amountDue", "AmountDue") ||
    memberTotals(session) ||
    Math.max(0, calculatedTotal);

  const finalNotes =
    selectedPreset === "OTHER"
      ? customNote.trim() || "Thanh toán thành công tại quầy POS"
      : selectedPreset;

  const handleCreateQr = async () => {
    if (!cafeId) {
      toast.error("Thiếu mã quán để tạo QR.");
      return;
    }
    setLoading(true);
    try {
      const status = String(session.status || session.Status || "").toLowerCase();
      if (status !== "unpaid" && onCheckout) {
        const checkoutOk = await onCheckout(session.id);
        if (!checkoutOk) return;
      }
      const code = await PosCheckInService.createSessionPayment(
        cafeId,
        session.id,
        {
          notes: finalNotes,
        },
      );
      const payload = code.qrPayload || code.code;
      if (!payload) {
        toast.error("BE không trả qrImageUrl / paymentUrl.");
        return;
      }
      setQrPayload(payload);
      setQrOrderId(code.code || "");
      setQrAmount(code.amount > 0 ? code.amount : finalTotalAmount);
      toast.success(
        code.amount > 0
          ? `Đã tạo QR VietQR · ${code.amount.toLocaleString("vi-VN")}đ. Chờ khách quét.`
          : "Đã tạo QR VietQR. Chờ khách quét.",
      );
    } catch (err: any) {
      toast.error(err?.message || "Không tạo được QR thanh toán.");
    } finally {
      setLoading(false);
    }
  };

  // Xử lý xác nhận thanh toán
  const handleConfirmPay = async () => {
    setLoading(true);

    const finalNotes =
      selectedPreset === "OTHER"
        ? customNote.trim() || "Thanh toán thành công tại quầy POS"
        : selectedPreset;

    const result = await onPay(session.id, {
      notes: finalNotes,
    });

    setLoading(false);
    if (result) {
      onClose();
    }
  };

  const handleReloadPayment = async () => {
    if (!onRefreshPayment) return;
    setLoading(true);
    try {
      const fresh = await onRefreshPayment(session.id);
      if (!fresh) {
        toast.error("Không tải được trạng thái phiên.");
        return;
      }
      const status = String(fresh?.status || fresh?.Status || "").toLowerCase();
      if (status === "paid") {
        toast.success("Đã ghi nhận chuyển khoản. Bàn đã giải phóng.");
        onClose();
        return;
      }
      toast.message(
        "Vẫn UNPAID — BE chưa ghi nhận CK (chưa có webhook). Đợi thêm hoặc xác nhận tiền mặt.",
      );
    } catch (err: any) {
      toast.error(err?.message || "Không tải được trạng thái thanh toán.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-neutral-950/40 backdrop-blur-xs z-50 flex items-center justify-center p-4">
      <div
        className={`bg-white border border-neutral-200 rounded-2xl w-full p-5 shadow-xl animate-in fade-in-50 duration-150 flex flex-col max-h-[90vh] ${
          qrPayload ? "max-w-4xl" : "max-w-md"
        }`}
      >
        {/* HEADER MODAL */}
        <div className="flex items-center justify-between border-b border-neutral-100 pb-3 shrink-0">
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

        <div
          className={`min-h-0 flex-1 pt-4 ${
            qrPayload
              ? "grid grid-cols-1 md:grid-cols-[minmax(0,1fr)_320px] gap-4 items-start overflow-hidden"
              : "space-y-4 overflow-y-auto"
          }`}
        >
          <div className="space-y-4 min-h-0 overflow-y-auto">
        {/* CHI TIẾT TÍNH TIỀN HÓA ĐƠN BR-15 */}
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
                Tiền cọc cấn trừ:
              </span>
              <span className="font-mono font-bold text-emerald-600">
                -{depositApplied.toLocaleString("vi-VN")}đ
              </span>
            </div>
          )}

          <div className="pt-2 border-t border-neutral-200 flex justify-between items-center text-sm font-extrabold text-neutral-950">
            <span>TỔNG THANH TOÁN:</span>
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
          </div>

        {qrPayload && (
          <div className="flex flex-col items-center gap-2 rounded-xl border border-emerald-200 bg-emerald-50/40 p-3 shrink-0">
            <p className="text-xs font-bold text-emerald-800 text-center">
              Quét QR VietQR
              {qrAmount > 0
                ? ` · ${qrAmount.toLocaleString("vi-VN")}đ`
                : ""}
            </p>
            {qrOrderId ? (
              <p className="font-mono text-[10px] text-neutral-500 text-center">
                ND CK: {qrOrderId}
              </p>
            ) : null}
            {/^https?:\/\//i.test(qrPayload) &&
            /vietqr|\.png|\.jpg|qr/i.test(qrPayload) ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={qrPayload}
                alt="VietQR thanh toán"
                className="w-[280px] h-[280px] object-contain rounded-xl bg-white"
              />
            ) : (
              <div className="rounded-xl bg-white p-2">
                <QRCode value={qrPayload} size={256} />
              </div>
            )}
          </div>
        )}
        </div>

        {/* FOOTER ACTIONS */}
        <div className="pt-3 mt-3 border-t border-neutral-100 flex flex-wrap justify-end gap-2 shrink-0">
          <Button
            type="button"
            variant="outline"
            onClick={onClose}
            className="h-9 text-xs rounded-lg border-neutral-200"
          >
            Hủy
          </Button>

          {onRefreshPayment && (
            <Button
              type="button"
              disabled={loading}
              variant="outline"
              onClick={() => void handleReloadPayment()}
              className="h-9 border-emerald-300 text-xs font-bold text-emerald-800 rounded-lg px-3"
            >
              <RefreshCw className={`mr-1 h-3.5 w-3.5 ${loading ? "animate-spin" : ""}`} />
              Reload
            </Button>
          )}

          <Button
            type="button"
            disabled={loading}
            onClick={() => void handleCreateQr()}
            className="h-9 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold rounded-lg px-3"
          >
            <QrCode className="mr-1 h-3.5 w-3.5" />
            {loading ? "Đang tạo QR..." : qrPayload ? "Tạo lại QR" : "Tạo QR thanh toán"}
          </Button>

          <Button
            type="button"
            disabled={loading}
            variant="outline"
            onClick={handleConfirmPay}
            className="h-9 text-xs font-bold rounded-lg px-4 flex items-center gap-1.5"
          >
            <CheckCircle2 className="w-4 h-4" />
            <span>{loading ? "Đang xử lý..." : "Thanh toán thủ công"}</span>
          </Button>
        </div>
      </div>
    </div>
  );
}