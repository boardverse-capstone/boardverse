'use client';

import { useState } from 'react';
import QRCode from 'react-qr-code';
import { Calculator, CheckCircle2, Receipt, Timer } from 'lucide-react';
import { toast } from 'sonner';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Separator } from '@/components/ui/separator';
import { Spinner } from '@/components/ui/spinner';
import { useActiveSession } from '../hooks/usePosCheckIn';
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
  const { data: session, isLoading, isError } = useActiveSession(bookingId);
  const cafeId = session?.cafeId;
  const calculateBill = useCalculateBill(session?.sessionId ?? '', cafeId);
  const generatePaymentCode = useGeneratePaymentCode(session?.sessionId ?? '', cafeId);
  const completeSession = useCompleteSession(bookingId, cafeId);

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
      const code = await generatePaymentCode.mutateAsync({ paymentMethod: 'QR' });
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
    <div className="space-y-4 rounded-xl border border-emerald-200 bg-emerald-50/40 p-4 md:space-y-5 md:p-5">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <p className="flex items-center gap-2 text-sm font-semibold text-emerald-900 md:text-base">
            <Receipt className="h-4 w-4 md:h-5 md:w-5" />
            Thanh toán sau khi chơi
          </p>
          <p className="mt-1 text-xs text-emerald-800 md:text-sm">
            {session.game.name} · {session.presentCount} người chơi
          </p>
        </div>
        <Badge variant="secondary" className="bg-emerald-100 px-3 py-1 text-sm text-emerald-900">
          {session.billingModel === 'BY_HOUR' ? 'Theo giờ' : 'Theo đồ uống'}
        </Badge>
      </div>

      <div className="flex items-center justify-between rounded-lg bg-background/80 px-3 py-3 text-sm md:text-base">
        <span className="flex items-center gap-1.5 text-muted-foreground">
          <Timer className="h-4 w-4 md:h-5 md:w-5" />
          Thời gian chơi
        </span>
        <SessionTimer startedAt={session.startedAt} className="font-mono text-base font-semibold md:text-lg" />
      </div>

      {!bill ? (
        <Button
          type="button"
          className="h-12 w-full text-base md:h-14"
          variant="secondary"
          disabled={isPending}
          onClick={() => void handleCalculateBill()}
        >
          {calculateBill.isPending ? (
            <Spinner className="mr-2 h-4 w-4" />
          ) : (
            <Calculator className="mr-2 h-4 w-4" />
          )}
          Tính bill
        </Button>
      ) : (
        <div className="grid gap-4 md:grid-cols-2 md:items-start">
          <div className="space-y-3 rounded-lg border bg-background p-3 md:p-4">
            <div className="flex items-center justify-between text-sm md:text-base">
              <span className="font-medium">Chi tiết bill</span>
              <span className="text-muted-foreground">{formatDuration(bill.durationMinutes)}</span>
            </div>
            <div className="space-y-2">
              {bill.lineItems.map((item) => (
                <div key={item.id} className="flex justify-between gap-3 text-sm md:text-base">
                  <span className="text-muted-foreground">{item.label}</span>
                  <span className="shrink-0">{formatCurrency(item.amount)}</span>
                </div>
              ))}
              <div className="flex justify-between text-sm md:text-base">
                <span className="text-muted-foreground">Credit cọc</span>
                <span className="text-emerald-700">-{formatCurrency(bill.depositCreditTotal)}</span>
              </div>
            </div>
            <Separator />
            <div className="flex justify-between text-base font-semibold md:text-lg">
              <span>Tổng thanh toán</span>
              <span className="text-emerald-700">{formatCurrency(bill.totalDue)}</span>
            </div>

            {bill && !paymentCode && (
              <Button
                type="button"
                className="h-12 w-full text-base md:h-14"
                disabled={isPending}
                onClick={() => void handleGeneratePaymentCode()}
              >
                {generatePaymentCode.isPending ? (
                  <Spinner className="mr-2 h-4 w-4" />
                ) : (
                  <Receipt className="mr-2 h-4 w-4" />
                )}
                Tạo mã thanh toán
              </Button>
            )}

            {paymentCode && (
              <Button
                type="button"
                className="h-12 w-full bg-emerald-600 text-base hover:bg-emerald-700 md:h-14"
                disabled={isPending}
                onClick={() => void handleCompleteSession()}
              >
                {completeSession.isPending ? (
                  <Spinner className="mr-2 h-4 w-4" />
                ) : (
                  <CheckCircle2 className="mr-2 h-4 w-4" />
                )}
                Xác nhận đã thanh toán & kết thúc phiên
              </Button>
            )}
          </div>

          {paymentCode ? (
            <div className="flex flex-col items-center justify-center gap-3 rounded-lg border border-primary/20 bg-background p-4 text-center md:p-6">
              <p className="text-sm font-medium md:text-base">Mã thanh toán</p>
              <p className="font-mono text-xl font-bold tracking-wide text-primary md:text-2xl">
                {paymentCode.code}
              </p>
              <div className="rounded-xl bg-white p-3 shadow-sm md:p-4">
                <QRCode
                  value={paymentCode.qrPayload}
                  size={200}
                  className="h-auto max-w-full md:hidden"
                />
                <QRCode
                  value={paymentCode.qrPayload}
                  size={240}
                  className="hidden h-auto max-w-full md:block"
                />
              </div>
              <p className="max-w-xs text-xs text-muted-foreground md:text-sm">
                Khách quét mã để thanh toán {formatCurrency(paymentCode.amount)} · Hết hạn{' '}
                {formatExpiry(paymentCode.expiresAt)}
              </p>
            </div>
          ) : (
            <div className="flex min-h-[200px] items-center justify-center rounded-lg border border-dashed bg-background/60 p-6 text-center text-sm text-muted-foreground md:text-base">
              Tạo mã thanh toán để hiển thị QR cho khách quét trên tablet hoặc điện thoại.
            </div>
          )}
        </div>
      )}
    </div>
  );
}
