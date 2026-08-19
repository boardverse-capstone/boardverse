'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import QRCode from 'react-qr-code';
import { Banknote, Calculator, CheckCircle2, Receipt, Timer } from 'lucide-react';
import { toast } from 'sonner';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Separator } from '@/components/ui/separator';
import { Spinner } from '@/components/ui/spinner';
import { useActiveSession, useStaffCafe } from '../hooks/usePosCheckIn';
import { useCompleteSession } from '../hooks/usePosMutations';
import { PosCheckInService, clearCheckoutComponentResults, clearServerCheckoutTotal } from '../services/pos-check-in.service';
import type { PaymentCode, SessionBill } from '../types/pos-check-in.interface';
import { SessionTimer } from './session-timer';

interface SessionCheckoutPanelProps {
  bookingId: string;
  onCompleted?: () => void;
}

function formatCurrency(amount: number) {
  return new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(amount);
}

function formatDuration(minutes: number) {
  const hours = Math.floor(minutes / 60);
  const mins = minutes % 60;
  if (hours === 0) return `${mins} phút`;
  return `${hours} giờ ${mins} phút`;
}

function isEstimatedBill(bill: SessionBill) {
  return bill.lineItems.some((item) => /estimated|ước tính tạm/i.test(item.id + item.label));
}

function billStorageKey(sessionId: string) {
  return `pos_bill_${sessionId}`;
}

function billFrozenKey(sessionId: string) {
  return `pos_bill_frozen_${sessionId}`;
}

function readStoredBill(sessionId: string): { bill: SessionBill; frozenAt: string | null } | null {
  if (typeof window === 'undefined' || !sessionId) return null;
  try {
    const raw = localStorage.getItem(billStorageKey(sessionId));
    if (!raw) return null;
    const bill = JSON.parse(raw) as SessionBill;
    if (!bill || !(Number(bill.totalDue) > 0)) return null;
    return {
      bill,
      frozenAt: localStorage.getItem(billFrozenKey(sessionId)),
    };
  } catch {
    return null;
  }
}

function writeStoredBill(sessionId: string, bill: SessionBill, frozenAt: string) {
  if (typeof window === 'undefined' || !sessionId) return;
  try {
    localStorage.setItem(billStorageKey(sessionId), JSON.stringify(bill));
    localStorage.setItem(billFrozenKey(sessionId), frozenAt);
  } catch {
    // ignore
  }
}

function clearStoredBill(sessionId: string) {
  if (typeof window === 'undefined' || !sessionId) return;
  try {
    localStorage.removeItem(billStorageKey(sessionId));
    localStorage.removeItem(billFrozenKey(sessionId));
  } catch {
    // ignore
  }
}

function isComponentsChecked(sessionId: string) {
  if (typeof window === 'undefined' || !sessionId) return false;
  try {
    return localStorage.getItem(`pos_components_checked_${sessionId}`) === 'true';
  } catch {
    return false;
  }
}

export function SessionCheckoutPanel({ bookingId, onCompleted }: SessionCheckoutPanelProps) {
  const { data: cafe } = useStaffCafe();
  const { data: session, isLoading, isError, refetch } = useActiveSession(bookingId);
  const effectiveCafeId = session?.cafeId || cafe?.id || '';
  const completeSession = useCompleteSession(bookingId, effectiveCafeId);

  const [bill, setBill] = useState<SessionBill | null>(null);
  const [paymentCode, setPaymentCode] = useState<PaymentCode | null>(null);
  const [isCalculating, setIsCalculating] = useState(false);
  const [isCreatingQr, setIsCreatingQr] = useState(false);
  const [isCashConfirm, setIsCashConfirm] = useState(false);
  /** Thời điểm đóng băng đếm giờ khi chốt hóa đơn (nếu server chưa có endedAt) */
  const [billFrozenAt, setBillFrozenAt] = useState<string | null>(null);
  const hydrateAttempted = useRef<string | null>(null);

  const timerEndedAt = useMemo(() => {
    if (session?.endedAt) return session.endedAt;
    if (bill && session?.startedAt && bill.durationMinutes > 0) {
      return new Date(
        new Date(session.startedAt).getTime() + bill.durationMinutes * 60_000,
      ).toISOString();
    }
    if (bill) return billFrozenAt || undefined;
    if (session?.status === 'Paying' || session?.status === 'Completed') {
      return billFrozenAt || session.endedAt || undefined;
    }
    return undefined;
  }, [session?.endedAt, session?.startedAt, session?.status, bill, billFrozenAt]);

  /** Restore hóa đơn sau F5 — bill chỉ sống trong state nên mất nếu không persist */
  useEffect(() => {
    if (!session?.sessionId) return;
    const sessionId = session.sessionId;

    if (!bill) {
      const stored = readStoredBill(sessionId);
      if (stored) {
        setBill(stored.bill);
        setBillFrozenAt(stored.frozenAt);
        hydrateAttempted.current = sessionId;
        return;
      }
    }

    if (hydrateAttempted.current === sessionId) return;
    if (bill) {
      hydrateAttempted.current = sessionId;
      return;
    }

    // Server đã UNPAID — tải lại hóa đơn im lặng
    if (session.status !== 'Paying' && session.status !== 'Completed') return;

    hydrateAttempted.current = sessionId;
    const cafeId = effectiveCafeId || cafe?.id || '';
    if (!cafeId) {
      hydrateAttempted.current = null;
      return;
    }

    void PosCheckInService.calculateBill(sessionId, cafeId)
      .then((result) => {
        if (!(result.totalDue > 0)) return;
        const frozenAt = result.calculatedAt || new Date().toISOString();
        setBill(result);
        setBillFrozenAt(frozenAt);
        writeStoredBill(sessionId, result, frozenAt);
      })
      .catch(() => {
        hydrateAttempted.current = null;
      });
  }, [session?.sessionId, session?.status, bill, effectiveCafeId, cafe?.id]);

  const markLocalPaid = () => {
    if (!session || typeof window === 'undefined') return;
    try {
      localStorage.setItem(`pos_paid_session_${session.sessionId}`, 'true');
      localStorage.removeItem(`pos_checking_${session.sessionId}`);
      localStorage.removeItem(`pos_components_checked_${session.sessionId}`);
      clearCheckoutComponentResults(session.sessionId);
      clearServerCheckoutTotal(session.sessionId);
      clearStoredBill(session.sessionId);
      if (session.tableLabel) {
        localStorage.setItem(
          `pos_paid_table_${session.tableLabel.toLowerCase().trim()}`,
          'true',
        );
      }
    } catch {
      // ignore
    }
  };

  const handleCalculateBill = async () => {
    if (!session?.sessionId) {
      toast.error('Thiếu sessionId — mở lại bàn từ sơ đồ.');
      return;
    }
    const cafeId = effectiveCafeId || cafe?.id || '';
    if (!cafeId) {
      toast.error('Thiếu mã quán.');
      return;
    }
    // Đã có hóa đơn / UNPAID thì không bắt kiểm kê lại
    if (
      session.status !== 'Paying' &&
      session.status !== 'Completed' &&
      !isComponentsChecked(session.sessionId)
    ) {
      toast.error(
        'Chưa kiểm kê linh kiện. Sang tab Game → Nhận lại game → Đủ hết, rồi mới chốt hóa đơn.',
      );
      return;
    }
    setIsCalculating(true);
    try {
      const result = await PosCheckInService.calculateBill(session.sessionId, cafeId);
      if (!result.totalDue || result.totalDue <= 0) {
        toast.error('Hóa đơn 0đ. Hãy nhận lại game, kiểm kê rồi chốt hóa đơn lại.');
        return;
      }
      const frozenAt = new Date().toISOString();
      setBill(result);
      setBillFrozenAt(frozenAt);
      writeStoredBill(session.sessionId, result, frozenAt);
      setPaymentCode(null);
      await refetch();
      toast.success('Đã chốt hóa đơn. Tiếp theo tạo QR hoặc thu tiền mặt.');
    } catch (err) {
      toast.error((err as Error)?.message || 'Không thể tính / chốt hóa đơn.');
    } finally {
      setIsCalculating(false);
    }
  };

  const handleGeneratePaymentCode = async () => {
    if (!session?.sessionId || !bill) return;
    const amount = Math.round(Number(bill.totalDue));
    if (!Number.isFinite(amount) || amount <= 0) {
      toast.error('Hóa đơn phải > 0đ. Hãy chốt hóa đơn lại.');
      return;
    }
    const cafeId = effectiveCafeId || cafe?.id || '';
    if (!cafeId) {
      toast.error('Thiếu mã quán.');
      return;
    }
    setIsCreatingQr(true);
    try {
      const code = await PosCheckInService.createSessionPayment(cafeId, session.sessionId, {
        totalAmount: amount,
        depositAppliedAmount: 0,
        notes: `POS VietQR · ${amount} VND`,
      });

      setPaymentCode(code);
      // Đồng bộ Tổng thanh toán theo totalAmount BE trả về (không giữ ước tính FE)
      const serverAmount = Math.round(Number(code.amount));
      if (Number.isFinite(serverAmount) && serverAmount > 0) {
        const synced: SessionBill = {
          ...bill,
          totalDue: serverAmount,
          subtotal: serverAmount + (bill.depositCreditTotal || 0),
          lineItems: [
            {
              id: 'session-total',
              label: 'Tổng hóa đơn (theo server)',
              quantity: 1,
              unitPrice: serverAmount,
              amount: serverAmount,
            },
          ],
          calculatedAt: new Date().toISOString(),
        };
        setBill(synced);
        writeStoredBill(session.sessionId, synced, synced.calculatedAt);
      }
      toast.success('Đã tạo mã thanh toán VietQR / SePay.');
    } catch (err) {
      toast.error((err as Error)?.message || 'Không thể tạo mã thanh toán.');
    } finally {
      setIsCreatingQr(false);
    }
  };

  const handleCashConfirm = async () => {
    if (!session?.sessionId || !bill) {
      toast.error('Vui lòng chốt hóa đơn trước.');
      return;
    }
    const cafeId = effectiveCafeId || cafe?.id || '';
    if (!cafeId) {
      toast.error('Thiếu mã quán.');
      return;
    }

    setIsCashConfirm(true);
    try {
      let payBill = bill;

      // Cố lấy số server; lỗi chốt/ước tính không chặn nếu đã có totalDue > 0
      if (isEstimatedBill(payBill) || session.status === 'Active' || session.status === 'Checking') {
        try {
          const freshBill = await PosCheckInService.calculateBill(session.sessionId, cafeId);
          if (freshBill.totalDue > 0) {
            payBill = freshBill;
            setBill(freshBill);
            writeStoredBill(session.sessionId, freshBill, freshBill.calculatedAt);
            await refetch();
          }
        } catch {
          // giữ payBill hiện tại
        }
      }

      if (isEstimatedBill(payBill)) {
        const serverAmt = await PosCheckInService.getServerSessionTotalAmount(
          cafeId,
          session.sessionId,
          { pollAttempts: 4, pollIntervalMs: 400 },
        );
        const amount = serverAmt > 0 ? serverAmt : Math.round(Number(payBill.totalDue));
        if (!Number.isFinite(amount) || amount <= 0) {
          toast.error('Hóa đơn phải > 0đ. Hãy chốt hóa đơn lại.');
          return;
        }
        // Bỏ nhãn ước tính — không chặn thu tiền mặt vì banner vàng
        payBill = {
          ...payBill,
          totalDue: amount,
          subtotal: amount + (payBill.depositCreditTotal || 0),
          lineItems: [
            {
              id: 'session-total',
              label: 'Tổng hóa đơn phiên chơi',
              quantity: 1,
              unitPrice: amount,
              amount,
            },
          ],
        };
        setBill(payBill);
        writeStoredBill(session.sessionId, payBill, payBill.calculatedAt);
      }

      const payAmount = Math.round(Number(payBill.totalDue));
      if (!Number.isFinite(payAmount) || payAmount <= 0) {
        toast.error('Hóa đơn phải > 0đ. Hãy chốt hóa đơn lại.');
        return;
      }

      await PosCheckInService.manualConfirmPayment({
        sessionId: session.sessionId,
        amount: payAmount,
        cafeId,
        notes: 'Staff xác nhận thu tiền mặt tại POS',
      });
      markLocalPaid();
      toast.success('Đã xác nhận thanh toán tiền mặt.');
      onCompleted?.();
    } catch (err) {
      toast.error((err as Error)?.message || 'Không thể xác nhận tiền mặt.');
    } finally {
      setIsCashConfirm(false);
    }
  };

  const handleCompleteSession = async () => {
    if (!session) return;
    try {
      if (!paymentCode && !bill) {
        toast.error('Vui lòng chốt hóa đơn và tạo mã thanh toán trước.');
        return;
      }
      if (bill && isEstimatedBill(bill)) {
        toast.error('Hóa đơn chưa chốt xong. Bấm Chốt hóa đơn lại, rồi mới thanh toán.');
        return;
      }
      const result = await completeSession.mutateAsync({
        sessionId: session.sessionId,
        bill: bill ?? undefined,
      });
      markLocalPaid();
      setBill(result.bill);
      setPaymentCode(result.paymentCode);
      toast.success(
        `${session.tableLabel || 'Bàn'} đã thanh toán · Bàn trở về trạng thái trống.`,
      );
      onCompleted?.();
    } catch (err) {
      toast.error((err as Error)?.message || 'Không thể hoàn tất thanh toán.');
    }
  };

  if (isLoading) {
    return (
      <div className="flex justify-center py-6">
        <Spinner className="h-5 w-5" />
      </div>
    );
  }

  if (isError || !session) {
    return (
      <p className="rounded-lg border border-rose-200 bg-rose-50 p-3 text-sm text-rose-700">
        Không tìm thấy phiên chơi đang hoạt động.
      </p>
    );
  }

  const isPending =
    isCalculating || isCreatingQr || isCashConfirm || completeSession.isPending;

  const componentsChecked =
    session.status === 'Paying' ||
    session.status === 'Completed' ||
    isComponentsChecked(session.sessionId);

  /** Ưu tiên totalAmount BE (từ QR / session-payment), không dùng ước tính FE */
  const displayTotal =
    paymentCode?.amount && Number(paymentCode.amount) > 0
      ? Math.round(Number(paymentCode.amount))
      : Math.round(Number(bill?.totalDue ?? 0));

  return (
    <div className="space-y-4 rounded-xl border border-emerald-200/80 bg-emerald-50/30 p-3 sm:p-4 md:p-5">
      <div className="flex flex-wrap items-center justify-between gap-2 border-b border-emerald-200/60 pb-3">
        <div>
          <p className="flex items-center gap-2 text-sm font-semibold text-emerald-950 md:text-base">
            <Receipt className="h-4 w-4 shrink-0 text-emerald-600" />
            Thanh toán phiên chơi
          </p>
          <p className="mt-0.5 text-xs text-muted-foreground">
            {session.game.name} · {session.presentCount} người
          </p>
        </div>
        <Badge
          variant="secondary"
          className="bg-emerald-100/80 text-emerald-900 border border-emerald-200 text-xs"
        >
          {session.billingModel === 'BY_HOUR' ? 'Theo giờ' : 'Theo đồ uống'}
        </Badge>
      </div>

      <div className="flex items-center justify-between rounded-lg bg-background p-3 text-sm border shadow-sm">
        <span className="flex items-center gap-1.5 text-muted-foreground text-xs sm:text-sm">
          <Timer className="h-4 w-4 text-emerald-600" />
          Thời gian đã chơi
        </span>
        <SessionTimer
          startedAt={session.startedAt}
          endedAt={timerEndedAt}
          className="font-mono text-base font-bold text-emerald-900"
        />
      </div>

      {!bill ? (
        <div className="space-y-2">
          {!componentsChecked ? (
            <p className="rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-xs text-amber-900">
              Chưa kiểm kê linh kiện — sang tab Game, nhận lại game và bấm <strong>Đủ hết</strong>, rồi
              mới chốt hóa đơn.
            </p>
          ) : null}
          <Button
            type="button"
            className="h-11 w-full text-sm font-medium"
            variant="default"
            disabled={isPending || !componentsChecked}
            onClick={() => void handleCalculateBill()}
          >
            {isCalculating ? (
              <Spinner className="mr-2 h-4 w-4" />
            ) : (
              <Calculator className="mr-2 h-4 w-4" />
            )}
            Chốt hóa đơn
          </Button>
        </div>
      ) : (
        <div className="space-y-4">
          {isEstimatedBill(bill) ? (
            <p className="rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-xs text-amber-900">
              Số tiền chưa khớp với hệ thống. Bấm <strong>Chốt hóa đơn</strong> lại trước khi tạo QR
              hoặc thu tiền mặt.
            </p>
          ) : null}
          <div className="space-y-3 rounded-lg border bg-background p-3 sm:p-4 shadow-sm">
            <div className="flex items-center justify-between border-b pb-2 text-sm font-semibold">
              <span>Chi tiết hóa đơn</span>
              <Badge variant="outline" className="font-normal text-xs">
                {formatDuration(bill.durationMinutes)}
              </Badge>
            </div>
            <div className="space-y-2 text-xs sm:text-sm">
              {bill.lineItems.map((item) => (
                <div key={item.id} className="flex justify-between items-center gap-2">
                  <span className="text-muted-foreground line-clamp-1">{item.label}</span>
                  <span className="font-medium shrink-0">{formatCurrency(item.amount)}</span>
                </div>
              ))}
              {bill.depositCreditTotal > 0 && (
                <div className="flex justify-between items-center text-emerald-700 font-medium">
                  <span>Credit đã cọc trước</span>
                  <span>-{formatCurrency(bill.depositCreditTotal)}</span>
                </div>
              )}
            </div>
            <Separator />
            <div className="flex items-center justify-between rounded-lg bg-emerald-50 p-2.5 border border-emerald-200 text-emerald-900">
              <span className="text-sm font-bold">Tổng thanh toán</span>
              <span className="text-base sm:text-lg font-extrabold text-emerald-700">
                {formatCurrency(displayTotal)}
              </span>
            </div>

            {!paymentCode && (
              <div className="grid gap-2 mt-2 sm:grid-cols-2">
                <Button
                  type="button"
                  className="h-11 w-full text-sm font-medium bg-emerald-600 hover:bg-emerald-700 text-white sm:col-span-2"
                  disabled={isPending}
                  onClick={() => void handleCashConfirm()}
                >
                  {isCashConfirm ? (
                    <Spinner className="mr-2 h-4 w-4" />
                  ) : (
                    <Banknote className="mr-2 h-4 w-4" />
                  )}
                  Thu tiền mặt · {formatCurrency(displayTotal)}
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  className="h-11 w-full text-sm font-medium sm:col-span-2"
                  disabled={isPending}
                  onClick={() => void handleGeneratePaymentCode()}
                >
                  {isCreatingQr ? (
                    <Spinner className="mr-2 h-4 w-4" />
                  ) : (
                    <Receipt className="mr-2 h-4 w-4" />
                  )}
                  Tạo mã VietQR / SePay
                </Button>
              </div>
            )}

            {paymentCode && (
              <Button
                type="button"
                className="h-11 w-full bg-emerald-600 hover:bg-emerald-700 text-white text-sm font-medium mt-2"
                disabled={isPending}
                onClick={() => void handleCompleteSession()}
              >
                {completeSession.isPending ? (
                  <Spinner className="mr-2 h-4 w-4" />
                ) : (
                  <CheckCircle2 className="mr-2 h-4 w-4" />
                )}
                Xác nhận đã thanh toán
              </Button>
            )}
          </div>

          {paymentCode ? (
            <div className="flex flex-col items-center gap-3 rounded-lg border border-emerald-300/70 bg-white p-4 text-center shadow-sm">
              <Badge variant="secondary" className="bg-emerald-100 text-emerald-800 text-xs">
                Mã giao dịch:{' '}
                <span className="font-mono font-bold ml-1">{paymentCode.code}</span>
              </Badge>
              <div className="rounded-xl bg-white p-3 shadow-sm ring-1 ring-border">
                <QRCode value={paymentCode.qrPayload || paymentCode.code} size={180} className="h-auto max-w-full" />
              </div>
              <p className="text-xs text-muted-foreground">
                Quét mã VietQR / SePay để chuyển khoản{' '}
                <span className="font-bold text-emerald-700">
                  {formatCurrency(displayTotal)}
                </span>
              </p>
            </div>
          ) : null}
        </div>
      )}
    </div>
  );
}
