export type RefundRequestStatus = 'Pending' | 'Approved' | 'Rejected' | 'Cancelled';

export interface AdminRefundRequest {
  id: string;
  userId: string;
  relatedLedgerEntryId: string;
  requestedAmountBvc: number;
  approvedAmountBvc: number | null;
  playerReason: string;
  adminNote: string | null;
  status: RefundRequestStatus | string;
  resolvedByAdminId: string | null;
  resolvedAt: string | null;
  resultLedgerEntryId: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface AdminRefundListParams {
  page: number;
  limit: number;
  status?: string;
  userId?: string;
}

export interface AdminRefundListPage {
  items: AdminRefundRequest[];
  page: number;
  pageSize: number;
  totalItems: number;
  totalPages: number;
}

export interface ResolveRefundRequest {
  approve: boolean;
  approvedAmountBvc?: number;
  adminNote: string;
}

export interface RawAdminRefundRequest {
  id?: string;
  Id?: string;
  userId?: string;
  UserId?: string;
  relatedLedgerEntryId?: string;
  RelatedLedgerEntryId?: string;
  requestedAmountBvc?: number;
  RequestedAmountBvc?: number;
  approvedAmountBvc?: number | null;
  ApprovedAmountBvc?: number | null;
  playerReason?: string;
  PlayerReason?: string;
  adminNote?: string | null;
  AdminNote?: string | null;
  status?: string;
  Status?: string;
  resolvedByAdminId?: string | null;
  ResolvedByAdminId?: string | null;
  resolvedAt?: string | null;
  ResolvedAt?: string | null;
  resultLedgerEntryId?: string | null;
  ResultLedgerEntryId?: string | null;
  createdAt?: string;
  CreatedAt?: string;
  updatedAt?: string;
  UpdatedAt?: string;
}
