'use client';



import { Badge } from '@/components/ui/badge';

import { Skeleton } from '@/components/ui/skeleton';

import { GAMER_TIER_COLORS } from '@/core/constants/user-management';

import { UserEmailBadge } from './user-email-badge';

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



function formatDate(value?: string | null) {

  if (!value) return '—';

  const date = new Date(value);

  return Number.isNaN(date.getTime()) ? value : date.toLocaleString('vi-VN');

}



function formatNumber(value?: number) {

  if (value == null) return '—';

  return value.toLocaleString('vi-VN');

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



function SectionCard({

  title,

  description,

  children,

}: {

  title: string;

  description?: string;

  children: React.ReactNode;

}) {

  return (

    <div className="space-y-4 rounded-xl border border-indigo-100 bg-indigo-50/30 p-5">

      <div>

        <h3 className="text-sm font-semibold text-indigo-900">{title}</h3>

      </div>

      {children}

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



  const hasProfileStats =

    user.karmaPoints != null ||

    user.globalElo != null ||

    user.level != null ||

    Boolean(user.gamerTier);



  const tierClass =

    (user.gamerTier && GAMER_TIER_COLORS[user.gamerTier]) ||

    'bg-violet-100 text-violet-800 border-violet-200';



  return (

    <div className="space-y-4">

      <SectionCard title="Thông tin tài khoản">

        <div className="flex flex-wrap items-center gap-2">

          <UserRoleBadge role={user.role} />

          <UserStatusBadge isActive={user.isActive} isBlocked={user.isBlocked} />

          {user.isEmailVerified && <UserEmailBadge verified={user.isEmailVerified} />}

        </div>



        <div className="grid gap-3">

          <InfoRow label="Username" value={user.username} />

          <InfoRow label="Email" value={user.email} />

          <InfoRow
            label="Số điện thoại"
            value={
              user.phoneNumber?.trim() ? (
                user.phoneNumber
              ) : (
                <span className="font-normal text-muted-foreground">Chưa nhập</span>
              )
            }
          />

          {user.provider && user.provider !== 'Local' && (

            <InfoRow label="Nhà cung cấp" value={user.provider} />

          )}

          <InfoRow label="Mã tài khoản" value={user.id} />

          <InfoRow label="Ngày tạo" value={formatDate(user.createdAt)} />

          <InfoRow label="Cập nhật lần cuối" value={formatDate(user.updatedAt)} />

          {user.lastLoginAt && (

            <InfoRow label="Đăng nhập gần nhất" value={formatDate(user.lastLoginAt)} />

          )}

        </div>



        {user.isBlocked && user.blockReason && (

          <div className="rounded-lg border border-rose-200 bg-rose-50 p-3">

            <p className="text-xs font-medium uppercase tracking-wide text-rose-700">Lý do khóa</p>

            <p className="mt-1 text-sm text-rose-800">{user.blockReason}</p>

            {user.blockedAt && (

              <p className="mt-2 text-xs text-rose-600">Khóa lúc: {formatDate(user.blockedAt)}</p>

            )}

          </div>

        )}

      </SectionCard>



      {(user.bio || hasProfileStats) && (

        <SectionCard

          title="Hồ sơ người chơi"

          description="Dữ liệu từ GET /api/UserManagement/{id}"

        >

          <div className="grid gap-3">

            {user.bio && <InfoRow label="Giới thiệu" value={user.bio} />}

            {user.gamerTier && (

              <InfoRow

                label="Hạng"

                value={

                  <Badge variant="outline" className={tierClass}>

                    {user.gamerTier}

                  </Badge>

                }

              />

            )}

            {user.karmaPoints != null && (

              <InfoRow label="Karma" value={formatNumber(user.karmaPoints)} />

            )}

            {user.globalElo != null && (

              <InfoRow label="Global ELO" value={formatNumber(user.globalElo)} />

            )}

            {user.level != null && <InfoRow label="Cấp độ" value={formatNumber(user.level)} />}

          </div>

        </SectionCard>

      )}

    </div>

  );

}


