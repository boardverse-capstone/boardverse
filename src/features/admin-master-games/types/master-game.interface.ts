export interface MasterGameComponent {
  componentId: string;
  name: string;
  type: string;
  defaultQuantity: number;
}

export interface CreateMasterGameComponentRequest {
  name: string;
  componentKind: number | string;
  defaultQuantity: number;
}

export interface BggComponentKindOption {
  kind: number | string;
  nameEn: string;
  nameVi: string;
}

export interface UpdateMasterGameComponentRequest extends CreateMasterGameComponentRequest {}

export interface UpdateMasterGameMetadataRequest {
  name?: string;
  description?: string;
  minPlayers?: number;
  maxPlayers?: number;
  playTimeMinutes?: number;
  designer?: string;
  yearPublished?: number;
}

export interface UpdateMasterGameThumbnailRequest {
  thumbnailUrl: string;
}

export interface SetMasterGameCategoriesRequest {
  categoryIds: string[];
}

export interface MasterGameCategoryLink {
  id: string;
  name: string;
  slug: string;
  isActive: boolean;
}

export interface MasterGameCatalogOption {
  id: string;
  name: string;
  thumbnailUrl: string | null;
}

export interface BggSearchHit {
  bggId: number;
  name: string;
  yearPublished: number | null;
}

export interface BggGamePreview {
  bggId: number;
  name: string;
  yearPublished: number | null;
  minPlayers: number | null;
  maxPlayers: number | null;
  playTimeMinutes: number | null;
  description: string | null;
  hasCuratedComponents: boolean;
  componentResolutionNote: string | null;
  componentCount: number;
}

export interface ImportBggGameRequest {
  bggId: number;
  overwriteExisting: boolean;
  curatedComponentsOnly: boolean;
}

export interface ImportBggGameResult {
  gameTemplateId: string;
  bggId: number;
  name: string;
  created: boolean;
  componentCount: number;
  categoryCount: number;
}

export interface RawMasterGameComponent {
  componentId?: string;
  ComponentId?: string;
  id?: string;
  Id?: string;
  name?: string;
  Name?: string;
  componentName?: string;
  ComponentName?: string;
  type?: string;
  Type?: string;
  componentKind?: string | number;
  ComponentKind?: string | number;
  defaultQuantity?: number;
  DefaultQuantity?: number;
  quantityInBox?: number;
  QuantityInBox?: number;
}

export interface RawMasterGameCategoryLink {
  id?: string;
  Id?: string;
  name?: string;
  Name?: string;
  slug?: string;
  Slug?: string;
  isActive?: boolean;
  IsActive?: boolean;
}
