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
} from '../types/wallet.interface';
import {
  mapApiAdminWalletDetail,
  normalizeAdminWalletListResponse,
  normalizeAdminWalletTransactionsPage,
} from '../utils/wallet.mapper';
import { AdminWalletMockService } from './admin-wallet.mock';

const USE_MOCK = process.env.NEXT_PUBLIC_USE_MOCK_WALLET_API === 'true';

export const ADMIN_WALLET_QUERY_KEYS = {
  list: 'admin-wallet-list',
  detail: 'admin-wallet-detail',
  transactions: 'admin-wallet-transactions',
} as const;

export const AdminWalletService = {
  /** GET /api/v1/admin/wallet */
  getWallets: async (params: AdminWalletListParams): Promise<PaginatedResponse<AdminWallet>> => {
    if (USE_MOCK) return AdminWalletMockService.getWallets(params);

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
    if (USE_MOCK) return AdminWalletMockService.getWalletByUserId(userId);

    const raw = await apiClient.get<never, RawAdminWallet>(`/api/v1/admin/wallet/${userId}`);
    return mapApiAdminWalletDetail(raw);
  },

  /** GET /api/v1/admin/wallet/{userId}/transactions */
  getWalletTransactions: async (
    params: AdminWalletTransactionParams,
  ): Promise<AdminWalletTransactionsPage> => {
    if (USE_MOCK) return AdminWalletMockService.getWalletTransactions(params);

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
    if (USE_MOCK) return AdminWalletMockService.setWalletStatus(payload);

    return apiClient.post<never, AdminSetWalletStatusResult>(
      '/api/v1/admin/wallet/set-status',
      payload,
    );
  },

  /** POST /api/v1/admin/wallet/adjust */
  adjustWalletBalance: async (
    payload: AdminAdjustWalletBalanceRequest,
  ): Promise<AdminAdjustWalletBalanceResult> => {
    if (USE_MOCK) return AdminWalletMockService.adjustWalletBalance(payload);

    return apiClient.post<never, AdminAdjustWalletBalanceResult>(
      '/api/v1/admin/wallet/adjust',
      payload,
    );
  },
};
