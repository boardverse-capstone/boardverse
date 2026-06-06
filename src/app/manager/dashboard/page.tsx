'use client';

// src/app/manager/dashboard/page.tsx
import { BarChart3, Calendar, Coffee, TrendingUp } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { ProfileCard } from '@/features/profile/components/profile-card';
import { useAuthStore } from '@/features/auth/store/auth.store';

const STATS = [
  { label: 'Báo cáo tháng này', value: '—', icon: BarChart3, color: 'text-blue-500' },
  { label: 'Lịch hôm nay', value: '—', icon: Calendar, color: 'text-green-500' },
  { label: 'Quán đang hoạt động', value: '—', icon: Coffee, color: 'text-orange-500' },
  { label: 'Tăng trưởng', value: '—', icon: TrendingUp, color: 'text-purple-500' },
];

export default function ManagerDashboardPage() {
  const user = useAuthStore((state) => state.user);

  return (
    <div className="flex flex-col gap-6">
      {/* Page header */}
      <div className="flex items-center justify-between">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-2xl font-bold tracking-tight">This is page Manager</h1>
            <Badge variant="secondary" className="text-xs">
              Manager
            </Badge>
          </div>
          <p className="text-muted-foreground mt-1">
            Chào mừng trở lại, {user?.username ?? 'Manager'}. Đây là trang quản lý vận hành.
          </p>
        </div>
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

      {/* Profile + Session */}
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
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
