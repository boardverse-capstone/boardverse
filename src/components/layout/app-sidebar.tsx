'use client';

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
  SidebarSeparator,
} from '@/components/ui/sidebar';
import { IconCommand } from '@tabler/icons-react';
import { cn } from '@/lib/utils';
import { NavMain, type NavItem } from './nav-main';
import { NavUser } from './nav-user';
import { useAuthStore } from '@/features/auth/store/auth.store';

const PORTAL_GRADIENT: Record<string, string> = {
  'Admin Portal': 'from-rose-500 via-orange-500 to-amber-500',
  'Staff Portal': 'from-emerald-500 via-teal-500 to-cyan-500',
  'Manager Portal': 'from-violet-500 via-indigo-500 to-blue-500',
};

const PORTAL_BADGE: Record<string, string> = {
  'Admin Portal': 'bg-rose-500/10 text-rose-700 ring-rose-500/20',
  'Staff Portal': 'bg-emerald-500/10 text-emerald-700 ring-emerald-500/20',
  'Manager Portal': 'bg-violet-500/10 text-violet-700 ring-violet-500/20',
};

interface AppSidebarProps extends React.ComponentProps<typeof Sidebar> {
  navItems: NavItem[];
  appName?: string;
  appSubtitle?: string;
  homeUrl?: string;
}

export function AppSidebar({
  navItems,
  appName = 'BoardVerse',
  appSubtitle = 'Admin Portal',
  homeUrl,
  className,
  ...props
}: AppSidebarProps) {
  const user = useAuthStore((state) => state.user);
  const dashboardUrl = homeUrl ?? navItems[0]?.url ?? '#';
  const gradient = PORTAL_GRADIENT[appSubtitle] ?? 'from-primary via-primary to-primary/80';
  const badgeClass = PORTAL_BADGE[appSubtitle] ?? 'bg-primary/10 text-primary ring-primary/20';

  return (
    <Sidebar
      variant="inset"
      className={cn('border-r border-sidebar-border/80', className)}
      {...props}
    >
      <SidebarHeader className="gap-3 border-b border-sidebar-border/60 px-2 pb-4 pt-3">
        <SidebarMenu>
          <SidebarMenuItem>
            <SidebarMenuButton
              size="lg"
              asChild
              className="h-auto rounded-xl px-2 py-2.5 hover:bg-sidebar-accent/80"
            >
              <Link href={dashboardUrl}>
                <div
                  className={cn(
                    'flex aspect-square size-10 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br shadow-md shadow-black/10',
                    gradient,
                  )}
                >
                  <IconCommand className="size-5 text-white" stroke={1.75} />
                </div>
                <div className="grid min-w-0 flex-1 gap-0.5 text-start leading-tight">
                  <span className="truncate text-[15px] font-semibold tracking-tight">
                    {appName}
                  </span>
                  <span
                    className={cn(
                      'inline-flex w-fit max-w-full truncate rounded-full px-2 py-0.5 text-[10px] font-medium uppercase tracking-wide ring-1 ring-inset',
                      badgeClass,
                    )}
                  >
                    {appSubtitle}
                  </span>
                </div>
              </Link>
            </SidebarMenuButton>
          </SidebarMenuItem>
        </SidebarMenu>
      </SidebarHeader>

      <SidebarContent className="px-1 py-3">
        <NavMain items={navItems} />
      </SidebarContent>

      <SidebarSeparator className="mx-2" />

      <SidebarFooter className="gap-2 p-2 pb-3">
        <NavUser user={user} portalLabel={appSubtitle} />
      </SidebarFooter>
    </Sidebar>
  );
}
