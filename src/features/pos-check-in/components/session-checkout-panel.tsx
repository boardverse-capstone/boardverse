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
  if (hours === 0) return `${mins} phÃºt`;
  return `${hours} giá» ${mins} phÃºt`;
}

function isEstimatedBill(bill: SessionBill) {
  return bill.lineItems.some((item) => /estimated|Æ°á»›c tÃ­nh táº¡m/i.test(item.id + item.label));
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
  /** Thá»i Ä‘iá»ƒm Ä‘Ã³ng bÄƒng Ä‘áº¿m giá» khi chá»‘t hÃ³a Ä‘Æ¡n (náº¿u server chÆ°a cÃ³ endedAt) */
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

  /** Restore hÃ³a Ä‘Æ¡n sau F5 â€” bill chá»‰ sá»‘ng trong state nÃªn máº¥t náº¿u khÃ´ng persist */
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

    // Server Ä‘Ã£ UNPAID â€” táº£i láº¡i hÃ³a Ä‘Æ¡n im láº·ng
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
      toast.error('Thiáº¿u sessionId â€” má»Ÿ láº¡i bÃ n tá»« sÆ¡ Ä‘á»“.');
      return;
    }
    const cafeId = effectiveCafeId || cafe?.id || '';
    if (!cafeId) {
      toast.error('Thiáº¿u mÃ£ quÃ¡n.');
      return;
    }
    // ÄÃ£ cÃ³ hÃ³a Ä‘Æ¡n / UNPAID thÃ¬ khÃ´ng báº¯t kiá»ƒm kÃª láº¡i
    if (
      session.status !== 'Paying' &&
      session.status !== 'Completed' &&
      !isComponentsChecked(session.sessionId)
    ) {
      toast.error(
        'ChÆ°a kiá»ƒm kÃª linh kiá»‡n. Sang tab Game â†’ Nháº­n láº¡i game â†’ Äá»§ háº¿t, rá»“i má»›i chá»‘t hÃ³a Ä‘Æ¡n.',
      );
      return;
    }
    setIsCalculating(true);
    try {
      const result = await PosCheckInService.calculateBill(session.sessionId, cafeId);
      if (!result.totalDue || result.totalDue <= 0) {
        toast.error('HÃ³a Ä‘Æ¡n 0Ä‘. HÃ£y nháº­n láº¡i game, kiá»ƒm kÃª rá»“i chá»‘t hÃ³a Ä‘Æ¡n láº¡i.');
        return;
      }
      const frozenAt = new Date().toISOString();
      setBill(result);
      setBillFrozenAt(frozenAt);
      writeStoredBill(session.sessionId, result, frozenAt);
      setPaymentCode(null);
      await refetch();
      toast.success('ÄÃ£ chá»‘t hÃ³a Ä‘Æ¡n. Tiáº¿p theo táº¡o QR hoáº·c thu tiá»n máº·t.');
    } catch (err) {
      toast.error((err as Error)?.message || 'KhÃ´ng thá»ƒ tÃ­nh / chá»‘t hÃ³a Ä‘Æ¡n.');
    } finally {
      setIsCalculating(false);
    }
  };

  const handleGeneratePaymentCode = async () => {
    if (!session?.sessionId || !bill) return;
    const amount = Math.round(Number(bill.totalDue));
    if (!Number.isFinite(amount) || amount <= 0) {
      toast.error('HÃ³a Ä‘Æ¡n pháº£i > 0Ä‘. HÃ£y chá»‘t hÃ³a Ä‘Æ¡n láº¡i.');
      return;
    }
    const cafeId = effectiveCafeId || cafe?.id || '';
    if (!cafeId) {
      toast.error('Thiáº¿u mÃ£ quÃ¡n.');
      return;
    }
    setIsCreatingQr(true);
    try {
      const code = await PosCheckInService.createSessionPayment(cafeId, session.sessionId, {
        totalAmount: amount,
        depositAppliedAmount: 0,
        notes: `POS VietQR Â· ${amount} VND`,
      });

      setPaymentCode(code);
      // Äá»“ng bá»™ Tá»•ng thanh toÃ¡n theo totalAmount BE tráº£ vá» (khÃ´ng giá»¯ Æ°á»›c tÃ­nh FE)
      const serverAmount = Math.round(Number(code.amount));
      if (Number.isFinite(serverAmount) && serverAmount > 0) {
        const synced: SessionBill = {
          ...bill,
          totalDue: serverAmount,
          subtotal: serverAmount + (bill.depositCreditTotal || 0),
          lineItems: [
            {
              id: 'session-total',
              label: 'Tá»•ng hÃ³a Ä‘Æ¡n (theo server)',
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
      toast.success('ÄÃ£ táº¡o mÃ£ thanh toÃ¡n VietQR / SePay.');
    } catch (err) {
      toast.error((err as Error)?.message || 'KhÃ´ng thá»ƒ táº¡o mÃ£ thanh toÃ¡n.');
    } finally {
      setIsCreatingQr(false);
    }
  };

  const handleCashConfirm = async () => {
    if (!session?.sessionId || !bill) {
      toast.error('Vui lÃ²ng chá»‘t hÃ³a Ä‘Æ¡n trÆ°á»›c.');
      return;
    }
    const cafeId = effectiveCafeId || cafe?.id || '';
    if (!cafeId) {
      toast.error('Thiáº¿u mÃ£ quÃ¡n.');
      return;
    }

    setIsCashConfirm(true);
    try {
      let payBill = bill;

      // Cá»‘ láº¥y sá»‘ server; lá»—i chá»‘t/Æ°á»›c tÃ­nh khÃ´ng cháº·n náº¿u Ä‘Ã£ cÃ³ totalDue > 0
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
          // giá»¯ payBill hiá»‡n táº¡i
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
          toast.error('HÃ³a Ä‘Æ¡n pháº£i > 0Ä‘. HÃ£y chá»‘t hÃ³a Ä‘Æ¡n láº¡i.');
          return;
        }
        // Bá» nhÃ£n Æ°á»›c tÃ­nh â€” khÃ´ng cháº·n thu tiá»n máº·t vÃ¬ banner vÃ ng
        payBill = {
          ...payBill,
          totalDue: amount,
          subtotal: amount + (payBill.depositCreditTotal || 0),
          lineItems: [
            {
              id: 'session-total',
              label: 'Tá»•ng hÃ³a Ä‘Æ¡n phiÃªn chÆ¡i',
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
        toast.error('HÃ³a Ä‘Æ¡n pháº£i > 0Ä‘. HÃ£y chá»‘t hÃ³a Ä‘Æ¡n láº¡i.');
        return;
      }

      await PosCheckInService.manualConfirmPayment({
        sessionId: session.sessionId,
        amount: payAmount,
        cafeId,
        notes: 'Staff xÃ¡c nháº­n thu tiá»n máº·t táº¡i POS',
      });
      markLocalPaid();
      toast.success('ÄÃ£ xÃ¡c nháº­n thanh toÃ¡n tiá»n máº·t.');
      onCompleted?.();
    } catch (err) {
      toast.error((err as Error)?.message || 'KhÃ´ng thá»ƒ xÃ¡c nháº­n tiá»n máº·t.');
    } finally {
      setIsCashConfirm(false);
    }
  };

  const handleCompleteSession = async () => {
    if (!session) return;
    try {
      if (!paymentCode && !bill) {
        toast.error('Vui lÃ²ng chá»‘t hÃ³a Ä‘Æ¡n vÃ  táº¡o mÃ£ thanh toÃ¡n trÆ°á»›c.');
        return;
      }
      if (bill && isEstimatedBill(bill)) {
        toast.error('HÃ³a Ä‘Æ¡n chÆ°a chá»‘t xong. Báº¥m Chá»‘t hÃ³a Ä‘Æ¡n láº¡i, rá»“i má»›i thanh toÃ¡n.');
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
        `${session.tableLabel || 'BÃ n'} Ä‘Ã£ thanh toÃ¡n Â· BÃ n trá»Ÿ vá» tráº¡ng thÃ¡i trá»‘ng.`,
      );
      onCompleted?.();
    } catch (err) {
      toast.error((err as Error)?.message || 'KhÃ´ng thá»ƒ hoÃ n táº¥t thanh toÃ¡n.');
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
      <p className="rounded-lg border border-orange-200 bg-orange-50 p-3 text-sm text-orange-700">
        KhÃ´ng tÃ¬m tháº¥y phiÃªn chÆ¡i Ä‘ang hoáº¡t Ä‘á»™ng.
      </p>
    );
  }

  const isPending =
    isCalculating || isCreatingQr || isCashConfirm || completeSession.isPending;

  const componentsChecked =
    session.status === 'Paying' ||
    session.status === 'Completed' ||
    isComponentsChecked(session.sessionId);

  /** Æ¯u tiÃªn totalAmount BE (tá»« QR / session-payment), khÃ´ng dÃ¹ng Æ°á»›c tÃ­nh FE */
  const displayTotal =
    paymentCode?.amount && Number(paymentCode.amount) > 0
      ? Math.round(Number(paymentCode.amount))
      : Math.round(Number(bill?.totalDue ?? 0));

  return (
    <div className="space-y-4 rounded-xl border border-orange-200/80 bg-orange-50/30 p-3 sm:p-4 md:p-5">
      <div className="flex flex-wrap items-center justify-between gap-2 border-b border-orange-200/60 pb-3">
        <div>
          <p className="flex items-center gap-2 text-sm font-semibold text-orange-950 md:text-base">
            <Receipt className="h-4 w-4 shrink-0 text-orange-600" />
            Thanh toÃ¡n phiÃªn chÆ¡i
          </p>
          <p className="mt-0.5 text-xs text-muted-foreground">
            {session.game.name} Â· {session.presentCount} ngÆ°á»i
          </p>
        </div>
        <Badge
          variant="secondary"
          className="bg-orange-100/80 text-orange-900 border border-orange-200 text-xs"
        >
          {session.billingModel === 'BY_HOUR' ? 'Theo giá»' : 'Theo Ä‘á»“ uá»‘ng'}
        </Badge>
      </div>

      <div className="flex items-center justify-between rounded-lg bg-background p-3 text-sm border shadow-sm">
        <span className="flex items-center gap-1.5 text-muted-foreground text-xs sm:text-sm">
          <Timer className="h-4 w-4 text-orange-600" />
          Thá»i gian Ä‘Ã£ chÆ¡i
        </span>
        <SessionTimer
          startedAt={session.startedAt}
          endedAt={timerEndedAt}
          className="font-mono text-base font-bold text-orange-900"
        />
      </div>

      {!bill ? (
        <div className="space-y-2">
          {!componentsChecked ? (
            <p className="rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-xs text-amber-900">
              ChÆ°a kiá»ƒm kÃª linh kiá»‡n â€” sang tab Game, nháº­n láº¡i game vÃ  báº¥m <strong>Äá»§ háº¿t</strong>, rá»“i
              má»›i chá»‘t hÃ³a Ä‘Æ¡n.
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
            Chá»‘t hÃ³a Ä‘Æ¡n
          </Button>
        </div>
      ) : (
        <div className="space-y-4">
          {isEstimatedBill(bill) ? (
            <p className="rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-xs text-amber-900">
              Sá»‘ tiá»n chÆ°a khá»›p vá»›i há»‡ thá»‘ng. Báº¥m <strong>Chá»‘t hÃ³a Ä‘Æ¡n</strong> láº¡i trÆ°á»›c khi táº¡o QR
              hoáº·c thu tiá»n máº·t.
            </p>
          ) : null}
          <div className="space-y-3 rounded-lg border bg-background p-3 sm:p-4 shadow-sm">
            <div className="flex items-center justify-between border-b pb-2 text-sm font-semibold">
              <span>Chi tiáº¿t hÃ³a Ä‘Æ¡n</span>
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
                <div className="flex justify-between items-center text-orange-700 font-medium">
                  <span>Credit Ä‘Ã£ cá»c trÆ°á»›c</span>
                  <span>-{formatCurrency(bill.depositCreditTotal)}</span>
                </div>
              )}
            </div>
            <Separator />
            <div className="flex items-center justify-between rounded-lg bg-orange-50 p-2.5 border border-orange-200 text-orange-900">
              <span className="text-sm font-bold">Tá»•ng thanh toÃ¡n</span>
              <span className="text-base sm:text-lg font-extrabold text-orange-700">
                {formatCurrency(displayTotal)}
              </span>
            </div>

            {!paymentCode && (
              <div className="grid gap-2 mt-2 sm:grid-cols-2">
                <Button
                  type="button"
                  className="h-11 w-full text-sm font-medium bg-orange-600 hover:bg-orange-700 text-white sm:col-span-2"
                  disabled={isPending}
                  onClick={() => void handleCashConfirm()}
                >
                  {isCashConfirm ? (
                    <Spinner className="mr-2 h-4 w-4" />
                  ) : (
                    <Banknote className="mr-2 h-4 w-4" />
                  )}
                  Thu tiá»n máº·t Â· {formatCurrency(displayTotal)}
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
                  Táº¡o mÃ£ VietQR / SePay
                </Button>
              </div>
            )}

            {paymentCode && (
              <Button
                type="button"
                className="h-11 w-full bg-orange-600 hover:bg-orange-700 text-white text-sm font-medium mt-2"
                disabled={isPending}
                onClick={() => void handleCompleteSession()}
              >
                {completeSession.isPending ? (
                  <Spinner className="mr-2 h-4 w-4" />
                ) : (
                  <CheckCircle2 className="mr-2 h-4 w-4" />
                )}
                XÃ¡c nháº­n Ä‘Ã£ thanh toÃ¡n
              </Button>
            )}
          </div>

          {paymentCode ? (
            <div className="flex flex-col items-center gap-3 rounded-lg border border-orange-300/70 bg-white p-4 text-center shadow-sm">
              <Badge variant="secondary" className="bg-orange-100 text-orange-800 text-xs">
                MÃ£ giao dá»‹ch:{' '}
                <span className="font-mono font-bold ml-1">{paymentCode.code}</span>
              </Badge>
              <div className="rounded-xl bg-white p-3 shadow-sm ring-1 ring-border">
                <QRCode value={paymentCode.qrPayload || paymentCode.code} size={180} className="h-auto max-w-full" />
              </div>
              <p className="text-xs text-muted-foreground">
                QuÃ©t mÃ£ VietQR / SePay Ä‘á»ƒ chuyá»ƒn khoáº£n{' '}
                <span className="font-bold text-orange-700">
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
