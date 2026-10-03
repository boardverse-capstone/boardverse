'use client';

import { useEffect, useState } from 'react';
import { Gamepad2, Receipt, Users } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Spinner } from '@/components/ui/spinner';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useActiveSession, useFloorPlan } from '../hooks/usePosCheckIn';
import type { TableBooking } from '../types/pos-check-in.interface';
import { SessionCheckoutPanel } from './session-checkout-panel';
import { SessionGamesPanel } from './session-games-panel';
import { SessionMembersPanel } from './session-members-panel';
import { SessionTimer } from './session-timer';

interface SessionOpsPanelProps {
  booking: TableBooking;
  onCompleted?: () => void;
  /** Khi khÃ´ng cÃ³ ActiveSession tháº­t â€” má»Ÿ láº¡i form check-in */
  onSessionMissing?: () => void;
}

export function SessionOpsPanel({ booking, onCompleted, onSessionMissing }: SessionOpsPanelProps) {
  const { data: session, isLoading, isError, isFetched } = useActiveSession(booking.id);
  const { data: floorPlan } = useFloorPlan(booking.cafeId);
  const [tab, setTab] = useState('members');
  /** Giá»¯ CHECKING / Ä‘Ã£ kiá»ƒm kÃª trÃªn parent â€” trÃ¡nh máº¥t khi Ä‘á»•i tab (unmount Games) */
  const [gameChecking, setGameChecking] = useState(false);
  const [componentsVerified, setComponentsVerified] = useState(false);

  // Hydrate tá»« localStorage sau reload (GET thÆ°á»ng váº«n Active dÃ¹ Ä‘Ã£ End)
  useEffect(() => {
    if (!session?.sessionId || typeof window === 'undefined') return;
    try {
      const checking = localStorage.getItem(`pos_checking_${session.sessionId}`) === 'true';
      const unpaid = localStorage.getItem(`pos_unpaid_${session.sessionId}`) === 'true';
      const components =
        localStorage.getItem(`pos_components_checked_${session.sessionId}`) === 'true';
      setGameChecking(checking || unpaid);
      setComponentsVerified(components || unpaid);
    } catch {
      setGameChecking(false);
      setComponentsVerified(false);
    }
  }, [session?.sessionId]);

  useEffect(() => {
    if (!session?.sessionId) return;
    if (
      session.status === 'Checking' ||
      session.status === 'Paying' ||
      session.status === 'Completed'
    ) {
      setGameChecking(true);
      if (session.status === 'Paying' || session.status === 'Completed') {
        setComponentsVerified(true);
      }
    } else if (session.status === 'Active') {
      // GET Active nhÆ°ng Ä‘Ã£ End/UNPAID trÆ°á»›c reload â€” giá»¯ UI, khÃ´ng xÃ³a LS
      try {
        if (localStorage.getItem(`pos_unpaid_${session.sessionId}`) === 'true') {
          setGameChecking(true);
          setComponentsVerified(true);
          return;
        }
        if (localStorage.getItem(`pos_checking_${session.sessionId}`) === 'true') {
          setGameChecking(true);
          return;
        }
      } catch {
        // ignore
      }
      setGameChecking(false);
    }
  }, [session?.status, session?.sessionId]);

  const goToCheckout = () => {
    setTab('checkout');
  };

  if (isLoading) {
    return (
      <div className="flex justify-center py-8">
        <Spinner className="h-5 w-5" />
      </div>
    );
  }

  if (isFetched && (isError || !session)) {
    return (
      <div className="space-y-3 rounded-lg border border-orange-200 bg-orange-50 p-3">
        <p className="text-sm text-orange-700">
          KhÃ´ng tÃ¬m tháº¥y phiÃªn chÆ¡i Ä‘ang hoáº¡t Ä‘á»™ng trÃªn server (booking cÃ³ thá»ƒ chÆ°a
          check-in thÃ nh cÃ´ng).
        </p>
        <button
          type="button"
          className="inline-flex h-9 items-center justify-center rounded-md bg-orange-600 px-3 text-sm font-medium text-white hover:bg-orange-700"
          onClick={() => onSessionMissing?.()}
        >
          Quay láº¡i check-in / má»Ÿ phiÃªn
        </button>
      </div>
    );
  }

  if (!session) {
    return (
      <div className="flex justify-center py-8">
        <Spinner className="h-5 w-5" />
      </div>
    );
  }

  const realMemberCount = (session.members || []).filter(
    (m) =>
      !String(m.id).startsWith('guest-slot-') &&
      !String(m.id).startsWith('guest-auto-'),
  ).length;
  const livePlayerCount =
    realMemberCount > 0
      ? realMemberCount
      : Math.max(session.presentCount || 0, booking?.participants?.length || 0, 1);

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap items-center justify-between gap-2 rounded-lg border bg-muted/30 px-3 py-2.5">
        <div>
          <p className="text-sm font-semibold">{session.tableLabel}</p>
          <p className="text-xs text-muted-foreground">
            {session.game.name} Â· {livePlayerCount} ngÆ°á»i
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Badge variant="secondary">{session.status || 'Active'}</Badge>
          <SessionTimer
            startedAt={session.startedAt}
            endedAt={session.endedAt}
            className="font-mono text-sm font-semibold"
          />
        </div>
      </div>

      <Tabs value={tab} onValueChange={setTab} className="gap-3">
        <TabsList className="grid h-auto w-full grid-cols-3">
          <TabsTrigger value="members" className="gap-1 py-2 text-xs sm:text-sm">
            <Users className="h-3.5 w-3.5" />
            ThÃ nh viÃªn
          </TabsTrigger>
          <TabsTrigger value="game" className="gap-1 py-2 text-xs sm:text-sm">
            <Gamepad2 className="h-3.5 w-3.5" />
            Game
          </TabsTrigger>
          <TabsTrigger value="checkout" className="gap-1 py-2 text-xs sm:text-sm">
            <Receipt className="h-3.5 w-3.5" />
            Thanh toÃ¡n
          </TabsTrigger>
        </TabsList>

        {/* KhÃ´ng dÃ¹ng TabsContent â€” trÃ¡nh Radix Presence áº©n panel (tab tráº¯ng) */}
        {tab === 'members' ? (
          <div className="mt-0">
            <SessionMembersPanel
              cafeId={session.cafeId}
              session={session}
              booking={booking}
              occupiedTables={floorPlan?.tables ?? []}
            />
          </div>
        ) : null}

        {tab === 'game' ? (
          <div className="mt-0">
            <SessionGamesPanel
              cafeId={session.cafeId || booking.cafeId}
              session={session}
              presentCount={session.presentCount}
              phaseLocked={gameChecking}
              componentsDone={componentsVerified}
              onPhaseLocked={() => setGameChecking(true)}
              onPhaseReset={() => setGameChecking(false)}
              onComponentsDone={() => setComponentsVerified(true)}
              onComponentsReset={() => setComponentsVerified(false)}
              onChecklistComplete={goToCheckout}
            />
          </div>
        ) : null}

        {tab === 'checkout' ? (
          <div className="mt-0">
            <SessionCheckoutPanel bookingId={booking.id} onCompleted={onCompleted} />
          </div>
        ) : null}
      </Tabs>
    </div>
  );
}
