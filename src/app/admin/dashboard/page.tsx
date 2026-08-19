'use client';

// src/app/admin/dashboard/page.tsx
import { Activity, Banknote, Building2, Users } from 'lucide-react';
import { PageHeader } from '@/components/common/page-header';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { ProfileCard } from '@/features/profile/components/profile-card';
import { useAuthStore } from '@/features/auth/store/auth.store';
import { useAdminReportsOverview } from '@/features/admin-reports/hooks/useAdminReportsOverview';

export default function AdminDashboardPage() {
  const user = useAuthStore((state) => state.user);
  const overview = useAdminReportsOverview();
  const stats = [
    {
      label: 'Tổng người dùng',
      value: overview.data?.totalUsers.toLocaleString('vi-VN') ?? '—',
      icon: Users,
      color: 'text-blue-500',
    },
    {
      label: 'Quán đang hoạt động',
      value: overview.data
        ? `${overview.data.activeCafes.toLocaleString('vi-VN')}/${overview.data.totalCafes.toLocaleString('vi-VN')}`
        : '—',
      icon: Building2,
      color: 'text-emerald-500',
    },
    {
      label: 'Lobby đang hoạt động',
      value: overview.data?.activeLobbies.toLocaleString('vi-VN') ?? '—',
      icon: Activity,
      color: 'text-violet-500',
    },
    {
      label: 'Tổng doanh thu',
      value: overview.data
        ? `${overview.data.totalRevenue.toLocaleString('vi-VN')} đ`
        : '—',
      icon: Banknote,
      color: 'text-amber-500',
    },
  ];

  return (
    <div className="flex flex-col gap-4 sm:gap-6">
      <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
        <PageHeader
          title="Dashboard"
          description={`Chào mừng trở lại, ${user?.username ?? 'Admin'}. Đây là trang quản trị hệ thống.`}
        />
        <Badge variant="destructive" className="w-fit text-xs">
          Admin
        </Badge>
      </div>

      {/* Stats grid */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        {stats.map((stat) => (
          <Card key={stat.label}>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">{stat.label}</CardTitle>
              <stat.icon className={`h-4 w-4 ${stat.color}`} />
            </CardHeader>
            <CardContent>
              {overview.isLoading ? (
                <Skeleton className="h-8 w-24" />
              ) : (
                <div className="text-2xl font-bold tabular-nums">{stat.value}</div>
              )}
            </CardContent>
          </Card>
        ))}
      </div>

      {overview.isError ? (
        <Card className="border-rose-200 bg-rose-50/60">
          <CardContent className="flex flex-col gap-3 py-4 text-sm text-rose-700 sm:flex-row sm:items-center sm:justify-between">
            <span>Không tải được số liệu Dashboard từ backend.</span>
            <Button variant="outline" size="sm" onClick={() => overview.refetch()}>
              Thử lại
            </Button>
          </CardContent>
        </Card>
      ) : null}

      {/* Profile section */}
      <div className="grid gap-6 md:grid-cols-2">
        <div className="flex flex-col gap-2">
          <h2 className="text-lg font-semibold">Thông tin tài khoản</h2>
          <ProfileCard />
        </div>

        <div className="flex flex-col gap-2">
          <h2 className="text-lg font-semibold">Thông tin phiên làm việc</h2>
          <Card>
            <CardContent className="pt-6 flex flex-col gap-3">
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">User ID</span>
                <span className="font-mono text-xs">{user?.id ?? '—'}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">Username</span>
                <span className="font-medium">{user?.username ?? '—'}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">Email</span>
                <span>{user?.email ?? '—'}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">Vai trò</span>
                <Badge variant="secondary">{user?.role ?? '—'}</Badge>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">Provider</span>
                <span>{user?.provider ?? '—'}</span>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
