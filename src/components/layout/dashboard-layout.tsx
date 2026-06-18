'use client';

// src/components/layout/dashboard-layout.tsx
import type { ReactNode } from 'react';
import {
  SidebarInset,
  SidebarProvider,
  SidebarTrigger,
} from '@/components/ui/sidebar';
import { Separator } from '@/components/ui/separator';
import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbList,
  BreadcrumbPage,
} from '@/components/ui/breadcrumb';
import { AppSidebar } from './app-sidebar';
import type { NavItem } from './nav-main';

interface DashboardLayoutProps {
  children: ReactNode;
  navItems: NavItem[];
  pageTitle?: string;
  appSubtitle?: string;
}

/**
 * Shared dashboard layout dùng chung cho tất cả roles.
 * Mỗi role truyền vào navItems và pageTitle riêng.
 * Thay đổi UI ở đây → tất cả roles đều cập nhật.
 */
export function DashboardLayout({
  children,
  navItems,
  pageTitle,
  appSubtitle,
}: DashboardLayoutProps) {
  return (
    <SidebarProvider>
      <AppSidebar
        navItems={navItems}
        appSubtitle={appSubtitle}
        homeUrl={navItems[0]?.url}
      />
      <SidebarInset>
        {/* Top bar */}
        <header className="flex h-16 shrink-0 items-center gap-2 border-b">
          <div className="flex items-center gap-2 px-4">
            <SidebarTrigger className="-ms-1" />
            <Separator
              orientation="vertical"
              className="me-2 data-vertical:h-4 data-vertical:self-auto"
            />
            {pageTitle && (
              <Breadcrumb>
                <BreadcrumbList>
                  <BreadcrumbItem>
                    <BreadcrumbPage>{pageTitle}</BreadcrumbPage>
                  </BreadcrumbItem>
                </BreadcrumbList>
              </Breadcrumb>
            )}
          </div>
        </header>

        {/* Page content */}
        <main className="flex flex-1 flex-col gap-4 p-3 pt-4 sm:p-4 sm:pt-6 md:p-6">{children}</main>
      </SidebarInset>
    </SidebarProvider>
  );
}
