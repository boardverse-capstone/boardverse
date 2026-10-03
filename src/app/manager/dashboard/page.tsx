'use client';

// src/app/manager/dashboard/page.tsx
import { Badge } from '@/components/ui/badge';
import { PageHeader } from '@/components/common/page-header';
import { useAuthStore } from '@/features/auth/store/auth.store';
import { ManagerDashboardOverview } from '@/features/manager-cafe/components/manager-dashboard-overview';

export default function ManagerDashboardPage() {
  const user = useAuthStore((state) => state.user);

  return (
    <div className="flex flex-col gap-4 sm:gap-6">
      <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
        <PageHeader
          title="Dashboard"
          description={`Chào mừng trở lại, ${user?.username ?? 'Manager'}. Đây là trang quản lý vận hành.`}
        />
        <Badge variant="secondary" className="w-fit text-xs">
          Manager
        </Badge>
      </div>

      <ManagerDashboardOverview />
    </div>
  );
}
