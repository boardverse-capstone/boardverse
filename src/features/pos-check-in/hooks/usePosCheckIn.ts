'use client';

import { useQuery } from '@tanstack/react-query';
import { useAuthStore } from '@/features/auth/store/auth.store';
import { POS_QUERY_KEYS, PosCheckInService } from '../services/pos-check-in.service';

export function useFloorPlan(cafeId?: string) {
  return useQuery({
    queryKey: [POS_QUERY_KEYS.floorPlan, cafeId],
    queryFn: () => PosCheckInService.getFloorPlan(cafeId!),
    enabled: Boolean(cafeId),
    refetchInterval: 30_000,
    staleTime: 5_000,
  });
}

export function useStaffCafe() {
  const token = useAuthStore((state) => state.token);

  return useQuery({
    queryKey: [POS_QUERY_KEYS.cafe],
    queryFn: () => PosCheckInService.getStaffCafe(),
    enabled: Boolean(token),
    staleTime: 60_000,
  });
}

export function usePendingBookings(cafeId?: string) {
  const token = useAuthStore((state) => state.token);

  return useQuery({
    queryKey: [POS_QUERY_KEYS.bookings, cafeId],
    queryFn: () => PosCheckInService.getPendingBookings(cafeId!),
    enabled: Boolean(cafeId) && Boolean(token),
    staleTime: 10_000,
  });
}

export function useTableBooking(bookingId: string) {
  return useQuery({
    queryKey: [POS_QUERY_KEYS.booking, bookingId],
    queryFn: () => PosCheckInService.getBookingById(bookingId),
    enabled: Boolean(bookingId),
  });
}

export function useAlternativeGames(cafeId: string | undefined, playerCount: number, enabled = false) {
  return useQuery({
    queryKey: [POS_QUERY_KEYS.alternatives, cafeId, playerCount],
    queryFn: () => PosCheckInService.getAlternativeGames(cafeId!, playerCount),
    enabled: enabled && Boolean(cafeId) && playerCount > 0,
    staleTime: 30_000,
  });
}

export function useActiveSession(bookingId: string, enabled = true) {
  return useQuery({
    queryKey: [POS_QUERY_KEYS.activeSession, bookingId],
    queryFn: () => PosCheckInService.getActiveSessionByBookingId(bookingId),
    enabled: enabled && Boolean(bookingId),
    staleTime: 5_000,
  });
}

/** GET /api/cafes/{cafeId}/sessions/{sessionId} */
export function useCafeSession(cafeId?: string, sessionId?: string, enabled = true) {
  return useQuery({
    queryKey: [POS_QUERY_KEYS.session, cafeId, sessionId],
    queryFn: () => PosCheckInService.getSession(cafeId!, sessionId!),
    enabled: enabled && Boolean(cafeId) && Boolean(sessionId),
    staleTime: 5_000,
  });
}

/** GET /api/cafes/{cafeId}/pos/sessions/active */
export function useActiveSessions(cafeId?: string, gameTemplateId?: string) {
  return useQuery({
    queryKey: [POS_QUERY_KEYS.activeSessions, cafeId, gameTemplateId ?? 'all'],
    queryFn: () =>
      PosCheckInService.getActiveSessions({
        cafeId: cafeId!,
        gameTemplateId: gameTemplateId || undefined,
      }),
    enabled: Boolean(cafeId),
    staleTime: 10_000,
    refetchInterval: 30_000,
  });
}

/** GET /api/cafes/{cafeId}/settlements/pending */
export function usePendingSettlements(cafeId?: string) {
  return useQuery({
    queryKey: [POS_QUERY_KEYS.settlements, cafeId],
    queryFn: () => PosCheckInService.getPendingSettlements(cafeId!),
    enabled: Boolean(cafeId),
    staleTime: 30_000,
  });
}
