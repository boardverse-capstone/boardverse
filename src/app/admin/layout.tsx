'use client';

import type { ReactNode } from 'react';
import { Suspense } from 'react';
import {
  IconCoffee,
  IconLayoutDashboard,
  IconUsers,
  IconSettings,
  IconShield,
} from '@tabler/icons-react';
import { DashboardLayout } from '@/components/layout/dashboard-layout';
import { RoleGuard } from '@/features/auth/components/role-guard';
import { AuthLoading } from '@/features/auth/components/auth-loading';
import { UserRole } from '@/core/constants/roles';
import type { NavItem } from '@/components/layout/nav-main';

const ADMIN_NAV: NavItem[] = [
  {
    title: 'Dashboard',
    url: '/admin/dashboard',
    icon: <IconLayoutDashboard />,
  },
  {
    title: 'Đăng ký đối tác',
    url: '/admin/registrations',
    icon: <IconCoffee />,
  },
  {
    title: 'Quản lý người dùng',
    url: '/admin/users',
    icon: <IconUsers />,
  },
  {
    title: 'Bảo mật',
    url: '/admin/security',
    icon: <IconShield />,
  },
  {
    title: 'Cài đặt hệ thống',
    url: '/admin/settings',
    icon: <IconSettings />,
  },
];

export default function AdminLayout({ children }: { children: ReactNode }) {
  return (
    <Suspense fallback={<AuthLoading message="Đang xác minh quyền truy cập..." />}>
      <RoleGuard allowedRole={UserRole.Admin}>
        <DashboardLayout navItems={ADMIN_NAV} appSubtitle="Admin Portal">
          {children}
        </DashboardLayout>
      </RoleGuard>
    </Suspense>
  );
}
