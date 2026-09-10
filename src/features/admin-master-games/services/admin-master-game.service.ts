import apiClient from '@/core/api/client';
import type {
  CreateMasterGameComponentRequest,
  MasterGameCatalogOption,
  MasterGameCategoryLink,
  MasterGameComponent,
  RawMasterGameCategoryLink,
  RawMasterGameComponent,
  SetMasterGameCategoriesRequest,
  UpdateMasterGameComponentRequest,
  UpdateMasterGameMetadataRequest,
  UpdateMasterGameThumbnailRequest,
  BggSearchHit,
  BggGamePreview,
  BggComponentKindOption,
  ImportBggGameRequest,
  ImportBggGameResult,
} from '../types/master-game.interface';
import {
  mapApiMasterGameComponent,
  normalizeMasterGameCategoryList,
  normalizeMasterGameComponentList,
} from '../utils/master-game.mapper';

export const ADMIN_MASTER_GAME_QUERY_KEYS = {
  catalog: 'admin-master-game-catalog',
  components: 'admin-master-game-components',
  categories: 'admin-master-game-categories',
  bggSearch: 'admin-bgg-search',
  bggPreview: 'admin-bgg-preview',
  bggComponentCatalog: 'admin-bgg-component-catalog',
} as const;

function asRecord(value: unknown): Record<string, unknown> | null {
  return value && typeof value === 'object' && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : null;
}

function unwrapList(raw: unknown): unknown[] {
  if (Array.isArray(raw)) return raw;
  const root = asRecord(raw);
  const nested = root?.data ?? root?.items ?? root?.Items;
  if (Array.isArray(nested)) return nested;
  const inner = asRecord(nested);
  const innerList = inner?.data ?? inner?.items;
  return Array.isArray(innerList) ? innerList : [];
}

function unwrapObject(raw: unknown): Record<string, unknown> {
  const root = asRecord(raw);
  const nested = root?.data;
  return asRecord(nested) ?? root ?? {};
}

function readCatalogKind(raw: unknown): number | string | null {
  if (typeof raw === 'number' && Number.isFinite(raw)) return raw;
  if (typeof raw !== 'string') return null;
  const trimmed = raw.trim();
  if (!trimmed) return null;
  const asNumber = Number(trimmed);
  if (Number.isFinite(asNumber) && String(asNumber) === trimmed) return asNumber;
  return trimmed;
}

function mapCatalogRow(item: unknown): BggComponentKindOption | null {
  const row = asRecord(item);
  if (!row) return null;
  const kind = readCatalogKind(row.kind ?? row.Kind ?? row.value ?? row.Value);
  if (kind == null) return null;
  return {
    kind,
    nameEn: String(row.nameEn ?? row.NameEn ?? row.name ?? row.Name ?? '').trim(),
    nameVi: String(row.nameVi ?? row.NameVi ?? '').trim(),
  };
}

function toComponentBody(payload: CreateMasterGameComponentRequest | UpdateMasterGameComponentRequest) {
  return {
    componentName: payload.name,
    componentKind: payload.componentKind,
    defaultQuantity: payload.defaultQuantity,
  };
}

export const AdminMasterGameService = {
  /** GET /api/v1/master-games — danh sách tựa game gốc (fallback board-games). */
  listCatalog: async (searchTerm?: string): Promise<MasterGameCatalogOption[]> => {
    const params = {
      pageNumber: 1,
      page: 1,
      pageSize: 100,
      ...(searchTerm?.trim() ? { searchTerm: searchTerm.trim() } : {}),
    };

    const parseList = (raw: unknown): MasterGameCatalogOption[] => {
      const root = raw as Record<string, unknown> | unknown[] | null;
      const nested =
        root && !Array.isArray(root) && typeof root === 'object'
          ? ((root.data as unknown) ?? (root.items as unknown) ?? (root.Items as unknown))
          : root;
      const list = Array.isArray(raw)
        ? raw
        : Array.isArray(nested)
          ? nested
          : nested && typeof nested === 'object'
            ? (((nested as Record<string, unknown>).data as unknown[]) ??
              ((nested as Record<string, unknown>).items as unknown[]) ??
              [])
            : [];
      if (!Array.isArray(list)) return [];
      return list
        .map((item) => {
          const row = item as Record<string, unknown>;
          const id = String(row.id ?? row.Id ?? row.gameTemplateId ?? row.GameTemplateId ?? '');
          const name = String(row.name ?? row.Name ?? row.title ?? row.Title ?? id);
          const thumbnail = String(
            row.thumbnailUrl ?? row.ThumbnailUrl ?? row.imageUrl ?? row.ImageUrl ?? '',
          ).trim();
          return id ? { id, name, thumbnailUrl: thumbnail || null } : null;
        })
        .filter((item): item is MasterGameCatalogOption => Boolean(item));
    };

    try {
      const raw = await apiClient.get<never, unknown>('/api/v1/master-games', { params });
      const games = parseList(raw);
      if (games.length) return games;
    } catch {
      // Admin có thể không gọi được master-games (role Manager) → catalog công khai
    }

    const raw = await apiClient.get<never, unknown>('/api/v1/board-games', {
      params: { pageNumber: 1, pageSize: 100 },
    });
    return parseList(raw);
  },

  /** GET /api/v1/admin/master-games/{gameTemplateId}/components */
  getComponents: async (gameTemplateId: string): Promise<MasterGameComponent[]> => {
    const raw = await apiClient.get<
      never,
      RawMasterGameComponent[] | { data?: RawMasterGameComponent[]; items?: RawMasterGameComponent[] }
    >(`/api/v1/admin/master-games/${gameTemplateId}/components`);
    return normalizeMasterGameComponentList(raw);
  },

  /** POST /api/v1/admin/master-games/{gameTemplateId}/components */
  createComponent: async (
    gameTemplateId: string,
    payload: CreateMasterGameComponentRequest,
  ): Promise<MasterGameComponent> => {
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
    const raw = await apiClient.put<never, RawMasterGameComponent>(
      `/api/v1/admin/master-games/${gameTemplateId}/components/${componentId}`,
      toComponentBody(payload),
    );
    return mapApiMasterGameComponent(raw);
  },

  /** DELETE /api/v1/admin/master-games/{gameTemplateId}/components/{componentId} */
  deleteComponent: async (gameTemplateId: string, componentId: string): Promise<void> => {
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

  /** GET /api/v1/bgg/component-catalog */
  listComponentCatalog: async (): Promise<BggComponentKindOption[]> => {
    const raw = await apiClient.get<never, unknown>('/api/v1/bgg/component-catalog');
    const rows = unwrapList(raw)
      .map(mapCatalogRow)
      .filter((item): item is BggComponentKindOption => Boolean(item));
    if (rows.length === 0 && unwrapList(raw).length > 0) {
      throw new Error('API component-catalog trả dữ liệu không có field kind.');
    }
    return rows;
  },

  /** GET /api/v1/bgg/search?query= */
  searchBgg: async (query: string): Promise<BggSearchHit[]> => {
    const raw = await apiClient.get<never, unknown>('/api/v1/bgg/search', {
      params: { query: query.trim() },
    });
    return unwrapList(raw)
      .map((item) => {
        const row = asRecord(item);
        if (!row) return null;
        const bggId = Number(row.bggId ?? row.BggId);
        const name = String(row.name ?? row.Name ?? '').trim();
        if (!Number.isFinite(bggId) || bggId <= 0 || !name) return null;
        const yearRaw = row.yearPublished ?? row.YearPublished;
        const year = Number(yearRaw);
        return {
          bggId,
          name,
          yearPublished: Number.isFinite(year) && year > 0 ? year : null,
        };
      })
      .filter((item): item is BggSearchHit => Boolean(item));
  },

  /** GET /api/v1/bgg/games/{bggId} */
  previewBggGame: async (
    bggId: number,
    curatedComponentsOnly = false,
  ): Promise<BggGamePreview> => {
    const raw = await apiClient.get<never, unknown>(`/api/v1/bgg/games/${bggId}`, {
      params: { curatedComponentsOnly },
    });
    const row = unwrapObject(raw);
    const components = unwrapList(row.components ?? row.Components);
    const minPlayers = Number(row.minPlayers ?? row.MinPlayers);
    const maxPlayers = Number(row.maxPlayers ?? row.MaxPlayers);
    const playTime = Number(row.playTimeMinutes ?? row.PlayTimeMinutes ?? row.playingTime);
    const year = Number(row.yearPublished ?? row.YearPublished);
    return {
      bggId: Number(row.bggId ?? row.BggId ?? bggId),
      name: String(row.name ?? row.Name ?? ''),
      yearPublished: Number.isFinite(year) && year > 0 ? year : null,
      minPlayers: Number.isFinite(minPlayers) && minPlayers > 0 ? minPlayers : null,
      maxPlayers: Number.isFinite(maxPlayers) && maxPlayers > 0 ? maxPlayers : null,
      playTimeMinutes: Number.isFinite(playTime) && playTime > 0 ? playTime : null,
      description: String(row.description ?? row.Description ?? '').trim() || null,
      hasCuratedComponents: Boolean(row.hasCuratedComponents ?? row.HasCuratedComponents),
      componentResolutionNote: String(
        row.componentResolutionNote ?? row.ComponentResolutionNote ?? '',
      ).trim() || null,
      componentCount: components.length,
    };
  },

  /** POST /api/v1/bgg/import */
  importBggGame: async (payload: ImportBggGameRequest): Promise<ImportBggGameResult> => {
    const raw = await apiClient.post<never, unknown>('/api/v1/bgg/import', payload);
    const row = unwrapObject(raw);
    return {
      gameTemplateId: String(row.gameTemplateId ?? row.GameTemplateId ?? ''),
      bggId: Number(row.bggId ?? row.BggId ?? payload.bggId),
      name: String(row.name ?? row.Name ?? ''),
      created: Boolean(row.created ?? row.Created),
      componentCount: Number(row.componentCount ?? row.ComponentCount ?? 0),
      categoryCount: Number(row.categoryCount ?? row.CategoryCount ?? 0),
    };
  },
};
