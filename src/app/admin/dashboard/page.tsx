'use client';

// src/app/admin/dashboard/page.tsx
import { Shield, Users, Settings, TrendingUp } from 'lucide-react';
import { PageHeader } from '@/components/common/page-header';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { ProfileCard } from '@/features/profile/components/profile-card';
import { useAuthStore } from '@/features/auth/store/auth.store';

const STATS = [
  { label: 'Tổng người dùng', value: '—', icon: Users, color: 'text-blue-500' },
  { label: 'Quản trị viên', value: '—', icon: Shield, color: 'text-purple-500' },
  { label: 'Hoạt động hôm nay', value: '—', icon: TrendingUp, color: 'text-green-500' },
  { label: 'Cài đặt hệ thống', value: 'Active', icon: Settings, color: 'text-orange-500' },
];

export default function AdminDashboardPage() {
  const user = useAuthStore((state) => state.user);

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
        {STATS.map((stat) => (
          <Card key={stat.label}>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">{stat.label}</CardTitle>
              <stat.icon className={`h-4 w-4 ${stat.color}`} />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stat.value}</div>
            </CardContent>
          </Card>
        ))}
      </div>

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
