import apiClient from '@/core/api/client';
import type {
  CategoryListParams,
  CreateCategoryRequest,
  GameCategory,
  RawGameCategory,
  UpdateCategoryRequest,
} from '../types/category.interface';
import {
  mapApiCategory,
  mapCategoryToApiPayload,
  normalizeCategoryList,
} from '../utils/category.mapper';
import { AdminCategoryMockService } from './admin-category.mock';

const USE_MOCK = process.env.NEXT_PUBLIC_USE_MOCK_ADMIN_CATEGORY_API === 'true';

export const ADMIN_CATEGORY_QUERY_KEYS = {
  list: 'admin-categories',
} as const;

export const AdminCategoryService = {
  /** GET /api/v1/admin/categories */
  getCategories: async (params: CategoryListParams = {}): Promise<GameCategory[]> => {
    if (USE_MOCK) return AdminCategoryMockService.getCategories(params.includeInactive);

    const raw = await apiClient.get<
      never,
      RawGameCategory[] | { data?: RawGameCategory[]; items?: RawGameCategory[] }
    >('/api/v1/admin/categories', {
      params: {
        includeInactive: params.includeInactive ? true : undefined,
      },
    });
    return normalizeCategoryList(raw);
  },

  /** POST /api/v1/admin/categories */
  createCategory: async (payload: CreateCategoryRequest): Promise<GameCategory> => {
    if (USE_MOCK) return AdminCategoryMockService.createCategory(payload);

    const raw = await apiClient.post<never, RawGameCategory>(
      '/api/v1/admin/categories',
      mapCategoryToApiPayload(payload),
    );
    return mapApiCategory(raw);
  },

  /** PUT /api/v1/admin/categories/{id} */
  updateCategory: async (id: string, payload: UpdateCategoryRequest): Promise<GameCategory> => {
    if (USE_MOCK) return AdminCategoryMockService.updateCategory(id, payload);

    const raw = await apiClient.put<never, RawGameCategory>(
      `/api/v1/admin/categories/${id}`,
      mapCategoryToApiPayload(payload),
    );
    return mapApiCategory(raw);
  },

  /** DELETE /api/v1/admin/categories/{id} — soft delete */
  deleteCategory: async (id: string): Promise<GameCategory> => {
    if (USE_MOCK) return AdminCategoryMockService.deleteCategory(id);

    const raw = await apiClient.delete<never, RawGameCategory>(`/api/v1/admin/categories/${id}`);
    return mapApiCategory(raw);
  },
};
