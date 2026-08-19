'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from '@/components/ui/collapsible';
import {
  SidebarGroup,
  SidebarGroupLabel,
  SidebarMenu,
  SidebarMenuAction,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarMenuSub,
  SidebarMenuSubButton,
  SidebarMenuSubItem,
} from '@/components/ui/sidebar';
import { IconChevronRight } from '@tabler/icons-react';
import { cn } from '@/lib/utils';

export interface NavItem {
  title: string;
  url: string;
  icon: React.ReactNode;
  items?: { title: string; url: string }[];
}

function NavIcon({ active, children }: { active: boolean; children: React.ReactNode }) {
  return (
    <span
      className={cn(
        'flex size-8 shrink-0 items-center justify-center rounded-lg transition-colors [&>svg]:size-[18px] [&>svg]:stroke-[1.75]',
        active
          ? 'bg-primary text-primary-foreground shadow-sm'
          : 'bg-sidebar-accent/70 text-sidebar-foreground/70 group-hover/menu-button:bg-sidebar-accent group-hover/menu-button:text-sidebar-accent-foreground',
      )}
    >
      {children}
    </span>
  );
}

function isNavItemActive(pathname: string, url: string, allUrls: string[]): boolean {
  if (!pathname.startsWith(url)) return false;
  return !allUrls.some(
    (other) => other !== url && other.startsWith(url) && pathname.startsWith(other),
  );
}

export function NavMain({ items, label = 'Menu chính' }: { items: NavItem[]; label?: string }) {
  const pathname = usePathname();
  const allUrls = items.flatMap((item) => [
    item.url,
    ...(item.items?.map((sub) => sub.url) ?? []),
  ]);

  return (
    <SidebarGroup className="px-0 py-0">
      <SidebarGroupLabel className="mb-2 px-2 text-[11px] font-semibold uppercase tracking-wider text-sidebar-foreground/45">
        {label}
      </SidebarGroupLabel>
      <SidebarMenu className="gap-0.5">
        {items.map((item) => {
          const isActive = isNavItemActive(pathname, item.url, allUrls);
          const hasSubItems = !!item.items?.length;
          const subActive = item.items?.some((sub) => pathname === sub.url || pathname.startsWith(sub.url));

          return (
            <Collapsible key={item.title} asChild defaultOpen={isActive || subActive}>
              <SidebarMenuItem>
                <SidebarMenuButton
                  asChild
                  tooltip={item.title}
                  isActive={isActive && !hasSubItems}
                  className={cn(
                    'h-10 rounded-lg px-2 transition-all',
                    (isActive || subActive) &&
                      !hasSubItems &&
                      'bg-primary/8 font-medium text-primary shadow-[inset_3px_0_0_0_var(--primary)]',
                    subActive && hasSubItems && 'font-medium text-foreground',
                  )}
                >
                  <Link href={item.url}>
                    <NavIcon active={Boolean(isActive && !hasSubItems) || Boolean(subActive && !isActive)}>
                      {item.icon}
                    </NavIcon>
                    <span className="truncate">{item.title}</span>
                  </Link>
                </SidebarMenuButton>
                {hasSubItems && (
                  <>
                    <CollapsibleTrigger asChild>
                      <SidebarMenuAction className="top-2 rounded-md data-[state=open]:rotate-90">
                        <IconChevronRight className="size-4" />
                        <span className="sr-only">Mở menu con</span>
                      </SidebarMenuAction>
                    </CollapsibleTrigger>
                    <CollapsibleContent>
                      <SidebarMenuSub className="ms-5 border-l border-sidebar-border/80 pl-2">
                        {item.items?.map((subItem) => {
                          const isSubActive =
                            pathname === subItem.url || pathname.startsWith(`${subItem.url}/`);

                          return (
                            <SidebarMenuSubItem key={subItem.title}>
                              <SidebarMenuSubButton
                                asChild
                                isActive={isSubActive}
                                className={cn(
                                  'h-9 rounded-md',
                                  isSubActive && 'bg-primary/8 font-medium text-primary',
                                )}
                              >
                                <Link href={subItem.url}>
                                  <span>{subItem.title}</span>
                                </Link>
                              </SidebarMenuSubButton>
                            </SidebarMenuSubItem>
                          );
                        })}
                      </SidebarMenuSub>
                    </CollapsibleContent>
                  </>
                )}
              </SidebarMenuItem>
            </Collapsible>
          );
        })}
      </SidebarMenu>
    </SidebarGroup>
  );
}
