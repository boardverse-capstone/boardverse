import apiClient from '@/core/api/client';
import type {
  CreateMasterGameComponentRequest,
  MasterGameComponent,
  RawMasterGameComponent,
  UpdateMasterGameComponentRequest,
} from '../types/master-game.interface';
import {
  mapApiMasterGameComponent,
  normalizeMasterGameComponentList,
} from '../utils/master-game.mapper';
import { AdminMasterGameMockService } from './admin-master-game.mock';

const USE_MOCK = process.env.NEXT_PUBLIC_USE_MOCK_ADMIN_MASTER_GAME_API === 'true';

export const ADMIN_MASTER_GAME_QUERY_KEYS = {
  components: 'admin-master-game-components',
} as const;

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
      payload,
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
      payload,
    );
    return mapApiMasterGameComponent(raw);
  },
};
