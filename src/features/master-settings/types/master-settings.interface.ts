export interface EloFormulaSettings {
  strategyK: number;
  partyK: number;
  competitiveK: number;
  casualK: number;
}

export interface KarmaWeightSettings {
  noShowPenalty: number;
  lateCancelPenalty: number;
  kickedPenalty: number;
}

export interface MatchmakingSettings {
  searchRadiusKm: number;
  maxEloDifference: number;
}

export interface PlatformFeeSettings {
  commissionPercent: number;
}

export interface MasterSettings {
  elo: EloFormulaSettings;
  karma: KarmaWeightSettings;
  matchmaking: MatchmakingSettings;
  platformFee: PlatformFeeSettings;
  updatedAt?: string;
}
