'use client';

import { useMutation, useQueryClient } from '@tanstack/react-query';
import { NO_SHOW_KARMA_PENALTY } from '@/core/constants/pos-check-in';
import { POS_QUERY_KEYS, PosCheckInService } from '../services/pos-check-in.service';
import type { ActivatedSession, BookedGame } from '../types/pos-check-in.interface';

export function useResolveBookingQr() {
  return useMutation({
    mutationFn: (payload: string) => PosCheckInService.resolveQrOrBookingId(payload),
  });
}

export function useMarkAbsent(bookingId: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (participantIds: string[]) =>
      PosCheckInService.markAbsent(bookingId, participantIds),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [POS_QUERY_KEYS.booking, bookingId] });
    },
  });
}

export function useActivateSession(bookingId: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({
      game,
      presentParticipantIds,
    }: {
      game: BookedGame;
      presentParticipantIds: string[];
    }) => PosCheckInService.activateSession(bookingId, game, presentParticipantIds),
    onSuccess: (session: ActivatedSession) => {
      queryClient.invalidateQueries({ queryKey: [POS_QUERY_KEYS.booking, bookingId] });
      queryClient.invalidateQueries({ queryKey: [POS_QUERY_KEYS.bookings] });
      queryClient.invalidateQueries({ queryKey: [POS_QUERY_KEYS.floorPlan] });
      return session;
    },
  });
}

export { NO_SHOW_KARMA_PENALTY };
