'use client';

import { useState } from 'react';
import Link from 'next/link';
import { AlertTriangle, ShieldAlert } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { KARMA_WARNING_THRESHOLD } from '@/core/constants/behavior-monitoring';
import { ROUTES } from '@/core/constants/routes';
import { useLowKarmaUsers } from '../hooks/useLowKarmaUsers';
import { ViolationProcessDialog } from './violation-process-dialog';
import type { LowKarmaUser } from '../types/behavior.interface';

export function BehaviorWarningCards() {
  const [searchInput, setSearchInput] = useState('');
  const [search, setSearch] = useState('');
  const [target, setTarget] = useState<LowKarmaUser | null>(null);
  const [dialogOpen, setDialogOpen] = useState(false);

  const { data, isLoading, isError, refetch } = useLowKarmaUsers(search);

  const openViolationDialog = (user: LowKarmaUser) => {
    setTarget(user);
    setDialogOpen(true);
  };

  if (isLoading) {
    return <div className="p-4 text-sm text-muted-foreground">Đang tải danh sách cảnh báo...</div>;
  }

  if (isError) {
    return (
      <div className="p-4 text-sm text-rose-600">
        Không thể tải cảnh báo.{' '}
        <button type="button" className="underline" onClick={() => refetch()}>
          Thử lại
        </button>
      </div>
    );
  }

  const users = data ?? [];

  return (
    <div className="space-y-4">
      <div className="flex flex-col gap-3 md:flex-row md:items-end md:justify-between">
        <p className="text-sm text-muted-foreground">
          Hiển thị tài khoản có Karma &lt; {KARMA_WARNING_THRESHOLD}.
        </p>
        <Input
          placeholder="Lọc theo tên, email hoặc ID..."
          className="w-full max-w-xs border-rose-200 md:shrink-0"
          value={searchInput}
          onChange={(e) => setSearchInput(e.target.value)}
          onKeyDown={(e) => e.key === 'Enter' && setSearch(searchInput)}
        />
      </div>

      {users.length === 0 ? (
        <Card className="border-dashed">
          <CardContent className="py-10 text-center text-sm text-muted-foreground">
            Không có tài khoản nào dưới ngưỡng Karma an toàn.
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-4 md:grid-cols-2">
          {users.map((user) => (
            <Card
              key={user.id}
              className="border-rose-200 bg-gradient-to-br from-rose-50/80 to-orange-50/40 shadow-sm"
            >
              <CardHeader className="flex flex-row items-start justify-between space-y-0 pb-2">
                <div className="space-y-1">
                  <CardTitle className="flex items-center gap-2 text-lg">
                    <ShieldAlert className="h-5 w-5 text-rose-600" />
                    {user.username}
                  </CardTitle>
                  <p className="text-xs text-muted-foreground">
                    {user.email || user.gamerTier || user.id.slice(0, 8)}
                  </p>
                </div>
                <Badge variant="destructive" className="gap-1">
                  <AlertTriangle className="h-3 w-3" />
                  Karma {user.karmaPoints}
                </Badge>
              </CardHeader>
              <CardContent className="flex flex-wrap items-center gap-2">
                <Button size="sm" variant="destructive" onClick={() => openViolationDialog(user)}>
                  Xử lý vi phạm
                </Button>
                <Button size="sm" variant="outline" asChild>
                  <Link href={ROUTES.ADMIN.USER_DETAIL(user.id)}>Xem hồ sơ</Link>
                </Button>
                {user.isBlocked && (
                  <Badge variant="outline" className="border-rose-300 text-rose-700">
                    Đang bị khóa
                  </Badge>
                )}
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      <ViolationProcessDialog
        user={target}
        open={dialogOpen}
        onOpenChange={setDialogOpen}
      />
    </div>
  );
}
