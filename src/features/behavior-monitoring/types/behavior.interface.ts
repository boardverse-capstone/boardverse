import type { PaginationParams } from '@/shared/types/pagination.interface';
import type { PenaltyType } from '@/core/constants/behavior-monitoring';

export interface KarmaLogEntry {
  id: string;
  userId: string;
  displayName: string;
  currentKarma: number;
  behaviorType: string;
  delta: number;
  recordedAt: string;
}

/** Bản ghi thô từ GET /api/UserManagement/karma-logs */
export interface RawKarmaLogRecord {
  id?: string;
  Id?: string;
  logId?: string;
  LogId?: string;
  userId?: string;
  UserId?: string;
  displayName?: string;
  DisplayName?: string;
  username?: string;
  Username?: string;
  gamerTag?: string;
  GamerTag?: string;
  currentKarma?: number;
  CurrentKarma?: number;
  karmaPoints?: number;
  KarmaPoints?: number;
  karmaAfter?: number;
  KarmaAfter?: number;
  newKarma?: number;
  NewKarma?: number;
  balanceAfter?: number;
  BalanceAfter?: number;
  behaviorType?: string;
  BehaviorType?: string;
  type?: string;
  Type?: string;
  delta?: number;
  Delta?: number;
  karmaDelta?: number;
  KarmaDelta?: number;
  pointsChange?: number;
  PointsChange?: number;
  recordedAt?: string;
  RecordedAt?: string;
  createdAt?: string;
  CreatedAt?: string;
  timestamp?: string;
  Timestamp?: string;
}

export interface KarmaLogParams extends PaginationParams {
  behaviorType?: string;
}

export interface LowKarmaUser {
  id: string;
  username: string;
  email: string;
  karmaPoints: number;
  role: string;
  isBlocked: boolean;
}

export interface ProcessViolationRequest {
  userId: string;
  penaltyType: PenaltyType;
  blockDays?: number;
  reason: string;
}

export interface AdjustKarmaRequest {
  userId: string;
  delta: number;
  reason: string;
  currentKarma: number;
}
