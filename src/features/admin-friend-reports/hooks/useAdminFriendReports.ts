'use client';

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import {
  ADMIN_FRIEND_REPORT_QUERY_KEY,
  AdminFriendReportService,
} from '../services/admin-friend-report.service';
import type {
  AdminFriendReportListParams,
  ResolveFriendReportRequest,
} from '../types/admin-friend-report.interface';

export function useAdminFriendReports(params: AdminFriendReportListParams) {
  return useQuery({
    queryKey: [
      ADMIN_FRIEND_REPORT_QUERY_KEY,
      params.status,
      params.offset,
      params.limit,
    ],
    queryFn: () => AdminFriendReportService.getReports(params),
    placeholderData: (previous) => previous,
    staleTime: 5000,
  });
}

export function useResolveFriendReport() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({
      reportId,
      payload,
    }: {
      reportId: string;
      payload: ResolveFriendReportRequest;
    }) => AdminFriendReportService.resolveReport(reportId, payload),
    onSuccess: (_, variables) => {
      toast.success(
        variables.payload.status === 'Reviewed'
          ? 'Đã đánh dấu báo cáo là đã xử lý.'
          : 'Đã bỏ qua báo cáo.',
      );
      queryClient.invalidateQueries({ queryKey: [ADMIN_FRIEND_REPORT_QUERY_KEY] });
    },
    onError: (error: Error) => {
      toast.error(error.message || 'Không thể xử lý báo cáo.');
    },
  });
}
