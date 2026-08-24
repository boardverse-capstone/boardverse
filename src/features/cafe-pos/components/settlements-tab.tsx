"use client";

import { useCallback, useEffect, useState } from "react";
import { Banknote, Receipt, RefreshCw, X } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { apiClient } from "@/core/api/client";
import { PosCheckInService } from "@/features/pos-check-in/services/pos-check-in.service";
import type { CafeSettlementPending } from "@/features/pos-check-in/types/pos-check-in.interface";

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
        err?.message || "Không tải được hóa đơn (cần phiên đã Paid).",
      );
    } finally {
      setLoadingReceiptId(null);
    }
  };

  if (!cafeId) {
    return (
      <div className="py-12 text-center text-xs text-neutral-400">
        Chưa có quán để tải giải ngân.
      </div>
    );
  }

  if (loading) {
    return (
      <div className="py-12 text-center text-xs text-neutral-400 animate-pulse">
        Đang tải giải ngân...
      </div>
    );
  }

  if (error) {
    return (
      <div className="space-y-3 rounded-2xl border border-rose-200 bg-rose-50/50 p-4 text-xs text-rose-700">
        <p>{error}</p>
        <Button
          type="button"
          size="sm"
          variant="outline"
          onClick={() => void load()}
          className="h-8 text-xs"
        >
          <RefreshCw className="mr-1.5 h-3.5 w-3.5" />
          Thử lại
        </Button>
      </div>
    );
  }

  if (items.length === 0 && paidSessions.length === 0) {
    return (
      <div className="rounded-2xl border border-dashed border-neutral-200 bg-white py-12 text-center text-xs text-neutral-400">
        Không có giải ngân đang chờ và chưa có phiên đã thanh toán hôm nay.
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
          className="h-8 border-neutral-200 text-xs font-bold"
        >
          <RefreshCw className="mr-1.5 h-3.5 w-3.5" />
          Làm mới
        </Button>
      </div>

      <div className="grid grid-cols-1 gap-4 md:grid-cols-2 md:items-start">
        <div className="space-y-2">
          <p className="text-xs font-bold uppercase tracking-wide text-neutral-500">
            Giải ngân đang chờ
          </p>
          {items.length === 0 ? (
            <p className="text-xs text-neutral-400">Không có giải ngân đang chờ.</p>
          ) : (
            items.map((item) => (
              <div
                key={item.id}
                className="flex flex-wrap items-center justify-between gap-2 rounded-2xl border border-neutral-200 bg-white px-4 py-3 shadow-2xs"
              >
                <div className="min-w-0 space-y-0.5">
                  <p className="flex items-center gap-1.5 text-sm font-bold text-neutral-950">
                    <Banknote className="h-4 w-4 shrink-0 text-neutral-600" />
                    {formatCurrency(item.netTransferAmount || item.depositAmount)}
                  </p>
                  <p className="font-mono text-[11px] text-neutral-400">
                    {formatTime(item.createdAt)} · {item.id.slice(0, 8)}…
                  </p>
                </div>
                <span className="rounded-lg border border-neutral-200 bg-neutral-50 px-2 py-0.5 text-[10px] font-bold text-neutral-700">
                  {formatSettlementStatusLabel(item.status)}
                </span>
              </div>
            ))
          )}
        </div>

        {onFetchPaidSessions ? (
          <div className="space-y-2">
            <p className="text-xs font-bold uppercase tracking-wide text-neutral-500">
              Phiên đã thanh toán (UTC hôm nay)
            </p>
            {paidSessions.length === 0 ? (
              <p className="text-xs text-neutral-400">Chưa có phiên Paid hôm nay.</p>
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
                    className="flex flex-wrap items-center justify-between gap-2 rounded-2xl border border-emerald-200 bg-emerald-50/40 px-4 py-3"
                  >
                    <div className="min-w-0 space-y-0.5">
                      <p className="text-sm font-bold text-neutral-950">{table}</p>
                      <p className="font-mono text-[11px] text-neutral-400">
                        #{id.slice(0, 8)}
                      </p>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-bold text-emerald-800">
                        {formatCurrency(total)}
                      </span>
                      {id ? (
                        <Button
                          type="button"
                          size="sm"
                          variant="outline"
                          disabled={loadingReceiptId === id}
                          onClick={() => void loadReceipt(id)}
                          className="h-8 gap-1.5 border-emerald-300 bg-white text-xs font-bold text-emerald-900"
                        >
                          <Receipt className="size-3.5" />
                          {loadingReceiptId === id ? "Đang tải..." : "Hóa đơn"}
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
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-neutral-950/40 p-4 backdrop-blur-xs">
          <div className="max-h-[90vh] w-full max-w-md space-y-4 overflow-y-auto rounded-2xl border border-neutral-200 bg-white p-5 shadow-xl">
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
                  Subtotal
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
            <div className="flex justify-end border-t border-neutral-100 pt-3">
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
