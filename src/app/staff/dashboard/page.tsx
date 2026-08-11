'use client';

// Staff Dashboard Page - BoardVerse Web POS & Staff Portal
import { Calendar, ClipboardList, Clock } from 'lucide-react';
import { PageHeader } from '@/components/common/page-header';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { ProfileCard } from '@/features/profile/components/profile-card';
import { NearbyCafesPanel } from '@/features/staff-cafe/components/nearby-cafes-panel';
import { useAuthStore } from '@/features/auth/store/auth.store';

const STATS = [
  { label: 'Ca làm việc', value: '—', icon: Clock, color: 'text-green-500' },
  { label: 'Báo cáo ca', value: '—', icon: ClipboardList, color: 'text-orange-500' },
  { label: 'Lịch tuần này', value: '—', icon: Calendar, color: 'text-purple-500' },
];

export default function StaffDashboardPage() {
  const user = useAuthStore((state) => state.user);

  return (
    <div className="flex flex-col gap-4 sm:gap-6">
      <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
        <PageHeader
          title="Dashboard"
          description={`Chào mừng trở lại, ${user?.username ?? 'Staff'}. Đây là trang dành cho nhân viên.`}
        />
        <Badge className="w-fit text-xs">Staff</Badge>
      </div>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
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

      <div className="grid gap-6 md:grid-cols-2">
        <div className="flex flex-col gap-2">
          <h2 className="text-lg font-semibold">Thông tin tài khoản</h2>
          <ProfileCard />
        </div>
        <div className="flex flex-col gap-2">
          <h2 className="text-lg font-semibold">Vị trí & quán gần</h2>
          <NearbyCafesPanel />
        </div>
      </div>
    </div>
  );
}
