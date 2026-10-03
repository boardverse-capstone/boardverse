import apiClient from '@/core/api/client';
import type {
  AdminFailedSettlementListParams,
  AdminSettlementListParams,
  AdminSettlementListResponse,
  OverrideSettlementRequest,
  OverrideSettlementResult,
} from '../types/admin-settlement.interface';

export const ADMIN_SETTLEMENT_QUERY_KEYS = {
  list: 'admin-settlement-list',
  failed: 'admin-settlement-failed',
  override: 'admin-settlement-override',
} as const;

export const AdminSettlementService = {
  /** GET /api/v1/admin/settlements */
  getSettlements: async (
    params: AdminSettlementListParams,
  ): Promise<AdminSettlementListResponse> => {
    return apiClient.get<never, AdminSettlementListResponse>('/api/v1/admin/settlements', {
      params,
    });
  },

  /** GET /api/v1/admin/settlements/failed */
  getFailedSettlements: async (
    params: AdminFailedSettlementListParams,
  ): Promise<AdminSettlementListResponse> => {
    return apiClient.get<never, AdminSettlementListResponse>(
      '/api/v1/admin/settlements/failed',
      {
        params: {
          cafeId: params.cafeId,
          cafeManagerId: params.cafeManagerId,
          fromUtc: params.fromUtc,
          toUtc: params.toUtc,
          pageNumber: params.pageNumber,
          pageSize: params.pageSize,
        },
      },
    );
  },

  /** POST /api/v1/admin/settlements/{settlementId}/override */
  overrideSettlement: async (
    settlementId: string,
    payload: OverrideSettlementRequest,
  ): Promise<OverrideSettlementResult> => {
    return apiClient.post<never, OverrideSettlementResult>(
      `/api/v1/admin/settlements/${settlementId}/override`,
      payload,
    );
  },
};
