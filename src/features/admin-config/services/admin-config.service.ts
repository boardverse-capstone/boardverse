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

export const AdminConfigService = {
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
