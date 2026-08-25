"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { PosCheckInService } from "@/features/pos-check-in/services/pos-check-in.service";
import type {
  MemberPaymentResult,
  SessionPaymentStatus,
} from "@/features/pos-check-in/types/pos-check-in.interface";
import { Banknote, QrCode, RefreshCw, Users } from "lucide-react";

function normalizePayStatus(status?: string | null) {
  return String(status ?? "")
    .toLowerCase()
    .replace(/[_\s-]/g, "");
}

function isMemberPaid(status?: string | null) {
  const st = normalizePayStatus(status);
  return st === "paidcash" || st === "paidqr" || st === "paid";
}

function statusLabel(status?: string | null) {
  const st = normalizePayStatus(status);
  if (st === "paidcash") return "Đã trả (tiền mặt)";
  if (st === "paidqr") return "Đã trả (QR)";
  if (st === "paid") return "Đã trả";
  return "Chưa trả";
}

function qrValue(row: MemberPaymentResult) {
  return row.qrImageUrl || row.paymentUrl || row.transferContent || "";
}

type SplitBillPanelProps = {
  cafeId: string;
  sessionId: string;
  notes?: string;
  onAllPaid?: () => void;
  /** Để modal bố trí QR bên phải giống Thu cả bàn */
  onQrListChange?: (list: MemberPaymentResult[]) => void;
};

export function SplitBillPanel({
  cafeId,
  sessionId,
  notes,
  onAllPaid,
  onQrListChange,
}: SplitBillPanelProps) {
  const [status, setStatus] = useState<SessionPaymentStatus | null>(null);
  const [loading, setLoading] = useState(false);
  const [busy, setBusy] = useState(false);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [qrList, setQrList] = useState<MemberPaymentResult[]>([]);
  const hasInitializedSelection = useRef(false);
  const notifiedAllPaid = useRef(false);
  const onAllPaidRef = useRef(onAllPaid);
  const onQrListChangeRef = useRef(onQrListChange);
  const loadStatusRef = useRef<(opts?: { silent?: boolean }) => Promise<SessionPaymentStatus | null>>(
    async () => null,
  );

  useEffect(() => {
    onAllPaidRef.current = onAllPaid;
  }, [onAllPaid]);

  useEffect(() => {
    onQrListChangeRef.current = onQrListChange;
  }, [onQrListChange]);

  // Không gọi onQrListChange trong updater setState (React có thể chạy lúc render → lỗi cập nhật cha).
  const setQrListAndNotify = useCallback(
    (
      next:
        | MemberPaymentResult[]
        | ((prev: MemberPaymentResult[]) => MemberPaymentResult[]),
    ) => {
      setQrList(next);
    },
    [],
  );

  useEffect(() => {
    onQrListChangeRef.current?.(qrList);
  }, [qrList]);

  const unpaidMembers = useMemo(
    () => (status?.members || []).filter((m) => !isMemberPaid(m.status)),
    [status],
  );

  const loadStatus = useCallback(
    async (opts?: { silent?: boolean }) => {
      const silent = opts?.silent === true;
      if (!silent) setLoading(true);
      try {
        const next = await PosCheckInService.getSessionPaymentStatus(
          cafeId,
          sessionId,
        );
        setStatus((prev) => {
          if (
            prev &&
            prev.totalAmount === next.totalAmount &&
            prev.totalPaid === next.totalPaid &&
            prev.totalRemaining === next.totalRemaining &&
            prev.members.length === next.members.length &&
            prev.members.every((m, i) => {
              const n = next.members[i];
              return (
                n &&
                m.memberId === n.memberId &&
                m.status === n.status &&
                m.totalAmount === n.totalAmount &&
                m.amountPaid === n.amountPaid
              );
            })
          ) {
            return prev;
          }
          return next;
        });

        const unpaidIds = next.members
          .filter((m) => !isMemberPaid(m.status))
          .map((m) => m.memberId);

        setSelectedIds((prev) => {
          if (!hasInitializedSelection.current) {
            hasInitializedSelection.current = true;
            return new Set(unpaidIds);
          }
          const unpaidSet = new Set(unpaidIds);
          let changed = false;
          const kept = new Set<string>();
          prev.forEach((id) => {
            if (unpaidSet.has(id)) kept.add(id);
            else changed = true;
          });
          if (!changed && kept.size === prev.size) return prev;
          return kept;
        });

        const allPaid =
          next.members.length > 0 &&
          next.members.every((m) => isMemberPaid(m.status));
        if (allPaid && !notifiedAllPaid.current) {
          notifiedAllPaid.current = true;
          onAllPaidRef.current?.();
        }
        return next;
      } catch (err: unknown) {
        if (!silent) {
          toast.error(
            err instanceof Error
              ? err.message
              : "Không tải được trạng thái chia tiền.",
          );
        }
        return null;
      } finally {
        if (!silent) setLoading(false);
      }
    },
    [cafeId, sessionId],
  );

  loadStatusRef.current = loadStatus;

  // Chỉ load lại khi đổi session/quán — không phụ thuộc callback (tránh loop nhấp nháy).
  useEffect(() => {
    hasInitializedSelection.current = false;
    notifiedAllPaid.current = false;
    void loadStatusRef.current();
  }, [cafeId, sessionId]);

  useEffect(() => {
    if (qrList.length === 0) return;
    const id = window.setInterval(() => {
      void loadStatusRef.current({ silent: true });
    }, 8000);
    return () => window.clearInterval(id);
  }, [qrList.length]);

  const toggleMember = (memberId: string) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(memberId)) next.delete(memberId);
      else next.add(memberId);
      return next;
    });
  };

  const selectAllUnpaid = () => {
    setSelectedIds(new Set(unpaidMembers.map((m) => m.memberId)));
  };

  const clearSelection = () => setSelectedIds(new Set());

  const paySelected = async (paymentMethod: "CASH" | "QR_CODE") => {
    const memberIds = unpaidMembers
      .map((m) => m.memberId)
      .filter((id) => selectedIds.has(id));
    if (memberIds.length === 0) {
      toast.error("Chọn ít nhất một khách chưa trả.");
      return;
    }

    setBusy(true);
    try {
      // 1 request BE cho nhiều memberIds — không gọi tuần tự từng người
      const results = await PosCheckInService.payMembers(cafeId, sessionId, {
        memberIds,
        paymentMethod,
        notes,
      });
      if (paymentMethod === "QR_CODE") {
        const withQr = results.filter((r) => qrValue(r));
        setQrListAndNotify(withQr.length > 0 ? withQr : results);
        toast.success(
          `Đã tạo ${results.length} mã QR trong 1 lần. Đưa từng QR cho khách quét.`,
        );
      } else {
        setQrListAndNotify([]);
        toast.success(`Đã thu tiền mặt ${results.length} khách.`);
      }
      const next = await loadStatus();
      if (
        next &&
        next.members.length > 0 &&
        next.members.every((m) => isMemberPaid(m.status))
      ) {
        onAllPaid?.();
      }
    } catch (err: unknown) {
      toast.error(
        err instanceof Error ? err.message : "Không thanh toán được.",
      );
    } finally {
      setBusy(false);
    }
  };

  const regenerateQr = async (memberId: string) => {
    setBusy(true);
    try {
      const row = await PosCheckInService.regenerateMemberQr(
        cafeId,
        sessionId,
        memberId,
      );
      if (!row) {
        toast.error("Không tạo lại được QR.");
        return;
      }
      setQrListAndNotify((prev) => {
        const others = prev.filter((p) => p.memberId !== memberId);
        return [...others, row];
      });
      toast.success("Đã tạo lại QR.");
      await loadStatus();
    } catch (err: unknown) {
      toast.error(
        err instanceof Error ? err.message : "Không tạo lại được QR.",
      );
    } finally {
      setBusy(false);
    }
  };

  const selectedCount = unpaidMembers.filter((m) =>
    selectedIds.has(m.memberId),
  ).length;

  return (
    <div className="min-h-0 space-y-3 overflow-y-auto rounded-xl border border-violet-200 bg-violet-50/40 p-3">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <p className="flex items-center gap-1.5 text-xs font-bold uppercase tracking-wide text-violet-900">
          <Users className="size-3.5" />
          Chia tiền theo khách
        </p>
        <Button
          type="button"
          size="sm"
          variant="outline"
          disabled={loading || busy}
          onClick={() => void loadStatus()}
          className="h-7 gap-1 border-violet-200 bg-white text-[11px]"
        >
          <RefreshCw className={`size-3 ${loading ? "animate-spin" : ""}`} />
          Làm mới
        </Button>
      </div>

      {status ? (
        <div className="grid grid-cols-3 gap-2 text-[11px]">
          <div className="rounded-lg border border-violet-100 bg-white px-2 py-1.5">
            <p className="text-neutral-400">Tổng</p>
            <p className="font-mono font-bold text-neutral-900">
              {status.totalAmount.toLocaleString("vi-VN")}đ
            </p>
          </div>
          <div className="rounded-lg border border-emerald-100 bg-white px-2 py-1.5">
            <p className="text-neutral-400">Đã thu</p>
            <p className="font-mono font-bold text-emerald-700">
              {status.totalPaid.toLocaleString("vi-VN")}đ
            </p>
          </div>
          <div className="rounded-lg border border-amber-100 bg-white px-2 py-1.5">
            <p className="text-neutral-400">Còn lại</p>
            <p className="font-mono font-bold text-amber-700">
              {status.totalRemaining.toLocaleString("vi-VN")}đ
            </p>
          </div>
        </div>
      ) : null}

      {unpaidMembers.length > 0 ? (
        <div className="flex flex-wrap items-center gap-1.5">
          <Button
            type="button"
            size="sm"
            variant="outline"
            disabled={busy}
            onClick={selectAllUnpaid}
            className="h-7 border-violet-200 bg-white text-[10px]"
          >
            Chọn hết chưa trả
          </Button>
          <Button
            type="button"
            size="sm"
            variant="ghost"
            disabled={busy || selectedCount === 0}
            onClick={clearSelection}
            className="h-7 text-[10px] text-neutral-500"
          >
            Bỏ chọn
          </Button>
          <span className="text-[10px] text-neutral-500">
            Đã chọn {selectedCount}/{unpaidMembers.length}
          </span>
          <div className="flex w-full gap-1 sm:ml-auto sm:w-auto">
            <Button
              type="button"
              size="sm"
              disabled={busy || selectedCount === 0}
              onClick={() => void paySelected("CASH")}
              className="h-8 flex-1 gap-1 bg-neutral-950 px-2.5 text-[11px] text-white sm:flex-none"
            >
              <Banknote className="size-3.5" />
              Tiền mặt ({selectedCount})
            </Button>
            <Button
              type="button"
              size="sm"
              variant="outline"
              disabled={busy || selectedCount === 0}
              onClick={() => void paySelected("QR_CODE")}
              className="h-8 flex-1 gap-1 border-violet-300 bg-white px-2.5 text-[11px] font-bold text-violet-900 sm:flex-none"
            >
              <QrCode className="size-3.5" />
              Tạo QR ({selectedCount})
            </Button>
          </div>
        </div>
      ) : null}

      <div className="max-h-52 space-y-1.5 overflow-y-auto">
        {(status?.members || []).length === 0 ? (
          <p className="text-[11px] text-neutral-500">
            {loading
              ? "Đang tải danh sách khách..."
              : "Chưa có dữ liệu chia tiền (session cần Unpaid sau checkout)."}
          </p>
        ) : (
          status?.members.map((m) => {
            const paid = isMemberPaid(m.status);
            const checked = selectedIds.has(m.memberId);
            return (
              <label
                key={m.memberId}
                className={`flex cursor-pointer items-center gap-2 rounded-lg border px-2.5 py-2 ${
                  paid
                    ? "border-emerald-100 bg-emerald-50/50"
                    : checked
                      ? "border-violet-300 bg-white"
                      : "border-neutral-200 bg-white"
                }`}
              >
                {!paid ? (
                  <input
                    type="checkbox"
                    checked={checked}
                        disabled={busy}
                        onChange={() => toggleMember(m.memberId)}
                        className="size-3.5 shrink-0 accent-violet-700"
                      />
                    ) : (
                      <span className="size-3.5 shrink-0" />
                    )}
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-xs font-bold text-neutral-950">
                        {m.displayName}
                      </p>
                      <p className="truncate text-[10px] text-neutral-500">
                        {statusLabel(m.status)} ·{" "}
                        <span className="font-mono font-semibold text-neutral-800">
                          {m.totalAmount.toLocaleString("vi-VN")}đ
                        </span>
                      </p>
                    </div>
                    {paid ? (
                      <span className="shrink-0 rounded-md border border-emerald-200 bg-emerald-50 px-1.5 py-0.5 text-[10px] font-bold text-emerald-800">
                        OK
                      </span>
                    ) : normalizePayStatus(m.paymentMethod) === "qrcode" ? (
                      <Button
                        type="button"
                        size="sm"
                        variant="ghost"
                        disabled={busy}
                        onClick={(e) => {
                          e.preventDefault();
                          void regenerateQr(m.memberId);
                        }}
                        className="h-7 shrink-0 px-1.5 text-[10px] text-neutral-600"
                        title="Tạo lại QR"
                      >
                        <RefreshCw className="size-3" />
                      </Button>
                    ) : null}
              </label>
            );
          })
        )}
      </div>
    </div>
  );
}
