"use client";

import { useEffect, useRef, useState } from "react";
import { toast } from "sonner";
import { useAuthStore } from "@/features/auth/store/auth.store";
import {
  getPosHubConnection,
  joinPosCafe,
  joinPosUserNotifications,
  leavePosCafe,
  stopPosHubConnection,
  subscribePosHubEvent,
} from "@/features/pos-check-in/lib/pos-hub";

const POS_EVENTS = [
  // Docs (pos-hub.md)
  "SessionStarted",
  "SessionEnded",
  "PlayerJoinedSession",
  "PlayerLeftSession",
  "CheckInTokenCreated",
  "PlayerScannedToken",
  "PlayerCheckedIn",
  "GameBorrowed",
  "GameReturned",
  "ComponentCheckRequired",
  "UpcomingReservationAlert",
  "LobbyAtRiskAlert",
  // Legacy aliases still emitted by some BE builds
  "SessionActivated",
  "SessionStatusChanged",
  "PenaltyAdded",
  "MemberLeftEarly",
  "SessionMerged",
  "RefundProcessed",
] as const;

/** SignalR `/hubs/pos` cho Manager/Staff cafe-pos — gọi onRefresh khi có event. */
export function useCafePosHub(opts: {
  enabled?: boolean;
  cafeId?: string | null;
  onRefresh?: () => void;
}) {
  const enabled = opts.enabled !== false;
  const cafeId = opts.cafeId ?? null;
  const onRefresh = opts.onRefresh;
  const token = useAuthStore((s) => s.token);
  const userId = useAuthStore((s) => s.user?.id);
  const [connected, setConnected] = useState(false);
  const unsubscribers = useRef<Array<() => void>>([]);
  const refreshRef = useRef(onRefresh);
  refreshRef.current = onRefresh;

  useEffect(() => {
    if (!enabled || !token) return;

    let cancelled = false;
    let joinedCafeId: string | null = null;

    (async () => {
      try {
        await getPosHubConnection();
        if (cancelled) return;
        setConnected(true);

        if (cafeId) {
          await joinPosCafe(cafeId);
          joinedCafeId = cafeId;
        }

        if (userId) {
          await joinPosUserNotifications(userId);
        }

        for (const eventName of POS_EVENTS) {
          const off = await subscribePosHubEvent(eventName, (payload) => {
            refreshRef.current?.();
            if (
              eventName === "SessionActivated" ||
              eventName === "SessionStarted" ||
              eventName === "PlayerCheckedIn"
            ) {
              const data = payload as { cafeName?: string } | null;
              toast.message("Phiên chơi đã cập nhật", {
                description: data?.cafeName
                  ? `Tại ${data.cafeName}`
                  : "Đã cập nhật sơ đồ / danh sách phiên.",
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
      if (joinedCafeId) {
        void leavePosCafe(joinedCafeId).catch(() => undefined);
      }
      setConnected(false);
    };
  }, [enabled, token, userId, cafeId]);

  useEffect(() => {
    return () => {
      if (enabled) {
        void stopPosHubConnection().catch(() => undefined);
      }
    };
  }, [enabled]);

  return { connected };
}
