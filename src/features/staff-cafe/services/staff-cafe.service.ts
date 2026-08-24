import apiClient from '@/core/api/client';
import type { PaginatedResponse } from '@/shared/types/pagination.interface';
import type {
  InventoryDetail,
  InventoryListItem,
  InventoryListParams,
  NearbyCafe,
  RawInventoryDetail,
  RawInventoryListItem,
  RawInventoryListResponse,
  StaffWorkingCafe,
} from '../types/cafe.interface';
import {
  mapApiInventoryDetail,
  mapApiStaffWorkingCafe,
  normalizeInventoryListResponse,
  normalizeNearbyCafeList,
} from '../utils/inventory.mapper';

export const STAFF_CAFE_QUERY_KEYS = {
  workingCafe: 'staff-working-cafe',
  nearbyCafes: 'staff-nearby-cafes',
  inventoryList: 'staff-inventory-list',
  inventoryDetail: 'staff-inventory-detail',
} as const;

function unwrapList<T>(raw: T[] | { data?: T[] } | null | undefined): T[] {
  if (!raw) return [];
  if (Array.isArray(raw)) return raw;
  return Array.isArray(raw.data) ? raw.data : [];
}

let cachedCafeId = '';

export const StaffCafeService = {
  getCachedCafeId: (): string => cachedCafeId,

  /** Quán staff đang gán: GET /api/staff/my-cafes */
  getStaffWorkingCafe: async (): Promise<StaffWorkingCafe> => {
    const raw = await apiClient.get<never, unknown>('/api/staff/my-cafes');
    const cafes = unwrapList(raw as StaffWorkingCafe[] | { data?: StaffWorkingCafe[] });
    if (cafes.length === 0) {
      throw new Error('Staff chưa được gán quán nào.');
    }
    const cafe = mapApiStaffWorkingCafe(cafes[0] as unknown as Record<string, unknown>);
    cachedCafeId = cafe.id;
    return cafe;
  },

  /**
   * GET /api/cafes/nearby/me — bắt buộc gameTemplateId
   * hoặc GET /api/cafes/nearby?latitude&longitude&gameTemplateId khi có tọa độ
   */
  getNearbyCafes: async (params: {
    gameTemplateId: string;
    radiusKm?: number;
    latitude?: number;
    longitude?: number;
  }): Promise<NearbyCafe[]> => {
    const { gameTemplateId, radiusKm = 15, latitude, longitude } = params;
    if (!gameTemplateId) {
      throw new Error('Thiếu gameTemplateId để tìm quán gần.');
    }

    const query = {
      gameTemplateId,
      radiusKm,
      pageNumber: 1,
      pageSize: 20,
    };

    // Có tọa độ tường minh → /nearby; không thì dùng vị trí profile → /nearby/me
    const raw =
      latitude != null && longitude != null
        ? await apiClient.get<never, unknown>('/api/cafes/nearby', {
            params: { ...query, latitude, longitude },
          })
        : await apiClient.get<never, unknown>('/api/cafes/nearby/me', {
            params: query,
          });

    return normalizeNearbyCafeList(raw);
  },

  /** GET /api/cafes/{cafeId}/inventory */
  getInventoryList: async (
    cafeId: string,
    params: InventoryListParams,
  ): Promise<PaginatedResponse<InventoryListItem>> => {
    const raw = await apiClient.get<never, RawInventoryListItem[] | RawInventoryListResponse>(
      `/api/cafes/${cafeId}/inventory`,
      {
        params: {
          pageNumber: params.page,
          pageSize: params.limit,
          sortDescending: true,
          search: params.search || undefined,
          status: params.status && params.status !== 'all' ? params.status : undefined,
        },
      },
    );

    return normalizeInventoryListResponse(raw, params);
  },

  /** GET /api/cafes/{cafeId}/inventory/{inventoryId} */
  getInventoryDetail: async (cafeId: string, inventoryId: string): Promise<InventoryDetail> => {
    const raw = await apiClient.get<never, RawInventoryDetail>(
      `/api/cafes/${cafeId}/inventory/${inventoryId}`,
    );
    return mapApiInventoryDetail(raw);
  },
};
