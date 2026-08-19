export interface EloFormulaSettings {
  /** API: elo_k_factor */
  kFactor: number;
}

export interface KarmaWeightSettings {
  /** API: karma_penalty_cancel (thường âm) */
  cancelPenalty: number;
  /** API: karma_penalty_noshow (thường âm) */
  noShowPenalty: number;
}

export interface MatchmakingSettings {
  /** API: matchmaking_elo_diff */
  eloDiff: number;
  /** API: matchmaking_radius_km */
  radiusKm: number;
}

export interface PlatformFeeSettings {
  /**
   * Hiển thị trên UI dạng % (0–100).
   * API lưu `platform_commission_rate` dạng tỉ lệ (vd. 0.15).
   */
  commissionPercent: number;
}

export interface MasterSettings {
  elo: EloFormulaSettings;
  karma: KarmaWeightSettings;
  matchmaking: MatchmakingSettings;
  platformFee: PlatformFeeSettings;
  updatedAt?: string;
}

/** Key đúng theo GET/PUT /api/v1/admin/configs */
export const ADMIN_CONFIG_KEYS = {
  ELO_K_FACTOR: 'elo_k_factor',
  KARMA_PENALTY_CANCEL: 'karma_penalty_cancel',
  KARMA_PENALTY_NOSHOW: 'karma_penalty_noshow',
  MATCHMAKING_ELO_DIFF: 'matchmaking_elo_diff',
  MATCHMAKING_RADIUS_KM: 'matchmaking_radius_km',
  PLATFORM_COMMISSION_RATE: 'platform_commission_rate',
} as const;

export type AdminConfigKey = (typeof ADMIN_CONFIG_KEYS)[keyof typeof ADMIN_CONFIG_KEYS];
