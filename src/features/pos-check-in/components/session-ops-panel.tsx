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
  /** Khi không có ActiveSession thật — mở lại form check-in */
  onSessionMissing?: () => void;
}

export function SessionOpsPanel({ booking, onCompleted, onSessionMissing }: SessionOpsPanelProps) {
  const { data: session, isLoading, isError, isFetched } = useActiveSession(booking.id);
  const { data: floorPlan } = useFloorPlan(booking.cafeId);
  const [tab, setTab] = useState('members');
  /** Giữ CHECKING / đã kiểm kê trên parent — tránh mất khi đổi tab (unmount Games) */
  const [gameChecking, setGameChecking] = useState(false);
  const [componentsVerified, setComponentsVerified] = useState(false);

  // Hydrate từ localStorage sau reload (GET thường vẫn Active dù đã End)
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
      // GET Active nhưng đã End/UNPAID trước reload — giữ UI, không xóa LS
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
      <div className="space-y-3 rounded-lg border border-rose-200 bg-rose-50 p-3">
        <p className="text-sm text-rose-700">
          Không tìm thấy phiên chơi đang hoạt động trên server (booking có thể chưa
          check-in thành công).
        </p>
        <button
          type="button"
          className="inline-flex h-9 items-center justify-center rounded-md bg-emerald-600 px-3 text-sm font-medium text-white hover:bg-emerald-700"
          onClick={() => onSessionMissing?.()}
        >
          Quay lại check-in / mở phiên
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
            {session.game.name} · {livePlayerCount} người
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
            Thành viên
          </TabsTrigger>
          <TabsTrigger value="game" className="gap-1 py-2 text-xs sm:text-sm">
            <Gamepad2 className="h-3.5 w-3.5" />
            Game
          </TabsTrigger>
          <TabsTrigger value="checkout" className="gap-1 py-2 text-xs sm:text-sm">
            <Receipt className="h-3.5 w-3.5" />
            Thanh toán
          </TabsTrigger>
        </TabsList>

        {/* Không dùng TabsContent — tránh Radix Presence ẩn panel (tab trắng) */}
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
