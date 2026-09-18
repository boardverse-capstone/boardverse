'use client';

import { Calendar, Coffee, TrendingUp } from 'lucide-react';
import { PageHeader } from '@/components/common/page-header';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { useAuthStore } from '@/features/auth/store/auth.store';
import { useStaffDashboardStats } from '@/features/staff-cafe/hooks/useStaffDashboardStats';
import { formatCurrencyVnd } from '@/features/staff-cafe/utils/inventory.mapper';

function StatCard({
  label,
  value,
  icon: Icon,
  color,
  loading,
}: {
  label: string;
  value: string | number;
  icon: React.ElementType;
  color: string;
  loading?: boolean;
}) {
  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
        <CardTitle className="text-sm font-medium">{label}</CardTitle>
        <Icon className={`h-4 w-4 ${color}`} />
      </CardHeader>
      <CardContent>
        {loading ? (
          <Skeleton className="h-8 w-24" />
        ) : (
          <div className="text-2xl font-bold">{value}</div>
        )}
      </CardContent>
    </Card>
  );
}

export default function StaffDashboardPage() {
  const user = useAuthStore((state) => state.user);
  const {
    totalShifts,
    shiftsToday,
    totalRevenue,
    totalSessions,
    currentCafe,
    isLoadingCafe,
    isLoadingShifts,
  } = useStaffDashboardStats();

  const isLoading = isLoadingCafe || isLoadingShifts;

  return (
    <div className="flex flex-col gap-4 sm:gap-6">
      <PageHeader
        title="Dashboard"
        description={`Chào mừng trở lại, ${user?.username ?? 'Staff'}. Đây là trang quản lý vận hành.`}
      />

      <div className="flex items-center gap-2">
        <Badge variant="secondary" className="w-fit text-xs">
          Staff
        </Badge>
      </div>

      {/* Stats Grid */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <StatCard
          label="Tổng ca làm"
          value={isLoading ? '—' : totalShifts}
          icon={Calendar}
          color="text-blue-500"
          loading={isLoading}
        />
        <StatCard
          label="Ca hôm nay"
          value={isLoading ? '—' : shiftsToday}
          icon={Calendar}
          color="text-green-500"
          loading={isLoading}
        />
        <StatCard
          label="Quán đang làm"
          value={isLoading ? '—' : (currentCafe?.name ?? 'Chưa gán')}
          icon={Coffee}
          color="text-orange-500"
          loading={isLoading}
        />
        <StatCard
          label="Tổng doanh thu"
          value={isLoading ? '—' : formatCurrencyVnd(totalRevenue)}
          icon={TrendingUp}
          color="text-purple-500"
          loading={isLoading}
        />
      </div>

      {/* Quick Stats */}
      <div className="grid gap-4 md:grid-cols-2">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-base">Tổng quan</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2 text-sm">
            <div className="flex justify-between">
              <span className="text-muted-foreground">Tổng phiên chơi</span>
              <span className="font-medium">{isLoadingShifts ? '—' : totalSessions.toLocaleString('vi-VN')}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">Doanh thu trung bình/ca</span>
              <span className="font-medium">
                {isLoadingShifts || totalShifts === 0
                  ? '—'
                  : formatCurrencyVnd(Math.round(totalRevenue / totalShifts))}
              </span>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-base">Quán hiện tại</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2 text-sm">
            {isLoadingCafe ? (
              <>
                <Skeleton className="h-4 w-32" />
                <Skeleton className="h-4 w-48" />
              </>
            ) : currentCafe ? (
              <>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Tên quán</span>
                  <span className="font-medium">{currentCafe.name}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Địa chỉ</span>
                  <span className="font-medium text-right max-w-[200px] truncate">
                    {currentCafe.address ?? '—'}
                  </span>
                </div>
              </>
            ) : (
              <p className="text-sm text-muted-foreground">
                Bạn chưa được gán quán nào. Liên hệ manager để được phân công.
              </p>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
