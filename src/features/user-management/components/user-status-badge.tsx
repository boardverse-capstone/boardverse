'use client';

import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';

interface UserStatusBadgeProps {
  isActive: boolean;
  isBlocked: boolean;
  className?: string;
}

export function UserStatusBadge({ isActive, isBlocked, className }: UserStatusBadgeProps) {
  if (isBlocked) {
    return (
      <Badge variant="outline" className={cn('border-rose-200 bg-rose-100 text-rose-800', className)}>
        Đã khóa
      </Badge>
    );
  }

  if (!isActive) {
    return (
      <Badge variant="outline" className={cn('border-slate-200 bg-slate-100 text-slate-600', className)}>
        Đã xóa
      </Badge>
    );
  }

  return (
    <Badge variant="outline" className={cn('border-emerald-200 bg-emerald-100 text-emerald-800', className)}>
      Hoạt động
    </Badge>
  );
}
