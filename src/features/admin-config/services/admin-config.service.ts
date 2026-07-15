import apiClient from '@/core/api/client';
import type { MasterSettings } from '@/features/master-settings/types/master-settings.interface';
import { DEFAULT_MASTER_SETTINGS } from '@/features/master-settings/constants/default-settings';
import { MasterSettingsMockService } from '@/features/master-settings/services/master-settings.mock';
import {
  buildAdminConfigUpdatePayload,
  configMapToMasterSettings,
  normalizeAdminConfigResponse,
  type AdminConfigMap,
} from '../utils/config.mapper';
import { AdminConfigMockService } from './admin-config.mock';

const USE_MOCK = process.env.NEXT_PUBLIC_USE_MOCK_ADMIN_CONFIG_API === 'true';

export const ADMIN_CONFIG_QUERY_KEY = 'admin-configs';

export const AdminConfigService = {
  /** GET /api/v1/admin/configs */
  getConfigs: async (): Promise<MasterSettings> => {
    if (USE_MOCK) return AdminConfigMockService.getConfigs();

    try {
      const raw = await apiClient.get<never, AdminConfigMap | MasterSettings>(
        '/api/v1/admin/configs',
      );
      const map = normalizeAdminConfigResponse(raw);
      if (Object.keys(map).length === 0 && raw && 'elo' in raw) {
        return raw as MasterSettings;
      }
      return configMapToMasterSettings(map);
    } catch {
      try {
        const legacy = await apiClient.get<never, MasterSettings>('/api/MasterSettings');
        return legacy ?? DEFAULT_MASTER_SETTINGS;
      } catch {
        return MasterSettingsMockService.getSettings();
      }
    }
  },

  /** PUT /api/v1/admin/configs */
  updateConfigs: async (payload: MasterSettings): Promise<MasterSettings> => {
    if (USE_MOCK) return AdminConfigMockService.updateConfigs(payload);

    const body = buildAdminConfigUpdatePayload(payload);

    try {
      const raw = await apiClient.put<never, AdminConfigMap | MasterSettings>(
        '/api/v1/admin/configs',
        body,
      );
      const map = normalizeAdminConfigResponse(raw);
      if (Object.keys(map).length === 0 && raw && 'elo' in raw) {
        return raw as MasterSettings;
      }
      return configMapToMasterSettings(map);
    } catch {
      try {
        return await apiClient.put<never, MasterSettings>('/api/MasterSettings', payload);
      } catch {
        return MasterSettingsMockService.updateSettings(payload);
      }
    }
  },
};
