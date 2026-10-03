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
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Spinner } from '@/components/ui/spinner';
import { cn } from '@/lib/utils';
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

type JobGroup = 'cleanup' | 'tournament' | 'system';

interface JobEntry {
  id: SystemJobType;
  title: string;
  description: string;
  warning: string;
  icon: typeof Hourglass;
  group: JobGroup;
}

const GROUP_META: Record<
  JobGroup,
  {
    label: string;
    description: string;
    iconColor: string;
    iconBg: string;
    chip: string;
  }
> = {
  cleanup: {
    label: 'Hết hạn & dọn dẹp',
    description: 'Đóng các tác vụ đã quá hạn và giải phóng tài nguyên.',
    iconColor: 'text-amber-700 dark:text-amber-300',
    iconBg: 'bg-amber-100 dark:bg-amber-500/20',
    chip: 'bg-amber-100 text-amber-700 dark:bg-amber-500/20 dark:text-amber-300',
  },
  tournament: {
    label: 'Giải đấu',
    description: 'Nhắc lịch, đóng đăng ký và đánh dấu vắng mặt giải đấu.',
    iconColor: 'text-fuchsia-700 dark:text-fuchsia-300',
    iconBg: 'bg-fuchsia-100 dark:bg-fuchsia-500/20',
    chip: 'bg-fuchsia-100 text-fuchsia-700 dark:bg-fuchsia-500/20 dark:text-fuchsia-300',
  },
  system: {
    label: 'Hệ thống',
    description: 'Cache & tác vụ tổng quát ảnh hưởng toàn nền tảng.',
    iconColor: 'text-violet-700 dark:text-violet-300',
    iconBg: 'bg-violet-100 dark:bg-violet-500/20',
    chip: 'bg-violet-100 text-violet-700 dark:bg-violet-500/20 dark:text-violet-300',
  },
};

const SYSTEM_JOBS: JobEntry[] = [
  {
    id: 'deposits/process-expired',
    title: 'Hết hạn tiền cọc đặt chỗ',
    description: 'Xử lý các khoản tiền cọc giữ chỗ đã quá hạn.',
    warning: 'Có thể giải phóng ghế và hoàn hoặc tịch thu tiền cọc.',
    icon: Hourglass,
    group: 'cleanup',
  },
  {
    id: 'wallet/expire-pending-topups',
    title: 'Hết hạn giao dịch nạp đang chờ',
    description: 'Đóng các giao dịch nạp BVC đang chờ quá thời gian cho phép.',
    warning: 'Các giao dịch hết hạn sẽ không thể tiếp tục thanh toán.',
    icon: WalletCards,
    group: 'cleanup',
  },
  {
    id: 'friends/expire-old-pending-requests',
    title: 'Hết hạn lời mời kết bạn',
    description: 'Đóng lời mời kết bạn đang chờ quá 30 ngày.',
    warning: 'Các lời mời cũ sẽ chuyển sang hết hạn.',
    icon: RefreshCw,
    group: 'cleanup',
  },
  {
    id: 'tournaments/auto-close-expired-registrations',
    title: 'Đóng đăng ký giải đấu',
    description: 'Đóng các đợt đăng ký giải đấu đã quá hạn.',
    warning: 'Trạng thái đăng ký giải đấu có thể thay đổi ngay lập tức.',
    icon: CalendarX,
    group: 'tournament',
  },
  {
    id: 'tournaments/send-reminders',
    title: 'Gửi nhắc lịch giải đấu',
    description: 'Gửi nhắc nhở trước 48 giờ và 24 giờ khi giải đấu bắt đầu.',
    warning: 'Người tham gia đủ điều kiện sẽ nhận thông báo.',
    icon: BellRing,
    group: 'tournament',
  },
  {
    id: 'tournaments/auto-mark-no-shows',
    title: 'Đánh dấu vắng mặt giải đấu',
    description: 'Xử lý người tham gia quá thời gian ân hạn nhưng chưa xuất hiện.',
    warning: 'Tác vụ có thể trừ Karma của người tham gia.',
    icon: UserRoundX,
    group: 'tournament',
  },
  {
    id: 'config/invalidate-cache',
    title: 'Xóa bộ nhớ đệm cấu hình',
    description: 'Buộc hệ thống tải lại cấu hình từ cơ sở dữ liệu.',
    warning: 'Cấu hình mới sẽ được áp dụng cho các yêu cầu tiếp theo.',
    icon: DatabaseZap,
    group: 'system',
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
      setSettlementError('Mã quán phải là UUID hợp lệ.');
      return;
    }
    if (!GUID_RE.test(payload.sessionId)) {
      setSettlementError('Mã phiên phải là UUID hợp lệ.');
      return;
    }
    if (!GUID_RE.test(payload.activeSessionId)) {
      setSettlementError('Mã phiên đang chạy phải là UUID hợp lệ.');
      return;
    }
    setSettlementError(null);
    settlementMutation.mutate(payload, { onSuccess: setSettlementResult });
  };

  const groupedJobs = (Object.keys(GROUP_META) as JobGroup[]).map((group) => ({
    group,
    jobs: SYSTEM_JOBS.filter((job) => job.group === group),
  }));

  return (
    <div className="space-y-6">
      <Alert className="border-violet-200/70 bg-gradient-to-r from-violet-50 via-fuchsia-50 to-rose-50 dark:border-violet-500/20 dark:from-violet-500/10 dark:via-fuchsia-500/10 dark:to-rose-500/10">
        <DatabaseZap className="size-4 text-violet-600 dark:text-violet-300" />
        <AlertTitle className="text-violet-900 dark:text-violet-200">
          Tác vụ vận hành trực tiếp
        </AlertTitle>
        <AlertDescription className="text-violet-900/80 dark:text-violet-200/80">
          Các job đều idempotent nhưng có thể thay đổi trạng thái và số dư. Chỉ
          chạy khi cần recovery, test scheduler hoặc xử lý tác vụ bị trễ.
        </AlertDescription>
      </Alert>

      <div className="space-y-8">
        {groupedJobs.map(({ group, jobs }) => {
          if (jobs.length === 0) return null;
          const meta = GROUP_META[group];
          return (
            <section key={group} className="space-y-3">
              <header className="flex flex-wrap items-end justify-between gap-2">
                <div>
                  <div className="flex items-center gap-2">
                    <span
                      className={cn(
                        'h-2 w-2 rounded-full',
                        group === 'cleanup' && 'bg-amber-500',
                        group === 'tournament' && 'bg-fuchsia-500',
                        group === 'system' && 'bg-violet-500',
                      )}
                    />
                    <h3 className="text-sm font-semibold uppercase tracking-wide text-foreground/80">
                      {meta.label}
                    </h3>
                    <span
                      className={cn(
                        'rounded-full px-2 py-0.5 text-[10px] font-semibold',
                        meta.chip,
                      )}
                    >
                      {jobs.length} jobs
                    </span>
                  </div>
                  <p className="mt-1 text-xs text-muted-foreground">
                    {meta.description}
                  </p>
                </div>
              </header>

              <div className="grid gap-4 lg:grid-cols-2">
                {jobs.map((job) => {
                  const Icon = job.icon;
                  const result = results[job.id];
                  const ran = Boolean(result);
                  return (
                    <Card
                      key={job.id}
                      className={cn(
                        'group relative overflow-hidden border-border/60 transition-all hover:-translate-y-0.5 hover:shadow-md',
                        ran && 'ring-2 ring-emerald-300/60 dark:ring-emerald-500/40',
                      )}
                    >
                      <div
                        className={cn(
                          'pointer-events-none absolute inset-x-0 top-0 h-1',
                          group === 'cleanup' && 'bg-gradient-to-r from-amber-400 to-orange-400',
                          group === 'tournament' && 'bg-gradient-to-r from-fuchsia-500 to-rose-500',
                          group === 'system' && 'bg-gradient-to-r from-violet-500 to-indigo-500',
                        )}
                      />
                      <CardHeader className="flex flex-row items-start gap-3 pb-3">
                        <div
                          className={cn(
                            'rounded-xl p-2.5 ring-1 ring-black/5 dark:ring-white/10',
                            meta.iconBg,
                          )}
                        >
                          <Icon className={cn('size-5', meta.iconColor)} />
                        </div>
                        <div className="min-w-0 flex-1 space-y-1">
                          <CardTitle className="text-base leading-tight">
                            {job.title}
                          </CardTitle>
                          <p className="text-sm leading-relaxed text-muted-foreground">
                            {job.description}
                          </p>
                        </div>
                        {ran ? (
                          <Badge className="border-emerald-200 bg-emerald-100 text-emerald-700 dark:border-emerald-500/30 dark:bg-emerald-500/20 dark:text-emerald-300">
                            Đã chạy
                          </Badge>
                        ) : (
                          <Badge variant="outline" className="text-muted-foreground">
                            Sẵn sàng
                          </Badge>
                        )}
                      </CardHeader>
                      <CardContent className="flex items-center justify-between gap-3 border-t border-dashed border-border/60 pt-3">
                        <p
                          className={cn(
                            'text-sm font-medium',
                            ran ? 'text-emerald-700 dark:text-emerald-300' : 'text-muted-foreground',
                          )}
                        >
                          {ran ? resultLabel(result!) : 'Chưa chạy trong phiên này'}
                        </p>
                        <AlertDialog>
                          <AlertDialogTrigger asChild>
                            <Button
                              size="sm"
                              variant="outline"
                              disabled={systemJobMutation.isPending}
                              className={cn(
                                'border-2 transition-colors',
                                group === 'cleanup' &&
                                  'border-amber-300 text-amber-700 hover:bg-amber-50 dark:border-amber-500/40 dark:text-amber-300 dark:hover:bg-amber-500/10',
                                group === 'tournament' &&
                                  'border-fuchsia-300 text-fuchsia-700 hover:bg-fuchsia-50 dark:border-fuchsia-500/40 dark:text-fuchsia-300 dark:hover:bg-fuchsia-500/10',
                                group === 'system' &&
                                  'border-violet-300 text-violet-700 hover:bg-violet-50 dark:border-violet-500/40 dark:text-violet-300 dark:hover:bg-violet-500/10',
                              )}
                            >
                              {systemJobMutation.isPending ? (
                                <Spinner className="mr-2" />
                              ) : (
                                <Icon className="mr-2 size-3.5" />
                              )}
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
            </section>
          );
        })}
      </div>

      <Card className="overflow-hidden border-emerald-200/60 bg-gradient-to-br from-emerald-50 via-teal-50 to-cyan-50 dark:border-emerald-500/20 dark:from-emerald-500/10 dark:via-teal-500/10 dark:to-cyan-500/10">
        <CardHeader className="space-y-2 border-b border-emerald-200/40 dark:border-emerald-500/20">
          <div className="flex items-center gap-2">
            <div className="rounded-lg bg-emerald-100 p-2 ring-1 ring-emerald-200 dark:bg-emerald-500/20 dark:ring-emerald-500/30">
              <BanknoteArrowUp className="size-5 text-emerald-700 dark:text-emerald-300" />
            </div>
            <div>
              <CardTitle className="text-base text-emerald-900 dark:text-emerald-100">
                Retry chuyển settlement
              </CardTitle>
              <p className="text-xs text-emerald-800/80 dark:text-emerald-200/80">
                Thử chuyển SePay lại cho phiên đã thanh toán nhưng giải ngân đang
                thất bại. Đây là thao tác thử lại chuyển tiền, không phải ghi đè.
              </p>
            </div>
          </div>
        </CardHeader>
        <CardContent className="space-y-4 pt-4">
          <div className="grid gap-4 md:grid-cols-3">
            <div className="space-y-1.5">
              <Label htmlFor="job-cafe-id" className="text-emerald-900 dark:text-emerald-100">
                Mã quán
              </Label>
              <Input
                id="job-cafe-id"
                className="border-emerald-200 bg-white/80 font-mono text-xs dark:border-emerald-500/30 dark:bg-white/5"
                value={cafeId}
                onChange={(event) => setCafeId(event.target.value)}
                placeholder="UUID quán"
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="job-session-id" className="text-emerald-900 dark:text-emerald-100">
                Mã phiên
              </Label>
              <Input
                id="job-session-id"
                className="border-emerald-200 bg-white/80 font-mono text-xs dark:border-emerald-500/30 dark:bg-white/5"
                value={sessionId}
                onChange={(event) => setSessionId(event.target.value)}
                placeholder="UUID phiên"
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="job-active-session-id" className="text-emerald-900 dark:text-emerald-100">
                Mã phiên đang chạy
              </Label>
              <Input
                id="job-active-session-id"
                className="border-emerald-200 bg-white/80 font-mono text-xs dark:border-emerald-500/30 dark:bg-white/5"
                value={activeSessionId}
                onChange={(event) => setActiveSessionId(event.target.value)}
                placeholder="UUID phiên đang chạy"
              />
            </div>
          </div>
          {settlementError ? (
            <p className="text-sm font-medium text-rose-600">{settlementError}</p>
          ) : null}
          {settlementResult ? (
            <div className="flex items-center gap-2 rounded-md border border-emerald-200 bg-white/70 px-3 py-2 text-sm font-medium text-emerald-700 dark:border-emerald-500/30 dark:bg-white/5 dark:text-emerald-300">
              <BanknoteArrowUp className="size-4" />
              {settlementResult.status} lúc{' '}
              {new Date(settlementResult.releasedAt).toLocaleString('vi-VN')}
            </div>
          ) : null}
          <Button
            onClick={releaseSettlement}
            disabled={settlementMutation.isPending}
            className="bg-gradient-to-r from-emerald-600 to-teal-600 text-white shadow-md shadow-emerald-500/20 hover:from-emerald-700 hover:to-teal-700"
          >
            {settlementMutation.isPending ? <Spinner className="mr-2" /> : (
              <BanknoteArrowUp className="mr-2 size-4" />
            )}
            Retry settlement
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}
