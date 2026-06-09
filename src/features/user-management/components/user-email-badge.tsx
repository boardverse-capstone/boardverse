'use client';

import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';

interface UserEmailBadgeProps {
  verified: boolean;
  className?: string;
}

export function UserEmailBadge({ verified, className }: UserEmailBadgeProps) {
  return (
    <Badge
      variant="outline"
      className={cn(
        'font-medium',
        verified
          ? 'border-emerald-200 bg-emerald-100 text-emerald-800'
          : 'border-slate-200 bg-slate-100 text-slate-600',
        className,
      )}
    >
      {verified ? 'Email đã xác minh' : 'Chưa xác minh email'}
    </Badge>
  );
}
