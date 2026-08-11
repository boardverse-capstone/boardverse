'use client';

import { useState } from 'react';
import QRCode from 'react-qr-code';
import { Calculator, CheckCircle2, Receipt, Timer } from 'lucide-react';
import { toast } from 'sonner';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Separator } from '@/components/ui/separator';
import { Spinner } from '@/components/ui/spinner';
import { useActiveSession, useStaffCafe } from '../hooks/usePosCheckIn';
import {
  useCalculateBill,
  useCompleteSession,
  useGeneratePaymentCode,
} from '../hooks/usePosMutations';
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

function formatExpiry(iso: string) {
  return new Intl.DateTimeFormat('vi-VN', {
    hour: '2-digit',
    minute: '2-digit',
  }).format(new Date(iso));
}

export function SessionCheckoutPanel({ bookingId, onCompleted }: SessionCheckoutPanelProps) {
  const { data: cafe } = useStaffCafe();
  const { data: session, isLoading, isError } = useActiveSession(bookingId);
  const effectiveCafeId = session?.cafeId || cafe?.id || '';
  const calculateBill = useCalculateBill(session?.sessionId ?? '', effectiveCafeId);
  const generatePaymentCode = useGeneratePaymentCode(session?.sessionId ?? '', effectiveCafeId);
  const completeSession = useCompleteSession(bookingId, effectiveCafeId);

  const [bill, setBill] = useState<SessionBill | null>(null);
  const [paymentCode, setPaymentCode] = useState<PaymentCode | null>(null);

  const handleCalculateBill = async () => {
    if (!session) return;
    try {
      const result = await calculateBill.mutateAsync();
      setBill(result);
      toast.success('Đã tính bill phiên chơi.');
    } catch {
      toast.error('Không thể tính bill.');
    }
  };

  const handleGeneratePaymentCode = async () => {
    if (!session) return;
    try {
      if (!bill) {
        const calculated = await calculateBill.mutateAsync();
        setBill(calculated);
      }
      const code = await generatePaymentCode.mutateAsync({ paymentMethod: 'SePay' });
      setPaymentCode(code);
      toast.success('Đã tạo mã thanh toán cho khách.');
    } catch {
      toast.error('Không thể tạo mã thanh toán.');
    }
  };

  const handleCompleteSession = async () => {
    if (!session) return;
    try {
      if (!paymentCode) {
        toast.error('Vui lòng tạo mã thanh toán trước khi kết thúc phiên.');
        return;
      }
      const result = await completeSession.mutateAsync(session.sessionId);
      setBill(result.bill);
      setPaymentCode(result.paymentCode);
      toast.success(`${session.tableLabel} đã thanh toán · Bàn trở về trạng thái trống.`);
      onCompleted?.();
    } catch {
      toast.error('Không thể kết thúc phiên.');
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
    calculateBill.isPending || generatePaymentCode.isPending || completeSession.isPending;

  return (
    <div className="space-y-4 rounded-xl border border-emerald-200/80 bg-emerald-50/30 p-3 sm:p-4 md:p-5">
      <div className="flex flex-wrap items-center justify-between gap-2 border-b border-emerald-200/60 pb-3">
        <div>
          <p className="flex items-center gap-2 text-sm font-semibold text-emerald-950 md:text-base">
            <Receipt className="h-4 w-4 shrink-0 text-emerald-600" />
            Thanh toán phiên chơi
          </p>
          <p className="mt-0.5 text-xs text-muted-foreground">
            {session.game.name} · {session.presentCount} người chơi
          </p>
        </div>
        <Badge variant="secondary" className="bg-emerald-100/80 text-emerald-900 border border-emerald-200 text-xs">
          {session.billingModel === 'BY_HOUR' ? 'Theo giờ' : 'Theo đồ uống'}
        </Badge>
      </div>

      <div className="flex items-center justify-between rounded-lg bg-background p-3 text-sm border shadow-sm">
        <span className="flex items-center gap-1.5 text-muted-foreground text-xs sm:text-sm">
          <Timer className="h-4 w-4 text-emerald-600" />
          Thời gian đã chơi
        </span>
        <SessionTimer startedAt={session.startedAt} className="font-mono text-base font-bold text-emerald-900" />
      </div>

      {!bill ? (
        <Button
          type="button"
          className="h-11 w-full text-sm font-medium"
          variant="default"
          disabled={isPending}
          onClick={() => void handleCalculateBill()}
        >
          {calculateBill.isPending ? (
            <Spinner className="mr-2 h-4 w-4" />
          ) : (
            <Calculator className="mr-2 h-4 w-4" />
          )}
          Tính hóa đơn thanh toán
        </Button>
      ) : (
        <div className="space-y-4">
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
                {formatCurrency(bill.totalDue)}
              </span>
            </div>

            {!paymentCode && (
              <Button
                type="button"
                className="h-11 w-full text-sm font-medium mt-2"
                disabled={isPending}
                onClick={() => void handleGeneratePaymentCode()}
              >
                {generatePaymentCode.isPending ? (
                  <Spinner className="mr-2 h-4 w-4" />
                ) : (
                  <Receipt className="mr-2 h-4 w-4" />
                )}
                Tạo mã VietQR / SePay
              </Button>
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
                Xác nhận đã thanh toán & Kết thúc phiên
              </Button>
            )}
          </div>

          {paymentCode ? (
            <div className="flex flex-col items-center gap-3 rounded-lg border border-emerald-300/70 bg-white p-4 text-center shadow-sm">
              <Badge variant="secondary" className="bg-emerald-100 text-emerald-800 text-xs">
                Mã giao dịch: <span className="font-mono font-bold ml-1">{paymentCode.code}</span>
              </Badge>
              <div className="rounded-xl bg-white p-3 shadow-sm ring-1 ring-border">
                <QRCode value={paymentCode.qrPayload} size={180} className="h-auto max-w-full" />
              </div>
              <p className="text-xs text-muted-foreground">
                Quét mã VietQR / SePay để chuyển khoản <span className="font-bold text-emerald-700">{formatCurrency(paymentCode.amount)}</span>
              </p>
            </div>
          ) : null}
        </div>
      )}
    </div>
  );
}
