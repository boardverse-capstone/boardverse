import apiClient from '@/core/api/client';
import type { PaginatedResponse } from '@/shared/types/pagination.interface';
import type {
  AdminAdjustWalletBalanceRequest,
  AdminAdjustWalletBalanceResult,
  AdminWallet,
  AdminWalletDetail,
  AdminSetWalletStatusRequest,
  AdminSetWalletStatusResult,
  AdminWalletListParams,
  AdminWalletTransactionParams,
  AdminWalletTransactionsPage,
  RawAdminWallet,
  RawAdminWalletListResponse,
  RawAdminWalletTransactionsPage,
  WalletReconcileResult,
} from '../types/wallet.interface';
import type {
  AdminRefundListPage,
  AdminRefundListParams,
  AdminRefundRequest,
  RawAdminRefundRequest,
  ResolveRefundRequest,
} from '../types/refund.interface';
import {
  mapApiAdminWalletDetail,
  normalizeAdminWalletListResponse,
  normalizeAdminWalletTransactionsPage,
} from '../utils/wallet.mapper';
import { mapApiRefundRequest, normalizeRefundListResponse } from '../utils/refund.mapper';

export const ADMIN_WALLET_QUERY_KEYS = {
  list: 'admin-wallet-list',
  detail: 'admin-wallet-detail',
  transactions: 'admin-wallet-transactions',
  refunds: 'admin-wallet-refunds',
  refundDetail: 'admin-wallet-refund-detail',
} as const;

export const AdminWalletService = {
  /** GET /api/v1/admin/wallet */
  getWallets: async (params: AdminWalletListParams): Promise<PaginatedResponse<AdminWallet>> => {
    const raw = await apiClient.get<never, RawAdminWalletListResponse>(
      '/api/v1/admin/wallet',
      {
        params: {
          page: params.page,
          pageSize: params.limit,
          searchTerm: params.search || undefined,
          statusFilter:
            params.statusFilter && params.statusFilter !== 'all'
              ? params.statusFilter
              : undefined,
          riskLevelFilter:
            params.riskLevelFilter && params.riskLevelFilter !== 'all'
              ? params.riskLevelFilter
              : undefined,
        },
      },
    );

    return normalizeAdminWalletListResponse(raw, params);
  },

  /** GET /api/v1/admin/wallet/{userId} */
  getWalletByUserId: async (userId: string): Promise<AdminWalletDetail> => {
    const raw = await apiClient.get<never, RawAdminWallet>(`/api/v1/admin/wallet/${userId}`);
    return mapApiAdminWalletDetail(raw);
  },

  /** GET /api/v1/admin/wallet/{userId}/reconcile */
  reconcileWallet: async (userId: string): Promise<WalletReconcileResult> => {
    return apiClient.get<never, WalletReconcileResult>(
      `/api/v1/admin/wallet/${userId}/reconcile`,
    );
  },

  /** GET /api/v1/admin/wallet/{userId}/transactions */
  getWalletTransactions: async (
    params: AdminWalletTransactionParams,
  ): Promise<AdminWalletTransactionsPage> => {
    const raw = await apiClient.get<never, RawAdminWalletTransactionsPage>(
      `/api/v1/admin/wallet/${params.userId}/transactions`,
      {
        params: {
          page: params.page,
          pageSize: params.limit,
        },
      },
    );

    return normalizeAdminWalletTransactionsPage(raw, params);
  },

  /** POST /api/v1/admin/wallet/set-status */
  setWalletStatus: async (payload: AdminSetWalletStatusRequest): Promise<AdminSetWalletStatusResult> => {
    return apiClient.post<never, AdminSetWalletStatusResult>(
      '/api/v1/admin/wallet/set-status',
      payload,
    );
  },

  /** POST /api/v1/admin/wallet/adjust */
  adjustWalletBalance: async (
    payload: AdminAdjustWalletBalanceRequest,
  ): Promise<AdminAdjustWalletBalanceResult> => {
    return apiClient.post<never, AdminAdjustWalletBalanceResult>(
      '/api/v1/admin/wallet/adjust',
      payload,
    );
  },

  /** GET /api/v1/admin/wallet/refund-requests */
  getRefundRequests: async (params: AdminRefundListParams): Promise<AdminRefundListPage> => {
    const raw = await apiClient.get<never, unknown>('/api/v1/admin/wallet/refund-requests', {
      params: {
        page: params.page,
        pageSize: params.limit,
        status: params.status && params.status !== 'all' ? params.status : undefined,
        userId: params.userId || undefined,
      },
    });
    return normalizeRefundListResponse(raw, params);
  },

  /** GET /api/v1/admin/wallet/refund-requests/{requestId} */
  getRefundRequestById: async (requestId: string): Promise<AdminRefundRequest> => {
    const raw = await apiClient.get<never, RawAdminRefundRequest>(
      `/api/v1/admin/wallet/refund-requests/${requestId}`,
    );
    return mapApiRefundRequest(raw);
  },

  /** POST /api/v1/admin/wallet/refund-requests/{requestId}/resolve */
  resolveRefundRequest: async (
    requestId: string,
    payload: ResolveRefundRequest,
  ): Promise<AdminRefundRequest> => {
    const body: Record<string, unknown> = {
      approve: payload.approve,
      adminNote: payload.adminNote,
    };
    if (payload.approve) {
      body.approvedAmountBvc = payload.approvedAmountBvc;
    }

    const idempotencyKey =
      typeof crypto !== 'undefined' && 'randomUUID' in crypto
        ? crypto.randomUUID()
        : `refund-resolve-${requestId}-${Date.now()}`;

    const raw = await apiClient.post<never, RawAdminRefundRequest>(
      `/api/v1/admin/wallet/refund-requests/${requestId}/resolve`,
      body,
      {
        headers: {
          'Idempotency-Key': idempotencyKey,
        },
      },
    );
    return mapApiRefundRequest(raw);
  },
};
