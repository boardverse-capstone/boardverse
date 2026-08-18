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
