import type { MasterSettings } from '@/features/master-settings/types/master-settings.interface';
import { DEFAULT_MASTER_SETTINGS } from '@/features/master-settings/constants/default-settings';
import {
  buildAdminConfigUpdatePayload,
  configMapToMasterSettings,
  masterSettingsToConfigMap,
  type AdminConfigMap,
} from '../utils/config.mapper';

const delay = () => new Promise((resolve) => setTimeout(resolve, 350));

let mockConfigs: AdminConfigMap = masterSettingsToConfigMap(DEFAULT_MASTER_SETTINGS);

export const AdminConfigMockService = {
  getConfigs: async (): Promise<MasterSettings> => {
    await delay();
    return configMapToMasterSettings(mockConfigs);
  },

  updateConfigs: async (payload: MasterSettings): Promise<MasterSettings> => {
    await delay();
    const body = buildAdminConfigUpdatePayload(payload);
    mockConfigs = body.configs.reduce<AdminConfigMap>((acc, item) => {
      acc[item.configKey] = item.configValue;
      return acc;
    }, {});
    return configMapToMasterSettings(mockConfigs);
  },
};
