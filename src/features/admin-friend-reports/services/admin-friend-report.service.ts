import apiClient from '@/core/api/client';
import type {
  AdminFriendReport,
  AdminFriendReportListParams,
  AdminFriendReportListResult,
  ResolveFriendReportRequest,
} from '../types/admin-friend-report.interface';
import {
  mapAdminFriendReport,
  normalizeAdminFriendReports,
} from '../utils/admin-friend-report.mapper';

const BASE_PATH = '/api/v1/admin/friend-reports';

export const ADMIN_FRIEND_REPORT_QUERY_KEY = 'admin-friend-reports';

export const AdminFriendReportService = {
  getReports: async (
    params: AdminFriendReportListParams,
  ): Promise<AdminFriendReportListResult> => {
    const raw = await apiClient.get<never, unknown>(BASE_PATH, {
      params: {
        status: params.status === 'all' ? undefined : params.status,
        offset: params.offset,
        limit: params.limit,
      },
    });
    return normalizeAdminFriendReports(raw, params);
  },

  resolveReport: async (
    reportId: string,
    payload: ResolveFriendReportRequest,
  ): Promise<AdminFriendReport> => {
    const raw = await apiClient.post<never, unknown>(
      `${BASE_PATH}/${reportId}/resolve`,
      payload,
    );
    return mapAdminFriendReport(raw);
  },
};
