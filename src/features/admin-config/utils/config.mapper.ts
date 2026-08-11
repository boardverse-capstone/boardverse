import type { MasterSettings } from '@/features/master-settings/types/master-settings.interface';
import { ADMIN_CONFIG_KEYS } from '@/features/master-settings/types/master-settings.interface';
import { DEFAULT_MASTER_SETTINGS } from '@/features/master-settings/constants/default-settings';

export type AdminConfigMap = Record<string, string | number | boolean>;

export interface RawAdminConfigEntry {
  key?: string;
  Key?: string;
  configKey?: string;
  ConfigKey?: string;
  value?: string | number | boolean;
  Value?: string | number | boolean;
  configValue?: string | number | boolean;
  ConfigValue?: string | number | boolean;
}

export interface SystemConfigUpdateItem {
  configKey: string;
  configValue: string;
}

export interface SystemConfigBulkUpdateRequest {
  configs: SystemConfigUpdateItem[];
}

function pickString(...values: (string | null | undefined)[]): string {
  for (const value of values) {
    if (value != null && value !== '') return value;
  }
  return '';
}

function pickNumber(...values: (number | string | boolean | null | undefined)[]): number | undefined {
  for (const value of values) {
    if (value == null || value === '') continue;
    if (typeof value === 'boolean') continue;
    const parsed = typeof value === 'number' ? value : Number(value);
    if (!Number.isNaN(parsed)) return parsed;
  }
  return undefined;
}

function rateToPercent(rate: number): number {
  // API có thể trả 0.15 hoặc đã là 15 (lỡ lệch) — ưu tiên tỉ lệ 0–1.
  if (rate >= 0 && rate <= 1) return Number((rate * 100).toFixed(4));
  return rate;
}

function percentToRate(percent: number): number {
  return Number((percent / 100).toFixed(6));
}

export function normalizeAdminConfigResponse(
  raw:
    | AdminConfigMap
    | RawAdminConfigEntry[]
    | { configs?: AdminConfigMap | RawAdminConfigEntry[] }
    | MasterSettings
    | null
    | undefined,
): AdminConfigMap {
  if (!raw) return {};

  if (Array.isArray(raw)) {
    return raw.reduce<AdminConfigMap>((acc, entry) => {
      const key = pickString(entry.configKey, entry.ConfigKey, entry.key, entry.Key);
      const value = entry.configValue ?? entry.ConfigValue ?? entry.value ?? entry.Value;
      if (key && value != null) acc[key] = value;
      return acc;
    }, {});
  }

  if (
    typeof raw === 'object' &&
    'configs' in raw &&
    raw.configs &&
    (Array.isArray(raw.configs) || typeof raw.configs === 'object')
  ) {
    return normalizeAdminConfigResponse(
      raw.configs as AdminConfigMap | RawAdminConfigEntry[],
    );
  }

  if ('elo' in raw && typeof raw.elo === 'object') {
    return masterSettingsToConfigMap(raw as MasterSettings);
  }

  return Object.entries(raw as AdminConfigMap).reduce<AdminConfigMap>((acc, [key, value]) => {
    if (value != null) acc[key] = value;
    return acc;
  }, {});
}

export function masterSettingsToConfigMap(settings: MasterSettings): AdminConfigMap {
  return {
    [ADMIN_CONFIG_KEYS.ELO_K_FACTOR]: settings.elo.kFactor,
    [ADMIN_CONFIG_KEYS.KARMA_PENALTY_CANCEL]: settings.karma.cancelPenalty,
    [ADMIN_CONFIG_KEYS.KARMA_PENALTY_NOSHOW]: settings.karma.noShowPenalty,
    [ADMIN_CONFIG_KEYS.MATCHMAKING_ELO_DIFF]: settings.matchmaking.eloDiff,
    [ADMIN_CONFIG_KEYS.MATCHMAKING_RADIUS_KM]: settings.matchmaking.radiusKm,
    [ADMIN_CONFIG_KEYS.PLATFORM_COMMISSION_RATE]: percentToRate(
      settings.platformFee.commissionPercent,
    ),
  };
}

export function configMapToMasterSettings(map: AdminConfigMap): MasterSettings {
  const base = DEFAULT_MASTER_SETTINGS;
  const commissionRate =
    pickNumber(
      map[ADMIN_CONFIG_KEYS.PLATFORM_COMMISSION_RATE],
      map.platform_commission_rate,
    ) ?? percentToRate(base.platformFee.commissionPercent);

  return {
    elo: {
      kFactor:
        pickNumber(map[ADMIN_CONFIG_KEYS.ELO_K_FACTOR], map.elo_k_factor) ?? base.elo.kFactor,
    },
    karma: {
      cancelPenalty:
        pickNumber(map[ADMIN_CONFIG_KEYS.KARMA_PENALTY_CANCEL], map.karma_penalty_cancel) ??
        base.karma.cancelPenalty,
      noShowPenalty:
        pickNumber(map[ADMIN_CONFIG_KEYS.KARMA_PENALTY_NOSHOW], map.karma_penalty_noshow) ??
        base.karma.noShowPenalty,
    },
    matchmaking: {
      eloDiff:
        pickNumber(map[ADMIN_CONFIG_KEYS.MATCHMAKING_ELO_DIFF], map.matchmaking_elo_diff) ??
        base.matchmaking.eloDiff,
      radiusKm:
        pickNumber(map[ADMIN_CONFIG_KEYS.MATCHMAKING_RADIUS_KM], map.matchmaking_radius_km) ??
        base.matchmaking.radiusKm,
    },
    platformFee: {
      commissionPercent: rateToPercent(commissionRate),
    },
  };
}

/** PUT /api/v1/admin/configs body: { configs: [{ configKey, configValue }] } */
export function buildAdminConfigUpdatePayload(
  settings: MasterSettings,
): SystemConfigBulkUpdateRequest {
  const map = masterSettingsToConfigMap(settings);
  return {
    configs: Object.entries(map).map(([configKey, value]) => ({
      configKey,
      configValue: String(value),
    })),
  };
}
