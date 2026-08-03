'use client';

import { useState } from 'react';
import { Mail, Phone, Gamepad2, Star, TrendingUp, Sparkles, Pencil, Trash2, BarChart3, Camera, KeyRound } from 'lucide-react';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { GAMER_TIER_COLORS } from '@/core/constants/user-management';
import { cn } from '@/lib/utils';
import { ChangePasswordDialog } from '@/features/auth/components/change-password-dialog';
import { useAuthStore } from '@/features/auth/store/auth.store';
import { useMyProfile } from '../hooks/useMyProfile';
import { ProfileCreateForm } from './profile-create-form';
import { ProfileUpdateDialog } from './profile-update-dialog';
import { ProfileDeleteDialog } from './profile-delete-dialog';
import { ProfileProgressDialog } from './profile-progress-dialog';
import { ProfileAvatarDialog } from './profile-avatar-dialog';
import { ProfileLocationSection } from './profile-location-section';
import { useDeleteProfile } from '../hooks/useDeleteProfile';
import { formatProfileDate } from '../utils/profile.mapper';

function ProfileSkeleton() {
  return (
    <Card>
      <CardHeader className="flex flex-row items-center gap-4">
        <Skeleton className="h-16 w-16 rounded-full" />
        <div className="flex flex-col gap-2">
          <Skeleton className="h-5 w-32" />
          <Skeleton className="h-4 w-48" />
        </div>
      </CardHeader>
      <CardContent className="grid gap-3">
        {[1, 2, 3].map((i) => (
          <Skeleton key={i} className="h-4 w-full" />
        ))}
      </CardContent>
    </Card>
  );
}

function InfoLine({
  icon: Icon,
  label,
  value,
}: {
  icon: React.ComponentType<{ className?: string }>;
  label: string;
  value: React.ReactNode;
}) {
  return (
    <div className="flex items-start gap-2 text-sm">
      <Icon className="mt-0.5 h-4 w-4 shrink-0 text-muted-foreground" />
      <div className="min-w-0">
        <span className="text-muted-foreground">{label}: </span>
        <span className="font-medium">{value}</span>
      </div>
    </div>
  );
}

export function ProfileCard() {
  const { data: profile, isLoading, isError } = useMyProfile();
  const user = useAuthStore((state) => state.user);
  const [updateOpen, setUpdateOpen] = useState(false);
  const [progressOpen, setProgressOpen] = useState(false);
  const [avatarOpen, setAvatarOpen] = useState(false);
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [changePasswordOpen, setChangePasswordOpen] = useState(false);
  const deleteMutation = useDeleteProfile();

  if (isLoading) return <ProfileSkeleton />;

  const displayName = profile?.username ?? user?.username ?? 'Người dùng';
  const email = user?.email ?? '';
  const initials = displayName.slice(0, 2).toUpperCase();
  const tierClass =
    (profile?.gamerTier && GAMER_TIER_COLORS[profile.gamerTier]) ||
    'bg-violet-100 text-violet-800 border-violet-200';

  return (
    <Card className="w-full">
      <CardHeader className="space-y-4 pb-4">
        <div className="flex items-start gap-4">
          <div className="relative shrink-0">
            <Avatar className="h-16 w-16">
              <AvatarImage src={profile?.avatarUrl ?? undefined} alt={displayName} />
              <AvatarFallback className="bg-primary/10 text-lg font-semibold text-primary">
                {initials}
              </AvatarFallback>
            </Avatar>
            {profile && !isError && (
              <Button
                type="button"
                variant="secondary"
                size="icon"
                className="absolute -right-1 -bottom-1 h-7 w-7 rounded-full shadow-sm"
                aria-label="Đổi avatar"
                onClick={() => setAvatarOpen(true)}
              >
                <Camera className="h-3.5 w-3.5" />
              </Button>
            )}
          </div>
          <div className="flex min-w-0 flex-1 flex-col gap-1">
            <div className="flex flex-wrap items-center gap-2">
              <CardTitle className="text-xl break-words">{displayName}</CardTitle>
              {user?.role && (
                <Badge variant="secondary" className="text-xs">
                  {user.role}
                </Badge>
              )}
              {profile?.gamerTier && (
                <Badge variant="outline" className={cn('text-xs', tierClass)}>
                  {profile.gamerTier}
                </Badge>
              )}
            </div>
            {email && (
              <div className="mt-1 flex items-center gap-1.5 text-sm text-muted-foreground">
                <Mail className="h-3.5 w-3.5 shrink-0" />
                <span className="truncate">{email}</span>
              </div>
            )}
          </div>
        </div>
        <div className="flex flex-wrap gap-2">
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={() => setChangePasswordOpen(true)}
          >
            <KeyRound className="mr-2 h-4 w-4" />
            Đổi mật khẩu
          </Button>
          {profile?.hasProfile && (
            <>
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => setUpdateOpen(true)}
              >
                <Pencil className="mr-2 h-4 w-4" />
                Chỉnh sửa
              </Button>
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => setProgressOpen(true)}
              >
                <BarChart3 className="mr-2 h-4 w-4" />
                Tiến trình
              </Button>
              <Button
                type="button"
                variant="outline"
                size="sm"
                className="text-destructive hover:text-destructive"
                onClick={() => setDeleteOpen(true)}
              >
                <Trash2 className="mr-2 h-4 w-4" />
                Vô hiệu hóa hồ sơ
              </Button>
            </>
          )}
        </div>
      </CardHeader>

      {isError ? (
        <CardContent>
          <p className="text-sm text-muted-foreground">
            Không thể tải hồ sơ. Vui lòng thử lại sau.
          </p>
        </CardContent>
      ) : profile && !profile.hasProfile ? (
        <CardContent>
          <ProfileCreateForm defaultGamerTag={user?.username ?? profile.username} />
        </CardContent>
      ) : profile && profile.hasProfile ? (
        <CardContent className="grid gap-3">
          <InfoLine
            icon={Phone}
            label="Số điện thoại"
            value={
              profile.phoneNumber?.trim() ? (
                profile.phoneNumber
              ) : (
                <span className="font-normal text-muted-foreground">Chưa nhập</span>
              )
            }
          />

          {profile.bio && (
            <InfoLine icon={Gamepad2} label="Giới thiệu" value={profile.bio} />
          )}

          <ProfileLocationSection />

          <InfoLine icon={Sparkles} label="Karma" value={profile.karmaPoints.toLocaleString('vi-VN')} />

          <div className="flex flex-wrap items-center gap-4 pt-1">
            <div className="flex items-center gap-1.5 text-sm">
              <Star className="h-4 w-4 text-yellow-500" />
              <span className="font-medium">{profile.globalElo.toLocaleString('vi-VN')}</span>
              <span className="text-muted-foreground">ELO</span>
            </div>
            <div className="flex items-center gap-1.5 text-sm">
              <TrendingUp className="h-4 w-4 text-blue-500" />
              <span className="font-medium">Lv.{profile.level}</span>
            </div>
          </div>

          {profile.updatedAt && (
            <p className="text-xs text-muted-foreground">
              Cập nhật: {formatProfileDate(profile.updatedAt)}
            </p>
          )}

          <ProfileUpdateDialog
            profile={profile}
            open={updateOpen}
            onOpenChange={setUpdateOpen}
          />

          <ProfileProgressDialog
            profile={profile}
            open={progressOpen}
            onOpenChange={setProgressOpen}
          />

          <ProfileDeleteDialog
            open={deleteOpen}
            onOpenChange={setDeleteOpen}
            username={displayName}
            isPending={deleteMutation.isPending}
            onConfirm={() => {
              deleteMutation.mutate(undefined, {
                onSuccess: () => setDeleteOpen(false),
              });
            }}
          />
        </CardContent>
      ) : (
        <CardContent>
          <p className="text-sm text-muted-foreground">Chưa có thông tin hồ sơ.</p>
        </CardContent>
      )}

      {profile && !isError && (
        <ProfileAvatarDialog
          profile={profile}
          displayName={displayName}
          open={avatarOpen}
          onOpenChange={setAvatarOpen}
        />
      )}

      <ChangePasswordDialog open={changePasswordOpen} onOpenChange={setChangePasswordOpen} />
    </Card>
  );
}
