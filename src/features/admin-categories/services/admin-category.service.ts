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

export const ADMIN_CATEGORY_QUERY_KEYS = {
  list: 'admin-categories',
} as const;

export const AdminCategoryService = {
  /** GET /api/v1/admin/categories */
  getCategories: async (params: CategoryListParams = {}): Promise<GameCategory[]> => {
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
    const raw = await apiClient.post<never, RawGameCategory>(
      '/api/v1/admin/categories',
      mapCategoryToApiPayload(payload),
    );
    return mapApiCategory(raw);
  },

  /** PUT /api/v1/admin/categories/{id} */
  updateCategory: async (id: string, payload: UpdateCategoryRequest): Promise<GameCategory> => {
    const raw = await apiClient.put<never, RawGameCategory>(
      `/api/v1/admin/categories/${id}`,
      mapCategoryToApiPayload(payload),
    );
    return mapApiCategory(raw);
  },

  /** DELETE /api/v1/admin/categories/{id} — soft delete */
  deleteCategory: async (id: string): Promise<GameCategory> => {
    const raw = await apiClient.delete<never, RawGameCategory>(`/api/v1/admin/categories/${id}`);
    return mapApiCategory(raw);
  },
};
