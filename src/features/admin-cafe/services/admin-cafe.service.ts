import apiClient from '@/core/api/client';
import type { PaginatedResponse } from '@/shared/types/pagination.interface';
import type {
  AdminCafe,
  AdminCafeDetail,
  AdminCafeListParams,
  CreateAdminCafeRequest,
  RawAdminCafe,
  RawAdminCafeListResponse,
  RawUpdateOperationalStatusResponse,
  UpdateAdminCafeRequest,
  UpdateOperationalStatusRequest,
  UpdateOperationalStatusResponse,
} from '../types/admin-cafe.interface';
import {
  mapApiAdminCafeDetail,
  mapOperationalStatusResponse,
  normalizeAdminCafeListResponse,
} from '../utils/admin-cafe.mapper';

export const ADMIN_CAFE_QUERY_KEYS = {
  list: 'admin-cafe-list',
  detail: 'admin-cafe-detail',
  operationalStatus: 'admin-cafe-operational-status',
} as const;

export const AdminCafeService = {
  /** GET /api/v1/admin/cafes */
  getCafes: async (params: AdminCafeListParams): Promise<PaginatedResponse<AdminCafe>> => {
    const raw = await apiClient.get<never, RawAdminCafeListResponse>(
      '/api/v1/admin/cafes',
      {
        params: {
          page: params.page,
          pageSize: params.limit,
          searchTerm: params.search || undefined,
          status:
            params.status && params.status !== 'all' ? params.status : undefined,
          managerId: params.managerId || undefined,
        },
      },
    );

    const page = normalizeAdminCafeListResponse(raw, params);

    // List DTO thường thiếu phoneNumber — bổ sung từ GET detail trên trang hiện tại
    const data = await Promise.all(
      page.data.map(async (cafe) => {
        if (cafe.phoneNumber?.trim()) return cafe;
        try {
          const detail = await AdminCafeService.getCafeById(cafe.id);
          return {
            ...cafe,
            phoneNumber: detail.phoneNumber || cafe.phoneNumber,
            latitude: detail.latitude || cafe.latitude,
            longitude: detail.longitude || cafe.longitude,
            managerName:
              cafe.managerName && cafe.managerName !== '—'
                ? cafe.managerName
                : detail.managerName || cafe.managerName,
          };
        } catch {
          return cafe;
        }
      }),
    );

    return { ...page, data };
  },

  /** GET /api/v1/admin/cafes/{cafeId} */
  getCafeById: async (cafeId: string): Promise<AdminCafeDetail> => {
    const raw = await apiClient.get<never, RawAdminCafe>(`/api/v1/admin/cafes/${cafeId}`);
    return mapApiAdminCafeDetail(raw);
  },

  /** POST /api/v1/admin/cafes */
  createCafe: async (payload: CreateAdminCafeRequest): Promise<AdminCafeDetail> => {
    const raw = await apiClient.post<never, RawAdminCafe>('/api/v1/admin/cafes', payload);
    return mapApiAdminCafeDetail(raw);
  },

  /** PUT /api/v1/admin/cafes/{cafeId} */
  updateCafe: async (
    cafeId: string,
    payload: UpdateAdminCafeRequest,
  ): Promise<AdminCafeDetail> => {
    const raw = await apiClient.put<never, RawAdminCafe>(
      `/api/v1/admin/cafes/${cafeId}`,
      payload,
    );
    return mapApiAdminCafeDetail(raw);
  },

  /** DELETE /api/v1/admin/cafes/{cafeId} */
  deleteCafe: async (cafeId: string): Promise<void> => {
    await apiClient.delete(`/api/v1/admin/cafes/${cafeId}`);
  },

  /** PUT /api/v1/admin/cafes/{cafeId}/operational-status */
  updateOperationalStatus: async (
    cafeId: string,
    payload: UpdateOperationalStatusRequest,
  ): Promise<UpdateOperationalStatusResponse> => {
    // Swagger: { status: DATA_BLANK|ACTIVE|INACTIVE|BANNED, reason? } — reason bắt buộc khi BANNED
    const raw = await apiClient.put<never, RawUpdateOperationalStatusResponse>(
      `/api/v1/admin/cafes/${cafeId}/operational-status`,
      {
        status: payload.status,
        reason: payload.reason,
      },
    );

    return mapOperationalStatusResponse(raw);
  },
};
