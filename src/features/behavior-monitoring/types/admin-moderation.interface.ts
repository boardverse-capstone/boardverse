export type AlertStatus = 'Open' | 'Acknowledged' | 'Resolved' | 'Dismissed';
export type AlertSeverity = 'Info' | 'Warning' | 'Critical';

export interface PageParams {
  pageNumber?: number;
  pageSize?: number;
}

export interface ActionHistoryParams extends PageParams {
  userId?: string;
  actionType?: string;
  fromUtc?: string;
  toUtc?: string;
}

export interface PlayerActionHistoryItem {
  id: string;
  userId: string;
  username: string;
  actionType: string;
  actionBy: string;
  actionByUsername: string;
  reason: string;
  metadata?: string | null;
  createdAt: string;
  expiresAt?: string | null;
}

export interface ActionHistoryPage {
  items: PlayerActionHistoryItem[];
  pageNumber: number;
  pageSize: number;
  totalCount: number;
}

export interface AlertParams extends PageParams {
  status?: AlertStatus;
  severity?: AlertSeverity;
  alertType?: string;
}

export interface PlayerAlert {
  id: string;
  userId: string;
  alertType: string;
  severity: AlertSeverity;
  signals?: Record<string, number> | string | null;
  riskScoreSnapshot: number;
  createdAt: string;
  acknowledgedBy?: string | null;
  acknowledgedAt?: string | null;
  status: AlertStatus;
  resolutionNote?: string | null;
}

export interface AlertPage {
  items: PlayerAlert[];
  pageNumber?: number;
  pageSize?: number;
  totalCount?: number;
}

export interface AlertMetrics {
  openCritical: number;
  openWarning: number;
  openInfo: number;
  acknowledgedAwaitingResolve: number;
  resolvedLast24h: number;
}

export interface CoolingOffParams {
  page?: number;
  pageSize?: number;
}

export interface CoolingOffUser {
  userId: string;
  username: string;
  karmaPoints: number;
  gamerTier: string;
  isCoolingOff: boolean;
  coolingOffExpiresAt: string;
  riskMultiplier: number;
  failedLobbyCount: number;
  coolingOffTriggerReason: string;
}

export interface CoolingOffPage {
  items: CoolingOffUser[];
  page: number;
  pageSize: number;
  totalCount: number;
  totalPages: number;
}

export interface ReleaseCoolingOffResponse {
  userId: string;
  username: string;
  isCoolingOff: boolean;
  coolingOffExpiresAt: string | null;
  riskMultiplier: number;
}

export interface ExtendCoolingOffRequest {
  additionalDays: number;
  reason: string;
}

export interface ExtendCoolingOffResponse extends ExtendCoolingOffRequest {
  userId: string;
  previousExpiresAt: string;
  newExpiresAt: string;
  extendedBy: string;
  extendedAt: string;
}

export interface PlayerRisk {
  userId: string;
  username: string;
  riskScore: number;
  riskLevel: string;
  riskMultiplier: number;
  accountStatus: string;
  isCoolingOff: boolean;
  coolingOffExpiresAt?: string | null;
  signals: Record<string, number>;
  actionHistoryCount: number;
  lastUpdated: string;
}

export interface RiskHistoryParams {
  fromUtc?: string;
  toUtc?: string;
}

export interface RiskHistoryItem {
  riskScore: number;
  riskLevel: string;
  snapshotDate: string;
  signals?: Record<string, number> | string | null;
  createdAt: string;
}
