import type { MasterSettings } from '@/features/master-settings/types/master-settings.interface';
import { DEFAULT_MASTER_SETTINGS } from '@/features/master-settings/constants/default-settings';

export type AdminConfigMap = Record<string, string | number | boolean>;

export interface RawAdminConfigEntry {
  key?: string;
  Key?: string;
  value?: string | number | boolean;
  Value?: string | number | boolean;
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

export function normalizeAdminConfigResponse(
  raw: AdminConfigMap | RawAdminConfigEntry[] | { configs?: AdminConfigMap } | MasterSettings | null | undefined,
): AdminConfigMap {
  if (!raw) return {};

  if (Array.isArray(raw)) {
    return raw.reduce<AdminConfigMap>((acc, entry) => {
      const key = pickString(entry.key, entry.Key);
      const value = entry.value ?? entry.Value;
      if (key && value != null) acc[key] = value;
      return acc;
    }, {});
  }

  if ('configs' in raw && raw.configs && typeof raw.configs === 'object') {
    return normalizeAdminConfigResponse(raw.configs);
  }

  if ('elo' in raw || 'karma' in raw) {
    return masterSettingsToConfigMap(raw as MasterSettings);
  }

  return Object.entries(raw as AdminConfigMap).reduce<AdminConfigMap>((acc, [key, value]) => {
    if (value != null) acc[key] = value;
    return acc;
  }, {});
}

export function masterSettingsToConfigMap(settings: MasterSettings): AdminConfigMap {
  return {
    'elo.strategyK': settings.elo.strategyK,
    'elo.partyK': settings.elo.partyK,
    'elo.competitiveK': settings.elo.competitiveK,
    'elo.casualK': settings.elo.casualK,
    'karma.noShowPenalty': settings.karma.noShowPenalty,
    'karma.lateCancelPenalty': settings.karma.lateCancelPenalty,
    'karma.kickedPenalty': settings.karma.kickedPenalty,
    'matchmaking.searchRadiusKm': settings.matchmaking.searchRadiusKm,
    'matchmaking.maxEloDifference': settings.matchmaking.maxEloDifference,
    'platformFee.commissionPercent': settings.platformFee.commissionPercent,
    updatedAt: settings.updatedAt ?? new Date().toISOString(),
  };
}

export function configMapToMasterSettings(map: AdminConfigMap): MasterSettings {
  const base = DEFAULT_MASTER_SETTINGS;
  return {
    elo: {
      strategyK: pickNumber(map['elo.strategyK'], map['Elo.StrategyK']) ?? base.elo.strategyK,
      partyK: pickNumber(map['elo.partyK'], map['Elo.PartyK']) ?? base.elo.partyK,
      competitiveK:
        pickNumber(map['elo.competitiveK'], map['Elo.CompetitiveK']) ?? base.elo.competitiveK,
      casualK: pickNumber(map['elo.casualK'], map['Elo.CasualK']) ?? base.elo.casualK,
    },
    karma: {
      noShowPenalty:
        pickNumber(map['karma.noShowPenalty'], map['Karma.NoShowPenalty']) ??
        base.karma.noShowPenalty,
      lateCancelPenalty:
        pickNumber(map['karma.lateCancelPenalty'], map['Karma.LateCancelPenalty']) ??
        base.karma.lateCancelPenalty,
      kickedPenalty:
        pickNumber(map['karma.kickedPenalty'], map['Karma.KickedPenalty']) ??
        base.karma.kickedPenalty,
    },
    matchmaking: {
      searchRadiusKm:
        pickNumber(map['matchmaking.searchRadiusKm'], map['Matchmaking.SearchRadiusKm']) ??
        base.matchmaking.searchRadiusKm,
      maxEloDifference:
        pickNumber(map['matchmaking.maxEloDifference'], map['Matchmaking.MaxEloDifference']) ??
        base.matchmaking.maxEloDifference,
    },
    platformFee: {
      commissionPercent:
        pickNumber(map['platformFee.commissionPercent'], map['PlatformFee.CommissionPercent']) ??
        base.platformFee.commissionPercent,
    },
    updatedAt: pickString(String(map.updatedAt ?? '')) || new Date().toISOString(),
  };
}

export function buildAdminConfigUpdatePayload(settings: MasterSettings): AdminConfigMap {
  return masterSettingsToConfigMap(settings);
}
