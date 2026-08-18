'use client';

import type { ReactNode } from 'react';
import { Suspense } from 'react';
import {
  IconCoffee,
  IconLayoutDashboard,
  IconUsers,
  IconSettings,
  IconShield,
  IconAlertTriangle,
  IconHistory,
  IconBuildingStore,
  IconCategory,
  IconComponents,
  IconWallet,
  IconTrophy,
  IconChartBar,
  IconCreditCard,
  IconReceiptRefund,
  IconActivity,
  IconFlag,
} from '@tabler/icons-react';
import { DashboardLayout } from '@/components/layout/dashboard-layout';
import { RoleGuard } from '@/features/auth/components/role-guard';
import { AuthLoading } from '@/features/auth/components/auth-loading';
import { UserRole } from '@/core/constants/roles';
import { ROUTES } from '@/core/constants/routes';
import type { NavItem } from '@/components/layout/nav-main';

const ADMIN_NAV: NavItem[] = [
  {
    title: 'Dashboard',
    url: ROUTES.DASHBOARD.ADMIN,
    icon: <IconLayoutDashboard />,
  },
  {
    title: 'Đăng ký đối tác',
    url: ROUTES.ADMIN.REGISTRATIONS,
    icon: <IconCoffee />,
  },
  {
    title: 'Quản lý quán',
    url: ROUTES.ADMIN.CAFES,
    icon: <IconBuildingStore />,
  },
  {
    title: 'Thể loại game',
    url: ROUTES.ADMIN.CATEGORIES,
    icon: <IconCategory />,
  },
  {
    title: 'Linh kiện game',
    url: ROUTES.ADMIN.MASTER_GAMES,
    icon: <IconComponents />,
  },
  {
    title: 'Quản lý người dùng',
    url: ROUTES.ADMIN.USERS,
    icon: <IconUsers />,
  },
  {
    title: 'Wallets',
    url: ROUTES.ADMIN.WALLETS,
    icon: <IconWallet />,
  },
  {
    title: 'Hoàn BVC',
    url: ROUTES.ADMIN.REFUND_REQUESTS,
    icon: <IconReceiptRefund />,
  },
  {
    title: 'Giải đấu',
    url: ROUTES.ADMIN.TOURNAMENTS,
    icon: <IconTrophy />,
  },
  {
    title: 'Báo cáo',
    url: ROUTES.ADMIN.REPORTS,
    icon: <IconChartBar />,
  },
  {
    title: 'Vận hành hệ thống',
    url: ROUTES.ADMIN.OPERATIONS,
    icon: <IconActivity />,
  },
  {
    title: 'SePay accounts',
    url: ROUTES.ADMIN.SEPAY_ACCOUNTS,
    icon: <IconCreditCard />,
  },
  {
    title: 'Karma',
    url: ROUTES.ADMIN.KARMA_LOGS,
    icon: <IconHistory />,
  },
  {
    title: 'Cảnh báo hành vi',
    url: ROUTES.ADMIN.BEHAVIOR_WARNINGS,
    icon: <IconAlertTriangle />,
  },
  {
    title: 'Báo cáo bạn bè',
    url: ROUTES.ADMIN.FRIEND_REPORTS,
    icon: <IconFlag />,
  },
  {
    title: 'Bảo mật',
    url: ROUTES.ADMIN.SECURITY,
    icon: <IconShield />,
  },
  {
    title: 'Cài đặt hệ thống',
    url: ROUTES.ADMIN.SETTINGS,
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
