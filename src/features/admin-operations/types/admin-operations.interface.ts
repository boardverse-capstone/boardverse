export type ReservationJobType =
  | 'process-deadlines'
  | 'process-cafe-approval-expiry'
  | 'process-no-show'
  | 'process-bvc-capture-retry';

export interface RunReservationJobPayload {
  job: ReservationJobType;
  batchSize: number;
}

export interface ReservationJobResult {
  processed: number;
}

export type SystemJobType =
  | 'deposits/process-expired'
  | 'wallet/expire-pending-topups'
  | 'tournaments/auto-close-expired-registrations'
  | 'tournaments/send-reminders'
  | 'tournaments/auto-mark-no-shows'
  | 'friends/expire-old-pending-requests'
  | 'config/invalidate-cache';

export interface SystemJobResult {
  processed?: number | boolean;
  totalMarked?: number;
  totalKarmaPenalty?: number;
  cleared?: boolean;
}

export interface ReleaseSessionDepositPayload {
  cafeId: string;
  sessionId: string;
  activeSessionId: string;
}

export interface ReleaseSessionDepositResult {
  status: string;
  cafeId: string;
  sessionId: string;
  releasedAt: string;
}

export interface OverrideReservationRefundRequest {
  refundAmount: number;
  reason: string;
}

export interface OverrideReservationRefundResult {
  reservationId: string;
  originalCapturedAmount: number;
  refundAmount: number;
  forfeitAmount: number;
  actualRefundAmount: number;
  refundPolicyApplied: string;
  refundBreakdown?: {
    returnedToAvailableBalance: number;
    forfeitedToCafe: number;
  };
  adminActionId: string;
  adminActionType: string;
  performedAt: string;
}
