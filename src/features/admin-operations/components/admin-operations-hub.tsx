'use client';

import { CalendarClock, Settings2, Sparkles } from 'lucide-react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { cn } from '@/lib/utils';
import { AdminReservationOperationsPanel } from './admin-reservation-operations-panel';
import { AdminSystemJobsPanel } from './admin-system-jobs-panel';

interface TabDescriptor {
  value: 'reservation' | 'system';
  label: string;
  icon: typeof CalendarClock;
  badge: string;
  description: string;
  accent: string;
  ringClass: string;
  badgeClass: string;
}

const TABS: TabDescriptor[] = [
  {
    value: 'reservation',
    label: 'Reservation',
    icon: CalendarClock,
    badge: '4 jobs',
    description: 'Xử lý đơn đặt chỗ, vắng mặt, duyệt quán & hoàn BVC thủ công.',
    accent:
      'bg-gradient-to-br from-sky-500/15 via-sky-400/5 to-transparent text-sky-700 dark:from-sky-500/25 dark:to-transparent dark:text-sky-300',
    ringClass:
      'data-[state=active]:bg-sky-500 data-[state=active]:text-white data-[state=active]:shadow-sky-500/30',
    badgeClass:
      'bg-sky-100 text-sky-700 group-data-[state=active]:bg-white/20 group-data-[state=active]:text-white dark:bg-sky-500/20 dark:text-sky-300',
  },
  {
    value: 'system',
    label: 'System jobs',
    icon: Settings2,
    badge: '7 jobs',
    description: 'Recovery scheduler: cọc, nạp BVC, giải đấu, kết bạn, cache cấu hình.',
    accent:
      'bg-gradient-to-br from-violet-500/15 via-fuchsia-400/5 to-transparent text-violet-700 dark:from-violet-500/25 dark:to-transparent dark:text-violet-300',
    ringClass:
      'data-[state=active]:bg-violet-500 data-[state=active]:text-white data-[state=active]:shadow-violet-500/30',
    badgeClass:
      'bg-violet-100 text-violet-700 group-data-[state=active]:bg-white/20 group-data-[state=active]:text-white dark:bg-violet-500/20 dark:text-violet-300',
  },
];

export function AdminOperationsHub() {
  return (
    <Tabs defaultValue="reservation" className="space-y-6">
      <div className="grid gap-3 sm:grid-cols-2">
        {TABS.map((tab) => {
          const Icon = tab.icon;
          return (
            <div
              key={tab.value}
              className={cn(
                'rounded-2xl border border-border/60 p-4 shadow-sm transition-colors',
                tab.accent,
              )}
            >
              <div className="flex items-start gap-3">
                <div className="rounded-xl bg-white/70 p-2 shadow-sm ring-1 ring-black/5 dark:bg-white/10 dark:ring-white/10">
                  <Icon className="size-5" />
                </div>
                <div className="space-y-1">
                  <div className="flex items-center gap-2">
                    <h2 className="text-sm font-semibold tracking-tight">
                      {tab.label}
                    </h2>
                    <span
                      className={cn(
                        'rounded-full px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide',
                        tab.badgeClass,
                      )}
                    >
                      {tab.badge}
                    </span>
                  </div>
                  <p className="text-xs leading-relaxed text-foreground/70">
                    {tab.description}
                  </p>
                </div>
                <Sparkles className="ml-auto size-3.5 opacity-50" />
              </div>
            </div>
          );
        })}
      </div>

      <TabsList className="grid h-auto w-full grid-cols-2 gap-1 bg-muted/60 p-1 sm:w-[480px]">
        {TABS.map((tab) => {
          const Icon = tab.icon;
          return (
            <TabsTrigger
              key={tab.value}
              value={tab.value}
              className={cn(
                'group gap-2 rounded-lg py-2.5 text-sm font-medium shadow-none transition-all',
                'data-[state=active]:shadow-lg',
                tab.ringClass,
              )}
            >
              <Icon className="size-4" />
              {tab.label}
            </TabsTrigger>
          );
        })}
      </TabsList>

      <TabsContent value="reservation" className="mt-0">
        <AdminReservationOperationsPanel />
      </TabsContent>
      <TabsContent value="system" className="mt-0">
        <AdminSystemJobsPanel />
      </TabsContent>
    </Tabs>
  );
}
