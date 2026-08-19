'use client';

import { IconShield } from '@tabler/icons-react';
import { Lock, Unlock, UserX } from 'lucide-react';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { UserDetailContent } from './user-detail-content';
import { AdjustKarmaDialog } from '@/features/behavior-monitoring/components/adjust-karma-dialog';
import type { ManagedUser } from '../types/user.interface';
import { toUserActionTarget } from '../utils/user.mapper';

interface UserDetailPanelProps {
  user?: ManagedUser;
  isLoading?: boolean;
  isError?: boolean;
  onBlock?: () => void;
  onUnblock?: () => void;
  onDisable?: () => void;
  onChangeRole?: () => void;
  isActionPending?: boolean;
}

export function UserDetailPanel({
  user,
  isLoading,
  isError,
  onBlock,
  onUnblock,
  onDisable,
  onChangeRole,
  isActionPending,
}: UserDetailPanelProps) {
  const actionTarget = user ? toUserActionTarget(user) : null;

  return (
    <div className="space-y-5">
      <Card className="overflow-hidden border-0 bg-gradient-to-r from-indigo-500/10 via-violet-500/5 to-background shadow-sm">
        <CardHeader className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
          <div className="flex items-start gap-4">
            {user && (
              <Avatar size="lg" className="size-14 border-2 border-indigo-100">
                {user.avatarUrl ? (
                  <AvatarImage src={user.avatarUrl} alt={user.username} />
                ) : null}
                <AvatarFallback className="bg-indigo-100 text-base font-semibold text-indigo-700">
                  {user.username.slice(0, 2).toUpperCase()}
                </AvatarFallback>
              </Avatar>
            )}
            <div className="space-y-2">
              <CardTitle className="text-2xl">{user?.username ?? 'Chi tiết tài khoản'}</CardTitle>
              {user && <p className="text-sm text-muted-foreground">{user.email}</p>}
              {user?.gamerTier && (
                <p className="text-xs font-medium text-indigo-600">
                  {user.gamerTier}
                  {user.level != null ? ` · Lv.${user.level}` : ''}
                </p>
              )}
            </div>
          </div>

          {user && (
            <div className="flex flex-wrap gap-2">
              <AdjustKarmaDialog
                userId={user.id}
                username={user.username}
                currentKarma={user.karmaPoints ?? 100}
              />
              {onChangeRole && (
                <Button
                  size="sm"
                  variant="outline"
                  disabled={isActionPending}
                  onClick={onChangeRole}
                >
                  <IconShield className="mr-2 h-4 w-4" />
                  Đổi role
                </Button>
              )}
              {user.isBlocked ? (
                <Button
                  size="sm"
                  className="bg-emerald-600 hover:bg-emerald-700"
                  disabled={isActionPending}
                  onClick={onUnblock}
                >
                  <Unlock className="mr-2 h-4 w-4" />
                  Mở khóa
                </Button>
              ) : (
                <Button
                  size="sm"
                  variant="destructive"
                  disabled={isActionPending}
                  onClick={onBlock}
                >
                  <Lock className="mr-2 h-4 w-4" />
                  Khóa tài khoản
                </Button>
              )}
              {user.isActive && (
                <Button
                  size="sm"
                  variant="outline"
                  className="border-rose-200 text-rose-700 hover:bg-rose-50 hover:text-rose-800"
                  disabled={isActionPending}
                  onClick={onDisable}
                >
                  <UserX className="mr-2 h-4 w-4" />
                  Xóa tài khoản
                </Button>
              )}
            </div>
          )}
        </CardHeader>
      </Card>

      <UserDetailContent user={user} isLoading={isLoading} isError={isError} />

      {actionTarget && (
        <Card className="border-dashed">
          <CardContent className="flex items-start gap-3 py-4">
            <IconShield className="mt-0.5 size-5 text-indigo-600" />
            <div className="text-sm text-muted-foreground">
              <p className="font-medium text-foreground">Ghi chú bảo mật</p>
              <p className="mt-1">
                Khóa tài khoản sẽ chặn đăng nhập cho đến khi được mở khóa.
              </p>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
