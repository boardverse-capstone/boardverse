import apiClient from '@/core/api/client';
import type {
  LowKarmaUser,
  PunishUserRequest,
  PunishUserResponse,
} from '../types/behavior.interface';
import { normalizeUserAlertsResponse } from '../utils/karma-log.mapper';

export const BehaviorSanctionService = {
  /** GET /api/v1/admin/users/alerts — user có Karma < 50 */
  getLowKarmaUsers: async (search?: string): Promise<LowKarmaUser[]> => {
    const raw = await apiClient.get<never, unknown>('/api/v1/admin/users/alerts');
    const users = normalizeUserAlertsResponse(raw);
    const q = search?.trim().toLowerCase() ?? '';
    if (!q) return users.sort((a, b) => a.karmaPoints - b.karmaPoints);

    return users
      .filter(
        (user) =>
          user.username.toLowerCase().includes(q) ||
          user.email.toLowerCase().includes(q) ||
          user.id.toLowerCase().includes(q),
      )
      .sort((a, b) => a.karmaPoints - b.karmaPoints);
  },

  /** POST /api/v1/admin/users/{id}/punish */
  punishUser: async (userId: string, payload: PunishUserRequest): Promise<PunishUserResponse> => {
    const body: Record<string, unknown> = {
      actionType: payload.actionType,
      reason: payload.reason,
    };
    if (payload.actionType === 'Suspend') {
      body.durationDays = payload.durationDays;
    }

    const raw = await apiClient.post<never, PunishUserResponse | { data: PunishUserResponse }>(
      `/api/v1/admin/users/${userId}/punish`,
      body,
    );

    if (raw && typeof raw === 'object' && 'data' in raw && raw.data) {
      return raw.data;
    }
    return raw as PunishUserResponse;
  },
};
