import apiClient from '@/core/api/client';
import type { AdjustKarmaRequest, AdjustKarmaResponse } from '../types/behavior.interface';
import { mapAdjustKarmaResponse } from '../utils/karma-log.mapper';

const USE_MOCK = process.env.NEXT_PUBLIC_USE_MOCK_BEHAVIOR_API === 'true';

export const KarmaAdjustmentService = {
  /** POST /api/v1/admin/users/{id}/adjust-karma */
  adjustKarma: async (payload: AdjustKarmaRequest): Promise<AdjustKarmaResponse> => {
    const nextKarma = Math.max(0, payload.currentKarma + payload.delta);

    if (USE_MOCK) {
      return {
        userId: payload.userId,
        karmaPoints: nextKarma,
        logId: `mock-log-${Date.now()}`,
      };
    }

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
