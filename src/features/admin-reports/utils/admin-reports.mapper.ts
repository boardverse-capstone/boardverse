import type { PaginationMeta } from '@/shared/types/pagination.interface';
import type {
  AdminReportsOverview,
  CafePerformanceItem,
  CafePerformanceResult,
  CafePerformanceSummary,
  DepositReportItem,
  DepositsReportResult,
  DepositsReportSummary,
  LobbyFailureItem,
  LobbyFailuresResult,
  LobbyFailuresSummary,
  RecentActivityItem,
} from '../types/admin-reports.interface';

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null;
}

function pickNumber(...values: unknown[]): number {
  for (const value of values) {
    if (typeof value === 'number' && !Number.isNaN(value)) return value;
  }
  return 0;
}

function pickString(...values: unknown[]): string {
  for (const value of values) {
    if (typeof value === 'string' && value.trim()) return value.trim();
  }
  return '';
}

function pickNullableString(...values: unknown[]): string | null {
  const value = pickString(...values);
  return value || null;
}

function toMeta(page: number, pageSize: number, totalCount: number, totalPages: number): PaginationMeta {
  const safeTotalPages = totalCount === 0 ? 1 : Math.max(1, totalPages || Math.ceil(totalCount / Math.max(pageSize, 1)));
  return {
    currentPage: page,
    limit: pageSize,
    totalItems: totalCount,
    totalPages: safeTotalPages,
    hasPrevious: page > 1,
    hasNext: page < safeTotalPages,
  };
}

function extractItems(raw: Record<string, unknown>): unknown[] {
  if (Array.isArray(raw.items)) return raw.items;
  if (Array.isArray(raw.cafes)) return raw.cafes;
  if (Array.isArray(raw.data)) return raw.data;
  return [];
}

export function mapAdminReportsOverview(raw: unknown): AdminReportsOverview {
  const source = isRecord(raw) ? raw : {};
  const recent = Array.isArray(source.recentActivity)
    ? (source.recentActivity as RecentActivityItem[])
    : [];

  return {
    totalUsers: pickNumber(source.totalUsers),
    activeUsers: pickNumber(source.activeUsers),
    totalCafes: pickNumber(source.totalCafes),
    activeCafes: pickNumber(source.activeCafes),
    totalTournaments: pickNumber(source.totalTournaments),
    activeTournaments: pickNumber(source.activeTournaments),
    draftTournaments: pickNumber(source.draftTournaments),
    registrationOpenTournaments: pickNumber(source.registrationOpenTournaments),
    totalLobbies: pickNumber(source.totalLobbies),
    activeLobbies: pickNumber(source.activeLobbies),
    failedLobbies: pickNumber(source.failedLobbies),
    totalBookings: pickNumber(source.totalBookings),
    pendingBookings: pickNumber(source.pendingBookings),
    confirmedBookings: pickNumber(source.confirmedBookings),
    checkedInBookings: pickNumber(source.checkedInBookings),
    completedBookings: pickNumber(source.completedBookings),
    totalDeposits: pickNumber(source.totalDeposits),
    pendingDeposits: pickNumber(source.pendingDeposits),
    totalDepositsAmountVnd: pickNumber(source.totalDepositsAmountVnd),
    totalRevenue: pickNumber(source.totalRevenue, source.totalRevenueVnd),
    totalLobbyFailures: pickNumber(source.totalLobbyFailures),
    timeoutFailures: pickNumber(source.timeoutFailures),
    hostCancelledFailures: pickNumber(source.hostCancelledFailures),
    rejectedByCafeFailures: pickNumber(source.rejectedByCafeFailures),
    expiredByCafeFailures: pickNumber(source.expiredByCafeFailures),
    recentActivity: recent,
  };
}

export function mapLobbyFailureItem(raw: unknown): LobbyFailureItem {
  const source = isRecord(raw) ? raw : {};
  return {
    lobbyId: pickString(source.lobbyId, source.id),
    lobbyName: pickString(source.lobbyName, source.title) || '—',
    cafeId: pickString(source.cafeId),
    cafeName: pickString(source.cafeName, source.gameTemplateName) || '—',
    hostId: pickString(source.hostId),
    hostUsername: pickString(source.hostUsername) || '—',
    failureType: pickString(source.failureType, source.status) || '—',
    playDate: pickString(source.playDate),
    timeSlot: pickString(source.timeSlot),
    maxPlayers: pickNumber(source.maxPlayers),
    currentPlayers: pickNumber(source.currentPlayers, source.memberCount),
    minPlayers: pickNumber(source.minPlayers),
    depositAmount: pickNumber(source.depositAmount),
    failureReason: pickNullableString(source.failureReason),
    createdAt: pickString(source.createdAt),
    failedAt: pickString(source.failedAt, source.closedAt),
  };
}

export function normalizeLobbyFailuresResponse(
  raw: unknown,
  fallbackPage: number,
  fallbackPageSize: number,
): LobbyFailuresResult {
  const source = isRecord(raw) ? raw : {};
  const items = extractItems(source).map(mapLobbyFailureItem);
  const summary: LobbyFailuresSummary = {
    totalFailures: pickNumber(source.summary && isRecord(source.summary) ? source.summary.totalFailures : undefined, source.totalCount, items.length),
    timeoutFailures: pickNumber(
      isRecord(source.summary) ? source.summary.timeoutFailures : undefined,
      source.timeoutCount,
      source.timeoutFailures,
    ),
    hostCancelled: pickNumber(
      isRecord(source.summary) ? source.summary.hostCancelled : undefined,
      source.hostCancelledCount,
      source.hostCancelled,
    ),
    rejectedByCafe: pickNumber(
      isRecord(source.summary) ? source.summary.rejectedByCafe : undefined,
      source.rejectedByCafeCount,
      source.rejectedByCafe,
    ),
    expiredByCafe: pickNumber(
      isRecord(source.summary) ? source.summary.expiredByCafe : undefined,
      source.expiredByCafeCount,
      source.expiredByCafe,
    ),
    totalBvcForfeited: pickNumber(
      isRecord(source.summary) ? source.summary.totalBvcForfeited : undefined,
      source.totalBvcForfeited,
    ),
    totalBvcRefunded: pickNumber(
      isRecord(source.summary) ? source.summary.totalBvcRefunded : undefined,
      source.totalBvcRefunded,
    ),
  };

  const page = pickNumber(source.page, fallbackPage) || fallbackPage;
  const pageSize = pickNumber(source.pageSize, fallbackPageSize) || fallbackPageSize;
  const totalCount = pickNumber(source.totalCount, items.length);
  const totalPages = pickNumber(source.totalPages, Math.ceil(totalCount / Math.max(pageSize, 1)));

  return { summary, data: items, meta: toMeta(page, pageSize, totalCount, totalPages) };
}

export function mapDepositReportItem(raw: unknown): DepositReportItem {
  const source = isRecord(raw) ? raw : {};
  return {
    depositId: pickString(source.depositId, source.id),
    bookingId: pickString(source.bookingId),
    lobbyId: pickString(source.lobbyId),
    userId: pickString(source.userId),
    username: pickString(source.username) || '—',
    cafeId: pickString(source.cafeId),
    cafeName: pickString(source.cafeName) || '—',
    amountBvc: pickNumber(source.amountBvc),
    amountVnd: pickNumber(source.amountVnd, source.amount),
    status: pickString(source.status) || '—',
    createdAt: pickString(source.createdAt),
    paidAt: pickNullableString(source.paidAt),
    refundedAt: pickNullableString(source.refundedAt),
    forfeitedAt: pickNullableString(source.forfeitedAt),
  };
}

export function normalizeDepositsReportResponse(
  raw: unknown,
  fallbackPage: number,
  fallbackPageSize: number,
): DepositsReportResult {
  const source = isRecord(raw) ? raw : {};
  const items = extractItems(source).map(mapDepositReportItem);
  const summary: DepositsReportSummary = {
    totalDeposits: pickNumber(
      isRecord(source.summary) ? source.summary.totalDeposits : undefined,
      source.totalDeposits,
      source.totalCount,
    ),
    pendingDeposits: pickNumber(
      isRecord(source.summary) ? source.summary.pendingDeposits : undefined,
      source.pendingDeposits,
      source.totalPending,
    ),
    paidDeposits: pickNumber(
      isRecord(source.summary) ? source.summary.paidDeposits : undefined,
      source.paidDeposits,
      source.totalPaid,
    ),
    refundedDeposits: pickNumber(
      isRecord(source.summary) ? source.summary.refundedDeposits : undefined,
      source.refundedDeposits,
      source.totalRefunded,
    ),
    forfeitedDeposits: pickNumber(
      isRecord(source.summary) ? source.summary.forfeitedDeposits : undefined,
      source.forfeitedDeposits,
      source.totalForfeited,
    ),
    totalAmountPending: pickNumber(
      isRecord(source.summary) ? source.summary.totalAmountPending : undefined,
      source.totalAmountPending,
      source.totalPendingAmount,
      source.pendingAmountVnd,
    ),
    totalAmountPaid: pickNumber(
      isRecord(source.summary) ? source.summary.totalAmountPaid : undefined,
      source.totalAmountPaid,
      source.totalPaidAmount,
      source.paidAmountVnd,
    ),
    totalAmountRefunded: pickNumber(
      isRecord(source.summary) ? source.summary.totalAmountRefunded : undefined,
      source.totalAmountRefunded,
      source.totalRefundedAmount,
      source.refundedAmountVnd,
    ),
    totalAmountForfeited: pickNumber(
      isRecord(source.summary) ? source.summary.totalAmountForfeited : undefined,
      source.totalAmountForfeited,
      source.totalForfeitedAmount,
      source.forfeitedAmountVnd,
    ),
  };

  const page = pickNumber(source.page, fallbackPage) || fallbackPage;
  const pageSize = pickNumber(source.pageSize, fallbackPageSize) || fallbackPageSize;
  const totalCount = pickNumber(source.totalCount, items.length);
  const totalPages = pickNumber(source.totalPages, Math.ceil(totalCount / Math.max(pageSize, 1)));

  return { summary, data: items, meta: toMeta(page, pageSize, totalCount, totalPages) };
}

export function mapCafePerformanceItem(raw: unknown): CafePerformanceItem {
  const source = isRecord(raw) ? raw : {};
  return {
    cafeId: pickString(source.cafeId, source.id),
    cafeName: pickString(source.cafeName, source.name) || '—',
    address: pickString(source.address) || '—',
    managerName: pickString(source.managerName) || '—',
    operationalStatus:
      pickString(source.operationalStatus, source.status) ||
      (source.activeCafe === true ? 'ACTIVE' : source.activeCafe === false ? 'INACTIVE' : '—'),
    totalRevenue: pickNumber(source.totalRevenue, source.totalRevenueVnd),
    totalSessions: pickNumber(source.totalSessions, source.totalBookings, source.completedBookings),
    totalMembers: pickNumber(source.totalMembers),
    averageSessionDuration: pickNumber(source.averageSessionDuration),
    averageRating: pickNumber(source.averageRating),
    totalReviews: pickNumber(source.totalReviews, source.failedLobbies),
    activeLobbies: pickNumber(source.activeLobbies, source.totalLobbies),
    lobbySuccessRate: pickNumber(source.lobbySuccessRate, source.completionRate),
    periodStart: pickString(source.periodStart, source.createdAt),
    periodEnd: pickString(source.periodEnd, source.generatedAt),
  };
}

export function normalizeCafePerformanceResponse(
  raw: unknown,
  fallbackPage: number,
  fallbackPageSize: number,
): CafePerformanceResult {
  const source = isRecord(raw) ? raw : {};
  const items = extractItems(source).map(mapCafePerformanceItem);
  const summary: CafePerformanceSummary = {
    totalCafes: pickNumber(
      isRecord(source.summary) ? source.summary.totalCafes : undefined,
      source.totalCafes,
      items.length,
    ),
    activeCafes: pickNumber(
      isRecord(source.summary) ? source.summary.activeCafes : undefined,
      source.activeCafes,
      items.filter((item) => item.operationalStatus === 'ACTIVE').length,
    ),
    totalRevenue: pickNumber(
      isRecord(source.summary) ? source.summary.totalRevenue : undefined,
      source.totalRevenue,
      source.totalRevenueVnd,
    ),
    totalSessions: pickNumber(
      isRecord(source.summary) ? source.summary.totalSessions : undefined,
      source.totalSessions,
      items.reduce((sum, item) => sum + item.totalSessions, 0),
    ),
    averageSessionRevenue: pickNumber(
      isRecord(source.summary) ? source.summary.averageSessionRevenue : undefined,
      source.averageSessionRevenue,
    ),
    averageRating: pickNumber(
      isRecord(source.summary) ? source.summary.averageRating : undefined,
      source.averageRating,
    ),
  };

  // Live API currently returns full cafe list without page fields.
  const page = pickNumber(source.page, fallbackPage) || fallbackPage;
  const pageSize = pickNumber(source.pageSize, fallbackPageSize, items.length || fallbackPageSize) || fallbackPageSize;
  const totalCount = pickNumber(source.totalCount, source.totalCafes, items.length);
  const totalPages = pickNumber(source.totalPages, Math.max(1, Math.ceil(totalCount / Math.max(pageSize, 1))));

  return { summary, data: items, meta: toMeta(page, pageSize, totalCount, totalPages) };
}
