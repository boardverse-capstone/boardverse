'use client';

import { useState } from 'react';
import {
  AlertTriangle,
  CalendarClock,
  CircleDollarSign,
  RefreshCw,
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
}> = [
  {
    id: 'process-deadlines',
    title: 'Xử lý hạn tuyển người',
    description: 'Xử lý đơn đặt chỗ đã đến hạn tuyển người.',
    icon: CalendarClock,
  },
  {
    id: 'process-cafe-approval-expiry',
    title: 'Hết hạn duyệt của quán',
    description: 'Hủy yêu cầu duyệt quá 24 giờ và hoàn BVC cho chủ đơn.',
    icon: AlertTriangle,
  },
  {
    id: 'process-no-show',
    title: 'Xử lý vắng mặt',
    description: 'Đánh dấu đơn quá giờ nhận bàn và xử lý BVC/Karma.',
    icon: UserX,
  },
  {
    id: 'process-bvc-capture-retry',
    title: 'Thử thu BVC lại',
    description: 'Thử thu lại BVC cho phiên đã thanh toán nhưng bị lỗi.',
    icon: RefreshCw,
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
      <Card>
        <CardHeader className="space-y-2">
          <CardTitle>Reservation jobs</CardTitle>
          <p className="text-sm text-muted-foreground">
            Các tác vụ vận hành chạy trực tiếp trên backend. Chỉ chạy thủ công
            khi cần xử lý hoặc kiểm tra hệ thống.
          </p>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="max-w-xs space-y-1.5">
            <Label htmlFor="reservation-job-batch-size">Batch size</Label>
            <Input
              id="reservation-job-batch-size"
              type="number"
              min={1}
              max={500}
              value={batchSize}
              onChange={(event) => setBatchSize(event.target.value)}
            />
            {!validBatchSize && (
              <p className="text-xs text-rose-600">
                Batch size phải là số nguyên từ 1 đến 500.
              </p>
            )}
          </div>

          <div className="grid gap-3 md:grid-cols-2">
            {RESERVATION_JOBS.map((job) => {
              const Icon = job.icon;
              const processed = jobResults[job.id];
              return (
                <div
                  key={job.id}
                  className="flex flex-col justify-between gap-4 rounded-xl border p-4"
                >
                  <div className="space-y-2">
                    <div className="flex items-center gap-2">
                      <Icon className="h-4 w-4 text-muted-foreground" />
                      <p className="font-semibold">{job.title}</p>
                    </div>
                    <p className="text-sm text-muted-foreground">
                      {job.description}
                    </p>
                    {processed !== undefined && (
                      <p className="text-sm font-medium text-emerald-700">
                        Lần chạy gần nhất: {processed} reservation
                      </p>
                    )}
                  </div>

                  <AlertDialog>
                    <AlertDialogTrigger asChild>
                      <Button
                        type="button"
                        variant="outline"
                        disabled={!validBatchSize || jobMutation.isPending}
                      >
                        {jobMutation.isPending ? (
                          <Spinner className="mr-2" />
                        ) : (
                          <Icon className="mr-2 h-4 w-4" />
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
              );
            })}
          </div>
        </CardContent>
      </Card>

      <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_minmax(300px,0.8fr)]">
        <Card>
          <CardHeader className="space-y-2">
            <CardTitle>Hoàn BVC thủ công cho đặt chỗ</CardTitle>
            <p className="text-sm text-muted-foreground">
              Hoàn BVC thủ công cho đơn đặt chỗ đã hoàn tất.
            </p>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-1.5">
              <Label htmlFor="reservation-refund-id">Mã đặt chỗ</Label>
              <Input
                id="reservation-refund-id"
                value={reservationId}
                onChange={(event) => setReservationId(event.target.value)}
                placeholder="UUID đặt chỗ"
                className="font-mono text-xs"
              />
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="reservation-refund-amount">
                Số BVC cần hoàn
              </Label>
              <Input
                id="reservation-refund-amount"
                type="number"
                min={0}
                value={refundAmount}
                onChange={(event) => setRefundAmount(event.target.value)}
                placeholder="Ví dụ: 120"
              />
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="reservation-refund-reason">Lý do</Label>
              <Textarea
                id="reservation-refund-reason"
                value={reason}
                onChange={(event) => setReason(event.target.value)}
                placeholder="Ghi rõ lý do hoàn BVC (tối thiểu 5 ký tự)..."
                rows={4}
              />
            </div>

            {refundError && (
              <p className="text-sm text-rose-600">{refundError}</p>
            )}

            <Button
              type="button"
              onClick={submitRefund}
              disabled={refundMutation.isPending}
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

        <Card>
          <CardHeader>
            <CardTitle>Kết quả refund</CardTitle>
          </CardHeader>
          <CardContent>
            {refundResult ? (
              <div className="space-y-2 text-sm">
                <p>
                  <span className="text-muted-foreground">Reservation:</span>{' '}
                  <span className="font-mono text-xs">
                    {refundResult.reservationId}
                  </span>
                </p>
                <p>
                  <span className="text-muted-foreground">Đã thu:</span>{' '}
                  {refundResult.originalCapturedAmount.toLocaleString('vi-VN')}{' '}
                  BVC
                </p>
                <p>
                  <span className="text-muted-foreground">Thực hoàn:</span>{' '}
                  {refundResult.actualRefundAmount.toLocaleString('vi-VN')} BVC
                </p>
                <p>
                  <span className="text-muted-foreground">Tịch thu:</span>{' '}
                  {refundResult.forfeitAmount.toLocaleString('vi-VN')} BVC
                </p>
                <p>
                  <span className="text-muted-foreground">Chính sách:</span>{' '}
                  {refundResult.refundPolicyApplied}
                </p>
                <p>
                  <span className="text-muted-foreground">Thực hiện lúc:</span>{' '}
                  {new Date(refundResult.performedAt).toLocaleString('vi-VN')}
                </p>
              </div>
            ) : (
              <p className="text-sm text-muted-foreground">
                Chưa có kết quả override refund.
              </p>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
