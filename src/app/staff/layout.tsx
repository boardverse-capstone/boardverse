'use client';

// src/app/staff/layout.tsx
import type { ReactNode } from 'react';
import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import {
  IconLayoutDashboard,
  IconChecklist,
  IconCalendar,
  IconClipboard,
  IconHelp,
} from '@tabler/icons-react';
import { DashboardLayout } from '@/components/layout/dashboard-layout';
import { useAuthStore } from '@/features/auth/store/auth.store';
import { UserRole } from '@/core/constants/roles';
import { ROUTES } from '@/core/constants/routes';
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
  const router = useRouter();
  const { token, user } = useAuthStore();

  useEffect(() => {
    if (!token || !user) {
      router.replace(ROUTES.AUTH.LOGIN);
      return;
    }
    if (user.role !== UserRole.Staff) {
      router.replace(ROUTES.AUTH.LOGIN);
    }
  }, [token, user, router]);

  if (!token || !user || user.role !== UserRole.Staff) {
    return null;
  }

  return (
    <DashboardLayout navItems={STAFF_NAV} appSubtitle="Staff Portal">
      {children}
    </DashboardLayout>
  );
}
