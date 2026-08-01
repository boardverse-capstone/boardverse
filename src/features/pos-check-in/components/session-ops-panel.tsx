'use client';

import { useState } from 'react';
import { Gamepad2, Receipt, Users } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Spinner } from '@/components/ui/spinner';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useActiveSession, useFloorPlan } from '../hooks/usePosCheckIn';
import type { TableBooking } from '../types/pos-check-in.interface';
import { SessionCheckoutPanel } from './session-checkout-panel';
import { SessionGamesPanel } from './session-games-panel';
import { SessionMembersPanel } from './session-members-panel';
import { SessionTimer } from './session-timer';

interface SessionOpsPanelProps {
  booking: TableBooking;
  onCompleted?: () => void;
}

export function SessionOpsPanel({ booking, onCompleted }: SessionOpsPanelProps) {
  const { data: session, isLoading, isError } = useActiveSession(booking.id);
  const { data: floorPlan } = useFloorPlan(booking.cafeId);
  const [tab, setTab] = useState('members');

  if (isLoading) {
    return (
      <div className="flex justify-center py-8">
        <Spinner className="h-5 w-5" />
      </div>
    );
  }

  if (isError || !session) {
    return (
      <p className="rounded-lg border border-rose-200 bg-rose-50 p-3 text-sm text-rose-700">
        Không tìm thấy phiên chơi đang hoạt động.
      </p>
    );
  }

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap items-center justify-between gap-2 rounded-lg border bg-muted/30 px-3 py-2.5">
        <div>
          <p className="text-sm font-semibold">{session.tableLabel}</p>
          <p className="text-xs text-muted-foreground">
            {session.game.name} · {session.presentCount} người
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Badge variant="secondary">Active</Badge>
          <SessionTimer startedAt={session.startedAt} className="font-mono text-sm font-semibold" />
        </div>
      </div>

      <Tabs value={tab} onValueChange={setTab} className="gap-3">
        <TabsList className="grid h-auto w-full grid-cols-3">
          <TabsTrigger value="members" className="gap-1 py-2 text-xs sm:text-sm">
            <Users className="h-3.5 w-3.5" />
            Thành viên
          </TabsTrigger>
          <TabsTrigger value="games" className="gap-1 py-2 text-xs sm:text-sm">
            <Gamepad2 className="h-3.5 w-3.5" />
            Game
          </TabsTrigger>
          <TabsTrigger value="checkout" className="gap-1 py-2 text-xs sm:text-sm">
            <Receipt className="h-3.5 w-3.5" />
            Thanh toán
          </TabsTrigger>
        </TabsList>

        <TabsContent value="members" className="mt-0">
          <SessionMembersPanel
            cafeId={session.cafeId}
            session={session}
            booking={booking}
            occupiedTables={floorPlan?.tables ?? []}
            onCheckoutBooking={onCompleted}
          />
        </TabsContent>

        <TabsContent value="games" className="mt-0">
          <SessionGamesPanel
            cafeId={session.cafeId}
            session={session}
            presentCount={session.presentCount}
            onEnded={() => setTab('checkout')}
          />
        </TabsContent>

        <TabsContent value="checkout" className="mt-0">
          <SessionCheckoutPanel bookingId={booking.id} onCompleted={onCompleted} />
        </TabsContent>
      </Tabs>
    </div>
  );
}
