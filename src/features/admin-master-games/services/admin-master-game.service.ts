import apiClient from '@/core/api/client';
import type {
  CreateMasterGameComponentRequest,
  MasterGameCategoryLink,
  MasterGameComponent,
  RawMasterGameCategoryLink,
  RawMasterGameComponent,
  SetMasterGameCategoriesRequest,
  UpdateMasterGameComponentRequest,
  UpdateMasterGameMetadataRequest,
  UpdateMasterGameThumbnailRequest,
} from '../types/master-game.interface';
import {
  mapApiMasterGameCategoryLink,
  mapApiMasterGameComponent,
  normalizeMasterGameCategoryList,
  normalizeMasterGameComponentList,
} from '../utils/master-game.mapper';
import { AdminMasterGameMockService } from './admin-master-game.mock';

const USE_MOCK = process.env.NEXT_PUBLIC_USE_MOCK_ADMIN_MASTER_GAME_API === 'true';

export const ADMIN_MASTER_GAME_QUERY_KEYS = {
  components: 'admin-master-game-components',
  categories: 'admin-master-game-categories',
} as const;

function toComponentBody(payload: CreateMasterGameComponentRequest | UpdateMasterGameComponentRequest) {
  return {
    componentName: payload.name,
    componentKind: Number.isFinite(Number(payload.type)) ? Number(payload.type) : payload.type,
    defaultQuantity: payload.defaultQuantity,
  };
}

export const AdminMasterGameService = {
  /** GET /api/v1/admin/master-games/{gameTemplateId}/components */
  getComponents: async (gameTemplateId: string): Promise<MasterGameComponent[]> => {
    if (USE_MOCK) return AdminMasterGameMockService.getComponents(gameTemplateId);

    try {
      const raw = await apiClient.get<
        never,
        RawMasterGameComponent[] | { data?: RawMasterGameComponent[]; items?: RawMasterGameComponent[] }
      >(`/api/v1/admin/master-games/${gameTemplateId}/components`);
      return normalizeMasterGameComponentList(raw);
    } catch {
      return AdminMasterGameMockService.getComponents(gameTemplateId);
    }
  },

  /** POST /api/v1/admin/master-games/{gameTemplateId}/components */
  createComponent: async (
    gameTemplateId: string,
    payload: CreateMasterGameComponentRequest,
  ): Promise<MasterGameComponent> => {
    if (USE_MOCK) return AdminMasterGameMockService.createComponent(gameTemplateId, payload);

    const raw = await apiClient.post<never, RawMasterGameComponent>(
      `/api/v1/admin/master-games/${gameTemplateId}/components`,
      toComponentBody(payload),
    );
    return mapApiMasterGameComponent(raw);
  },

  /** PUT /api/v1/admin/master-games/{gameTemplateId}/components/{componentId} */
  updateComponent: async (
    gameTemplateId: string,
    componentId: string,
    payload: UpdateMasterGameComponentRequest,
  ): Promise<MasterGameComponent> => {
    if (USE_MOCK) return AdminMasterGameMockService.updateComponent(gameTemplateId, componentId, payload);

    const raw = await apiClient.put<never, RawMasterGameComponent>(
      `/api/v1/admin/master-games/${gameTemplateId}/components/${componentId}`,
      toComponentBody(payload),
    );
    return mapApiMasterGameComponent(raw);
  },

  /** DELETE /api/v1/admin/master-games/{gameTemplateId}/components/{componentId} */
  deleteComponent: async (gameTemplateId: string, componentId: string): Promise<void> => {
    if (USE_MOCK) return AdminMasterGameMockService.deleteComponent?.(gameTemplateId, componentId);

    await apiClient.delete(
      `/api/v1/admin/master-games/${gameTemplateId}/components/${componentId}`,
    );
  },

  /** GET /api/v1/admin/master-games/{gameTemplateId}/categories */
  getCategories: async (gameTemplateId: string): Promise<MasterGameCategoryLink[]> => {
    const raw = await apiClient.get<
      never,
      RawMasterGameCategoryLink[] | { data?: RawMasterGameCategoryLink[]; items?: RawMasterGameCategoryLink[] }
    >(`/api/v1/admin/master-games/${gameTemplateId}/categories`);
    return normalizeMasterGameCategoryList(raw);
  },

  /** PUT /api/v1/admin/master-games/{gameTemplateId}/categories */
  setCategories: async (
    gameTemplateId: string,
    payload: SetMasterGameCategoriesRequest,
  ): Promise<MasterGameCategoryLink[]> => {
    const raw = await apiClient.put<
      never,
      RawMasterGameCategoryLink[] | { data?: RawMasterGameCategoryLink[]; items?: RawMasterGameCategoryLink[] }
    >(`/api/v1/admin/master-games/${gameTemplateId}/categories`, payload);
    return normalizeMasterGameCategoryList(raw);
  },

  /** PUT /api/v1/admin/master-games/{gameTemplateId} */
  updateMetadata: async (
    gameTemplateId: string,
    payload: UpdateMasterGameMetadataRequest,
  ): Promise<unknown> => {
    return apiClient.put(`/api/v1/admin/master-games/${gameTemplateId}`, payload);
  },

  /** PATCH /api/v1/admin/master-games/{gameTemplateId}/thumbnail */
  updateThumbnail: async (
    gameTemplateId: string,
    payload: UpdateMasterGameThumbnailRequest,
  ): Promise<unknown> => {
    return apiClient.patch(`/api/v1/admin/master-games/${gameTemplateId}/thumbnail`, payload);
  },
};
