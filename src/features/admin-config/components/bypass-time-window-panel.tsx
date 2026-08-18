'use client';

import { AlertTriangle, Clock3, ShieldCheck } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { Spinner } from '@/components/ui/spinner';
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
  useBypassTimeWindow,
  useSetBypassTimeWindow,
} from '../hooks/useBypassTimeWindow';

export function BypassTimeWindowPanel() {
  const statusQuery = useBypassTimeWindow();
  const mutation = useSetBypassTimeWindow();
  const enabled = statusQuery.data?.bypassEnabled ?? false;
  const nextEnabled = !enabled;

  return (
    <Card className={enabled ? 'border-amber-400 bg-amber-50/40' : undefined}>
      <CardHeader>
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div className="space-y-1">
            <CardTitle className="flex items-center gap-2">
              <Clock3 className="h-5 w-5" />
              Bypass time-window
            </CardTitle>
            <CardDescription>
              Bỏ qua giới hạn thời gian check-in, lobby, cancel và no-show để
              kiểm thử.
            </CardDescription>
          </div>
          {statusQuery.isLoading ? (
            <Spinner />
          ) : (
            <Badge variant={enabled ? 'destructive' : 'outline'}>
              {enabled ? 'ĐANG BẬT' : 'ĐANG TẮT'}
            </Badge>
          )}
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        {statusQuery.isError ? (
          <div className="text-sm text-rose-600">
            {(statusQuery.error as Error)?.message ||
              'Không thể tải trạng thái bypass.'}{' '}
            <button
              type="button"
              className="underline"
              onClick={() => void statusQuery.refetch()}
            >
              Thử lại
            </button>
          </div>
        ) : (
          <>
            <div
              className={`flex gap-3 rounded-lg border p-3 text-sm ${
                enabled
                  ? 'border-amber-300 bg-amber-100/60 text-amber-950'
                  : 'border-neutral-200 bg-neutral-50 text-neutral-600'
              }`}
            >
              {enabled ? (
                <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" />
              ) : (
                <ShieldCheck className="mt-0.5 h-4 w-4 shrink-0" />
              )}
              <p>
                {enabled
                  ? 'Các kiểm tra thời gian đang bị bỏ qua trên toàn hệ thống. Hãy tắt ngay sau khi kiểm thử.'
                  : 'Các quy tắc thời gian đang hoạt động bình thường.'}
              </p>
            </div>

            <AlertDialog>
              <AlertDialogTrigger asChild>
                <Button
                  type="button"
                  variant={enabled ? 'outline' : 'destructive'}
                  disabled={statusQuery.isLoading || mutation.isPending}
                >
                  {mutation.isPending && <Spinner className="mr-2" />}
                  {enabled ? 'Tắt bypass' : 'Bật bypass để test'}
                </Button>
              </AlertDialogTrigger>
              <AlertDialogContent>
                <AlertDialogHeader>
                  <AlertDialogTitle>
                    {nextEnabled
                      ? 'Bật bypass time-window?'
                      : 'Tắt bypass time-window?'}
                  </AlertDialogTitle>
                  <AlertDialogDescription>
                    {nextEnabled
                      ? 'Thao tác này bỏ qua kiểm tra thời gian trên toàn hệ thống và chỉ được dùng ở môi trường test. Thay đổi áp dụng trong tối đa 10 giây.'
                      : 'Các quy tắc thời gian sẽ hoạt động lại trong tối đa 10 giây.'}
                  </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                  <AlertDialogCancel>Hủy</AlertDialogCancel>
                  <AlertDialogAction
                    onClick={() => mutation.mutate(nextEnabled)}
                  >
                    {nextEnabled ? 'Xác nhận bật' : 'Xác nhận tắt'}
                  </AlertDialogAction>
                </AlertDialogFooter>
              </AlertDialogContent>
            </AlertDialog>
          </>
        )}
      </CardContent>
    </Card>
  );
}
