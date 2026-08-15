import apiClient from '@/core/api/client';
import type {
  OverrideSettlementRequest,
  OverrideSettlementResult,
} from '../types/admin-settlement.interface';

export const ADMIN_SETTLEMENT_QUERY_KEYS = {
  override: 'admin-settlement-override',
} as const;

export const AdminSettlementService = {
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
