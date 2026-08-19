'use client';

import { CalendarClock, Settings2 } from 'lucide-react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { AdminReservationOperationsPanel } from './admin-reservation-operations-panel';
import { AdminSystemJobsPanel } from './admin-system-jobs-panel';

export function AdminOperationsHub() {
  return (
    <Tabs defaultValue="reservation" className="space-y-6">
      <TabsList className="grid h-auto w-full grid-cols-2 sm:w-[440px]">
        <TabsTrigger value="reservation" className="gap-2 py-2.5">
          <CalendarClock className="size-4" />
          Reservation
        </TabsTrigger>
        <TabsTrigger value="system" className="gap-2 py-2.5">
          <Settings2 className="size-4" />
          System jobs
        </TabsTrigger>
      </TabsList>
      <TabsContent value="reservation">
        <AdminReservationOperationsPanel />
      </TabsContent>
      <TabsContent value="system">
        <AdminSystemJobsPanel />
      </TabsContent>
    </Tabs>
  );
}
