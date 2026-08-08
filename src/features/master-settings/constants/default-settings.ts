import type { MasterSettings } from '../types/master-settings.interface';

export const DEFAULT_MASTER_SETTINGS: MasterSettings = {
  elo: {
    kFactor: 32,
  },
  karma: {
    cancelPenalty: -3,
    noShowPenalty: -5,
  },
  matchmaking: {
    eloDiff: 200,
    radiusKm: 15,
  },
  platformFee: {
    commissionPercent: 15,
  },
};
