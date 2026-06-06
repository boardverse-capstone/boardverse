'use client';

// src/components/layout/app-sidebar.tsx
import * as React from 'react';
import Link from 'next/link';
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
} from '@/components/ui/sidebar';
import { IconCommand } from '@tabler/icons-react';
import { NavMain, type NavItem } from './nav-main';
import { NavUser } from './nav-user';
import { useAuthStore } from '@/features/auth/store/auth.store';

interface AppSidebarProps extends React.ComponentProps<typeof Sidebar> {
  navItems: NavItem[];
  appName?: string;
  appSubtitle?: string;
}

export function AppSidebar({
  navItems,
  appName = 'BoardVerse',
  appSubtitle = 'Admin Portal',
  ...props
}: AppSidebarProps) {
  const user = useAuthStore((state) => state.user);

  return (
    <Sidebar variant="inset" {...props}>
      {/* Header – App branding */}
      <SidebarHeader>
        <SidebarMenu>
          <SidebarMenuItem>
            <SidebarMenuButton size="lg" asChild>
              <Link href="#">
                <div className="flex aspect-square size-8 items-center justify-center rounded-lg bg-sidebar-primary text-sidebar-primary-foreground">
                  <IconCommand className="size-4" />
                </div>
                <div className="grid flex-1 text-start text-sm leading-tight">
                  <span className="truncate font-medium">{appName}</span>
                  <span className="truncate text-xs text-muted-foreground">{appSubtitle}</span>
                </div>
              </Link>
            </SidebarMenuButton>
          </SidebarMenuItem>
        </SidebarMenu>
      </SidebarHeader>

      {/* Content – Navigation */}
      <SidebarContent>
        <NavMain items={navItems} />
      </SidebarContent>

      {/* Footer – User info + logout */}
      <SidebarFooter>
        <NavUser user={user} />
      </SidebarFooter>
    </Sidebar>
  );
}
