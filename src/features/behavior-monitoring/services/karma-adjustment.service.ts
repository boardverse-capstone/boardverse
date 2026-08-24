import apiClient from '@/core/api/client';
import type { AdjustKarmaRequest, AdjustKarmaResponse } from '../types/behavior.interface';
import { mapAdjustKarmaResponse } from '../utils/karma-log.mapper';

export const KarmaAdjustmentService = {
  /** POST /api/v1/admin/users/{id}/adjust-karma */
  adjustKarma: async (payload: AdjustKarmaRequest): Promise<AdjustKarmaResponse> => {
    const nextKarma = Math.max(0, payload.currentKarma + payload.delta);

    const raw = await apiClient.post<never, unknown>(
      `/api/v1/admin/users/${payload.userId}/adjust-karma`,
      {
        amount: payload.delta,
        reason: payload.reason,
      },
    );

    return mapAdjustKarmaResponse(raw, nextKarma);
  },
};
