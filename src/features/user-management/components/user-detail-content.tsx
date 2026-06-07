'use client';

import { Skeleton } from '@/components/ui/skeleton';
import { UserRoleBadge } from './user-role-badge';
import { UserStatusBadge } from './user-status-badge';
import type { ManagedUser } from '../types/user.interface';

interface UserDetailContentProps {
  user?: ManagedUser;
  isLoading?: boolean;
  isError?: boolean;
}

function InfoRow({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div className="grid gap-1 sm:grid-cols-[160px_1fr]">
      <span className="text-sm text-muted-foreground">{label}</span>
      <span className="text-sm font-medium">{value}</span>
    </div>
  );
}

function DetailSkeleton() {
  return (
    <div className="space-y-3">
      <Skeleton className="h-6 w-48" />
      <Skeleton className="h-4 w-full" />
      <Skeleton className="h-4 w-3/4" />
      <Skeleton className="h-4 w-2/3" />
    </div>
  );
}

export function UserDetailContent({ user, isLoading, isError }: UserDetailContentProps) {
  if (isLoading) return <DetailSkeleton />;

  if (isError || !user) {
    return (
      <div className="rounded-xl border bg-muted/30 px-4 py-8 text-center text-sm text-muted-foreground">
        Không thể tải thông tin tài khoản.
      </div>
    );
  }

  return (
    <div className="space-y-4 rounded-xl border border-indigo-100 bg-indigo-50/30 p-5">
      <div className="flex flex-wrap items-center gap-2">
        <UserRoleBadge role={user.role} />
        <UserStatusBadge isActive={user.isActive} isBlocked={user.isBlocked} />
      </div>

      <div className="grid gap-3">
        <InfoRow label="Username" value={user.username} />
        <InfoRow label="Email" value={user.email} />
        <InfoRow label="Mã tài khoản" value={user.id} />
        <InfoRow label="Ngày tạo" value={new Date(user.createdAt).toLocaleString('vi-VN')} />
        {user.updatedAt && (
          <InfoRow label="Cập nhật lần cuối" value={new Date(user.updatedAt).toLocaleString('vi-VN')} />
        )}
      </div>

      {user.isBlocked && user.blockReason && (
        <div className="rounded-lg border border-rose-200 bg-rose-50 p-3">
          <p className="text-xs font-medium uppercase tracking-wide text-rose-700">Lý do khóa</p>
          <p className="mt-1 text-sm text-rose-800">{user.blockReason}</p>
        </div>
      )}
    </div>
  );
}
