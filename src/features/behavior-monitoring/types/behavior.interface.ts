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
