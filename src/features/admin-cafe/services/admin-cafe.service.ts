import apiClient from '@/core/api/client';
import type {
  RawUpdateOperationalStatusResponse,
  UpdateOperationalStatusRequest,
  UpdateOperationalStatusResponse,
} from '../types/admin-cafe.interface';
import { mapOperationalStatusResponse } from '../utils/admin-cafe.mapper';
import { AdminCafeMockService } from './admin-cafe.mock';

const USE_MOCK = process.env.NEXT_PUBLIC_USE_MOCK_ADMIN_CAFE_API === 'true';

export const ADMIN_CAFE_QUERY_KEYS = {
  operationalStatus: 'admin-cafe-operational-status',
} as const;

export const AdminCafeService = {
  /** PUT /api/v1/admin/cafes/{cafeId}/operational-status */
  updateOperationalStatus: async (
    cafeId: string,
    payload: UpdateOperationalStatusRequest,
  ): Promise<UpdateOperationalStatusResponse> => {
    if (USE_MOCK) return AdminCafeMockService.updateOperationalStatus(cafeId, payload);

    const raw = await apiClient.put<never, RawUpdateOperationalStatusResponse>(
      `/api/v1/admin/cafes/${cafeId}/operational-status`,
      payload,
    );

    return mapOperationalStatusResponse(raw);
  },
};
