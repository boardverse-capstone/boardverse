import type { PaginationParams, PaginationMeta } from '@/shared/types/pagination.interface';

export interface ComponentPenaltySummary {
  componentId: string;
  componentName: string;
  penaltyFee: number;
  currency: string;
}

export interface ComponentPenaltyDetail {
  componentId: string;
  componentName: string;
  type: string;
  quantityInBox: number;
  penaltyFeePerUnit: number;
}

export interface InventoryListItem {
  inventoryId: string;
  gameTemplateId: string;
  name: string;
  imageUrl: string | null;
  status: string;
  barcode: string | null;
  condition: string | null;
  isFullMode: boolean;
  componentPenalties: ComponentPenaltySummary[];
}

export interface GameTemplateDetail {
  gameTemplateId: string;
  title: string;
  description: string | null;
  minPlayers: number;
  maxPlayers: number;
  playingTime: number;
}

export interface InventoryDetail {
  inventoryId: string;
  cafeId: string;
  gameTemplate: GameTemplateDetail;
  barcode: string | null;
  status: string;
  condition: string | null;
  purchaseDate: string | null;
  notes: string | null;
  componentPenalties: ComponentPenaltyDetail[];
}

export interface NearbyCafe {
  id: string;
  name: string;
  address: string | null;
  distanceKm: number | null;
  distanceLabel: string | null;
}

export interface StaffWorkingCafe {
  id: string;
  name: string;
  address: string | null;
}

export interface RawInventoryListResponse {
  data?: RawInventoryListItem[];
  items?: RawInventoryListItem[];
  Items?: RawInventoryListItem[];
  meta?: Partial<PaginationMeta>;
  totalCount?: number;
  TotalCount?: number;
  page?: number;
  Page?: number;
  pageSize?: number;
  PageSize?: number;
}

export interface InventoryListParams extends PaginationParams {
  status?: string;
  search?: string;
}

export interface RawComponentPenaltySummary {
  componentId?: string;
  ComponentId?: string;
  componentName?: string;
  ComponentName?: string;
  penaltyFee?: number;
  PenaltyFee?: number;
  currency?: string;
  Currency?: string;
}

export interface RawInventoryListItem {
  inventoryId?: string;
  InventoryId?: string;
  gameTemplateId?: string;
  GameTemplateId?: string;
  name?: string;
  Name?: string;
  imageUrl?: string | null;
  ImageUrl?: string | null;
  status?: string;
  Status?: string;
  barcode?: string | null;
  Barcode?: string | null;
  condition?: string | null;
  Condition?: string | null;
  isFullMode?: boolean;
  IsFullMode?: boolean;
  componentPenalties?: RawComponentPenaltySummary[];
  ComponentPenalties?: RawComponentPenaltySummary[];
}

export interface RawInventoryDetail {
  inventoryId?: string;
  InventoryId?: string;
  cafeId?: string;
  CafeId?: string;
  gameTemplate?: Record<string, unknown>;
  GameTemplate?: Record<string, unknown>;
  barcode?: string | null;
  Barcode?: string | null;
  status?: string;
  Status?: string;
  condition?: string | null;
  Condition?: string | null;
  purchaseDate?: string | null;
  PurchaseDate?: string | null;
  notes?: string | null;
  Notes?: string | null;
  componentPenalties?: RawComponentPenaltyDetail[];
  ComponentPenalties?: RawComponentPenaltyDetail[];
}

export interface RawComponentPenaltyDetail {
  componentId?: string;
  ComponentId?: string;
  componentName?: string;
  ComponentName?: string;
  type?: string;
  Type?: string;
  quantityInBox?: number;
  QuantityInBox?: number;
  penaltyFeePerUnit?: number;
  PenaltyFeePerUnit?: number;
}

export interface RawNearbyCafe {
  id?: string;
  Id?: string;
  cafeId?: string;
  CafeId?: string;
  name?: string;
  Name?: string;
  address?: string | null;
  Address?: string | null;
  distance?: number;
  Distance?: number;
  distanceKm?: number;
  DistanceKm?: number;
  distanceLabel?: string | null;
  DistanceLabel?: string | null;
}
