/* eslint-disable @typescript-eslint/no-explicit-any */
"use client";

import { useEffect, useRef, useState } from "react";
import QRCode from "react-qr-code";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { PosCheckInService } from "@/features/pos-check-in/services/pos-check-in.service";
import { SplitBillPanel } from "./split-bill-panel";
import type { MemberPaymentResult } from "@/features/pos-check-in/types/pos-check-in.interface";
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
  Users,
} from "lucide-react";

type PayMode = "table" | "split";

function splitQrValue(row: MemberPaymentResult) {
  return row.qrImageUrl || row.paymentUrl || row.transferContent || "";
}

function isPaidStatus(status: unknown) {
  const normalized = String(status ?? "").toLowerCase();
  return normalized === "paid" || normalized === "completed";
}

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
  const [payMode, setPayMode] = useState<PayMode>("table");
  const [splitQrList, setSplitQrList] = useState<MemberPaymentResult[]>([]);
  /** Chặn toast "Thanh toán thành công" bị poll/Reload bắn nhiều lần. */
  const paidNotifiedRef = useRef(false);
  const onCloseRef = useRef(onClose);
  const onRefreshPaymentRef = useRef(onRefreshPayment);
  onCloseRef.current = onClose;
  onRefreshPaymentRef.current = onRefreshPayment;

  const notifyPaidSuccessOnce = (tableLabel: string, sessionId: string) => {
    if (paidNotifiedRef.current) return false;
    paidNotifiedRef.current = true;
    toast.success(
      `Thanh toán thành công. ${tableLabel} đã trống, có thể đặt bàn ngay!`,
      { id: `pos-paid-success-${sessionId}` },
    );
    onCloseRef.current();
    return true;
  };

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
      paidNotifiedRef.current = false;
      setQrPayload(null);
      setQrAmount(0);
      setQrOrderId("");
      setPayMode("table");
      setSplitQrList([]);
    }
  }, [isOpen]);

  useEffect(() => {
    paidNotifiedRef.current = false;
  }, [session?.id]);

  useEffect(() => {
    if (
      !isOpen ||
      payMode !== "split" ||
      splitQrList.length === 0 ||
      !onRefreshPaymentRef.current ||
      !session?.id
    ) {
      return;
    }
    let stopped = false;
    let refreshing = false;
    const sessionId = session.id;
    const tableLabel = session.tableName || session.tableLabel || "Bàn";
    const tick = async () => {
      if (stopped || refreshing || paidNotifiedRef.current) return;
      refreshing = true;
      try {
        const fresh = await onRefreshPaymentRef.current?.(sessionId);
        if (stopped || paidNotifiedRef.current) return;
        if (isPaidStatus(fresh?.status ?? fresh?.Status)) {
          notifyPaidSuccessOnce(tableLabel, sessionId);
        }
      } catch {
        // ignore
      } finally {
        refreshing = false;
      }
    };
    void tick();
    const id = window.setInterval(() => void tick(), 5000);
    return () => {
      stopped = true;
      window.clearInterval(id);
    };
  }, [isOpen, payMode, splitQrList.length, session?.id, session?.tableName, session?.tableLabel]);

  useEffect(() => {
    if (!isOpen || !qrPayload || payMode !== "table" || !onRefreshPaymentRef.current || !session?.id)
      return;
    let stopped = false;
    let refreshing = false;
    const sessionId = session.id;
    const tableLabel = session.tableName || session.tableLabel || "Bàn";
    const tick = async () => {
      if (stopped || refreshing || paidNotifiedRef.current) return;
      refreshing = true;
      try {
        const fresh = await onRefreshPaymentRef.current?.(sessionId);
        if (stopped || paidNotifiedRef.current) return;
        if (isPaidStatus(fresh?.status ?? fresh?.Status)) {
          notifyPaidSuccessOnce(tableLabel, sessionId);
        }
      } catch {
        // Bỏ qua — poll sẽ thử lại; 404 sau webhook được xử lý trong onRefreshPayment
      } finally {
        refreshing = false;
      }
    };
    void tick();
    const id = window.setInterval(() => void tick(), 5000);
    return () => {
      stopped = true;
      window.clearInterval(id);
    };
  }, [isOpen, qrPayload, payMode, session?.id, session?.tableName, session?.tableLabel]);

  if (!isOpen || !session) return null;

  // 1. TÍNH TIỀN GIỜ CHƠI (SUBTOTAL) — sau POST checkout BE mới có số
  const elapsedMinutes = Number(
    session.elapsedMinutes ?? session.ElapsedMinutes ?? 0,
  );
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
            (c.missingQuantity && c.missingQuantity > 0),
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

      const code = qrPayload
        ? await PosCheckInService.regenerateSessionPaymentQr(session.id)
        : await PosCheckInService.createSessionPayment(cafeId, session.id, {
            notes: finalNotes,
          });
      const payload = code.qrPayload || code.code;
      if (!payload) {
        toast.error("Máy chủ không trả mã QR thanh toán.");
        return;
      }
      setQrPayload(payload);
      setQrOrderId(code.code || "");
      setQrAmount(code.amount > 0 ? code.amount : finalTotalAmount);
      toast.success(
        qrPayload
          ? "Đã tạo lại QR thanh toán."
          : code.amount > 0
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
      if (isPaidStatus(fresh?.status ?? fresh?.Status)) {
        const tableLabel = session.tableName || session.tableLabel || "Bàn";
        notifyPaidSuccessOnce(tableLabel, session.id);
        return;
      }
      toast.message(
        "Vẫn chờ thanh toán — hệ thống chưa ghi nhận chuyển khoản. Đợi thêm hoặc xác nhận tiền mặt.",
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
          payMode === "split" && splitQrList.length > 1
            ? "max-w-6xl"
            : (payMode === "table" && qrPayload) ||
                (payMode === "split" && splitQrList.length > 0) ||
                payMode === "split"
              ? "max-w-4xl"
              : "max-w-lg"
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
                Bàn:{" "}
                <strong className="text-neutral-900">
                  {session.tableName || "Bàn POS"}
                </strong>{" "}
                • Trạng thái:{" "}
                <span className="font-bold text-amber-600">
                  {(() => {
                    const st = String(session.status || "")
                      .toLowerCase()
                      .replace(/[_\s-]/g, "");
                    if (st === "unpaid") return "Chờ thanh toán";
                    if (st === "checking") return "Đang kiểm kê";
                    if (st === "paid") return "Đã thanh toán";
                    if (st === "completed") return "Đã hoàn tất";
                    if (st === "playing" || st === "active") return "Đang chơi";
                    return session.status || "Chờ thanh toán";
                  })()}
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
            payMode === "split" && splitQrList.length > 1
              ? "grid grid-cols-1 md:grid-cols-[minmax(0,1fr)_minmax(0,1.15fr)] gap-4 items-stretch overflow-hidden"
              : (payMode === "table" && qrPayload) ||
                  (payMode === "split" && splitQrList.length > 0)
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

        {cafeId ? (
          <div className="grid grid-cols-2 gap-1 rounded-xl border border-neutral-200 bg-neutral-50 p-1">
            <button
              type="button"
              onClick={() => {
                setPayMode("table");
                setSplitQrList([]);
              }}
              className={`flex h-9 items-center justify-center gap-1.5 rounded-lg text-xs font-bold transition-colors ${
                payMode === "table"
                  ? "bg-white text-neutral-950 shadow-2xs"
                  : "text-neutral-500 hover:text-neutral-800"
              }`}
            >
              <CreditCard className="size-3.5" />
              Thu cả bàn
            </button>
            <button
              type="button"
              onClick={() => {
                setPayMode("split");
                setQrPayload(null);
              }}
              className={`flex h-9 items-center justify-center gap-1.5 rounded-lg text-xs font-bold transition-colors ${
                payMode === "split"
                  ? "bg-white text-neutral-950 shadow-2xs"
                  : "text-neutral-500 hover:text-neutral-800"
              }`}
            >
              <Users className="size-3.5" />
              Chia tiền
            </button>
          </div>
        ) : null}

        {payMode === "split" && cafeId ? (
          <SplitBillPanel
            cafeId={cafeId}
            sessionId={String(session.id)}
            notes={finalNotes}
            onQrListChange={setSplitQrList}
            onAllPaid={() => {
              const tableLabel =
                session.tableName || session.tableLabel || "Bàn";
              toast.success(
                `Đã thu đủ theo khách. ${tableLabel} trống — xem hóa đơn tại tab Giải ngân.`,
              );
              void onRefreshPayment?.(session.id);
              onClose();
            }}
          />
        ) : null}

        {payMode === "table" ? (
          <>
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
          </>
        ) : null}
          </div>

        {payMode === "table" && qrPayload ? (
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
        ) : null}

        {payMode === "split" && splitQrList.length > 0 ? (
          <div className="flex max-h-full min-h-0 shrink-0 flex-col gap-2 overflow-hidden rounded-xl border border-violet-200 bg-violet-50/40 p-3">
            <p className="shrink-0 text-center text-xs font-bold text-violet-900">
              QR VietQR ({splitQrList.length})
            </p>
            <div
              className={`min-h-0 flex-1 gap-2 ${
                splitQrList.length === 1
                  ? "flex flex-col items-center overflow-y-auto"
                  : "grid grid-flow-col auto-cols-[minmax(160px,1fr)] overflow-x-auto overflow-y-hidden"
              }`}
            >
              {splitQrList.map((row) => {
                const payload = splitQrValue(row);
                if (!payload) return null;
                const compact = splitQrList.length > 1;
                const qrPx = compact ? 148 : 220;
                return (
                  <div
                    key={row.memberId}
                    className="flex h-full min-w-0 flex-col items-center justify-start gap-1 rounded-xl border border-violet-200 bg-white p-2"
                  >
                    <p className="w-full truncate text-center text-xs font-bold text-violet-900">
                      {row.displayName}
                      {row.amountDue > 0
                        ? ` · ${row.amountDue.toLocaleString("vi-VN")}đ`
                        : ""}
                    </p>
                    {row.transferContent || row.orderId ? (
                      <p className="w-full truncate text-center font-mono text-[9px] text-neutral-500">
                        ND: {row.transferContent || row.orderId}
                      </p>
                    ) : null}
                    {/^https?:\/\//i.test(payload) &&
                    /vietqr|\.png|\.jpg|qr/i.test(payload) ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img
                        src={payload}
                        alt={`QR ${row.displayName}`}
                        className={
                          compact
                            ? "h-auto max-h-[min(52vh,320px)] w-auto max-w-full rounded-lg bg-white object-contain"
                            : "h-[220px] w-[220px] rounded-lg bg-white object-contain"
                        }
                      />
                    ) : (
                      <div className="rounded-lg bg-white p-1">
                        <QRCode value={payload} size={qrPx} />
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        ) : null}
        </div>

        <div className="pt-3 mt-3 border-t border-neutral-100 flex flex-wrap justify-end gap-2 shrink-0">
          <Button
            type="button"
            variant="outline"
            onClick={onClose}
            className="h-9 text-xs rounded-lg border-neutral-200"
          >
            Đóng
          </Button>

          {payMode === "table" && onRefreshPayment ? (
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
          ) : null}

          {payMode === "table" ? (
            <>
              <Button
                type="button"
                disabled={loading}
                onClick={() => void handleCreateQr()}
                className="h-9 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold rounded-lg px-3"
              >
                <QrCode className="mr-1 h-3.5 w-3.5" />
                {loading ? "Đang tạo QR..." : qrPayload ? "Tạo lại QR" : "Tạo QR cả bàn"}
              </Button>

              <Button
                type="button"
                disabled={loading}
                variant="outline"
                onClick={handleConfirmPay}
                className="h-9 text-xs font-bold rounded-lg px-4 flex items-center gap-1.5"
              >
                <CheckCircle2 className="w-4 h-4" />
                <span>{loading ? "Đang xử lý..." : "Tiền mặt cả bàn"}</span>
              </Button>
            </>
          ) : null}
        </div>
      </div>
    </div>
  );
}