import apiClient from '@/core/api/client';
import type { MasterSettings } from '../types/master-settings.interface';
import { DEFAULT_MASTER_SETTINGS } from '../constants/default-settings';
import { MasterSettingsMockService } from './master-settings.mock';

const USE_MOCK = process.env.NEXT_PUBLIC_USE_MOCK_MASTER_SETTINGS !== 'false';

export const MASTER_SETTINGS_QUERY_KEY = 'master-settings';

export const MasterSettingsService = {
  getSettings: async (): Promise<MasterSettings> => {
    if (USE_MOCK) return MasterSettingsMockService.getSettings();

    try {
      const raw = await apiClient.get<never, MasterSettings>('/api/MasterSettings');
      return raw ?? DEFAULT_MASTER_SETTINGS;
    } catch {
      return MasterSettingsMockService.getSettings();
    }
  },

  updateSettings: async (payload: MasterSettings): Promise<MasterSettings> => {
    if (USE_MOCK) return MasterSettingsMockService.updateSettings(payload);

    try {
      return await apiClient.put<never, MasterSettings>('/api/MasterSettings', payload);
    } catch {
      return MasterSettingsMockService.updateSettings(payload);
    }
  },
};
