import apiClient from '@/core/api/client';
import type {
  OverrideReservationRefundRequest,
  OverrideReservationRefundResult,
  ReleaseSessionDepositPayload,
  ReleaseSessionDepositResult,
  ReservationJobResult,
  RunReservationJobPayload,
  SystemJobResult,
  SystemJobType,
} from '../types/admin-operations.interface';

const RESERVATION_JOBS_BASE = '/api/v1/admin/jobs/reservations';
const ADMIN_JOBS_BASE = '/api/v1/admin/jobs';

export const AdminOperationsService = {
  runReservationJob: async ({
    job,
    batchSize,
  }: RunReservationJobPayload): Promise<ReservationJobResult> => {
    return apiClient.post<never, ReservationJobResult>(
      `${RESERVATION_JOBS_BASE}/${job}`,
      null,
      { params: { batchSize } },
    );
  },

  runSystemJob: async (job: SystemJobType): Promise<SystemJobResult> => {
    return apiClient.post<never, SystemJobResult>(
      `${ADMIN_JOBS_BASE}/${job}`,
      null,
    );
  },

  releaseSessionDeposit: async (
    payload: ReleaseSessionDepositPayload,
  ): Promise<ReleaseSessionDepositResult> => {
    return apiClient.post<never, ReleaseSessionDepositResult>(
      `${ADMIN_JOBS_BASE}/settlement/release-session-deposit`,
      null,
      { params: payload },
    );
  },

  overrideReservationRefund: async (
    reservationId: string,
    payload: OverrideReservationRefundRequest,
  ): Promise<OverrideReservationRefundResult> => {
    const idempotencyKey =
      typeof crypto !== 'undefined' && 'randomUUID' in crypto
        ? crypto.randomUUID()
        : `reservation-refund-${reservationId}-${Date.now()}`;

    return apiClient.post<never, OverrideReservationRefundResult>(
      `/api/v1/admin/reservations/${reservationId}/override-refund`,
      payload,
      {
        headers: {
          'Idempotency-Key': idempotencyKey,
        },
      },
    );
  },
};
