"use client";

import type { ReactNode } from "react";
import { Suspense } from "react";
import {
  IconLayoutDashboard,
  IconDeviceDesktop,
  IconPackage,
} from "@tabler/icons-react";
import { DashboardLayout } from "@/components/layout/dashboard-layout";
import { RoleGuard } from "@/features/auth/components/role-guard";
import { AuthLoading } from "@/features/auth/components/auth-loading";
import { UserRole } from "@/core/constants/roles";
import { ROUTES } from "@/core/constants/routes";
import type { NavItem } from "@/components/layout/nav-main";

const STAFF_NAV: NavItem[] = [
  {
    title: "Thông tin cá nhân",
    url: ROUTES.DASHBOARD.STAFF,
    icon: <IconLayoutDashboard />,
  },
  {
    title: "Web POS",
    url: ROUTES.STAFF.POS,
    icon: <IconDeviceDesktop />,
  },
  {
    title: "Kho game",
    url: ROUTES.STAFF.INVENTORY,
    icon: <IconPackage />,
  },
  // [HIDDEN 2026-10-04] Ẩn theo yêu cầu — staff không cần truy cập trực tiếp.
  // - "Lịch làm việc" (/staff/calendar)
  // - "Báo cáo ca" (/staff/reports)
  // Trang vẫn tồn tại trong filesystem nhưng không có link trong nav staff.
];

export default function StaffLayout({ children }: { children: ReactNode }) {
  return (
    <Suspense
      fallback={<AuthLoading message="Đang xác minh quyền truy cập..." />}
    >
      <RoleGuard allowedRole={UserRole.Staff}>
        <DashboardLayout navItems={STAFF_NAV} appSubtitle="Staff Portal">
          {children}
        </DashboardLayout>
      </RoleGuard>
    </Suspense>
  );
}
