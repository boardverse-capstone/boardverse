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

function isMemberStatusPaid(status?: string | null) {
  const st = normalizePayStatus(status);
  return st === "paidcash" || st === "paidqr" || st === "paid";
}

/**
 * Member coi là "đã trả thật" khi:
 *  - status thuộc nhóm paid (paidcash | paidqr | paid), VÀ
 *  - paidAt là timestamp thật (không null/empty).
 *
 * Lý do: BE có thể set status = PaidQr ngay khi vừa tạo QR — lúc này chưa có
 * webhook SePay xác nhận. Nếu chỉ dựa vào status, POS sẽ auto-fire
 * "Thanh toán thành công" dù khách chưa quét QR.
 */
function isMemberPaid(status?: string | null, paidAt?: string | null) {
  if (!isMemberStatusPaid(status)) return false;
  return Boolean(paidAt && String(paidAt).trim().length > 0);
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
  /**
   * Cache kết quả `payMembers` / `regenerateMemberQr` theo memberId.
   * Dùng để biết member nào có `paidAt` thật (CASH hoặc QR đã webhook)
   * khi `/payment-status` BE chưa cập nhật kịp. Lưu state (không ref) để
   * React re-render khi cache đổi và linter không cảnh báo truy cập ref
   * trong render.
   *
   * Reset cache khi đổi session/quán: dùng useEffect thay vì key prop
   * (giữ component identity) nhưng suppress React Compiler cảnh báo
   * "cascading renders" vì đây là sync giữa 2 nguồn state (sessionId ↔
   * cache) — chỉ chạy 1 lần khi session đổi, không có loop.
   */
  const [paymentResultByMember, setPaymentResultByMember] = useState<
    Map<string, MemberPaymentResult>
  >(() => new Map());
  const prevSessionKey = useRef(`${cafeId}::${sessionId}`);
  const hasInitializedSelection = useRef(false);
  const notifiedAllPaid = useRef(false);
  /**
   * [FIX #split-bill-auto-close] Chỉ auto-fire `onAllPaid` khi staff đã có
   * tương tác thanh toán thật sự trong phiên này (`payMembers` /
   * `manualConfirm`). Tránh case load `/payment-status` lần đầu mà BE
   * trả `totalPaid === totalAmount` (do data cũ, cache, hoặc session
   * trạng thái khác) → tự đóng modal + xóa session khỏi state dù chưa
   * thanh toán gì từ flow này.
   */
  const hasUserInteracted = useRef(false);
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

  const rememberPaymentResults = useCallback((rows: MemberPaymentResult[]) => {
    setPaymentResultByMember((prev) => {
      const next = new Map(prev);
      rows.forEach((row) => {
        if (row?.memberId) next.set(row.memberId, row);
      });
      return next;
    });
  }, []);

  const rememberPaymentResult = useCallback((row: MemberPaymentResult | null) => {
    if (!row?.memberId) return;
    setPaymentResultByMember((prev) => {
      const next = new Map(prev);
      next.set(row.memberId, row);
      return next;
    });
  }, []);

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

  /** Member coi là chưa trả khi KHÔNG có paidAt thật (CASH ngay, hoặc QR đã webhook). */
  const unpaidMembers = useMemo(
    () =>
      (status?.members || []).filter((m) => {
        const cachedPaidAt = paymentResultByMember.get(m.memberId)?.paidAt;
        return !isMemberPaid(m.status, m.paidAt ?? cachedPaidAt ?? null);
      }),
    [status, paymentResultByMember],
  );

  /** Tổng paidAt từ cache + status — dùng cho check "tất cả đã trả thật". */
  const resolvePaidAt = useCallback(
    (memberId: string, statusPaidAt?: string | null): string | null => {
      const fromCache = paymentResultByMember.get(memberId)?.paidAt;
      const fromStatus = statusPaidAt ?? null;
      const candidate = fromStatus || fromCache || null;
      return candidate && String(candidate).trim().length > 0 ? candidate : null;
    },
    [paymentResultByMember],
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
          .filter(
            (m) =>
              !isMemberPaid(
                m.status,
                resolvePaidAt(m.memberId, m.paidAt ?? null),
              ),
          )
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

        /**
         * Chỉ coi "đã thu đủ" khi:
         *  1. Tất cả members có status paid (paidcash | paidqr | paid) VÀ paidAt thật, HOẶC
         *  2. Tổng đã thu từ BE (totalPaid) >= tổng hóa đơn (totalAmount) — backend đã
         *     cộng dồn từ MemberPayments audit, đáng tin cậy hơn status từng member.
         *
         * Tránh case BE trả status=PaidQr ngay khi tạo QR (chưa có webhook SePay).
         */
        const totalMatches =
          next.members.length > 0 &&
          next.totalAmount > 0 &&
          next.totalPaid >= next.totalAmount;
        const allMembersMarkedPaid =
          next.members.length > 0 &&
          next.members.every((m) =>
            isMemberPaid(m.status, resolvePaidAt(m.memberId, m.paidAt ?? null)),
          );
        const allPaid = totalMatches || allMembersMarkedPaid;
        // [FIX #split-bill-auto-close] Chỉ auto-fire khi staff đã có tương tác
        // thanh toán trong phiên này. Tránh BE trả totalPaid === totalAmount
        // (data cũ, cache, hoặc session khác) khiến modal tự đóng + xóa session.
        if (allPaid && hasUserInteracted.current && !notifiedAllPaid.current) {
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
    [cafeId, sessionId, resolvePaidAt],
  );

  useEffect(() => {
    loadStatusRef.current = loadStatus;
  });

  // Chỉ load lại khi đổi session/quán — không phụ thuộc callback (tránh loop nhấp nháy).
  useEffect(() => {
    const key = `${cafeId}::${sessionId}`;
    const isNewSession = prevSessionKey.current !== key;
    prevSessionKey.current = key;
    hasInitializedSelection.current = false;
    notifiedAllPaid.current = false;
    if (isNewSession) {
      // Reset cache khi chuyển session — lần render đầu của session mới.
      setPaymentResultByMember(new Map());
      hasUserInteracted.current = false;
    }
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
    // [FIX #split-bill-auto-close] Đánh dấu staff đã có tương tác thanh toán
    // thực sự — từ giờ `loadStatus` mới được auto-fire `onAllPaid` nếu đủ.
    hasUserInteracted.current = true;
    try {
      // 1 request BE cho nhiều memberIds — không gọi tuần tự từng người
      const results = await PosCheckInService.payMembers(cafeId, sessionId, {
        memberIds,
        paymentMethod,
        notes,
      });
      // Lưu kết quả vào cache để biết member nào có paidAt thật (CASH ngay,
      // QR chỉ có paidAt sau khi SePay webhook thành công).
      rememberPaymentResults(results);

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
      /**
       * CASH — BE atomic flip đồng bộ ngay (`PaidCash` + `paidAt` set
       * ngay từ DB transaction). TIN tưởng `results` trả về từ
       * `payMembers`: nếu ≥1 member đã được confirm thành công (có
       * `memberId` + `status = PaidCash` thật), coi như phiên đã được
       * thu đủ phần CASH. KHÔNG cần đợi `loadStatus()` vì nhiều khi
       * BE trả `payment-status` chậm / cache khiến `paidAt` rỗng →
       * FE tưởng chưa thanh toán → không fire `onAllPaid` → session
       * vẫn nằm trong phiên chơi dù staff đã thu xong tiền mặt.
       */
      if (
        paymentMethod === "CASH" &&
        results.length > 0 &&
        results.every((r) => r?.memberId && isMemberStatusPaid(r.status)) &&
        !notifiedAllPaid.current
      ) {
        notifiedAllPaid.current = true;
        onAllPaidRef.current?.();
      }
      const next = await loadStatus();
      /**
       * QR — KHÔNG auto-fire onAllPaid ngay sau khi tạo QR — chờ polling
       * `/payment-status` xác nhận đã có paidAt thật (QR chỉ có sau
       * webhook SePay). Việc check "đã thu đủ" được thực hiện trong
       * `loadStatus` dựa trên totalPaid >= totalAmount hoặc paidAt
       * thật của từng member.
       */
      if (paymentMethod === "QR_CODE" && next) {
        const allMarkedPaid =
          next.members.length > 0 &&
          next.members.every((m) =>
            isMemberPaid(m.status, resolvePaidAt(m.memberId, m.paidAt ?? null)),
          );
        if (allMarkedPaid && !notifiedAllPaid.current) {
          notifiedAllPaid.current = true;
          onAllPaidRef.current?.();
        }
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
    // [FIX #split-bill-auto-close] Đánh dấu staff đã tương tác thanh toán.
    hasUserInteracted.current = true;
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
      // Cập nhật cache để tránh stale paidAt từ lần pay trước.
      rememberPaymentResult(row);
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

  const selectedCount = useMemo(
    () => unpaidMembers.filter((m) => selectedIds.has(m.memberId)).length,
    [unpaidMembers, selectedIds],
  );

  return (
    <div className="min-h-0 space-y-3 overflow-y-auto rounded-xl border border-amber-200 bg-amber-50/40 p-3">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <p className="flex items-center gap-1.5 text-xs font-bold uppercase tracking-wide text-amber-900">
          <Users className="size-3.5" />
          Chia tiền theo khách
        </p>
        <Button
          type="button"
          size="sm"
          variant="outline"
          disabled={loading || busy}
          onClick={() => void loadStatus()}
          className="h-7 gap-1 border-amber-200 bg-white text-[11px]"
        >
          <RefreshCw className={`size-3 ${loading ? "animate-spin" : ""}`} />
          Làm mới
        </Button>
      </div>

      {status ? (
        <div className="grid grid-cols-3 gap-2 text-[11px]">
          <div className="rounded-lg border border-amber-100 bg-white px-2 py-1.5">
            <p className="text-neutral-400">Tổng</p>
            <p className="font-mono font-bold text-neutral-900">
              {status.totalAmount.toLocaleString("vi-VN")}đ
            </p>
          </div>
          <div className="rounded-lg border border-orange-100 bg-white px-2 py-1.5">
            <p className="text-neutral-400">Đã thu</p>
            <p className="font-mono font-bold text-orange-700">
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
            className="h-7 border-amber-200 bg-white text-[10px]"
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
              className="h-8 flex-1 gap-1 border-amber-300 bg-white px-2.5 text-[11px] font-bold text-amber-900 sm:flex-none"
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
            const cachedPaidAt = paymentResultByMember.get(m.memberId)?.paidAt;
            const paid = isMemberPaid(m.status, m.paidAt ?? cachedPaidAt ?? null);
            const checked = selectedIds.has(m.memberId);
            return (
              <label
                key={m.memberId}
                className={`flex cursor-pointer items-center gap-2 rounded-lg border px-2.5 py-2 ${
                  paid
                    ? "border-orange-100 bg-orange-50/50"
                    : checked
                      ? "border-amber-300 bg-white"
                      : "border-neutral-200 bg-white"
                }`}
              >
                {!paid ? (
                  <input
                    type="checkbox"
                    checked={checked}
                        disabled={busy}
                        onChange={() => toggleMember(m.memberId)}
                        className="size-3.5 shrink-0 accent-amber-700"
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
                      <span className="shrink-0 rounded-md border border-orange-200 bg-orange-50 px-1.5 py-0.5 text-[10px] font-bold text-orange-800">
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
