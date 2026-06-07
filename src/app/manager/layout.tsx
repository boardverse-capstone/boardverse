'use client';

import type { ReactNode } from 'react';
import { Suspense } from 'react';
import {
  IconLayoutDashboard,
  IconChartBar,
  IconCalendar,
  IconReport,
  IconCoffee,
} from '@tabler/icons-react';
import { DashboardLayout } from '@/components/layout/dashboard-layout';
import { RoleGuard } from '@/features/auth/components/role-guard';
import { AuthLoading } from '@/features/auth/components/auth-loading';
import { UserRole } from '@/core/constants/roles';
import type { NavItem } from '@/components/layout/nav-main';

const MANAGER_NAV: NavItem[] = [
  {
    title: 'Dashboard',
    url: '/manager/dashboard',
    icon: <IconLayoutDashboard />,
  },
  {
    title: 'Báo cáo',
    url: '/manager/reports',
    icon: <IconReport />,
    items: [
      { title: 'Tổng quan', url: '/manager/reports' },
      { title: 'Doanh thu', url: '/manager/reports/revenue' },
    ],
  },
  {
    title: 'Lịch biểu',
    url: '/manager/schedule',
    icon: <IconCalendar />,
  },
  {
    title: 'Thống kê',
    url: '/manager/analytics',
    icon: <IconChartBar />,
  },
  {
    title: 'Quản lý quán',
    url: '/manager/cafe',
    icon: <IconCoffee />,
  },
];

export default function ManagerLayout({ children }: { children: ReactNode }) {
  return (
    <Suspense fallback={<AuthLoading message="Đang xác minh quyền truy cập..." />}>
      <RoleGuard allowedRole={UserRole.Manager}>
        <DashboardLayout navItems={MANAGER_NAV} appSubtitle="Manager Portal">
          {children}
        </DashboardLayout>
      </RoleGuard>
    </Suspense>
  );
}
