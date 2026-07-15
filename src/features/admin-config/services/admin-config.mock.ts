import type { MasterSettings } from '@/features/master-settings/types/master-settings.interface';
import { DEFAULT_MASTER_SETTINGS } from '@/features/master-settings/constants/default-settings';
import { MasterSettingsMockService } from '@/features/master-settings/services/master-settings.mock';
import {
  buildAdminConfigUpdatePayload,
  configMapToMasterSettings,
  normalizeAdminConfigResponse,
} from '../utils/config.mapper';

const delay = () => new Promise((resolve) => setTimeout(resolve, 350));

let mockConfigs = buildAdminConfigUpdatePayload(DEFAULT_MASTER_SETTINGS);

export const AdminConfigMockService = {
  getConfigs: async (): Promise<MasterSettings> => {
    await delay();
    return configMapToMasterSettings(mockConfigs);
  },

  updateConfigs: async (payload: MasterSettings): Promise<MasterSettings> => {
    await delay();
    mockConfigs = buildAdminConfigUpdatePayload(payload);
    return configMapToMasterSettings(mockConfigs);
  },
};
