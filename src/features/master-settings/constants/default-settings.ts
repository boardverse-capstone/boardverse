import type { MasterSettings } from '../types/master-settings.interface';

export const DEFAULT_MASTER_SETTINGS: MasterSettings = {
  elo: {
    strategyK: 32,
    partyK: 28,
    competitiveK: 40,
    casualK: 24,
  },
  karma: {
    noShowPenalty: 15,
    lateCancelPenalty: 8,
    kickedPenalty: 12,
  },
  matchmaking: {
    searchRadiusKm: 10,
    maxEloDifference: 200,
  },
  platformFee: {
    commissionPercent: 12,
  },
};
