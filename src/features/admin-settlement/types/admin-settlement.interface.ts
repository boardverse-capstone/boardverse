export type CafeSettlementStatus =
  | 'Pending'
  | 'Succeeded'
  | 'Failed'
  | 'Retrying'
  | 'Overridden';

export interface AdminSettlement {
  id: string;
  cafeId: string;
  cafeName: string;
  cafeManagerId: string;
  activeSessionId: string;
  bookingDepositId: string;
  depositAmount: number;
  feeAmount: number;
  netTransferAmount: number;
  sePayTransferId: string | null;
  status: CafeSettlementStatus;
  failureReason: string | null;
  retryCount: number;
  nextRetryAt: string | null;
  transferredAt: string | null;
  overrideBy: string | null;
  overrideAt: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface AdminSettlementListParams {
  status?: CafeSettlementStatus;
  cafeId?: string;
  cafeManagerId?: string;
  fromUtc?: string;
  toUtc?: string;
  pageNumber?: number;
  pageSize?: number;
}

export type AdminFailedSettlementListParams = Omit<AdminSettlementListParams, 'status'>;

export interface AdminSettlementPaginationMeta {
  currentPage: number;
  pageSize: number;
  totalItems: number;
  totalPages: number;
  hasPrevious: boolean;
  hasNext: boolean;
}

export interface AdminSettlementListResponse {
  data: AdminSettlement[];
  meta: AdminSettlementPaginationMeta;
}

export interface OverrideSettlementRequest {
  reason: string;
}

export interface OverrideSettlementResult {
  id: string;
  status: string;
  overrideBy: string;
  overrideAt: string;
  previousStatus: string;
  settlementAmount: number;
  cafeId: string;
  cafeName: string;
  bookingId: string;
}
