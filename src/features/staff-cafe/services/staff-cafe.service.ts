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
  RawNearbyCafe,
  StaffWorkingCafe,
} from '../types/cafe.interface';
import {
  mapApiInventoryDetail,
  mapApiStaffWorkingCafe,
  normalizeInventoryListResponse,
  normalizeNearbyCafeList,
} from '../utils/inventory.mapper';
import { StaffCafeMockService } from './staff-cafe.mock';

const USE_MOCK = process.env.NEXT_PUBLIC_USE_MOCK_STAFF_CAFE_API !== 'false';

export const STAFF_CAFE_QUERY_KEYS = {
  workingCafe: 'staff-working-cafe',
  nearbyCafes: 'staff-nearby-cafes',
  inventoryList: 'staff-inventory-list',
  inventoryDetail: 'staff-inventory-detail',
} as const;

export const StaffCafeService = {
  /** Quán staff đang gán */
  getStaffWorkingCafe: async (): Promise<StaffWorkingCafe> => {
    if (USE_MOCK) return StaffCafeMockService.getStaffWorkingCafe();

    try {
      const raw = await apiClient.get<never, StaffWorkingCafe[] | { data?: StaffWorkingCafe[] }>(
        '/api/staff/my-cafes',
      );
      const cafes = Array.isArray(raw) ? raw : raw.data ?? [];
      if (cafes.length > 0) {
        return mapApiStaffWorkingCafe(cafes[0] as unknown as Record<string, unknown>);
      }
    } catch {
      // fallback mock
    }

    return StaffCafeMockService.getStaffWorkingCafe();
  },

  /** GET /api/cafes/nearby/me */
  getNearbyCafes: async (): Promise<NearbyCafe[]> => {
    if (USE_MOCK) return StaffCafeMockService.getNearbyCafes();

    try {
      const raw = await apiClient.get<never, RawNearbyCafe[] | { data?: RawNearbyCafe[] }>(
        '/api/cafes/nearby/me',
      );
      const list = normalizeNearbyCafeList(raw);
      if (list.length > 0) return list;
    } catch {
      // fallback mock
    }

    return StaffCafeMockService.getNearbyCafes();
  },

  /** GET /api/cafes/{cafeId}/inventory */
  getInventoryList: async (
    cafeId: string,
    params: InventoryListParams,
  ): Promise<PaginatedResponse<InventoryListItem>> => {
    if (USE_MOCK) return StaffCafeMockService.getInventoryList(cafeId, params);

    try {
      const raw = await apiClient.get<never, RawInventoryListItem[] | RawInventoryListResponse>(
        `/api/cafes/${cafeId}/inventory`,
        {
          params: {
            Page: params.page,
            PageSize: params.limit,
            Search: params.search || undefined,
            Status: params.status && params.status !== 'all' ? params.status : undefined,
          },
        },
      );

      return normalizeInventoryListResponse(raw, params);
    } catch {
      return StaffCafeMockService.getInventoryList(cafeId, params);
    }
  },

  /** GET /api/cafes/{cafeId}/inventory/{inventoryId} */
  getInventoryDetail: async (cafeId: string, inventoryId: string): Promise<InventoryDetail> => {
    if (USE_MOCK) return StaffCafeMockService.getInventoryDetail(cafeId, inventoryId);

    try {
      const raw = await apiClient.get<never, RawInventoryDetail>(
        `/api/cafes/${cafeId}/inventory/${inventoryId}`,
      );
      return mapApiInventoryDetail(raw);
    } catch (error) {
      if (error instanceof Error && error.message.includes('404')) {
        throw error;
      }
      return StaffCafeMockService.getInventoryDetail(cafeId, inventoryId);
    }
  },
};
