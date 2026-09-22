/* eslint-disable @typescript-eslint/no-explicit-any */
"use client";

import { useEffect, useRef, useState } from "react";
import QRCode from "react-qr-code";
import { toast } from "sonner";
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
  Maximize2,
} from "lucide-react";
import {
  backdropCloseHandler,
  useDismissOnBackdrop,
} from "../lib/use-dismiss-on-backdrop";

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
  /** Chia tiền xong — BE đã trả totalPaid === totalAmount. Reload POS state ngay. */
  onSplitBillPaid?: (sessionId: string) => Promise<void>;
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
  onSplitBillPaid,
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
  /** Nội dung QR đang được phóng to (null = đóng popup). */
  const [zoomedQr, setZoomedQr] = useState<{
    payload: string;
    title: string;
    subtitle?: string;
    isImage: boolean;
  } | null>(null);
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

  // Click ra ngoài backdrop hoặc nhấn Escape để đóng
  useDismissOnBackdrop(
    isOpen,
    () => {
      if (loading) return;
      onClose();
    },
    { busy: loading },
  );

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
    <div
      className="fixed inset-0 bg-neutral-950/70 backdrop-blur-xs z-50 flex items-center justify-center p-4"
      onClick={backdropCloseHandler(
        () => {
          if (loading) return;
          onClose();
        },
        loading,
      )}
    >
      <div
        className={`relative overflow-hidden rounded-2xl border-2 border-orange-400 bg-gradient-to-br from-orange-50 via-amber-50 to-yellow-50 shadow-[6px_6px_0_rgba(249,115,22,0.4)] flex flex-col max-h-[90vh] ${
          payMode === "split" && splitQrList.length > 1
            ? "max-w-6xl w-full"
            : (payMode === "table" && qrPayload) ||
                (payMode === "split" && splitQrList.length > 0)
              ? "max-w-4xl w-full"
              : "max-w-lg w-full"
        }`}
        onClick={(event) => event.stopPropagation()}
      >
        {/* CRT + LED corners */}
        <div className="pointer-events-none absolute inset-0 bg-[repeating-linear-gradient(0deg,transparent_0,transparent_3px,rgba(255,255,255,0.05)_3px,rgba(255,255,255,0.05)_4px)]" />
        <span className="pointer-events-none absolute -left-0.5 -top-0.5 size-2 animate-pulse rounded-full bg-orange-500 shadow-[0_0_10px_currentColor]" />
        <span className="pointer-events-none absolute -right-0.5 -bottom-0.5 size-2 animate-pulse rounded-full bg-amber-500 shadow-[0_0_10px_currentColor] [animation-delay:0.4s]" />
        <span className="pointer-events-none absolute -right-0.5 -top-0.5 size-1.5 animate-pulse rounded-full bg-yellow-400 shadow-[0_0_8px_currentColor]" />
        <span className="pointer-events-none absolute -left-0.5 -bottom-0.5 size-1.5 animate-pulse rounded-full bg-amber-500 shadow-[0_0_8px_currentColor] [animation-delay:0.2s]" />

        {/* HEADER */}
        <div className="relative flex items-center justify-between border-b-2 border-amber-300/70 bg-gradient-to-r from-orange-100 via-amber-100 to-yellow-100 px-5 py-3 shrink-0">
          <div className="flex items-center gap-3">
            <div className="relative p-2.5 rounded-xl border-2 border-orange-400 bg-gradient-to-br from-orange-400 to-amber-600 shadow-[inset_0_-2px_0_rgba(0,0,0,0.2),0_0_12px_rgba(249,115,22,0.5)]">
              <CreditCard className="w-5 h-5 text-white" />
              <span className="absolute -right-1 -top-1 size-2 animate-pulse rounded-full bg-yellow-400 shadow-[0_0_8px_currentColor]" />
            </div>
            <div>
              <h3 className="font-mono text-sm font-extrabold uppercase tracking-widest text-orange-950">
                ► Thu tiền hóa đơn
              </h3>
              <p className="font-mono text-[10px] font-bold uppercase tracking-widest text-amber-700">
                <span className="text-amber-500">▸</span> Bàn:{" "}
                <strong className="text-orange-900">
                  {session.tableName || "Bàn POS"}
                </strong>{" "}
                • Trạng thái:{" "}
                <span className="rounded border border-amber-400 bg-amber-100 px-1.5 py-0.5 font-mono text-[10px] font-extrabold uppercase tracking-widest text-amber-800 shadow-[inset_0_-1px_0_rgba(0,0,0,0.1)]">
                  {(() => {
                    const st = String(session.status || "")
                      .toLowerCase()
                      .replace(/[_\s-]/g, "");
                    if (st === "unpaid") return "CHỜ THANH TOÁN";
                    if (st === "checking") return "ĐANG KIỂM KÊ";
                    if (st === "paid") return "ĐÃ THANH TOÁN";
                    if (st === "completed") return "ĐÃ HOÀN TẤT";
                    if (st === "playing" || st === "active") return "ĐANG CHƠI";
                    return session.status || "CHỜ THANH TOÁN";
                  })()}
                </span>
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="rounded-xl border-2 border-amber-300 bg-white p-1.5 font-mono text-amber-600 shadow-[2px_2px_0_rgba(249,115,22,0.3)] transition-all hover:border-amber-500 hover:bg-amber-50"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <div
          className={`relative min-h-0 flex-1 pt-4 px-4 pb-2 overflow-y-auto ${
            payMode === "split" && splitQrList.length > 1
              ? "grid grid-cols-1 md:grid-cols-[minmax(0,1fr)_minmax(0,1.15fr)] gap-4 items-stretch overflow-hidden"
              : (payMode === "table" && qrPayload) ||
                  (payMode === "split" && splitQrList.length > 0)
                ? "grid grid-cols-1 md:grid-cols-[minmax(0,1fr)_320px] gap-4 items-start overflow-hidden"
                : "space-y-4 overflow-y-auto"
          }`}
        >
          <div className="space-y-4 min-h-0 overflow-y-auto">

        {/* CHI TIẾT TÍNH TIỀN */}
        <div className="relative overflow-hidden rounded-xl border-2 border-amber-300 bg-gradient-to-br from-white via-amber-50/60 to-yellow-50/40 p-4 shadow-[2px_2px_0_rgba(249,115,22,0.25)] space-y-2.5 text-xs">
          {/* Row: Tiền giờ */}
          <div className="flex justify-between items-center rounded-lg border border-amber-200/70 bg-white/80 px-3 py-2">
            <span className="flex items-center gap-2 font-mono text-[11px] font-bold uppercase tracking-widest text-amber-700">
              <Clock className="w-3.5 h-3.5 text-amber-500" />
              Tiền giờ chơi ({elapsedMinutes} phút):
            </span>
            <span className="font-mono text-sm font-extrabold uppercase tracking-wide text-amber-950 [text-shadow:1px_1px_0_rgba(255,255,255,0.8)]">
              {subtotal.toLocaleString("vi-VN")}đ
            </span>
          </div>

          {/* Row: Phạt */}
          <div className="rounded-lg border border-amber-200/70 bg-white/80 px-3 py-2 space-y-1.5">
            <div className="flex justify-between items-center">
              <span className="flex items-center gap-2 font-mono text-[11px] font-bold uppercase tracking-widest text-amber-700">
                <Boxes className="w-3.5 h-3.5 text-amber-500" />
                Phạt hỏng/thiếu đồ:
              </span>
              <span className={[
                "font-mono text-sm font-extrabold uppercase tracking-wide",
                penaltyAmount > 0 ? "text-orange-600 [text-shadow:1px_1px_0_rgba(255,255,255,0.8)]" : "text-amber-950 [text-shadow:1px_1px_0_rgba(255,255,255,0.8)]"
              ].join(" ")}>
                +{penaltyAmount.toLocaleString("vi-VN")}đ
              </span>
            </div>
            {damagedOrMissingComponents.length > 0 && (
              <div className="bg-gradient-to-r from-orange-50 to-amber-50 border border-amber-200 rounded-lg p-2 space-y-1">
                <div className="font-mono text-[10px] font-extrabold uppercase tracking-widest text-amber-700 flex items-center gap-1">
                  <AlertCircle className="w-3 h-3 text-orange-500" />
                  Mảnh ghi nhận sự cố:
                </div>
                {damagedOrMissingComponents.map((item, idx) => (
                  <div
                    key={`${item.componentId}-${idx}`}
                    className="flex items-center justify-between text-[11px] bg-white/80 rounded border border-amber-100 p-1.5"
                  >
                    <span className="font-mono text-[10px] font-bold uppercase tracking-wide text-amber-800 truncate">
                      ► {item.componentName} (x{item.quantity} {item.reason})
                    </span>
                    <span className="font-mono text-[10px] font-extrabold uppercase text-orange-600 shrink-0 ml-2">
                      +{item.penaltyFee.toLocaleString("vi-VN")}đ
                    </span>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Row: Tiền cọc */}
          {depositApplied > 0 && (
            <div className="flex justify-between items-center rounded-lg border border-amber-200/70 bg-white/80 px-3 py-2">
              <span className="flex items-center gap-2 font-mono text-[11px] font-bold uppercase tracking-widest text-amber-700">
                <ShieldCheck className="w-3.5 h-3.5 text-amber-500" />
                Tiền cọc cấn trừ:
              </span>
              <span className="font-mono text-sm font-extrabold uppercase tracking-wide text-amber-600">
                -{depositApplied.toLocaleString("vi-VN")}đ
              </span>
            </div>
          )}

          {/* TỔNG */}
          <div className="relative mt-2 flex justify-between items-center rounded-xl border-2 border-orange-500 bg-gradient-to-r from-orange-500 to-amber-500 px-4 py-3 shadow-[inset_0_-2px_0_rgba(0,0,0,0.2),0_0_12px_rgba(249,115,22,0.4)]">
            <span className="font-mono text-[11px] font-extrabold uppercase tracking-widest text-white [text-shadow:1px_1px_0_rgba(0,0,0,0.3)]">
              ► TỔNG THANH TOÁN:
            </span>
            <span className="font-mono text-lg font-extrabold uppercase tracking-wide text-yellow-300 [text-shadow:2px_2px_0_rgba(0,0,0,0.4)]">
              {finalTotalAmount.toLocaleString("vi-VN")}đ
            </span>
          </div>
        </div>

        {/* MODE TOGGLE */}
        {cafeId ? (
          <div className="relative overflow-hidden rounded-xl border-2 border-amber-300 bg-gradient-to-r from-amber-50/80 to-yellow-50/80 p-1 shadow-[2px_2px_0_rgba(249,115,22,0.2)]">
            <div className="grid grid-cols-2 gap-1">
              <button
                type="button"
                onClick={() => { setPayMode("table"); setSplitQrList([]); }}
                className={`flex h-9 items-center justify-center gap-1.5 rounded-lg font-mono text-[11px] font-extrabold uppercase tracking-widest transition-all ${
                  payMode === "table"
                    ? "border-2 border-orange-600 bg-gradient-to-b from-orange-500 to-amber-600 text-white shadow-[inset_0_-2px_0_rgba(0,0,0,0.2),2px_2px_0_rgba(0,0,0,0.15)]"
                    : "border-2 border-transparent text-amber-700 hover:border-amber-300 hover:bg-amber-100"
                }`}
              >
                <CreditCard className="size-3.5" />
                Thu cả bàn
              </button>
              <button
                type="button"
                onClick={() => { setPayMode("split"); setQrPayload(null); }}
                className={`flex h-9 items-center justify-center gap-1.5 rounded-lg font-mono text-[11px] font-extrabold uppercase tracking-widest transition-all ${
                  payMode === "split"
                    ? "border-2 border-orange-600 bg-gradient-to-b from-orange-500 to-amber-600 text-white shadow-[inset_0_-2px_0_rgba(0,0,0,0.2),2px_2px_0_rgba(0,0,0,0.15)]"
                    : "border-2 border-transparent text-amber-700 hover:border-amber-300 hover:bg-amber-100"
                }`}
              >
                <Users className="size-3.5" />
                Chia tiền
              </button>
            </div>
          </div>
        ) : null}

        {/* SPLIT BILL PANEL */}
        {payMode === "split" && cafeId ? (
          <SplitBillPanel
            cafeId={cafeId}
            sessionId={String(session.id)}
            notes={finalNotes}
            onQrListChange={setSplitQrList}
            onAllPaid={async () => {
              console.info(
                "[split-bill] onAllPaid triggered for session",
                session.id,
              );
              const tableLabel =
                session.tableName || session.tableLabel || "Bàn";
              toast.success(
                `Đã thu đủ theo khách. ${tableLabel} trống — xem hóa đơn tại tab Giải ngân.`,
              );
              if (onSplitBillPaid) {
                await onSplitBillPaid(session.id);
              } else {
                void onRefreshPayment?.(session.id);
              }
              onClose();
            }}
          />
        ) : null}

        {/* GHI CHÚ + HÀNH ĐỘNG */}
        {payMode === "table" ? (
          <>
            <div className="space-y-2">
              <label className="font-mono text-[11px] font-extrabold uppercase tracking-widest text-amber-800 flex items-center gap-2">
                <Tag className="w-3.5 h-3.5 text-orange-500" />
                Ghi chú thu tiền:
              </label>
              <div className="flex flex-wrap gap-1.5">
                {PRESET_NOTES.map((preset) => {
                  const isSelected = selectedPreset === preset;
                  return (
                    <button
                      key={preset}
                      type="button"
                      onClick={() => setSelectedPreset(preset)}
                      className={`px-2.5 py-1 rounded-lg font-mono text-[10px] font-extrabold uppercase tracking-widest transition-all border-2 ${
                        isSelected
                          ? "border-orange-500 bg-gradient-to-b from-orange-400 to-amber-500 text-white shadow-[inset_0_-2px_0_rgba(0,0,0,0.2),2px_2px_0_rgba(0,0,0,0.15)]"
                          : "border-amber-200 bg-white text-amber-700 hover:border-amber-400 shadow-[1px_1px_0_rgba(249,115,22,0.2)]"
                      }`}
                    >
                      {isSelected ? "► " : "▸ "}{preset}
                    </button>
                  );
                })}
                <button
                  type="button"
                  onClick={() => setSelectedPreset("OTHER")}
                  className={`px-2.5 py-1 rounded-lg font-mono text-[10px] font-extrabold uppercase tracking-widest transition-all border-2 flex items-center gap-1 ${
                    selectedPreset === "OTHER"
                      ? "border-orange-500 bg-gradient-to-b from-orange-400 to-amber-500 text-white shadow-[inset_0_-2px_0_rgba(0,0,0,0.2),2px_2px_0_rgba(0,0,0,0.15)]"
                      : "border-amber-200 bg-white text-amber-700 hover:border-amber-400 shadow-[1px_1px_0_rgba(249,115,22,0.2)]"
                  }`}
                >
                  <PenTool className="w-3 h-3" />
                  <span>{selectedPreset === "OTHER" ? "► Tự nhập..." : "▸ Tự nhập..."}</span>
                </button>
              </div>
              {selectedPreset === "OTHER" && (
                <div className="pt-1">
                  <Input
                    type="text"
                    autoFocus
                    placeholder="▸ Nhập ghi chú chi tiết..."
                    value={customNote}
                    onChange={(e) => setCustomNote(e.target.value)}
                    className="h-9 text-xs bg-white border-2 border-amber-300 font-mono font-bold focus-visible:border-orange-500 focus-visible:ring-amber-300 rounded-lg"
                  />
                </div>
              )}
            </div>
          </>
        ) : null}
          </div>

        {/* QR DISPLAY */}
        {payMode === "table" && qrPayload ? (
          <div className="relative flex flex-col items-center gap-2 rounded-xl border-2 border-amber-400 bg-gradient-to-br from-white via-amber-50/60 to-yellow-50/40 p-3 shrink-0 shadow-[2px_2px_0_rgba(249,115,22,0.3)]">
            <span className="pointer-events-none absolute right-3 top-3 size-1.5 animate-pulse rounded-full bg-amber-500 shadow-[0_0_6px_currentColor]" />
            <button
              type="button"
              onClick={() =>
                setZoomedQr({
                  payload: qrPayload,
                  title: "QR VietQR · Thanh toán cả bàn",
                  subtitle:
                    (qrAmount > 0 ? `${qrAmount.toLocaleString("vi-VN")}đ` : "") +
                    (qrOrderId ? ` · ND CK: ${qrOrderId}` : ""),
                  isImage:
                    /^https?:\/\//i.test(qrPayload) &&
                    /vietqr|\.png|\.jpg|qr/i.test(qrPayload),
                })
              }
              className="absolute right-2 top-2 inline-flex size-7 items-center justify-center rounded-lg border-2 border-amber-400 bg-gradient-to-b from-white to-amber-50 text-amber-700 shadow-[1px_1px_0_rgba(249,115,22,0.4)] transition-all hover:from-amber-100 hover:to-amber-200"
              title="Phóng to QR để khách quét dễ hơn"
            >
              <Maximize2 className="size-3.5" />
            </button>
            <p className="font-mono text-[11px] font-extrabold uppercase tracking-widest text-amber-800 text-center">
              ► Quét QR VietQR
              {qrAmount > 0
                ? ` · ${qrAmount.toLocaleString("vi-VN")}đ`
                : ""}
            </p>
            {qrOrderId ? (
              <p className="font-mono text-[10px] text-amber-600 text-center font-bold uppercase tracking-widest">
                ND CK: <span className="rounded border border-amber-300 bg-amber-50 px-1.5 py-0.5 text-amber-800">{qrOrderId}</span>
              </p>
            ) : null}
            <button
              type="button"
              onClick={() =>
                setZoomedQr({
                  payload: qrPayload,
                  title: "QR VietQR · Thanh toán cả bàn",
                  subtitle:
                    (qrAmount > 0 ? `${qrAmount.toLocaleString("vi-VN")}đ` : "") +
                    (qrOrderId ? ` · ND CK: ${qrOrderId}` : ""),
                  isImage:
                    /^https?:\/\//i.test(qrPayload) &&
                    /vietqr|\.png|\.jpg|qr/i.test(qrPayload),
                })
              }
              className="group relative cursor-pointer rounded-xl bg-white transition-transform hover:scale-[1.02] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber-500 focus-visible:ring-offset-2"
              title="Bấm để phóng to QR"
            >
              <Maximize2 className="absolute right-2 top-2 z-10 size-3.5 rounded bg-white/90 p-0.5 text-amber-700 opacity-70 transition-opacity group-hover:opacity-100" />
              {/^https?:\/\//i.test(qrPayload) &&
              /vietqr|\.png|\.jpg|qr/i.test(qrPayload) ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={qrPayload}
                  alt="VietQR thanh toán"
                  className="h-[260px] w-[260px] rounded-xl border-2 border-amber-300 object-contain shadow-[2px_2px_0_rgba(249,115,22,0.3)]"
                />
              ) : (
                <div className="rounded-xl border-2 border-amber-300 p-2 shadow-[2px_2px_0_rgba(249,115,22,0.3)]">
                  <QRCode value={qrPayload} size={256} />
                </div>
              )}
            </button>
          </div>
        ) : null}

        {payMode === "split" && splitQrList.length > 0 ? (
          <div className="relative flex max-h-full min-h-0 shrink-0 flex-col gap-2 overflow-hidden rounded-xl border-2 border-amber-400 bg-gradient-to-br from-amber-50/80 to-yellow-50/40 p-3 shadow-[2px_2px_0_rgba(249,115,22,0.3)]">
            <span className="pointer-events-none absolute right-3 top-3 size-1.5 animate-pulse rounded-full bg-amber-500 shadow-[0_0_6px_currentColor]" />
            <p className="shrink-0 text-center font-mono text-[11px] font-extrabold uppercase tracking-widest text-amber-900">
              ► QR VietQR ({splitQrList.length})
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
                    className="relative flex h-full min-w-0 flex-col items-center justify-start gap-1 rounded-xl border-2 border-amber-300 bg-white p-2 shadow-[2px_2px_0_rgba(249,115,22,0.25)]"
                  >
                    <button
                      type="button"
                      onClick={() =>
                        setZoomedQr({
                          payload,
                          title: `QR VietQR · ${row.displayName}`,
                          subtitle:
                            (row.amountDue > 0
                              ? `${row.amountDue.toLocaleString("vi-VN")}đ`
                              : "") +
                            (row.transferContent || row.orderId
                              ? ` · ND: ${row.transferContent || row.orderId}`
                              : ""),
                          isImage:
                            /^https?:\/\//i.test(payload) &&
                            /vietqr|\.png|\.jpg|qr/i.test(payload),
                        })
                      }
                      className="absolute right-1 top-1 z-10 inline-flex size-6 items-center justify-center rounded-md border border-amber-300 bg-white/90 text-amber-700 shadow-[1px_1px_0_rgba(249,115,22,0.3)] transition-all hover:bg-amber-100"
                      title="Phóng to QR để khách quét dễ hơn"
                    >
                      <Maximize2 className="size-3" />
                    </button>
                    <p className="w-full truncate text-center font-mono text-[10px] font-extrabold uppercase tracking-widest text-amber-900">
                      ► {row.displayName}
                      {row.amountDue > 0
                        ? ` · ${row.amountDue.toLocaleString("vi-VN")}đ`
                        : ""}
                    </p>
                    {row.transferContent || row.orderId ? (
                      <p className="w-full truncate text-center font-mono text-[9px] text-amber-600 font-bold">
                        ND: {row.transferContent || row.orderId}
                      </p>
                    ) : null}
                    <button
                      type="button"
                      onClick={() =>
                        setZoomedQr({
                          payload,
                          title: `QR VietQR · ${row.displayName}`,
                          subtitle:
                            (row.amountDue > 0
                              ? `${row.amountDue.toLocaleString("vi-VN")}đ`
                              : "") +
                            (row.transferContent || row.orderId
                              ? ` · ND: ${row.transferContent || row.orderId}`
                              : ""),
                          isImage:
                            /^https?:\/\//i.test(payload) &&
                            /vietqr|\.png|\.jpg|qr/i.test(payload),
                        })
                      }
                      className="group cursor-pointer rounded-lg bg-white transition-transform hover:scale-[1.02] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber-500 focus-visible:ring-offset-1"
                      title="Bấm để phóng to QR"
                    >
                      {/^https?:\/\//i.test(payload) &&
                      /vietqr|\.png|\.jpg|qr/i.test(payload) ? (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img
                          src={payload}
                          alt={`QR ${row.displayName}`}
                          className={
                            compact
                              ? "h-auto max-h-[min(52vh,320px)] w-auto max-w-full rounded-lg border border-amber-200"
                              : "h-[220px] w-[220px] rounded-lg border border-amber-200"
                          }
                        />
                      ) : (
                        <div className="rounded-lg border border-amber-200 p-1">
                          <QRCode value={payload} size={qrPx} />
                        </div>
                      )}
                    </button>
                  </div>
                );
              })}
            </div>
          </div>
        ) : null}
        </div>

        {/* FOOTER */}
        <div className="relative flex flex-wrap justify-end gap-2 border-t-2 border-amber-300/70 bg-gradient-to-r from-orange-100/60 to-amber-100/60 px-5 py-3 shrink-0">
          <button
            type="button"
            onClick={onClose}
            className="inline-flex h-9 items-center justify-center gap-1.5 rounded-xl border-2 border-neutral-400 bg-gradient-to-b from-neutral-100 to-neutral-200 px-5 font-mono text-[11px] font-extrabold uppercase tracking-widest text-neutral-700 shadow-[inset_0_-2px_0_rgba(0,0,0,0.1),2px_2px_0_rgba(0,0,0,0.1)] transition-all hover:from-neutral-200 hover:to-neutral-300"
          >
            ✕ Đóng
          </button>

          {payMode === "table" && onRefreshPayment ? (
            <button
              type="button"
              disabled={loading}
              onClick={() => void handleReloadPayment()}
              className="inline-flex h-9 items-center justify-center gap-1.5 rounded-xl border-2 border-amber-400 bg-gradient-to-b from-orange-100 to-amber-200 px-3 font-mono text-[11px] font-extrabold uppercase tracking-widest text-amber-800 shadow-[inset_0_-2px_0_rgba(0,0,0,0.1),2px_2px_0_rgba(249,115,22,0.2)] transition-all hover:from-orange-200 hover:to-amber-300 disabled:opacity-50"
            >
              <RefreshCw className={`mr-1 h-3.5 w-3.5 ${loading ? "animate-spin" : ""}`} />
              Tải lại
            </button>
          ) : null}

          {payMode === "table" ? (
            <>
              <button
                type="button"
                disabled={loading}
                onClick={() => void handleCreateQr()}
                className="inline-flex h-9 items-center justify-center gap-1.5 rounded-xl border-2 border-orange-600 bg-gradient-to-b from-orange-500 to-amber-600 px-3 font-mono text-[11px] font-extrabold uppercase tracking-widest text-white shadow-[inset_0_-2px_0_rgba(0,0,0,0.25),3px_3px_0_rgba(0,0,0,0.15)] transition-all hover:from-orange-400 hover:to-amber-500 disabled:opacity-50"
              >
                <QrCode className="mr-1 h-3.5 w-3.5 text-yellow-300" />
                {loading ? "Đang tạo..." : qrPayload ? "Tạo lại QR" : "► Tạo QR cả bàn"}
              </button>

              <button
                type="button"
                disabled={loading}
                onClick={handleConfirmPay}
                className="inline-flex h-9 items-center justify-center gap-1.5 rounded-xl border-2 border-neutral-800 bg-gradient-to-b from-neutral-700 to-neutral-950 px-4 font-mono text-[11px] font-extrabold uppercase tracking-widest text-white shadow-[inset_0_-2px_0_rgba(0,0,0,0.3),3px_3px_0_rgba(0,0,0,0.2)] transition-all hover:from-neutral-600 hover:to-neutral-900 disabled:opacity-50"
              >
                <CheckCircle2 className="mr-1 h-4 w-4 text-amber-400" />
                <span>{loading ? "Đang xử lý..." : "► Tiền mặt cả bàn"}</span>
              </button>
            </>
          ) : null}
        </div>
      </div>

      {/* POPUP PHÓNG TO QR — đưa ra màn hình riêng cho khách quét dễ */}
      {zoomedQr ? (
        <div
          className="fixed inset-0 z-[200] flex items-center justify-center bg-black/70 p-4 backdrop-blur-sm"
          role="dialog"
          aria-modal="true"
          onClick={(event) =>
            backdropCloseHandler(event, () => setZoomedQr(null))
          }
        >
          <div
            className="relative flex max-h-[92vh] w-full max-w-md flex-col items-center gap-3 overflow-y-auto rounded-2xl border-2 border-amber-400 bg-gradient-to-br from-white via-amber-50 to-yellow-50 p-6 shadow-2xl"
            onClick={(event) => event.stopPropagation()}
          >
            <button
              type="button"
              onClick={() => setZoomedQr(null)}
              className="absolute right-3 top-3 inline-flex size-9 items-center justify-center rounded-xl border-2 border-amber-400 bg-gradient-to-b from-white to-amber-50 text-amber-700 shadow-[2px_2px_0_rgba(249,115,22,0.4)] transition-all hover:from-amber-100 hover:to-amber-200"
              title="Đóng"
            >
              <X className="size-4" />
            </button>
            <p className="text-center font-mono text-xs font-extrabold uppercase tracking-widest text-amber-800">
              {zoomedQr.title}
            </p>
            {zoomedQr.subtitle ? (
              <p className="text-center font-mono text-[11px] font-bold uppercase tracking-widest text-amber-600">
                {zoomedQr.subtitle}
              </p>
            ) : null}
            <div className="rounded-2xl border-4 border-amber-300 bg-white p-4 shadow-[4px_4px_0_rgba(249,115,22,0.35)]">
              {zoomedQr.isImage ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={zoomedQr.payload}
                  alt={zoomedQr.title}
                  className="size-[min(70vh,440px)] max-w-full object-contain"
                />
              ) : (
                <QRCode value={zoomedQr.payload} size={420} />
              )}
            </div>
            <p className="text-center font-mono text-[10px] font-bold uppercase tracking-widest text-amber-700/80">
              💡 Đưa màn hình cho khách quét — bấm bất kỳ chỗ trống để đóng
            </p>
            <button
              type="button"
              onClick={() => setZoomedQr(null)}
              className="inline-flex h-9 items-center justify-center gap-1.5 rounded-xl border-2 border-amber-400 bg-gradient-to-b from-orange-400 to-amber-500 px-6 font-mono text-[11px] font-extrabold uppercase tracking-widest text-white shadow-[2px_2px_0_rgba(249,115,22,0.45)] transition-all hover:from-orange-500 hover:to-amber-600"
            >
              ✕ Đóng
            </button>
          </div>
        </div>
      ) : null}
    </div>
  );
}