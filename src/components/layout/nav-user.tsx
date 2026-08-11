'use client';

import Link from 'next/link';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  useSidebar,
} from '@/components/ui/sidebar';
import {
  IconSelector,
  IconRosetteDiscountCheck,
  IconBell,
  IconLogout,
} from '@tabler/icons-react';
import { MANAGED_ROLE_LABELS } from '@/core/constants/user-management';
import { useLogout } from '@/features/auth/hooks/useLogout';
import type { AuthUser } from '@/features/auth/types/auth.interface';
import { cn } from '@/lib/utils';

interface NavUserProps {
  user: AuthUser | null;
  portalLabel?: string;
}

export function NavUser({ user, portalLabel }: NavUserProps) {
  const { isMobile } = useSidebar();
  const { mutate: logout, isPending } = useLogout();

  const displayName = user?.username ?? 'Người dùng';
  const email = user?.email ?? '';
  const initials = displayName.slice(0, 2).toUpperCase();
  const roleLabel = user?.role ? (MANAGED_ROLE_LABELS[user.role] ?? user.role) : null;

  return (
    <SidebarMenu>
      <SidebarMenuItem>
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <SidebarMenuButton
              size="lg"
              className={cn(
                'h-auto rounded-xl border border-sidebar-border/70 bg-sidebar-accent/40 px-2 py-2.5 shadow-sm',
                'data-[state=open]:border-sidebar-border data-[state=open]:bg-sidebar-accent',
              )}
            >
              <Avatar className="size-9 rounded-lg ring-2 ring-background">
                <AvatarFallback className="rounded-lg bg-gradient-to-br from-primary/90 to-primary text-xs font-semibold text-primary-foreground">
                  {initials}
                </AvatarFallback>
              </Avatar>
              <div className="grid min-w-0 flex-1 gap-0.5 text-start leading-tight">
                <span className="truncate text-sm font-semibold">{displayName}</span>
                <span className="truncate text-xs text-muted-foreground">{email || portalLabel}</span>
              </div>
              <IconSelector className="ms-auto size-4 shrink-0 text-muted-foreground" />
            </SidebarMenuButton>
          </DropdownMenuTrigger>
          <DropdownMenuContent
            className="w-(--radix-dropdown-menu-trigger-width) min-w-56 rounded-xl"
            side={isMobile ? 'bottom' : 'right'}
            align="end"
            sideOffset={8}
          >
            <DropdownMenuLabel className="p-0 font-normal">
              <div className="flex items-center gap-2 px-2 py-2 text-start text-sm">
                <Avatar className="size-9 rounded-lg">
                  <AvatarFallback className="rounded-lg bg-gradient-to-br from-primary/90 to-primary text-xs font-semibold text-primary-foreground">
                    {initials}
                  </AvatarFallback>
                </Avatar>
                <div className="grid min-w-0 flex-1 gap-1 text-start leading-tight">
                  <span className="truncate font-semibold">{displayName}</span>
                  {email && (
                    <span className="truncate text-xs text-muted-foreground">{email}</span>
                  )}
                  {roleLabel && (
                    <Badge variant="secondary" className="w-fit text-[10px]">
                      {roleLabel}
                    </Badge>
                  )}
                </div>
              </div>
            </DropdownMenuLabel>
            <DropdownMenuSeparator />
            <DropdownMenuGroup>
              <DropdownMenuItem asChild>
                <Link href="#">
                  <IconRosetteDiscountCheck className="size-4" />
                  Tài khoản
                </Link>
              </DropdownMenuItem>
              <DropdownMenuItem asChild>
                <Link href="#">
                  <IconBell className="size-4" />
                  Thông báo
                </Link>
              </DropdownMenuItem>
            </DropdownMenuGroup>
            <DropdownMenuSeparator />
            <DropdownMenuItem
              onClick={() => logout()}
              disabled={isPending}
              variant="destructive"
            >
              <IconLogout className="size-4" />
              {isPending ? 'Đang đăng xuất...' : 'Đăng xuất'}
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </SidebarMenuItem>
    </SidebarMenu>
  );
}
