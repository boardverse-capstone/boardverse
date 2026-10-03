'use client';

import { useState } from 'react';
import {
  AlertTriangle,
  CalendarClock,
  CircleDollarSign,
  Coins,
  RefreshCw,
  ScrollText,
  UserX,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Spinner } from '@/components/ui/spinner';
import { Textarea } from '@/components/ui/textarea';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from '@/components/ui/alert-dialog';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';
import {
  useOverrideReservationRefund,
  useRunReservationJob,
} from '../hooks/useAdminOperations';
import type {
  OverrideReservationRefundResult,
  ReservationJobType,
} from '../types/admin-operations.interface';

const GUID_RE =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

const RESERVATION_JOBS: Array<{
  id: ReservationJobType;
  title: string;
  description: string;
  icon: typeof CalendarClock;
  accent: string;
  iconBg: string;
  iconColor: string;
  chipClass: string;
}> = [
  {
    id: 'process-deadlines',
    title: 'Xử lý hạn tuyển người',
    description: 'Xử lý đơn đặt chỗ đã đến hạn tuyển người.',
    icon: CalendarClock,
    accent: 'from-sky-500 to-blue-500',
    iconBg: 'bg-sky-100 dark:bg-sky-500/20',
    iconColor: 'text-sky-700 dark:text-sky-300',
    chipClass: 'bg-sky-100 text-sky-700 dark:bg-sky-500/20 dark:text-sky-300',
  },
  {
    id: 'process-cafe-approval-expiry',
    title: 'Hết hạn duyệt của quán',
    description: 'Hủy yêu cầu duyệt quá 24 giờ và hoàn BVC cho chủ đơn.',
    icon: AlertTriangle,
    accent: 'from-rose-500 to-orange-500',
    iconBg: 'bg-rose-100 dark:bg-rose-500/20',
    iconColor: 'text-rose-700 dark:text-rose-300',
    chipClass: 'bg-rose-100 text-rose-700 dark:bg-rose-500/20 dark:text-rose-300',
  },
  {
    id: 'process-no-show',
    title: 'Xử lý vắng mặt',
    description: 'Đánh dấu đơn quá giờ nhận bàn và xử lý BVC/Karma.',
    icon: UserX,
    accent: 'from-orange-500 to-amber-500',
    iconBg: 'bg-orange-100 dark:bg-orange-500/20',
    iconColor: 'text-orange-700 dark:text-orange-300',
    chipClass: 'bg-orange-100 text-orange-700 dark:bg-orange-500/20 dark:text-orange-300',
  },
  {
    id: 'process-bvc-capture-retry',
    title: 'Thử thu BVC lại',
    description: 'Thử thu lại BVC cho phiên đã thanh toán nhưng bị lỗi.',
    icon: RefreshCw,
    accent: 'from-cyan-500 to-teal-500',
    iconBg: 'bg-cyan-100 dark:bg-cyan-500/20',
    iconColor: 'text-cyan-700 dark:text-cyan-300',
    chipClass: 'bg-cyan-100 text-cyan-700 dark:bg-cyan-500/20 dark:text-cyan-300',
  },
];

export function AdminReservationOperationsPanel() {
  const [batchSize, setBatchSize] = useState('100');
  const [jobResults, setJobResults] = useState<
    Partial<Record<ReservationJobType, number>>
  >({});
  const [reservationId, setReservationId] = useState('');
  const [refundAmount, setRefundAmount] = useState('');
  const [reason, setReason] = useState('');
  const [refundError, setRefundError] = useState<string | null>(null);
  const [refundResult, setRefundResult] =
    useState<OverrideReservationRefundResult | null>(null);

  const jobMutation = useRunReservationJob();
  const refundMutation = useOverrideReservationRefund();
  const parsedBatchSize = Number(batchSize);
  const validBatchSize =
    Number.isInteger(parsedBatchSize) &&
    parsedBatchSize >= 1 &&
    parsedBatchSize <= 500;

  const runJob = (job: ReservationJobType) => {
    if (!validBatchSize) return;
    jobMutation.mutate(
      { job, batchSize: parsedBatchSize },
      {
        onSuccess: (result) => {
          setJobResults((current) => ({
            ...current,
            [job]: result.processed,
          }));
        },
      },
    );
  };

  const submitRefund = () => {
    const id = reservationId.trim();
    const amount = Number(refundAmount);
    const trimmedReason = reason.trim();

    if (!GUID_RE.test(id)) {
      setRefundError('Reservation ID phải là UUID hợp lệ.');
      return;
    }
    if (!Number.isFinite(amount) || amount < 0) {
      setRefundError('Số BVC hoàn phải lớn hơn hoặc bằng 0.');
      return;
    }
    if (trimmedReason.length < 5) {
      setRefundError('Lý do phải có tối thiểu 5 ký tự.');
      return;
    }

    setRefundError(null);
    refundMutation.mutate(
      {
        reservationId: id,
        payload: { refundAmount: amount, reason: trimmedReason },
      },
      { onSuccess: setRefundResult },
    );
  };

  return (
    <div className="space-y-6">
      <Card className="overflow-hidden border-sky-200/60 bg-gradient-to-br from-sky-50 via-blue-50 to-indigo-50 dark:border-sky-500/20 dark:from-sky-500/10 dark:via-blue-500/10 dark:to-indigo-500/10">
        <CardHeader className="space-y-3 border-b border-sky-200/40 pb-4 dark:border-sky-500/20">
          <div className="flex items-center gap-3">
            <div className="rounded-xl bg-sky-100 p-2.5 ring-1 ring-sky-200 dark:bg-sky-500/20 dark:ring-sky-500/30">
              <CalendarClock className="size-5 text-sky-700 dark:text-sky-300" />
            </div>
            <div className="flex-1">
              <CardTitle className="text-base text-sky-900 dark:text-sky-100">
                Reservation jobs
              </CardTitle>
              <p className="text-xs text-sky-800/80 dark:text-sky-200/80">
                Các tác vụ vận hành chạy trực tiếp trên backend. Chỉ chạy thủ
                công khi cần xử lý hoặc kiểm tra hệ thống.
              </p>
            </div>
            <Badge
              variant="outline"
              className="border-sky-200 bg-white/70 text-sky-700 dark:border-sky-500/30 dark:bg-white/5 dark:text-sky-300"
            >
              {RESERVATION_JOBS.length} jobs
            </Badge>
          </div>

          <div className="max-w-xs space-y-1.5">
            <Label
              htmlFor="reservation-job-batch-size"
              className="text-sky-900 dark:text-sky-100"
            >
              Batch size
            </Label>
            <Input
              id="reservation-job-batch-size"
              type="number"
              min={1}
              max={500}
              value={batchSize}
              onChange={(event) => setBatchSize(event.target.value)}
              className="border-sky-200 bg-white/80 dark:border-sky-500/30 dark:bg-white/5"
            />
            {!validBatchSize && (
              <p className="text-xs font-medium text-rose-600">
                Batch size phải là số nguyên từ 1 đến 500.
              </p>
            )}
          </div>
        </CardHeader>
        <CardContent className="pt-4">
          <div className="grid gap-3 md:grid-cols-2">
            {RESERVATION_JOBS.map((job) => {
              const Icon = job.icon;
              const processed = jobResults[job.id];
              const ran = processed !== undefined;
              return (
                <div
                  key={job.id}
                  className={cn(
                    'group relative overflow-hidden rounded-xl border-2 bg-card p-4 transition-all hover:-translate-y-0.5 hover:shadow-md',
                    'border-border/60',
                    ran && 'ring-2 ring-emerald-300/60 dark:ring-emerald-500/40',
                  )}
                >
                  <div
                    className={cn(
                      'pointer-events-none absolute inset-x-0 top-0 h-1 bg-gradient-to-r',
                      job.accent,
                    )}
                  />
                  <div className="flex items-start gap-3">
                    <div
                      className={cn(
                        'rounded-lg p-2 ring-1 ring-black/5 dark:ring-white/10',
                        job.iconBg,
                      )}
                    >
                      <Icon className={cn('size-4', job.iconColor)} />
                    </div>
                    <div className="min-w-0 flex-1 space-y-1">
                      <div className="flex items-center justify-between gap-2">
                        <p className="font-semibold leading-tight">
                          {job.title}
                        </p>
                        {ran ? (
                          <Badge className="border-emerald-200 bg-emerald-100 text-emerald-700 dark:border-emerald-500/30 dark:bg-emerald-500/20 dark:text-emerald-300">
                            {processed} đơn
                          </Badge>
                        ) : (
                          <span
                            className={cn(
                              'rounded-full px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide',
                              job.chipClass,
                            )}
                          >
                            Sẵn sàng
                          </span>
                        )}
                      </div>
                      <p className="text-sm text-muted-foreground">
                        {job.description}
                      </p>
                    </div>
                  </div>

                  <div className="mt-3 flex items-center justify-end">
                    <AlertDialog>
                      <AlertDialogTrigger asChild>
                        <Button
                          type="button"
                          size="sm"
                          variant="outline"
                          disabled={!validBatchSize || jobMutation.isPending}
                          className={cn(
                            'border-2 transition-colors',
                            'border-sky-300 text-sky-700 hover:bg-sky-50 dark:border-sky-500/40 dark:text-sky-300 dark:hover:bg-sky-500/10',
                          )}
                        >
                          {jobMutation.isPending ? (
                            <Spinner className="mr-2" />
                          ) : (
                            <Icon className="mr-2 h-3.5 w-3.5" />
                          )}
                          Chạy tác vụ
                        </Button>
                      </AlertDialogTrigger>
                      <AlertDialogContent>
                        <AlertDialogHeader>
                          <AlertDialogTitle>Chạy {job.title}?</AlertDialogTitle>
                          <AlertDialogDescription>
                            Backend sẽ xử lý tối đa {parsedBatchSize} reservation.
                            Tác vụ này có thể thay đổi trạng thái và số dư BVC.
                          </AlertDialogDescription>
                        </AlertDialogHeader>
                        <AlertDialogFooter>
                          <AlertDialogCancel>Hủy</AlertDialogCancel>
                          <AlertDialogAction onClick={() => runJob(job.id)}>
                            Xác nhận chạy
                          </AlertDialogAction>
                        </AlertDialogFooter>
                      </AlertDialogContent>
                    </AlertDialog>
                  </div>
                </div>
              );
            })}
          </div>
        </CardContent>
      </Card>

      <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_minmax(300px,0.8fr)]">
        <Card className="overflow-hidden border-amber-200/60 bg-gradient-to-br from-amber-50 via-orange-50 to-rose-50 dark:border-amber-500/20 dark:from-amber-500/10 dark:via-orange-500/10 dark:to-rose-500/10">
          <CardHeader className="space-y-2 border-b border-amber-200/40 dark:border-amber-500/20">
            <div className="flex items-center gap-2">
              <div className="rounded-lg bg-amber-100 p-2 ring-1 ring-amber-200 dark:bg-amber-500/20 dark:ring-amber-500/30">
                <Coins className="size-5 text-amber-700 dark:text-amber-300" />
              </div>
              <div>
                <CardTitle className="text-base text-amber-900 dark:text-amber-100">
                  Hoàn BVC thủ công cho đặt chỗ
                </CardTitle>
                <p className="text-xs text-amber-800/80 dark:text-amber-200/80">
                  Hoàn BVC thủ công cho đơn đặt chỗ đã hoàn tất.
                </p>
              </div>
            </div>
          </CardHeader>
          <CardContent className="space-y-4 pt-4">
            <div className="space-y-1.5">
              <Label
                htmlFor="reservation-refund-id"
                className="text-amber-900 dark:text-amber-100"
              >
                Mã đặt chỗ
              </Label>
              <Input
                id="reservation-refund-id"
                value={reservationId}
                onChange={(event) => setReservationId(event.target.value)}
                placeholder="UUID đặt chỗ"
                className="border-amber-200 bg-white/80 font-mono text-xs dark:border-amber-500/30 dark:bg-white/5"
              />
            </div>

            <div className="space-y-1.5">
              <Label
                htmlFor="reservation-refund-amount"
                className="text-amber-900 dark:text-amber-100"
              >
                Số BVC cần hoàn
              </Label>
              <Input
                id="reservation-refund-amount"
                type="number"
                min={0}
                value={refundAmount}
                onChange={(event) => setRefundAmount(event.target.value)}
                placeholder="Ví dụ: 120"
                className="border-amber-200 bg-white/80 dark:border-amber-500/30 dark:bg-white/5"
              />
            </div>

            <div className="space-y-1.5">
              <Label
                htmlFor="reservation-refund-reason"
                className="text-amber-900 dark:text-amber-100"
              >
                Lý do
              </Label>
              <Textarea
                id="reservation-refund-reason"
                value={reason}
                onChange={(event) => setReason(event.target.value)}
                placeholder="Ghi rõ lý do hoàn BVC (tối thiểu 5 ký tự)..."
                rows={4}
                className="border-amber-200 bg-white/80 dark:border-amber-500/30 dark:bg-white/5"
              />
            </div>

            {refundError && (
              <p className="rounded-md border border-rose-200 bg-rose-50 px-3 py-2 text-sm font-medium text-rose-700 dark:border-rose-500/30 dark:bg-rose-500/10 dark:text-rose-300">
                {refundError}
              </p>
            )}

            <Button
              type="button"
              onClick={submitRefund}
              disabled={refundMutation.isPending}
              className="bg-gradient-to-r from-amber-600 to-orange-600 text-white shadow-md shadow-amber-500/20 hover:from-amber-700 hover:to-orange-700"
            >
              {refundMutation.isPending ? (
                <Spinner className="mr-2" />
              ) : (
                <CircleDollarSign className="mr-2 h-4 w-4" />
              )}
              Xác nhận hoàn BVC
            </Button>
          </CardContent>
        </Card>

        <Card className="overflow-hidden border-slate-200 bg-gradient-to-br from-slate-50 to-gray-50 dark:border-slate-700 dark:from-slate-900 dark:to-gray-900">
          <CardHeader className="border-b border-slate-200 pb-3 dark:border-slate-700">
            <div className="flex items-center gap-2">
              <div className="rounded-lg bg-slate-100 p-2 ring-1 ring-slate-200 dark:bg-slate-800 dark:ring-slate-700">
                <ScrollText className="size-5 text-slate-700 dark:text-slate-300" />
              </div>
              <CardTitle className="text-base text-slate-900 dark:text-slate-100">
                Kết quả refund
              </CardTitle>
            </div>
          </CardHeader>
          <CardContent className="pt-4">
            {refundResult ? (
              <div className="space-y-3 text-sm">
                <div className="rounded-lg border border-slate-200 bg-white/80 p-3 dark:border-slate-700 dark:bg-white/5">
                  <p className="text-xs uppercase tracking-wide text-muted-foreground">
                    Reservation
                  </p>
                  <p className="mt-0.5 break-all font-mono text-xs">
                    {refundResult.reservationId}
                  </p>
                </div>
                <dl className="space-y-1.5">
                  <div className="flex items-center justify-between gap-3">
                    <dt className="text-muted-foreground">Đã thu</dt>
                    <dd className="font-mono font-semibold">
                      {refundResult.originalCapturedAmount.toLocaleString('vi-VN')} BVC
                    </dd>
                  </div>
                  <div className="flex items-center justify-between gap-3 rounded-md bg-emerald-50 px-2 py-1.5 text-emerald-700 dark:bg-emerald-500/10 dark:text-emerald-300">
                    <dt>Thực hoàn</dt>
                    <dd className="font-mono font-semibold">
                      {refundResult.actualRefundAmount.toLocaleString('vi-VN')} BVC
                    </dd>
                  </div>
                  <div className="flex items-center justify-between gap-3 rounded-md bg-rose-50 px-2 py-1.5 text-rose-700 dark:bg-rose-500/10 dark:text-rose-300">
                    <dt>Tịch thu</dt>
                    <dd className="font-mono font-semibold">
                      {refundResult.forfeitAmount.toLocaleString('vi-VN')} BVC
                    </dd>
                  </div>
                  <div className="flex items-start justify-between gap-3 pt-1">
                    <dt className="text-muted-foreground">Chính sách</dt>
                    <dd className="text-right text-xs font-medium">
                      {refundResult.refundPolicyApplied}
                    </dd>
                  </div>
                  <div className="flex items-center justify-between gap-3">
                    <dt className="text-muted-foreground">Thực hiện lúc</dt>
                    <dd className="text-xs font-medium">
                      {new Date(refundResult.performedAt).toLocaleString('vi-VN')}
                    </dd>
                  </div>
                </dl>
              </div>
            ) : (
              <div className="rounded-lg border border-dashed border-slate-300 bg-white/40 p-6 text-center dark:border-slate-700 dark:bg-white/5">
                <ScrollText className="mx-auto size-6 text-slate-400" />
                <p className="mt-2 text-sm text-muted-foreground">
                  Chưa có kết quả override refund.
                </p>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
