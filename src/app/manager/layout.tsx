'use client';

// src/app/manager/layout.tsx
import type { ReactNode } from 'react';
import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import {
  IconLayoutDashboard,
  IconChartBar,
  IconCalendar,
  IconReport,
  IconCoffee,
} from '@tabler/icons-react';
import { DashboardLayout } from '@/components/layout/dashboard-layout';
import { useAuthStore } from '@/features/auth/store/auth.store';
import { UserRole } from '@/core/constants/roles';
import { ROUTES } from '@/core/constants/routes';
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
  const router = useRouter();
  const { token, user } = useAuthStore();

  useEffect(() => {
    if (!token || !user) {
      router.replace(ROUTES.AUTH.LOGIN);
      return;
    }
    if (user.role !== UserRole.Manager) {
      router.replace(ROUTES.AUTH.LOGIN);
    }
  }, [token, user, router]);

  if (!token || !user || user.role !== UserRole.Manager) {
    return null;
  }

  return (
    <DashboardLayout navItems={MANAGER_NAV} appSubtitle="Manager Portal">
      {children}
    </DashboardLayout>
  );
}
