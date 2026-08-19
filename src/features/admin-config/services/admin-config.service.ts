import apiClient from '@/core/api/client';
import type { MasterSettings } from '@/features/master-settings/types/master-settings.interface';
import {
  buildAdminConfigUpdatePayload,
  configMapToMasterSettings,
  normalizeAdminConfigResponse,
  type AdminConfigMap,
} from '../utils/config.mapper';
import { AdminConfigMockService } from './admin-config.mock';

const USE_MOCK = process.env.NEXT_PUBLIC_USE_MOCK_ADMIN_CONFIG_API === 'true';

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

  /** GET /api/v1/admin/configs */
  getConfigs: async (): Promise<MasterSettings> => {
    if (USE_MOCK) return AdminConfigMockService.getConfigs();

    const raw = await apiClient.get<never, AdminConfigMap>('/api/v1/admin/configs');
    return configMapToMasterSettings(normalizeAdminConfigResponse(raw));
  },

  /** PUT /api/v1/admin/configs */
  updateConfigs: async (payload: MasterSettings): Promise<MasterSettings> => {
    if (USE_MOCK) return AdminConfigMockService.updateConfigs(payload);

    const body = buildAdminConfigUpdatePayload(payload);
    const raw = await apiClient.put<never, AdminConfigMap | { configs?: AdminConfigMap }>(
      '/api/v1/admin/configs',
      body,
    );
    return configMapToMasterSettings(normalizeAdminConfigResponse(raw));
  },
};
