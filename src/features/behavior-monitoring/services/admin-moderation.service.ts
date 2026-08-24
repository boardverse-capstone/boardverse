import apiClient from '@/core/api/client';
import type {
  ActionHistoryPage,
  ActionHistoryParams,
  AlertMetrics,
  AlertPage,
  AlertParams,
  CoolingOffPage,
  CoolingOffParams,
  ExtendCoolingOffRequest,
  ExtendCoolingOffResponse,
  PlayerAlert,
  PlayerRisk,
  ReleaseCoolingOffResponse,
  RiskHistoryItem,
  RiskHistoryParams,
} from '../types/admin-moderation.interface';

const playerPath = (userId: string) =>
  `/api/v1/admin/players/${encodeURIComponent(userId.trim())}`;

const coolingOffPath = (userId: string) =>
  `/api/v1/admin/cooling-off/${encodeURIComponent(userId)}`;

const alertPath = (alertId: string) =>
  `/api/v1/admin/alerts/${encodeURIComponent(alertId)}`;

export const AdminModerationService = {
  getActionHistory: (params: ActionHistoryParams = {}) =>
    apiClient.get<never, ActionHistoryPage>('/api/v1/admin/users/action-history', { params }),

  getAlerts: async (params: AlertParams = {}): Promise<AlertPage> => {
    const result = await apiClient.get<never, AlertPage | PlayerAlert[]>('/api/v1/admin/alerts', {
      params,
    });
    return Array.isArray(result) ? { items: result, totalCount: result.length } : result;
  },

  getAlertMetrics: () =>
    apiClient.get<never, AlertMetrics>('/api/v1/admin/alerts/metrics'),

  acknowledgeAlert: (alertId: string) =>
    apiClient.post<never, PlayerAlert>(`${alertPath(alertId)}/acknowledge`),

  resolveAlert: (alertId: string, note: string) =>
    apiClient.post<never, PlayerAlert>(`${alertPath(alertId)}/resolve`, { note }),

  dismissAlert: (alertId: string, note: string) =>
    apiClient.post<never, PlayerAlert>(`${alertPath(alertId)}/dismiss`, { note }),

  getPlayerRisk: (userId: string) =>
    apiClient.get<never, PlayerRisk>(`${playerPath(userId)}/risk`),

  getPlayerRiskHistory: (userId: string, params: RiskHistoryParams = {}) =>
    apiClient.get<never, RiskHistoryItem[]>(`${playerPath(userId)}/risk-history`, { params }),

  getCoolingOffUsers: (params: CoolingOffParams = {}) =>
    apiClient.get<never, CoolingOffPage>('/api/v1/admin/cooling-off', { params }),

  releaseCoolingOff: (userId: string) =>
    apiClient.post<never, ReleaseCoolingOffResponse>(`${coolingOffPath(userId)}/release`),

  extendCoolingOff: (userId: string, payload: ExtendCoolingOffRequest) =>
    apiClient.post<never, ExtendCoolingOffResponse>(
      `${coolingOffPath(userId)}/extend`,
      payload,
    ),
};
