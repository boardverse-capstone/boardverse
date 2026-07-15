import type { MasterSettings } from '../types/master-settings.interface';
import { AdminConfigService } from '@/features/admin-config/services/admin-config.service';
import { MasterSettingsMockService } from './master-settings.mock';

const USE_MOCK = process.env.NEXT_PUBLIC_USE_MOCK_MASTER_SETTINGS !== 'false';

export const MASTER_SETTINGS_QUERY_KEY = 'master-settings';

export const MasterSettingsService = {
  getSettings: async (): Promise<MasterSettings> => {
    if (USE_MOCK) return MasterSettingsMockService.getSettings();
    return AdminConfigService.getConfigs();
  },

  updateSettings: async (payload: MasterSettings): Promise<MasterSettings> => {
    if (USE_MOCK) return MasterSettingsMockService.updateSettings(payload);
    return AdminConfigService.updateConfigs(payload);
  },
};
