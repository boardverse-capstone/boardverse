'use client';

// src/features/profile/components/profile-card.tsx
import { User, Mail, MapPin, Calendar, Gamepad2, Star, TrendingUp } from 'lucide-react';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { useMyProfile } from '../hooks/useMyProfile';
import { useAuthStore } from '@/features/auth/store/auth.store';

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

export function ProfileCard() {
  const { data: profile, isLoading, isError } = useMyProfile();
  const user = useAuthStore((state) => state.user);

  if (isLoading) return <ProfileSkeleton />;

  const displayName = profile?.gamerTag ?? user?.username ?? 'Người dùng';
  const email = user?.email ?? '';
  const initials = displayName.slice(0, 2).toUpperCase();

  return (
    <Card className="w-full">
      <CardHeader className="flex flex-row items-center gap-4 pb-4">
        <Avatar className="h-16 w-16">
          <AvatarImage src={profile?.avatarUrl ?? undefined} alt={displayName} />
          <AvatarFallback className="text-lg font-semibold bg-primary/10 text-primary">
            {initials}
          </AvatarFallback>
        </Avatar>
        <div className="flex flex-col gap-1">
          <div className="flex items-center gap-2">
            <CardTitle className="text-xl">{displayName}</CardTitle>
            {user?.role && (
              <Badge variant="secondary" className="text-xs">
                {user.role}
              </Badge>
            )}
          </div>
          {email && (
            <div className="flex items-center gap-1.5 text-sm text-muted-foreground">
              <Mail className="h-3.5 w-3.5" />
              <span>{email}</span>
            </div>
          )}
        </div>
      </CardHeader>

      {isError ? (
        <CardContent>
          <p className="text-sm text-muted-foreground">
            Chưa có hồ sơ. Hồ sơ sẽ được hiển thị khi được tạo.
          </p>
        </CardContent>
      ) : profile ? (
        <CardContent className="grid gap-3">
          {/* Full name */}
          {(profile.firstName || profile.lastName) && (
            <div className="flex items-center gap-2 text-sm">
              <User className="h-4 w-4 text-muted-foreground shrink-0" />
              <span>
                {[profile.firstName, profile.lastName].filter(Boolean).join(' ')}
              </span>
            </div>
          )}

          {/* Bio */}
          {profile.bio && (
            <div className="flex items-start gap-2 text-sm">
              <Gamepad2 className="h-4 w-4 text-muted-foreground shrink-0 mt-0.5" />
              <span className="text-muted-foreground">{profile.bio}</span>
            </div>
          )}

          {/* Home address */}
          {profile.homeAddress && (
            <div className="flex items-center gap-2 text-sm">
              <MapPin className="h-4 w-4 text-muted-foreground shrink-0" />
              <span>{profile.homeAddress}</span>
            </div>
          )}

          {/* Date of birth */}
          {profile.dateOfBirth && (
            <div className="flex items-center gap-2 text-sm">
              <Calendar className="h-4 w-4 text-muted-foreground shrink-0" />
              <span>
                {new Date(profile.dateOfBirth).toLocaleDateString('vi-VN', {
                  year: 'numeric',
                  month: 'long',
                  day: 'numeric',
                })}
              </span>
            </div>
          )}

          {/* Elo & Level */}
          {(profile.globalElo !== undefined || profile.level !== undefined) && (
            <div className="flex items-center gap-4 pt-1">
              {profile.globalElo !== undefined && (
                <div className="flex items-center gap-1.5 text-sm">
                  <Star className="h-4 w-4 text-yellow-500" />
                  <span className="font-medium">{profile.globalElo}</span>
                  <span className="text-muted-foreground">ELO</span>
                </div>
              )}
              {profile.level !== undefined && (
                <div className="flex items-center gap-1.5 text-sm">
                  <TrendingUp className="h-4 w-4 text-blue-500" />
                  <span className="font-medium">Lv.{profile.level}</span>
                </div>
              )}
            </div>
          )}
        </CardContent>
      ) : (
        <CardContent>
          <p className="text-sm text-muted-foreground">Chưa có thông tin hồ sơ.</p>
        </CardContent>
      )}
    </Card>
  );
}
