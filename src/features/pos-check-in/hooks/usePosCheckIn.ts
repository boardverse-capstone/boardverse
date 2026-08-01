'use client';

import { useQuery } from '@tanstack/react-query';
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
  return useQuery({
    queryKey: [POS_QUERY_KEYS.cafe],
    queryFn: () => PosCheckInService.getStaffCafe(),
    staleTime: 60_000,
  });
}

export function usePendingBookings(cafeId?: string) {
  return useQuery({
    queryKey: [POS_QUERY_KEYS.bookings, cafeId],
    queryFn: () => PosCheckInService.getPendingBookings(cafeId!),
    enabled: Boolean(cafeId),
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
