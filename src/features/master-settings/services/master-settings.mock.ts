import type { MasterSettings } from '../types/master-settings.interface';
import { DEFAULT_MASTER_SETTINGS } from '../constants/default-settings';

const delay = (ms = 350) => new Promise((resolve) => setTimeout(resolve, ms));

let settings: MasterSettings = { ...DEFAULT_MASTER_SETTINGS, updatedAt: new Date().toISOString() };

export const MasterSettingsMockService = {
  getSettings: async (): Promise<MasterSettings> => {
    await delay();
    return settings;
  },

  updateSettings: async (payload: MasterSettings): Promise<MasterSettings> => {
    await delay(500);
    settings = { ...payload, updatedAt: new Date().toISOString() };
    return settings;
  },
};
