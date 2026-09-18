"use client";

import { useCallback, useEffect, useState } from "react";
import {
  Banknote,
  CheckCircle2,
  Clock,
  FileDown,
  Loader2,
  Receipt,
  RefreshCw,
  Wallet,
  X,
} from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { apiClient } from "@/core/api/client";
import { PosCheckInService } from "@/features/pos-check-in/services/pos-check-in.service";
import type { CafeSettlementPending } from "@/features/pos-check-in/types/pos-check-in.interface";
import {
  arcadeCardClass,
  hexChipClass,
  statusOrbClass,
} from "../lib/game-theme";
import { cn } from "@/lib/utils";

interface SettlementsTabProps {
  cafeId: string | null;
  onFetchPaidSessions?: (
    fromDate?: string,
    toDate?: string,
  ) => Promise<any[]>;
}

function formatCurrency(amount: number) {
  return new Intl.NumberFormat("vi-VN", {
    style: "currency",
    currency: "VND",
  }).format(amount);
}

function formatTime(iso: string) {
  return new Intl.DateTimeFormat("vi-VN", {
    hour: "2-digit",
    minute: "2-digit",
    day: "2-digit",
    month: "2-digit",
  }).format(new Date(iso));
}

function escapeHtml(value: unknown) {
  return String(value ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

/** BE chỉ trả JSON — in qua iframe ẩn (không bị chặn popup), chọn Save as PDF. */
function exportReceiptPdf(receipt: any) {
  const members = Array.isArray(receipt?.members) ? receipt.members : [];
  const memberRows = members
    .map(
      (m: any) => `
      <tr>
        <td>${escapeHtml(m.displayName || "Khách")}${m.isGuestSlot ? " (guest)" : ""}</td>
        <td style="text-align:right">${escapeHtml(
          Number(m.total || 0).toLocaleString("vi-VN"),
        )}đ</td>
      </tr>`,
    )
    .join("");

  const paidAt = receipt?.paidAt
    ? formatTime(String(receipt.paidAt))
    : "—";
  const title = `Hoa-don-${String(receipt?.tableName || "ban").replace(/\s+/g, "-")}-${String(receipt?.sessionId || "").slice(0, 8) || "receipt"}`;

  const html = `<!DOCTYPE html>
<html lang="vi">
<head>
  <meta charset="utf-8" />
  <title>${escapeHtml(title)}</title>
  <style>
    body { font-family: system-ui, "Segoe UI", Arial, sans-serif; color: #111; padding: 24px; max-width: 480px; margin: 0 auto; }
    h1 { font-size: 18px; margin: 0 0 4px; }
    .meta { color: #555; font-size: 12px; margin-bottom: 16px; }
    .row { display: flex; justify-content: space-between; font-size: 13px; padding: 4px 0; }
    .total { font-weight: 700; font-size: 15px; border-top: 1px solid #ddd; margin-top: 8px; padding-top: 8px; }
    table { width: 100%; border-collapse: collapse; margin-top: 12px; font-size: 12px; }
    th, td { padding: 6px 0; border-bottom: 1px solid #eee; text-align: left; }
    @media print { body { padding: 0; } }
  </style>
</head>
<body>
  <h1>Hóa đơn BoardVerse</h1>
  <p class="meta">
    ${escapeHtml(receipt?.cafeName || "BoardVerse")}<br/>
    ${escapeHtml(receipt?.cafeAddress || "")}<br/>
    ${escapeHtml(receipt?.tableName || "Bàn")} · ${escapeHtml(receipt?.gameName || "Game")}<br/>
    Thời lượng: ${escapeHtml(receipt?.durationMinutes ?? "—")} phút · Thanh toán: ${escapeHtml(paidAt)}
  </p>
    <div class="row"><span>Tạm tính</span><span>${escapeHtml(Number(receipt?.totalSubtotal || 0).toLocaleString("vi-VN"))}đ</span></div>
  <div class="row"><span>Phạt</span><span>${escapeHtml(Number(receipt?.totalPenalty || 0).toLocaleString("vi-VN"))}đ</span></div>
  <div class="row"><span>Cọc trừ</span><span>${escapeHtml(Number(receipt?.totalDepositApplied || 0).toLocaleString("vi-VN"))}đ</span></div>
  <div class="row total"><span>Tổng</span><span>${escapeHtml(Number(receipt?.grandTotal || 0).toLocaleString("vi-VN"))}đ</span></div>
  ${
    members.length
      ? `<table><thead><tr><th>Thành viên</th><th style="text-align:right">Số tiền</th></tr></thead><tbody>${memberRows}</tbody></table>`
      : ""
  }
</body>
</html>`;

  const iframe = document.createElement("iframe");
  iframe.setAttribute("title", title);
  iframe.style.cssText =
    "position:fixed;right:0;bottom:0;width:0;height:0;border:0;opacity:0;pointer-events:none;";
  document.body.appendChild(iframe);

  const frameDoc = iframe.contentDocument || iframe.contentWindow?.document;
  if (!frameDoc || !iframe.contentWindow) {
    iframe.remove();
    toast.error("Không mở được bản in hóa đơn.");
    return;
  }

  frameDoc.open();
  frameDoc.write(html);
  frameDoc.close();

  const cleanup = () => {
    iframe.remove();
  };

  iframe.contentWindow.onafterprint = cleanup;
  // Một số trình duyệt không gọi afterprint — dọn sau timeout.
  window.setTimeout(cleanup, 60_000);

  window.setTimeout(() => {
    try {
      iframe.contentWindow?.focus();
      iframe.contentWindow?.print();
      toast.message(
        "Chọn “Lưu dưới dạng PDF” trong hộp thoại in.",
      );
    } catch {
      cleanup();
      toast.error("Không thể mở hộp thoại in.");
    }
  }, 150);
}

function formatSettlementStatusLabel(status?: string | null) {
  switch (String(status ?? "")
    .toLowerCase()
    .replace(/[_\s-]/g, "")) {
    case "pending":
      return "Chờ xử lý";
    case "processing":
      return "Đang xử lý";
    case "retrying":
      return "Đang thử lại";
    case "completed":
    case "succeeded":
      return "Thành công";
    case "failed":
      return "Thất bại";
    case "overridden":
      return "Đã ghi đè";
    default:
      return status?.trim() || "Không rõ";
  }
}

/** Style badge theo settlement status — màu sắc giúp scan nhanh. */
function getSettlementStatusStyle(status?: string | null) {
  const key = String(status ?? "")
    .toLowerCase()
    .replace(/[_\s-]/g, "");
  switch (key) {
    case "pending":
      return {
        wrap: "border-amber-200 bg-amber-50 text-amber-800",
        dot: "bg-amber-500",
        Icon: Clock,
      };
    case "processing":
      return {
        wrap: "border-sky-200 bg-sky-50 text-sky-800",
        dot: "bg-sky-500",
        Icon: Loader2,
      };
    case "retrying":
      return {
        wrap: "border-orange-200 bg-orange-50 text-orange-800",
        dot: "bg-orange-500",
        Icon: RefreshCw,
      };
    case "completed":
    case "succeeded":
      return {
        wrap: "border-emerald-200 bg-emerald-50 text-emerald-800",
        dot: "bg-emerald-500",
        Icon: CheckCircle2,
      };
    case "failed":
      return {
        wrap: "border-rose-200 bg-rose-50 text-rose-800",
        dot: "bg-rose-500",
        Icon: X,
      };
    case "overridden":
      return {
        wrap: "border-violet-200 bg-violet-50 text-violet-800",
        dot: "bg-violet-500",
        Icon: CheckCircle2,
      };
    default:
      return {
        wrap: "border-neutral-200 bg-neutral-50 text-neutral-700",
        dot: "bg-neutral-400",
        Icon: Clock,
      };
  }
}

/** Tab giải ngân — UI theo style cafe-pos, data từ PosCheckInService. */
export function SettlementsTab({
  cafeId,
  onFetchPaidSessions,
}: SettlementsTabProps) {
  const [items, setItems] = useState<CafeSettlementPending[]>([]);
  const [paidSessions, setPaidSessions] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [receipt, setReceipt] = useState<any | null>(null);
  const [loadingReceiptId, setLoadingReceiptId] = useState<string | null>(null);

  // Nhấn Escape để đóng modal receipt
  useEffect(() => {
    if (!receipt) return;
    const onKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") setReceipt(null);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [receipt]);

  const load = useCallback(async () => {
    if (!cafeId) return;
    setLoading(true);
    setError(null);
    try {
      const data = await PosCheckInService.getPendingSettlements(cafeId);
      setItems(data);
      if (onFetchPaidSessions) {
        const paid = await onFetchPaidSessions();
        setPaidSessions(Array.isArray(paid) ? paid : []);
      }
    } catch (err) {
      setError((err as Error)?.message || "Không tải được settlements.");
      setItems([]);
    } finally {
      setLoading(false);
    }
  }, [cafeId, onFetchPaidSessions]);

  useEffect(() => {
    void load();
  }, [load]);

  const loadReceipt = async (sessionId: string) => {
    setLoadingReceiptId(sessionId);
    try {
      const raw: any = await apiClient.get(
        `/api/v1/sessions/${encodeURIComponent(sessionId)}/receipt`,
      );
      setReceipt(raw?.data ?? raw);
    } catch (err: any) {
      setReceipt(null);
      toast.error(
        err?.message || "Không tải được hóa đơn (cần phiên đã thanh toán).",
      );
    } finally {
      setLoadingReceiptId(null);
    }
  };

  if (!cafeId) {
    return (
      <div className="py-12 text-center font-mono text-xs uppercase tracking-widest text-neutral-400">
        ▸ Chưa chọn quán
      </div>
    );
  }

  if (loading) {
    return (
      <div className="space-y-2 py-12 text-center font-mono text-xs uppercase tracking-widest text-neutral-400">
        <Loader2 className="mx-auto size-6 animate-spin" />
        Đang tải danh sách giải ngân…
      </div>
    );
  }

  if (error) {
    return (
      <div className="space-y-3 rounded-lg border-2 border-rose-300 bg-rose-50/50 p-4 text-xs text-rose-700">
        <p className="font-mono font-bold uppercase tracking-wide">
          ⚠ {error}
        </p>
        <Button
          type="button"
          size="sm"
          variant="outline"
          onClick={() => void load()}
          className="h-8 border-2 font-mono text-xs font-bold uppercase tracking-wider"
        >
          <RefreshCw className="mr-1.5 h-3.5 w-3.5" />
          ► Thử lại
        </Button>
      </div>
    );
  }

  if (items.length === 0 && paidSessions.length === 0) {
    return (
      <div className="rounded-lg border-2 border-dashed border-neutral-300 bg-white py-12 text-center font-mono text-xs uppercase tracking-widest text-neutral-400">
        ▸ Không có yêu cầu giải ngân nào hôm nay
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex justify-end">
        <Button
          type="button"
          size="sm"
          variant="outline"
          onClick={() => void load()}
          className="h-8 border-2 font-mono text-xs font-bold uppercase tracking-wider shadow-[inset_0_-2px_0_rgba(0,0,0,0.08)] transition-all hover:translate-y-[-1px]"
        >
          <RefreshCw className="mr-1.5 h-3.5 w-3.5" />
          ► Làm mới
        </Button>
      </div>

      <div className="grid grid-cols-1 gap-4 md:grid-cols-2 md:items-start">
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <p className="flex items-center gap-1.5 font-mono text-xs font-bold uppercase tracking-widest text-amber-700">
              <span className={cn(statusOrbClass, "bg-amber-500")} />
              Yêu cầu chờ giải ngân
            </p>
            {items.length > 0 ? (
              <span className={cn(hexChipClass, "border border-amber-300 bg-amber-100 text-amber-800")}>
                ► {items.length} ITEMS
              </span>
            ) : null}
          </div>
          {items.length === 0 ? (
            <div className="flex flex-col items-center justify-center gap-2 rounded-lg border-2 border-dashed border-neutral-300 bg-neutral-50/60 px-4 py-8 text-center">
              <div className="flex size-10 items-center justify-center rounded-md border-2 border-amber-300 bg-amber-100 text-amber-600 shadow-[inset_0_-2px_0_rgba(0,0,0,0.06)]">
                <Wallet className="h-5 w-5" />
              </div>
              <p className="font-mono text-xs font-bold uppercase tracking-widest text-neutral-600">
                ▸ Không có yêu cầu nào
              </p>
              <p className="font-mono text-[11px] uppercase tracking-wider text-neutral-400">
                Tất cả đã được xử lý.
              </p>
            </div>
          ) : (
            items.map((item) => {
              const statusStyle = getSettlementStatusStyle(item.status);
              const StatusIcon = statusStyle.Icon;
              return (
                <div
                  key={item.id}
                  className={cn(
                    arcadeCardClass,
                    "group flex flex-wrap items-center justify-between gap-3 border-2 border-amber-200 bg-gradient-to-br from-amber-50/80 via-white to-orange-50/40 px-4 py-3 transition-all hover:translate-y-[-2px]",
                  )}
                >
                  <div className="flex min-w-0 items-center gap-3">
                    <div className="flex size-9 shrink-0 items-center justify-center rounded-md border-2 border-amber-700 bg-gradient-to-b from-amber-400 to-orange-500 text-white shadow-[inset_0_-2px_0_rgba(0,0,0,0.2)]">
                      <Banknote className="h-4 w-4" />
                    </div>
                    <div className="min-w-0 space-y-0.5">
                      <p className="font-mono text-sm font-extrabold text-neutral-950">
                        {formatCurrency(
                          item.netTransferAmount || item.depositAmount,
                        )}
                      </p>
                      <p className="font-mono text-[10px] uppercase tracking-widest text-neutral-400">
                        ▸ {formatTime(item.createdAt)} · {item.id.slice(0, 8)}…
                      </p>
                    </div>
                  </div>
                  <span
                    className={cn(
                      "inline-flex items-center gap-1 rounded-md border-2 px-2 py-0.5 font-mono text-[10px] font-extrabold uppercase tracking-widest shadow-[inset_0_-1px_0_rgba(0,0,0,0.06)]",
                      statusStyle.wrap,
                    )}
                  >
                    <StatusIcon
                      className={`h-3 w-3 ${statusStyle.Icon === Loader2 || statusStyle.Icon === RefreshCw ? "animate-spin" : ""}`}
                    />
                    {formatSettlementStatusLabel(item.status)}
                  </span>
                </div>
              );
            })
          )}
        </div>

        {onFetchPaidSessions ? (
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <p className="flex items-center gap-1.5 font-mono text-xs font-bold uppercase tracking-widest text-emerald-700">
                <span className={cn(statusOrbClass, "bg-emerald-500")} />
                Phiên đã thanh toán (UTC hôm nay)
              </p>
              {paidSessions.length > 0 ? (
                <span className={cn(hexChipClass, "border border-emerald-300 bg-emerald-100 text-emerald-800")}>
                  ► {paidSessions.length} SESSIONS
                </span>
              ) : null}
            </div>
            {paidSessions.length === 0 ? (
              <div className="flex flex-col items-center justify-center gap-2 rounded-lg border-2 border-dashed border-neutral-300 bg-neutral-50/60 px-4 py-8 text-center">
                <div className="flex size-10 items-center justify-center rounded-md border-2 border-emerald-300 bg-emerald-100 text-emerald-600 shadow-[inset_0_-2px_0_rgba(0,0,0,0.06)]">
                  <CheckCircle2 className="h-5 w-5" />
                </div>
                <p className="font-mono text-xs font-bold uppercase tracking-widest text-neutral-600">
                  ▸ Không có phiên đã thanh toán hôm nay
                </p>
                <p className="font-mono text-[11px] uppercase tracking-wider text-neutral-400">
                  Phiên đã thanh toán sẽ hiển thị tại đây.
                </p>
              </div>
            ) : (
              paidSessions.map((ses: any) => {
                const id = String(ses.id || ses.sessionId || "");
                const table = ses.tableName || ses.TableName || "Bàn";
                const total = Number(
                  ses.totalAmount ?? ses.TotalAmount ?? 0,
                );
                return (
                  <div
                    key={id || Math.random()}
                    className={cn(
                      arcadeCardClass,
                      "group flex flex-wrap items-center justify-between gap-3 border-2 border-emerald-200 bg-gradient-to-br from-emerald-50/80 via-white to-teal-50/40 px-4 py-3 transition-all hover:translate-y-[-2px]",
                    )}
                  >
                    <div className="flex min-w-0 items-center gap-3">
                      <div className="flex size-9 shrink-0 items-center justify-center rounded-md border-2 border-emerald-700 bg-gradient-to-b from-emerald-500 to-teal-600 text-white shadow-[inset_0_-2px_0_rgba(0,0,0,0.2)]">
                        <CheckCircle2 className="h-4 w-4" />
                      </div>
                      <div className="min-w-0 space-y-0.5">
                        <p className="font-mono text-sm font-extrabold uppercase tracking-tight text-neutral-950">
                          ► {table}
                        </p>
                        <p className="font-mono text-[10px] uppercase tracking-widest text-neutral-400">
                          #{id.slice(0, 8)}
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="font-mono text-sm font-extrabold tabular-nums text-emerald-800">
                        {formatCurrency(total)}
                      </span>
                      {id ? (
                        <Button
                          type="button"
                          size="sm"
                          variant="outline"
                          disabled={loadingReceiptId === id}
                          onClick={() => void loadReceipt(id)}
                          className="h-8 gap-1.5 border-2 border-emerald-400 bg-white font-mono text-xs font-extrabold uppercase tracking-widest text-emerald-900 shadow-[inset_0_-2px_0_rgba(0,0,0,0.08)] hover:bg-emerald-50"
                        >
                          <Receipt className="size-3.5" />
                          {loadingReceiptId === id ? "Đang tải…" : "► Phiếu"}
                        </Button>
                      ) : null}
                    </div>
                  </div>
                );
              })
            )}
          </div>
        ) : null}
      </div>

      {receipt ? (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-neutral-950/40 p-4 backdrop-blur-xs"
          onClick={(event) => {
            if (event.target === event.currentTarget) setReceipt(null);
          }}
        >
          <div
            className="max-h-[90vh] w-full max-w-md space-y-4 overflow-y-auto rounded-2xl border border-neutral-200 bg-white p-5 shadow-xl"
            onClick={(event) => event.stopPropagation()}
          >
            <div className="flex items-start justify-between gap-2 border-b border-neutral-100 pb-3">
              <div>
                <h3 className="flex items-center gap-1.5 text-base font-bold text-neutral-950">
                  <Receipt className="size-4 text-neutral-600" />
                  Hóa đơn (receipt)
                </h3>
                <p className="text-[11px] text-neutral-500">
                  {receipt.cafeName || "BoardVerse"} ·{" "}
                  {receipt.tableName || "Bàn"}
                </p>
              </div>
              <button
                type="button"
                onClick={() => setReceipt(null)}
                className="rounded-lg p-1 text-neutral-400 hover:text-neutral-950"
                aria-label="Đóng"
              >
                <X className="size-5" />
              </button>
            </div>
            <p className="text-xs text-neutral-600">
              {receipt.gameName || "Game"} · {receipt.durationMinutes ?? "—"} phút
            </p>
            <div className="grid grid-cols-2 gap-2 text-xs">
              <div>
                <span className="text-[10px] uppercase text-neutral-400">
                  Tạm tính
                </span>
                <p className="font-mono font-semibold">
                  {Number(receipt.totalSubtotal || 0).toLocaleString("vi-VN")}đ
                </p>
              </div>
              <div>
                <span className="text-[10px] uppercase text-neutral-400">Phạt</span>
                <p className="font-mono font-semibold">
                  {Number(receipt.totalPenalty || 0).toLocaleString("vi-VN")}đ
                </p>
              </div>
              <div>
                <span className="text-[10px] uppercase text-neutral-400">
                  Cọc trừ
                </span>
                <p className="font-mono font-semibold">
                  {Number(receipt.totalDepositApplied || 0).toLocaleString(
                    "vi-VN",
                  )}
                  đ
                </p>
              </div>
              <div>
                <span className="text-[10px] uppercase text-neutral-400">Tổng</span>
                <p className="font-mono font-bold text-emerald-800">
                  {Number(receipt.grandTotal || 0).toLocaleString("vi-VN")}đ
                </p>
              </div>
            </div>
            {Array.isArray(receipt.members) && receipt.members.length > 0 ? (
              <div className="max-h-40 space-y-1 overflow-y-auto border-t border-neutral-100 pt-2 text-xs">
                {receipt.members.map((m: any) => (
                  <div
                    key={m.memberId || m.userId || m.displayName}
                    className="flex items-center justify-between gap-2"
                  >
                    <span className="truncate text-neutral-700">
                      {m.displayName || "Khách"}
                      {m.isGuestSlot ? " (guest)" : ""}
                    </span>
                    <span className="font-mono font-semibold">
                      {Number(m.total || 0).toLocaleString("vi-VN")}đ
                    </span>
                  </div>
                ))}
              </div>
            ) : null}
            <div className="flex justify-end gap-2 border-t border-neutral-100 pt-3">
              <Button
                type="button"
                variant="outline"
                onClick={() => exportReceiptPdf(receipt)}
                className="h-9 gap-1.5 text-xs font-bold"
              >
                <FileDown className="size-3.5" />
                Xuất PDF
              </Button>
              <Button
                type="button"
                variant="outline"
                onClick={() => setReceipt(null)}
                className="h-9 text-xs"
              >
                Đóng
              </Button>
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
}
