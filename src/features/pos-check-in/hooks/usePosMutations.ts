'use client';

import { useMutation, useQueryClient } from '@tanstack/react-query';
import { NO_SHOW_KARMA_PENALTY } from '@/core/constants/pos-check-in';
import { POS_QUERY_KEYS, PosCheckInService } from '../services/pos-check-in.service';
import type {
  ActivatedSession,
  AddGuestSlotsPayload,
  AddSessionMembersPayload,
  AssignSessionGamesPayload,
  BookedGame,
  CheckSessionGamesPayload,
  CompleteSessionResult,
  MergeSessionsPayload,
  PartialCheckoutPayload,
  PaySessionPayload,
  PaymentCode,
  ReportInventoryLossPayload,
  SessionBill,
} from '../types/pos-check-in.interface';

function invalidateSessionQueries(
  queryClient: ReturnType<typeof useQueryClient>,
  opts: { bookingId?: string; cafeId?: string; sessionId?: string },
) {
  if (opts.bookingId) {
    queryClient.invalidateQueries({ queryKey: [POS_QUERY_KEYS.booking, opts.bookingId] });
    queryClient.invalidateQueries({ queryKey: [POS_QUERY_KEYS.activeSession, opts.bookingId] });
  }
  if (opts.cafeId) {
    queryClient.invalidateQueries({ queryKey: [POS_QUERY_KEYS.bookings, opts.cafeId] });
    queryClient.invalidateQueries({ queryKey: [POS_QUERY_KEYS.floorPlan, opts.cafeId] });
  }
  if (opts.cafeId && opts.sessionId) {
    queryClient.invalidateQueries({
      queryKey: [POS_QUERY_KEYS.session, opts.cafeId, opts.sessionId],
    });
  }
}

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
    onSuccess: (_session: ActivatedSession) => {
      invalidateSessionQueries(queryClient, { bookingId });
      queryClient.invalidateQueries({ queryKey: [POS_QUERY_KEYS.bookings] });
      queryClient.invalidateQueries({ queryKey: [POS_QUERY_KEYS.floorPlan] });
    },
  });
}

export function useCheckOutBooking(cafeId?: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (bookingId: string) => PosCheckInService.checkOutBooking(bookingId),
    onSuccess: (_void, bookingId) => {
      invalidateSessionQueries(queryClient, { bookingId, cafeId });
    },
  });
}

export function useCalculateBill(sessionId: string, cafeId?: string) {
  return useMutation({
    mutationFn: () => PosCheckInService.calculateBill(sessionId, cafeId),
  });
}

export function useGeneratePaymentCode(sessionId: string, cafeId?: string) {
  return useMutation({
    mutationFn: (payload?: PaySessionPayload) =>
      cafeId
        ? PosCheckInService.paySession(cafeId, sessionId, payload)
        : PosCheckInService.generatePaymentCode(sessionId, cafeId),
  });
}

export function useCompleteSession(bookingId: string, cafeId?: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (sessionId: string) => PosCheckInService.completeSession(sessionId, cafeId),
    onSuccess: (_result: CompleteSessionResult, sessionId) => {
      invalidateSessionQueries(queryClient, { bookingId, cafeId, sessionId });
      queryClient.invalidateQueries({ queryKey: [POS_QUERY_KEYS.bookings] });
      queryClient.invalidateQueries({ queryKey: [POS_QUERY_KEYS.floorPlan] });
    },
  });
}

export function useEndGame(cafeId: string, sessionId: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: () => PosCheckInService.endGame(cafeId, sessionId),
    onSuccess: () => invalidateSessionQueries(queryClient, { cafeId, sessionId }),
  });
}

export function useAddGuestSlots(cafeId: string, sessionId: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (payload: AddGuestSlotsPayload) =>
      PosCheckInService.addGuestSlots(cafeId, sessionId, payload),
    onSuccess: () => invalidateSessionQueries(queryClient, { cafeId, sessionId }),
  });
}

export function useAddSessionMembers(cafeId: string, sessionId: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (payload: AddSessionMembersPayload) =>
      PosCheckInService.addSessionMembers(cafeId, sessionId, payload),
    onSuccess: () => invalidateSessionQueries(queryClient, { cafeId, sessionId }),
  });
}

export function useAssignSessionGames(cafeId: string, sessionId: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (payload: AssignSessionGamesPayload) =>
      PosCheckInService.assignSessionGames(cafeId, sessionId, payload),
    onSuccess: () => invalidateSessionQueries(queryClient, { cafeId, sessionId }),
  });
}

export function useCheckSessionGames(cafeId: string, sessionId: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (payload: CheckSessionGamesPayload) =>
      PosCheckInService.checkSessionGames(cafeId, sessionId, payload),
    onSuccess: () => invalidateSessionQueries(queryClient, { cafeId, sessionId }),
  });
}

export function useReportInventoryLoss(cafeId: string, sessionId: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (payload: ReportInventoryLossPayload) =>
      PosCheckInService.reportInventoryLoss(cafeId, sessionId, payload),
    onSuccess: () => invalidateSessionQueries(queryClient, { cafeId, sessionId }),
  });
}

export function useMergeSessions(cafeId: string, sourceSessionId: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (payload: MergeSessionsPayload) =>
      PosCheckInService.mergeSessions(cafeId, sourceSessionId, payload),
    onSuccess: (_result, payload) => {
      invalidateSessionQueries(queryClient, { cafeId, sessionId: sourceSessionId });
      invalidateSessionQueries(queryClient, { cafeId, sessionId: payload.targetSessionId });
    },
  });
}

export function usePartialCheckout(cafeId: string, sessionId: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (payload: PartialCheckoutPayload) =>
      PosCheckInService.partialCheckout(cafeId, sessionId, payload),
    onSuccess: () => invalidateSessionQueries(queryClient, { cafeId, sessionId }),
  });
}

export type { SessionBill, PaymentCode, CompleteSessionResult };

export { NO_SHOW_KARMA_PENALTY };
