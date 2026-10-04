"use client";

import type { ReactNode } from "react";
import { Suspense } from "react";
import {
  IconDeviceDesktop,
  IconTrophy,
  IconPackage,
  IconUserCircle,
  IconChartBar,
} from "@tabler/icons-react";
import { DashboardLayout } from "@/components/layout/dashboard-layout";
import { RoleGuard } from "@/features/auth/components/role-guard";
import { AuthLoading } from "@/features/auth/components/auth-loading";
import { UserRole } from "@/core/constants/roles";
import { ROUTES } from "@/core/constants/routes";
import type { NavItem } from "@/components/layout/nav-main";

// [HIDDEN 2026-10-04] Nút "Dashboard" (/manager/dashboard) bị ẩn khỏi sidebar
// theo yêu cầu — manager vẫn truy cập được trang dashboard qua URL trực tiếp.
const MANAGER_NAV: NavItem[] = [
  {
    title: "Web POS",
    url: ROUTES.MANAGER.POS,
    icon: <IconDeviceDesktop />,
  },
  {
    title: "Giải đấu",
    url: ROUTES.MANAGER.TOURNAMENT,
    icon: <IconTrophy />,
  },
  {
    title: "Kho game",
    url: ROUTES.MANAGER.INVENTORY,
    icon: <IconPackage />,
  },
  {
    title: "Hồ sơ vận hành",
    url: ROUTES.MANAGER.OPERATIONAL_PROFILE,
    icon: <IconUserCircle />,
  },
  {
    title: "Báo cáo",
    url: ROUTES.MANAGER.REPORTS,
    icon: <IconChartBar />,
  },
];

export default function ManagerLayout({ children }: { children: ReactNode }) {
  return (
    <Suspense
      fallback={<AuthLoading message="Đang xác minh quyền truy cập..." />}
    >
      <RoleGuard allowedRole={UserRole.Manager}>
        <DashboardLayout
          navItems={MANAGER_NAV}
          appSubtitle="Manager Portal"
        >
          {children}
        </DashboardLayout>
      </RoleGuard>
    </Suspense>
  );
}
