import type { MasterSettings } from '../types/master-settings.interface';
import { DEFAULT_MASTER_SETTINGS } from '../constants/default-settings';

const delay = (ms = 350) => new Promise((resolve) => setTimeout(resolve, ms));

let settings: MasterSettings = structuredClone(DEFAULT_MASTER_SETTINGS);

export const MasterSettingsMockService = {
  getSettings: async (): Promise<MasterSettings> => {
    await delay();
    return structuredClone(settings);
  },

  updateSettings: async (payload: MasterSettings): Promise<MasterSettings> => {
    await delay(500);
    settings = structuredClone(payload);
    return structuredClone(settings);
  },
};
