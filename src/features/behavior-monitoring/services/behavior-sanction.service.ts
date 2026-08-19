import apiClient from '@/core/api/client';
import type {
  LowKarmaUser,
  PunishUserRequest,
  PunishUserResponse,
} from '../types/behavior.interface';
import { normalizeUserAlertsResponse } from '../utils/karma-log.mapper';

const USE_MOCK = process.env.NEXT_PUBLIC_USE_MOCK_BEHAVIOR_API === 'true';

const MOCK_ALERTS: LowKarmaUser[] = [
  {
    id: '092bbcf3-e729-43b5-8913-898961babc99',
    username: 'jonny',
    email: 'jonny@example.com',
    karmaPoints: 42,
    role: 'Player',
    isBlocked: false,
    gamerTier: 'Bronze',
  },
  {
    id: '74b0b478-8ca3-4557-8576-fb471c03c562',
    username: 'test1',
    email: 'test1@example.com',
    karmaPoints: 35,
    role: 'Player',
    isBlocked: false,
    gamerTier: 'Bronze',
  },
];

export const BehaviorSanctionService = {
  /** GET /api/v1/admin/users/alerts — user có Karma < 50 */
  getLowKarmaUsers: async (search?: string): Promise<LowKarmaUser[]> => {
    if (USE_MOCK) {
      const q = search?.trim().toLowerCase() ?? '';
      if (!q) return MOCK_ALERTS;
      return MOCK_ALERTS.filter(
        (user) =>
          user.username.toLowerCase().includes(q) ||
          user.email.toLowerCase().includes(q) ||
          user.id.toLowerCase().includes(q),
      );
    }

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
    if (USE_MOCK) {
      return {
        userId,
        actionType: payload.actionType,
        accountStatus:
          payload.actionType === 'Warning'
            ? 'Active'
            : payload.actionType === 'Suspend'
              ? 'Suspended'
              : 'Banned',
        lockoutEndDate: null,
        reason: payload.reason,
      };
    }

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
