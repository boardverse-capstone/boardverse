'use client';

import Link from 'next/link';
import { IconShield, IconUserCog } from '@tabler/icons-react';
import { Lock, Unlock } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { ROUTES } from '@/core/constants/routes';
import { UserDetailContent } from './user-detail-content';
import type { ManagedUser } from '../types/user.interface';
import { toUserActionTarget } from '../utils/user.mapper';

interface UserDetailPanelProps {
  user?: ManagedUser;
  isLoading?: boolean;
  isError?: boolean;
  onBlock?: () => void;
  onUnblock?: () => void;
  isActionPending?: boolean;
}

export function UserDetailPanel({
  user,
  isLoading,
  isError,
  onBlock,
  onUnblock,
  isActionPending,
}: UserDetailPanelProps) {
  const actionTarget = user ? toUserActionTarget(user) : null;

  return (
    <div className="space-y-5">
      <Card className="overflow-hidden border-0 bg-gradient-to-r from-indigo-500/10 via-violet-500/5 to-background shadow-sm">
        <CardHeader className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
          <div className="space-y-2">
            <CardTitle className="text-2xl">{user?.username ?? 'Chi tiết tài khoản'}</CardTitle>
            {user && (
              <p className="text-sm text-muted-foreground">{user.email}</p>
            )}
          </div>

          {user && (
            <div className="flex flex-wrap gap-2">
              <Button variant="outline" size="sm" asChild>
                <Link href={ROUTES.ADMIN.USER_ROLES}>
                  <IconUserCog className="mr-2 size-4" />
                  Phân quyền
                </Link>
              </Button>
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
                Thay đổi vai trò tại trang Phân quyền. Khóa tài khoản sẽ chặn đăng nhập cho đến
                khi được mở khóa.
              </p>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
