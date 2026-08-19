'use client';

import { useEffect, useRef, useState } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { useAuthStore } from '@/features/auth/store/auth.store';
import {
  getPosHubConnection,
  joinPosSession,
  joinPosUserNotifications,
  leavePosSession,
  stopPosHubConnection,
  subscribePosHubEvent,
} from '../lib/pos-hub';
import { POS_QUERY_KEYS } from '../services/pos-check-in.service';

const POS_EVENTS = [
  'SessionActivated',
  'SessionStatusChanged',
  'PenaltyAdded',
  'MemberLeftEarly',
  'SessionMerged',
  'RefundProcessed',
] as const;

/**
 * Kết nối `/hubs/pos` khi mở Web POS — invalidate floor/bookings/sessions khi có event.
 */
export function usePosHub(opts?: { sessionId?: string; enabled?: boolean }) {
  const enabled = opts?.enabled !== false;
  const sessionId = opts?.sessionId;
  const queryClient = useQueryClient();
  const token = useAuthStore((s) => s.token);
  const userId = useAuthStore((s) => s.user?.id);
  const [connected, setConnected] = useState(false);
  const unsubscribers = useRef<Array<() => void>>([]);

  useEffect(() => {
    if (!enabled || !token) return;

    let cancelled = false;

    const invalidatePos = () => {
      queryClient.invalidateQueries({ queryKey: [POS_QUERY_KEYS.floorPlan] });
      queryClient.invalidateQueries({ queryKey: [POS_QUERY_KEYS.bookings] });
      queryClient.invalidateQueries({ queryKey: [POS_QUERY_KEYS.activeSessions] });
      queryClient.invalidateQueries({ queryKey: [POS_QUERY_KEYS.boxes] });
      if (sessionId) {
        queryClient.invalidateQueries({ queryKey: [POS_QUERY_KEYS.session] });
        queryClient.invalidateQueries({ queryKey: [POS_QUERY_KEYS.activeSession] });
      }
    };

    (async () => {
      try {
        await getPosHubConnection();
        if (cancelled) return;
        setConnected(true);

        if (userId) {
          await joinPosUserNotifications(userId);
        }

        for (const eventName of POS_EVENTS) {
          const off = await subscribePosHubEvent(eventName, (payload) => {
            invalidatePos();
            if (eventName === 'SessionActivated') {
              const data = payload as { cafeName?: string } | null;
              toast.message('Phiên chơi đã kích hoạt', {
                description: data?.cafeName
                  ? `Tại ${data.cafeName}`
                  : 'Cập nhật sơ đồ / danh sách phiên.',
              });
            }
          });
          unsubscribers.current.push(off);
        }
      } catch {
        if (!cancelled) setConnected(false);
      }
    })();

    return () => {
      cancelled = true;
      unsubscribers.current.forEach((off) => off());
      unsubscribers.current = [];
      setConnected(false);
      // Không stop singleton khi unmount panel phụ — chỉ stop khi rời POS hoàn toàn
    };
  }, [enabled, token, userId, queryClient, sessionId]);

  useEffect(() => {
    if (!enabled || !sessionId || !connected) return;

    void joinPosSession(sessionId).catch(() => undefined);

    return () => {
      void leavePosSession(sessionId).catch(() => undefined);
    };
  }, [enabled, sessionId, connected]);

  return { connected };
}

/** Gọi khi rời trang Web POS để đóng hub. */
export function usePosHubCleanup(active: boolean) {
  useEffect(() => {
    return () => {
      if (active) {
        void stopPosHubConnection().catch(() => undefined);
      }
    };
  }, [active]);
}
