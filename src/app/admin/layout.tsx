'use client';

// src/app/admin/layout.tsx
import type { ReactNode } from 'react';
import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import {
  IconLayoutDashboard,
  IconUsers,
  IconSettings,
  IconShield,
} from '@tabler/icons-react';
import { DashboardLayout } from '@/components/layout/dashboard-layout';
import { useAuthStore } from '@/features/auth/store/auth.store';
import { UserRole } from '@/core/constants/roles';
import { ROUTES } from '@/core/constants/routes';
import type { NavItem } from '@/components/layout/nav-main';

const ADMIN_NAV: NavItem[] = [
  {
    title: 'Dashboard',
    url: '/admin/dashboard',
    icon: <IconLayoutDashboard />,
  },
  {
    title: 'Quản lý người dùng',
    url: '/admin/users',
    icon: <IconUsers />,
    items: [
      { title: 'Danh sách người dùng', url: '/admin/users' },
      { title: 'Phân quyền', url: '/admin/users/roles' },
    ],
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
  const router = useRouter();
  const { token, user } = useAuthStore();

  useEffect(() => {
    if (!token || !user) {
      router.replace(ROUTES.AUTH.LOGIN);
      return;
    }
    if (user.role !== UserRole.Admin) {
      router.replace(ROUTES.AUTH.LOGIN);
    }
  }, [token, user, router]);

  // Không render gì cả trong khi đang kiểm tra quyền
  if (!token || !user || user.role !== UserRole.Admin) {
    return null;
  }

  return (
    <DashboardLayout navItems={ADMIN_NAV} appSubtitle="Admin Portal">
      {children}
    </DashboardLayout>
  );
}
