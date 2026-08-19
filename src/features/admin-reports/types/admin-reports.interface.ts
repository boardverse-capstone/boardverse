import type { PaginationMeta } from '@/shared/types/pagination.interface';

export type LobbyFailureType =
  | 'TimeoutFailed'
  | 'HostCancelled'
  | 'RejectedByCafe'
  | 'ExpiredByCafe';

export type DepositReportStatus = 'Pending' | 'Paid' | 'Refunded' | 'Forfeited';

export type CafePerformanceSortBy = 'revenue' | 'sessions' | 'rating';
export type SortOrder = 'asc' | 'desc';

export interface RecentActivityItem {
  type: string;
  timestamp: string;
  details: string;
}

export interface AdminReportsOverview {
  totalUsers: number;
  activeUsers: number;
  totalCafes: number;
  activeCafes: number;
  totalTournaments: number;
  activeTournaments: number;
  draftTournaments: number;
  registrationOpenTournaments: number;
  totalLobbies: number;
  activeLobbies: number;
  failedLobbies: number;
  totalBookings: number;
  pendingBookings: number;
  confirmedBookings: number;
  checkedInBookings: number;
  completedBookings: number;
  totalDeposits: number;
  pendingDeposits: number;
  totalDepositsAmountVnd: number;
  totalRevenue: number;
  totalLobbyFailures: number;
  timeoutFailures: number;
  hostCancelledFailures: number;
  rejectedByCafeFailures: number;
  expiredByCafeFailures: number;
  recentActivity: RecentActivityItem[];
}

export interface DateRangeParams {
  fromUtc?: string;
  toUtc?: string;
}

export interface ReportListParams extends DateRangeParams {
  page: number;
  pageSize: number;
}

export interface LobbyFailuresParams extends ReportListParams {
  failureType?: LobbyFailureType | 'all';
}

export interface DepositsReportParams extends ReportListParams {
  status?: DepositReportStatus | 'all';
}

export interface CafePerformanceParams extends ReportListParams {
  sortBy?: CafePerformanceSortBy;
  sortOrder?: SortOrder;
}

export interface LobbyFailuresSummary {
  totalFailures: number;
  timeoutFailures: number;
  hostCancelled: number;
  rejectedByCafe: number;
  expiredByCafe: number;
  totalBvcForfeited: number;
  totalBvcRefunded: number;
}

export interface LobbyFailureItem {
  lobbyId: string;
  lobbyName: string;
  cafeId: string;
  cafeName: string;
  hostId: string;
  hostUsername: string;
  failureType: LobbyFailureType | string;
  playDate: string;
  timeSlot: string;
  maxPlayers: number;
  currentPlayers: number;
  minPlayers: number;
  depositAmount: number;
  failureReason: string | null;
  createdAt: string;
  failedAt: string;
}

export interface DepositsReportSummary {
  totalDeposits: number;
  pendingDeposits: number;
  paidDeposits: number;
  refundedDeposits: number;
  forfeitedDeposits: number;
  totalAmountPending: number;
  totalAmountPaid: number;
  totalAmountRefunded: number;
  totalAmountForfeited: number;
}

export interface DepositReportItem {
  depositId: string;
  bookingId: string;
  lobbyId: string;
  userId: string;
  username: string;
  cafeId: string;
  cafeName: string;
  amountBvc: number;
  amountVnd: number;
  status: DepositReportStatus | string;
  createdAt: string;
  paidAt: string | null;
  refundedAt: string | null;
  forfeitedAt: string | null;
}

export interface CafePerformanceSummary {
  totalCafes: number;
  activeCafes: number;
  totalRevenue: number;
  totalSessions: number;
  averageSessionRevenue: number;
  averageRating: number;
}

export interface CafePerformanceItem {
  cafeId: string;
  cafeName: string;
  address: string;
  managerName: string;
  operationalStatus: string;
  totalRevenue: number;
  totalSessions: number;
  totalMembers: number;
  averageSessionDuration: number;
  averageRating: number;
  totalReviews: number;
  activeLobbies: number;
  lobbySuccessRate: number;
  periodStart: string;
  periodEnd: string;
}

export interface ReportListResult<TSummary, TItem> {
  summary: TSummary;
  data: TItem[];
  meta: PaginationMeta;
}

export type LobbyFailuresResult = ReportListResult<LobbyFailuresSummary, LobbyFailureItem>;
export type DepositsReportResult = ReportListResult<DepositsReportSummary, DepositReportItem>;
export type CafePerformanceResult = ReportListResult<CafePerformanceSummary, CafePerformanceItem>;

export interface RawReportListResponse<TSummary, TItem> {
  summary?: TSummary;
  items?: TItem[];
  page?: number;
  pageSize?: number;
  totalCount?: number;
  totalPages?: number;
}
