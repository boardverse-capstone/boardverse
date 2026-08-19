import type { PaginationParams } from '@/shared/types/pagination.interface';
import type { PenaltyType } from '@/core/constants/behavior-monitoring';

export type ViolationCategory =
  | 'CrossRating'
  | 'NoShow'
  | 'LateDepositCancel'
  | 'KickedFromLobby'
  | 'AdminManual'
  | 'AdminWarning';

export type PunishActionType = 'Warning' | 'Suspend' | 'Ban';

export interface KarmaLogEntry {
  id: string;
  userId: string;
  displayName: string;
  currentKarma: number;
  behaviorType: string;
  delta: number;
  recordedAt: string;
  reason?: string;
  source?: string;
  karmaBefore?: number;
  performedByUserId?: string;
  isAdminAdjustment?: boolean;
}

/** Bản ghi thô từ GET /api/v1/admin/karma-logs */
export interface RawKarmaLogRecord {
  id?: string;
  Id?: string;
  logId?: string;
  LogId?: string;
  userId?: string;
  UserId?: string;
  username?: string;
  Username?: string;
  displayName?: string;
  DisplayName?: string;
  gamerTag?: string;
  GamerTag?: string;
  violationCategory?: string;
  ViolationCategory?: string;
  source?: string;
  Source?: string;
  karmaPointsChange?: number;
  KarmaPointsChange?: number;
  /** @deprecated field cũ — vẫn map nếu BE trả */
  deltaAmount?: number;
  DeltaAmount?: number;
  delta?: number;
  Delta?: number;
  karmaDelta?: number;
  KarmaDelta?: number;
  pointsChange?: number;
  PointsChange?: number;
  karmaBefore?: number;
  KarmaBefore?: number;
  karmaAfter?: number;
  KarmaAfter?: number;
  currentKarma?: number;
  CurrentKarma?: number;
  karmaPoints?: number;
  KarmaPoints?: number;
  newKarma?: number;
  NewKarma?: number;
  balanceAfter?: number;
  BalanceAfter?: number;
  reason?: string;
  Reason?: string;
  relatedLobbyId?: string | null;
  RelatedLobbyId?: string | null;
  performedByUserId?: string;
  PerformedByUserId?: string;
  /** @deprecated field cũ */
  actorUserId?: string;
  ActorUserId?: string;
  isAdminAdjustment?: boolean;
  IsAdminAdjustment?: boolean;
  behaviorType?: string;
  BehaviorType?: string;
  type?: string;
  Type?: string;
  recordedAt?: string;
  RecordedAt?: string;
  createdAt?: string;
  CreatedAt?: string;
  timestamp?: string;
  Timestamp?: string;
}

export interface KarmaLogParams extends PaginationParams {
  /** Map sang `violationCategory` trên API */
  behaviorType?: string;
  userId?: string;
  fromUtc?: string;
  toUtc?: string;
}

export interface RawUserAlertRecord {
  id?: string;
  Id?: string;
  userId?: string;
  UserId?: string;
  username?: string;
  Username?: string;
  email?: string;
  Email?: string;
  karmaPoints?: number;
  KarmaPoints?: number;
  gamerTier?: string;
  GamerTier?: string;
  role?: string;
  Role?: string;
  isBlocked?: boolean;
  IsBlocked?: boolean;
  accountStatus?: string;
  AccountStatus?: string;
}

export interface LowKarmaUser {
  id: string;
  username: string;
  email: string;
  karmaPoints: number;
  role: string;
  isBlocked: boolean;
  gamerTier?: string;
}

export interface ProcessViolationRequest {
  userId: string;
  penaltyType: PenaltyType;
  blockDays?: number;
  reason: string;
}

export interface PunishUserRequest {
  actionType: PunishActionType;
  durationDays?: number;
  reason: string;
}

export interface PunishUserResponse {
  userId: string;
  actionType: PunishActionType;
  accountStatus?: string;
  lockoutEndDate?: string | null;
  reason: string;
}

export interface AdjustKarmaRequest {
  userId: string;
  delta: number;
  reason: string;
  currentKarma: number;
}

export interface AdjustKarmaResponse {
  userId?: string;
  karmaPoints: number;
  gamerTier?: string;
  logId?: string;
}
