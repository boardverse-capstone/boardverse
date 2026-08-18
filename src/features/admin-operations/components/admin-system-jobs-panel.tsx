'use client';

import { useState } from 'react';
import {
  BanknoteArrowUp,
  BellRing,
  CalendarX,
  DatabaseZap,
  Hourglass,
  RefreshCw,
  UserRoundX,
  WalletCards,
} from 'lucide-react';
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
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Spinner } from '@/components/ui/spinner';
import {
  useReleaseSessionDeposit,
  useRunSystemJob,
} from '../hooks/useAdminOperations';
import type {
  ReleaseSessionDepositResult,
  SystemJobResult,
  SystemJobType,
} from '../types/admin-operations.interface';

const GUID_RE =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

const SYSTEM_JOBS: Array<{
  id: SystemJobType;
  title: string;
  description: string;
  warning: string;
  icon: typeof Hourglass;
}> = [
  {
    id: 'deposits/process-expired',
    title: 'Expire booking deposits',
    description: 'Xử lý các deposit giữ chỗ cũ đã quá hạn.',
    warning: 'Có thể giải phóng ghế và hoàn hoặc tịch thu tiền cọc.',
    icon: Hourglass,
  },
  {
    id: 'wallet/expire-pending-topups',
    title: 'Expire pending top-ups',
    description: 'Đóng các giao dịch nạp BVC đang Pending quá timeout.',
    warning: 'Các giao dịch hết hạn sẽ không thể tiếp tục thanh toán.',
    icon: WalletCards,
  },
  {
    id: 'tournaments/auto-close-expired-registrations',
    title: 'Đóng đăng ký giải đấu',
    description: 'Đóng các đợt đăng ký giải đấu đã quá hạn.',
    warning: 'Trạng thái đăng ký giải đấu có thể thay đổi ngay lập tức.',
    icon: CalendarX,
  },
  {
    id: 'tournaments/send-reminders',
    title: 'Gửi nhắc lịch giải đấu',
    description: 'Gửi reminder cho mốc 48 giờ và 24 giờ trước khi bắt đầu.',
    warning: 'Người tham gia đủ điều kiện sẽ nhận thông báo.',
    icon: BellRing,
  },
  {
    id: 'tournaments/auto-mark-no-shows',
    title: 'Đánh dấu no-show giải đấu',
    description: 'Xử lý người tham gia quá grace period nhưng chưa xuất hiện.',
    warning: 'Tác vụ có thể trừ Karma của người tham gia.',
    icon: UserRoundX,
  },
  {
    id: 'friends/expire-old-pending-requests',
    title: 'Expire lời mời kết bạn',
    description: 'Đóng lời mời kết bạn Pending quá 30 ngày.',
    warning: 'Các lời mời cũ sẽ chuyển sang hết hạn.',
    icon: RefreshCw,
  },
  {
    id: 'config/invalidate-cache',
    title: 'Xóa cache cấu hình',
    description: 'Buộc backend tải lại system configuration từ database.',
    warning: 'Cấu hình mới sẽ được áp dụng cho các request tiếp theo.',
    icon: DatabaseZap,
  },
];

function resultLabel(result: SystemJobResult): string {
  if (result.totalMarked !== undefined) {
    return `${result.totalMarked} người, Karma ${result.totalKarmaPenalty ?? 0}`;
  }
  if (result.cleared) return 'Đã xóa cache';
  if (typeof result.processed === 'boolean') return result.processed ? 'Đã trigger' : 'Không xử lý';
  return `${result.processed ?? 0} bản ghi`;
}

export function AdminSystemJobsPanel() {
  const [results, setResults] = useState<Partial<Record<SystemJobType, SystemJobResult>>>({});
  const [cafeId, setCafeId] = useState('');
  const [sessionId, setSessionId] = useState('');
  const [activeSessionId, setActiveSessionId] = useState('');
  const [settlementError, setSettlementError] = useState<string | null>(null);
  const [settlementResult, setSettlementResult] =
    useState<ReleaseSessionDepositResult | null>(null);
  const systemJobMutation = useRunSystemJob();
  const settlementMutation = useReleaseSessionDeposit();

  const runJob = (job: SystemJobType) => {
    systemJobMutation.mutate(job, {
      onSuccess: (result) => {
        setResults((current) => ({ ...current, [job]: result }));
      },
    });
  };

  const releaseSettlement = () => {
    const payload = {
      cafeId: cafeId.trim(),
      sessionId: sessionId.trim(),
      activeSessionId: activeSessionId.trim(),
    };
    if (!GUID_RE.test(payload.cafeId)) {
      setSettlementError('Cafe ID phải là UUID hợp lệ.');
      return;
    }
    if (!GUID_RE.test(payload.sessionId)) {
      setSettlementError('Session ID phải là UUID hợp lệ.');
      return;
    }
    if (!GUID_RE.test(payload.activeSessionId)) {
      setSettlementError('Active Session ID phải là UUID hợp lệ.');
      return;
    }
    setSettlementError(null);
    settlementMutation.mutate(payload, { onSuccess: setSettlementResult });
  };

  return (
    <div className="space-y-6">
      <Alert>
        <DatabaseZap className="size-4" />
        <AlertTitle>Tác vụ vận hành trực tiếp</AlertTitle>
        <AlertDescription>
          Các job đều idempotent nhưng có thể thay đổi trạng thái và số dư. Chỉ chạy khi cần
          recovery, test scheduler hoặc xử lý tác vụ bị trễ.
        </AlertDescription>
      </Alert>

      <div className="grid gap-4 lg:grid-cols-2">
        {SYSTEM_JOBS.map((job) => {
          const Icon = job.icon;
          const result = results[job.id];
          return (
            <Card key={job.id} className="flex flex-col">
              <CardHeader className="flex flex-row items-start gap-3">
                <div className="rounded-lg bg-primary/10 p-2">
                  <Icon className="size-5 text-primary" />
                </div>
                <div className="space-y-1">
                  <CardTitle className="text-base">{job.title}</CardTitle>
                  <p className="text-sm text-muted-foreground">{job.description}</p>
                </div>
              </CardHeader>
              <CardContent className="mt-auto flex items-center justify-between gap-3">
                <p className="text-sm font-medium text-emerald-700">
                  {result ? resultLabel(result) : 'Chưa chạy trong phiên này'}
                </p>
                <AlertDialog>
                  <AlertDialogTrigger asChild>
                    <Button variant="outline" disabled={systemJobMutation.isPending}>
                      {systemJobMutation.isPending ? <Spinner className="mr-2" /> : null}
                      Chạy job
                    </Button>
                  </AlertDialogTrigger>
                  <AlertDialogContent>
                    <AlertDialogHeader>
                      <AlertDialogTitle>Chạy {job.title}?</AlertDialogTitle>
                      <AlertDialogDescription>{job.warning}</AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                      <AlertDialogCancel>Hủy</AlertDialogCancel>
                      <AlertDialogAction onClick={() => runJob(job.id)}>
                        Xác nhận chạy
                      </AlertDialogAction>
                    </AlertDialogFooter>
                  </AlertDialogContent>
                </AlertDialog>
              </CardContent>
            </Card>
          );
        })}
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <BanknoteArrowUp className="size-5 text-emerald-600" />
            Retry chuyển settlement
          </CardTitle>
          <p className="text-sm text-muted-foreground">
            Retry SePay cho session đã PAID nhưng settlement đang Failed. Đây là retry transfer,
            không phải thao tác Settlement Override.
          </p>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid gap-4 md:grid-cols-3">
            <div className="space-y-1.5">
              <Label htmlFor="job-cafe-id">Cafe ID</Label>
              <Input
                id="job-cafe-id"
                className="font-mono text-xs"
                value={cafeId}
                onChange={(event) => setCafeId(event.target.value)}
                placeholder="UUID cafe"
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="job-session-id">Session ID</Label>
              <Input
                id="job-session-id"
                className="font-mono text-xs"
                value={sessionId}
                onChange={(event) => setSessionId(event.target.value)}
                placeholder="UUID session"
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="job-active-session-id">Active Session ID</Label>
              <Input
                id="job-active-session-id"
                className="font-mono text-xs"
                value={activeSessionId}
                onChange={(event) => setActiveSessionId(event.target.value)}
                placeholder="UUID active session"
              />
            </div>
          </div>
          {settlementError ? <p className="text-sm text-rose-600">{settlementError}</p> : null}
          {settlementResult ? (
            <p className="text-sm font-medium text-emerald-700">
              {settlementResult.status} lúc{' '}
              {new Date(settlementResult.releasedAt).toLocaleString('vi-VN')}
            </p>
          ) : null}
          <Button onClick={releaseSettlement} disabled={settlementMutation.isPending}>
            {settlementMutation.isPending ? <Spinner className="mr-2" /> : null}
            Retry settlement
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}
