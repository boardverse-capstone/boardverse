'use client';

import { AlertTriangle, RefreshCw, ShieldCheck, TestTube2 } from 'lucide-react';
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
  useDemoLoosenLobbyConstraints,
  useInvalidateConfigCache,
  useSetDemoLoosenLobbyConstraints,
} from '../hooks/useDemoLoosenLobbyConstraints';

export function DemoLoosenLobbyPanel() {
  const statusQuery = useDemoLoosenLobbyConstraints();
  const mutation = useSetDemoLoosenLobbyConstraints();
  const invalidateMutation = useInvalidateConfigCache();
  const enabled = statusQuery.data?.demoEnabled ?? false;
  const nextEnabled = !enabled;

  return (
    <Card className={enabled ? 'border-amber-400 bg-amber-50/40' : undefined}>
      <CardHeader>
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div className="space-y-1">
            <CardTitle className="flex items-center gap-2">
              <TestTube2 className="h-5 w-5" />
              Nới lỏng ràng buộc lobby
            </CardTitle>
            <CardDescription>
              Bỏ qua một số giới hạn lobby và check-in cho luồng demo.
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
              'Không thể tải trạng thái chế độ demo.'}{' '}
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
                  ? 'Một số giới hạn tạo, tham gia lobby và check-in đang bị bỏ qua. Chỉ dùng trên môi trường test.'
                  : 'Các ràng buộc lobby đang hoạt động theo cấu hình an toàn.'}
              </p>
            </div>

            <div className="flex flex-wrap gap-2">
              <AlertDialog>
                <AlertDialogTrigger asChild>
                  <Button
                    type="button"
                    variant={enabled ? 'outline' : 'destructive'}
                    disabled={statusQuery.isLoading || mutation.isPending}
                  >
                    {mutation.isPending && <Spinner className="mr-2" />}
                    {enabled ? 'Tắt chế độ demo' : 'Bật chế độ demo'}
                  </Button>
                </AlertDialogTrigger>
                <AlertDialogContent>
                  <AlertDialogHeader>
                    <AlertDialogTitle>
                      {nextEnabled
                        ? 'Bật chế độ nới lỏng lobby?'
                        : 'Tắt chế độ nới lỏng lobby?'}
                    </AlertDialogTitle>
                    <AlertDialogDescription>
                      {nextEnabled
                        ? 'Thao tác này bỏ qua một số ràng buộc lobby và check-in trên toàn hệ thống. Chỉ bật trên môi trường test.'
                        : 'Hệ thống sẽ áp dụng lại đầy đủ các ràng buộc lobby trong tối đa 10 giây.'}
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

              <Button
                type="button"
                variant="outline"
                onClick={() => invalidateMutation.mutate()}
                disabled={invalidateMutation.isPending}
              >
                {invalidateMutation.isPending ? (
                  <Spinner className="mr-2" />
                ) : (
                  <RefreshCw className="mr-2 h-4 w-4" />
                )}
                Làm mới cache cấu hình
              </Button>
            </div>
          </>
        )}
      </CardContent>
    </Card>
  );
}
