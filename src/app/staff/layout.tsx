'use client';

import type { ReactNode } from 'react';
import { Suspense } from 'react';
import {
  IconLayoutDashboard,
  IconChecklist,
  IconCalendar,
  IconClipboard,
  IconHelp,
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
    title: 'Công việc',
    url: '/staff/tasks',
    icon: <IconChecklist />,
    items: [
      { title: 'Danh sách việc', url: '/staff/tasks' },
      { title: 'Đã hoàn thành', url: '/staff/tasks/completed' },
    ],
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
