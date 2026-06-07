'use client';

import { Badge } from '@/components/ui/badge';
import { MANAGED_ROLE_COLORS, MANAGED_ROLE_LABELS } from '@/core/constants/user-management';
import { cn } from '@/lib/utils';

interface UserRoleBadgeProps {
  role: string;
  className?: string;
}

export function UserRoleBadge({ role, className }: UserRoleBadgeProps) {
  const label = MANAGED_ROLE_LABELS[role] ?? role;
  const color = MANAGED_ROLE_COLORS[role] ?? 'bg-slate-100 text-slate-700 border-slate-200';

  return (
    <Badge variant="outline" className={cn('font-medium', color, className)}>
      {label}
    </Badge>
  );
}
