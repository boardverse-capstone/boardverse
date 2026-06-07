import { Spinner } from '@/components/ui/spinner';

export function AuthLoading({ message = 'Đang tải phiên đăng nhập...' }: { message?: string }) {
  return (
    <div className="flex min-h-svh flex-col items-center justify-center gap-3 bg-background">
      <Spinner className="size-6" />
      <p className="text-sm text-muted-foreground">{message}</p>
    </div>
  );
}
