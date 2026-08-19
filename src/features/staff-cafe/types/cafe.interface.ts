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
  isActive: boolean;
  boxQuantity: number;
  minPlayers: number;
  maxPlayers: number;
  playTime: number;
  componentPenalties: ComponentPenaltySummary[];
}

export interface GameTemplateDetail {
  gameTemplateId: string;
  title: string;
  description: string | null;
  imageUrl: string | null;
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
  phoneNumber: string | null;
  description: string | null;
  latitude: number | null;
  longitude: number | null;
  distanceMeters: number | null;
  distanceKm: number | null;
  distanceLabel: string | null;
  availableGameCount: number;
  totalGameBoxCount: number;
  availableTableCount: number;
  totalTableCount: number;
  selectedGameAvailabilityStatus: string | null;
  estimatedWaitMinutes: number | null;
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
  meta?: Partial<PaginationMeta> & {
    pageSize?: number;
    PageSize?: number;
  };
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
  id?: string;
  Id?: string;
  componentId?: string;
  ComponentId?: string;
  gameComponentTemplateId?: string;
  GameComponentTemplateId?: string;
  componentName?: string;
  ComponentName?: string;
  defaultQuantity?: number;
  DefaultQuantity?: number;
  penaltyFee?: number;
  PenaltyFee?: number;
  currency?: string;
  Currency?: string;
}

export interface RawInventoryListItem {
  id?: string;
  Id?: string;
  inventoryId?: string;
  InventoryId?: string;
  cafeId?: string;
  CafeId?: string;
  gameTemplateId?: string;
  GameTemplateId?: string;
  name?: string;
  Name?: string;
  gameName?: string;
  GameName?: string;
  imageUrl?: string | null;
  ImageUrl?: string | null;
  thumbnailUrl?: string | null;
  ThumbnailUrl?: string | null;
  coverUrl?: string | null;
  CoverUrl?: string | null;
  coverImageUrl?: string | null;
  CoverImageUrl?: string | null;
  description?: string | null;
  Description?: string | null;
  minPlayers?: number;
  MinPlayers?: number;
  maxPlayers?: number;
  MaxPlayers?: number;
  playTime?: number;
  PlayTime?: number;
  playingTime?: number;
  PlayingTime?: number;
  boxQuantity?: number;
  BoxQuantity?: number;
  status?: string;
  Status?: string;
  barcode?: string | null;
  Barcode?: string | null;
  condition?: string | null;
  Condition?: string | null;
  isFullMode?: boolean;
  IsFullMode?: boolean;
  isActive?: boolean;
  IsActive?: boolean;
  componentPenalties?: RawComponentPenaltySummary[];
  ComponentPenalties?: RawComponentPenaltySummary[];
  components?: RawComponentPenaltySummary[];
  Components?: RawComponentPenaltySummary[];
}

export interface RawInventoryDetail extends RawInventoryListItem {
  gameTemplate?: Record<string, unknown>;
  GameTemplate?: Record<string, unknown>;
  purchaseDate?: string | null;
  PurchaseDate?: string | null;
  notes?: string | null;
  Notes?: string | null;
  createdAt?: string | null;
  CreatedAt?: string | null;
}

export interface RawComponentPenaltyDetail {
  id?: string;
  Id?: string;
  componentId?: string;
  ComponentId?: string;
  gameComponentTemplateId?: string;
  GameComponentTemplateId?: string;
  componentName?: string;
  ComponentName?: string;
  type?: string;
  Type?: string;
  quantityInBox?: number;
  QuantityInBox?: number;
  defaultQuantity?: number;
  DefaultQuantity?: number;
  penaltyFee?: number;
  PenaltyFee?: number;
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
  phoneNumber?: string | null;
  PhoneNumber?: string | null;
  description?: string | null;
  Description?: string | null;
  latitude?: number | null;
  Latitude?: number | null;
  longitude?: number | null;
  Longitude?: number | null;
  distance?: number;
  Distance?: number;
  distanceMeters?: number;
  DistanceMeters?: number;
  distanceKm?: number;
  DistanceKm?: number;
  distanceLabel?: string | null;
  DistanceLabel?: string | null;
  availableGameCount?: number;
  AvailableGameCount?: number;
  totalGameBoxCount?: number;
  TotalGameBoxCount?: number;
  availableTableCount?: number;
  AvailableTableCount?: number;
  totalTableCount?: number;
  TotalTableCount?: number;
  selectedGameAvailabilityStatus?: string | null;
  SelectedGameAvailabilityStatus?: string | null;
  estimatedWaitMinutes?: number | null;
  EstimatedWaitMinutes?: number | null;
}

/** Envelope sau unwrap: { cafes: { data, meta }, emptyResultMessage, alternativeSuggestions } */
export interface RawNearbyCafesResponse {
  cafes?: {
    data?: RawNearbyCafe[];
    meta?: unknown;
  };
  Cafes?: {
    data?: RawNearbyCafe[];
    Data?: RawNearbyCafe[];
  };
  data?: RawNearbyCafe[] | { data?: RawNearbyCafe[] };
  emptyResultMessage?: string | null;
  EmptyResultMessage?: string | null;
  alternativeSuggestions?: unknown[];
}
