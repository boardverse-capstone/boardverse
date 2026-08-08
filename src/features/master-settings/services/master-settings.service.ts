import type { MasterSettings } from '../types/master-settings.interface';
import { AdminConfigService } from '@/features/admin-config/services/admin-config.service';

export const MASTER_SETTINGS_QUERY_KEY = 'master-settings';

export const MasterSettingsService = {
  /** GET /api/v1/admin/configs */
  getSettings: async (): Promise<MasterSettings> => {
    return AdminConfigService.getConfigs();
  },

  /** PUT /api/v1/admin/configs */
  updateSettings: async (payload: MasterSettings): Promise<MasterSettings> => {
    return AdminConfigService.updateConfigs(payload);
  },
};
