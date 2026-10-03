import apiClient from '@/core/api/client';
import type { MasterSettings } from '@/features/master-settings/types/master-settings.interface';
import {
  buildAdminConfigUpdatePayload,
  configMapToMasterSettings,
  normalizeAdminConfigResponse,
  type AdminConfigMap,
} from '../utils/config.mapper';
export const ADMIN_CONFIG_QUERY_KEY = 'admin-configs';

export interface SystemConfigLookupResult {
  configKey: string;
  configValue: string;
  description: string;
  updatedAt: string;
  inferredType: 'bool' | 'int' | 'double' | 'string';
  parsedValue: boolean | number | string | null;
}

export interface BypassTimeWindowResult {
  bypassEnabled: boolean;
  configKey: string;
  appliedWithinSeconds?: number;
}

export interface DemoLoosenLobbyConstraintsResult {
  demoEnabled: boolean;
  configKey: string;
  appliedWithinSeconds?: number;
  affectedRules?: string[];
}

export const AdminConfigService = {
  /** GET /api/v1/system-configs/{key} — read-only */
  getConfigByKey: async (key: string): Promise<SystemConfigLookupResult> => {
    return apiClient.get<never, SystemConfigLookupResult>(
      `/api/v1/system-configs/${encodeURIComponent(key.trim())}`,
    );
  },

  /** GET /api/v1/admin/configs/bypass-time-window */
  getBypassTimeWindow: async (): Promise<BypassTimeWindowResult> => {
    return apiClient.get<never, BypassTimeWindowResult>(
      '/api/v1/admin/configs/bypass-time-window',
    );
  },

  /** POST/DELETE /api/v1/admin/configs/bypass-time-window */
  setBypassTimeWindow: async (
    enabled: boolean,
  ): Promise<BypassTimeWindowResult> => {
    const path = '/api/v1/admin/configs/bypass-time-window';
    return enabled
      ? apiClient.post<never, BypassTimeWindowResult>(path)
      : apiClient.delete<never, BypassTimeWindowResult>(path);
  },

  /** GET /api/v1/admin/configs/demo-loosen-lobby-constraints */
  getDemoLoosenLobbyConstraints:
    async (): Promise<DemoLoosenLobbyConstraintsResult> => {
      return apiClient.get<never, DemoLoosenLobbyConstraintsResult>(
        '/api/v1/admin/configs/demo-loosen-lobby-constraints',
      );
    },

  /** POST/DELETE /api/v1/admin/configs/demo-loosen-lobby-constraints */
  setDemoLoosenLobbyConstraints: async (
    enabled: boolean,
  ): Promise<DemoLoosenLobbyConstraintsResult> => {
    const path = '/api/v1/admin/configs/demo-loosen-lobby-constraints';
    return enabled
      ? apiClient.post<never, DemoLoosenLobbyConstraintsResult>(path)
      : apiClient.delete<never, DemoLoosenLobbyConstraintsResult>(path);
  },

  /** POST /api/v1/admin/configs/invalidate-cache */
  invalidateCache: async (): Promise<void> => {
    await apiClient.post('/api/v1/admin/configs/invalidate-cache');
  },

  /** GET /api/v1/admin/configs */
  getConfigs: async (): Promise<MasterSettings> => {
    const raw = await apiClient.get<never, AdminConfigMap>('/api/v1/admin/configs');
    return configMapToMasterSettings(normalizeAdminConfigResponse(raw));
  },

  /** PUT /api/v1/admin/configs */
  updateConfigs: async (payload: MasterSettings): Promise<MasterSettings> => {
    const body = buildAdminConfigUpdatePayload(payload);
    const raw = await apiClient.put<never, AdminConfigMap | { configs?: AdminConfigMap }>(
      '/api/v1/admin/configs',
      body,
    );
    return configMapToMasterSettings(normalizeAdminConfigResponse(raw));
  },
};
