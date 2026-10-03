"use client";

import type { ReactNode } from "react";
import { Suspense } from "react";
import {
  IconLayoutDashboard,
  IconReport,
  IconDeviceDesktop,
} from "@tabler/icons-react";
import { DashboardLayout } from "@/components/layout/dashboard-layout";
import { RoleGuard } from "@/features/auth/components/role-guard";
import { AuthLoading } from "@/features/auth/components/auth-loading";
import { UserRole } from "@/core/constants/roles";
import { ROUTES } from "@/core/constants/routes";
import type { NavItem } from "@/components/layout/nav-main";
import { Box, Coffee, Trophy } from "lucide-react";

const MANAGER_NAV: NavItem[] = [
  {
    title: "Dashboard",
    url: "/manager/dashboard",
    icon: <IconLayoutDashboard />,
  },
  {
    title: "Web POS",
    url: ROUTES.MANAGER.POS,
    icon: <IconDeviceDesktop />,
  },
  {
    title: "Giải đấu",
    url: ROUTES.MANAGER.TOURNAMENT,
    icon: <Trophy className="w-5 h-5" />,
  },
  {
    title: "Hồ sơ vận hành",
    url: ROUTES.MANAGER.OPERATIONAL_PROFILE,
    icon: <Coffee />,
  },
  {
    title: "Quản lý kho game",
    url: ROUTES.MANAGER.INVENTORY,
    icon: <Box className="h-4 w-4" />,
  },
  {
    title: "Báo cáo ca",
    url: ROUTES.MANAGER.REPORTS,
    icon: <IconReport />,
  },
];

export default function ManagerLayout({ children }: { children: ReactNode }) {
  return (
    <Suspense
      fallback={<AuthLoading message="Đang xác minh quyền truy cập..." />}
    >
      <RoleGuard allowedRole={UserRole.Manager}>
        <DashboardLayout navItems={MANAGER_NAV} appSubtitle="Manager Portal">
          {children}
        </DashboardLayout>
      </RoleGuard>
    </Suspense>
  );
}
