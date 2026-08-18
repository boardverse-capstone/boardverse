export type FriendReportStatus = 'Pending' | 'Reviewed' | 'Dismissed';

export interface AdminFriendReport {
  id: string;
  reporterUserId: string;
  reporterUsername: string;
  targetUserId: string;
  targetUsername: string;
  category: string;
  reason: string;
  status: FriendReportStatus | string;
  adminNote: string | null;
  resolvedBy: string | null;
  resolvedAt: string | null;
  createdAt: string;
}

export interface AdminFriendReportListParams {
  status?: FriendReportStatus | 'all';
  offset: number;
  limit: number;
}

export interface AdminFriendReportListResult {
  items: AdminFriendReport[];
  offset: number;
  limit: number;
  totalItems: number;
  totalPages: number;
}

export interface ResolveFriendReportRequest {
  status: Exclude<FriendReportStatus, 'Pending'>;
  adminNote: string;
}
