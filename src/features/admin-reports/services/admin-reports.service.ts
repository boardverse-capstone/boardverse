import apiClient from '@/core/api/client';
import type {
  AdminReportsOverview,
  CafePerformanceParams,
  CafePerformanceResult,
  DepositsReportParams,
  DepositsReportResult,
  LobbyFailuresParams,
  LobbyFailuresResult,
} from '../types/admin-reports.interface';
import {
  mapAdminReportsOverview,
  normalizeCafePerformanceResponse,
  normalizeDepositsReportResponse,
  normalizeLobbyFailuresResponse,
} from '../utils/admin-reports.mapper';

export const ADMIN_REPORTS_QUERY_KEYS = {
  overview: 'admin-reports-overview',
  lobbyFailures: 'admin-reports-lobby-failures',
  deposits: 'admin-reports-deposits',
  cafePerformance: 'admin-reports-cafe-performance',
} as const;

export const AdminReportsService = {
  /** GET /api/v1/admin/reports/overview */
  getOverview: async (): Promise<AdminReportsOverview> => {
    const raw = await apiClient.get<never, unknown>('/api/v1/admin/reports/overview');
    return mapAdminReportsOverview(raw);
  },

  /** GET /api/v1/admin/reports/lobby-failures */
  getLobbyFailures: async (params: LobbyFailuresParams): Promise<LobbyFailuresResult> => {
    const raw = await apiClient.get<never, unknown>('/api/v1/admin/reports/lobby-failures', {
      params: {
        page: params.page,
        pageSize: params.pageSize,
        fromUtc: params.fromUtc || undefined,
        toUtc: params.toUtc || undefined,
        failureType:
          params.failureType && params.failureType !== 'all' ? params.failureType : undefined,
      },
    });

    return normalizeLobbyFailuresResponse(raw, params.page, params.pageSize);
  },

  /** GET /api/v1/admin/reports/deposits */
  getDeposits: async (params: DepositsReportParams): Promise<DepositsReportResult> => {
    const raw = await apiClient.get<never, unknown>('/api/v1/admin/reports/deposits', {
      params: {
        page: params.page,
        pageSize: params.pageSize,
        fromUtc: params.fromUtc || undefined,
        toUtc: params.toUtc || undefined,
        status: params.status && params.status !== 'all' ? params.status : undefined,
      },
    });

    return normalizeDepositsReportResponse(raw, params.page, params.pageSize);
  },

  /** GET /api/v1/admin/reports/cafe-performance */
  getCafePerformance: async (params: CafePerformanceParams): Promise<CafePerformanceResult> => {
    const raw = await apiClient.get<never, unknown>('/api/v1/admin/reports/cafe-performance', {
      params: {
        page: params.page,
        pageSize: params.pageSize,
        fromUtc: params.fromUtc || undefined,
        toUtc: params.toUtc || undefined,
        sortBy: params.sortBy || undefined,
        sortOrder: params.sortOrder || undefined,
      },
    });

    return normalizeCafePerformanceResponse(raw, params.page, params.pageSize);
  },
};
