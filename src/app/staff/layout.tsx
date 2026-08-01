'use client';

import type { ReactNode } from 'react';
import { Suspense } from 'react';
import {
  IconLayoutDashboard,
  IconCalendar,
  IconClipboard,
  IconHelp,
  IconDeviceDesktop,
  IconPackage,
} from '@tabler/icons-react';
import { DashboardLayout } from '@/components/layout/dashboard-layout';
import { RoleGuard } from '@/features/auth/components/role-guard';
import { AuthLoading } from '@/features/auth/components/auth-loading';
import { UserRole } from '@/core/constants/roles';
import type { NavItem } from '@/components/layout/nav-main';

const STAFF_NAV: NavItem[] = [
  {
    title: 'Dashboard',
    url: '/staff/dashboard',
    icon: <IconLayoutDashboard />,
  },
  {
    title: 'Web POS',
    url: '/staff/pos',
    icon: <IconDeviceDesktop />,
  },
  {
    title: 'Kho game',
    url: '/staff/inventory',
    icon: <IconPackage />,
  },
  {
    title: 'Lịch làm việc',
    url: '/staff/calendar',
    icon: <IconCalendar />,
  },
  {
    title: 'Báo cáo ca',
    url: '/staff/reports',
    icon: <IconClipboard />,
  },
  {
    title: 'Hỗ trợ',
    url: '/staff/help',
    icon: <IconHelp />,
  },
];

export default function StaffLayout({ children }: { children: ReactNode }) {
  return (
    <Suspense fallback={<AuthLoading message="Đang xác minh quyền truy cập..." />}>
      <RoleGuard allowedRole={UserRole.Staff}>
        <DashboardLayout navItems={STAFF_NAV} appSubtitle="Staff Portal">
          {children}
        </DashboardLayout>
      </RoleGuard>
    </Suspense>
  );
}
