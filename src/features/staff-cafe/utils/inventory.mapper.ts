import type { PaginatedResponse, PaginationMeta } from '@/shared/types/pagination.interface';
import type {
  ComponentPenaltyDetail,
  ComponentPenaltySummary,
  GameTemplateDetail,
  InventoryDetail,
  InventoryListItem,
  InventoryListParams,
  NearbyCafe,
  RawComponentPenaltyDetail,
  RawComponentPenaltySummary,
  RawInventoryDetail,
  RawInventoryListItem,
  RawInventoryListResponse,
  RawNearbyCafe,
  StaffWorkingCafe,
} from '../types/cafe.interface';

function pickString(...values: (string | null | undefined)[]): string {
  for (const value of values) {
    if (value != null && value !== '') return value;
  }
  return '';
}

function pickNumber(...values: (number | null | undefined)[]): number | undefined {
  for (const value of values) {
    if (value != null && !Number.isNaN(value)) return value;
  }
  return undefined;
}

function pickBoolean(value: boolean | null | undefined, fallback = false): boolean {
  return value ?? fallback;
}

function parseApiDate(value?: string | null): string | null {
  if (!value) return null;
  const normalized = value.includes('T') ? value : value.replace(' ', 'T');
  const date = new Date(normalized);
  return Number.isNaN(date.getTime()) ? value : date.toISOString();
}

function mapComponentPenaltySummary(raw: RawComponentPenaltySummary): ComponentPenaltySummary {
  return {
    componentId: pickString(
      raw.componentId,
      raw.ComponentId,
      raw.gameComponentTemplateId,
      raw.GameComponentTemplateId,
      raw.id,
      raw.Id,
    ),
    componentName: pickString(raw.componentName, raw.ComponentName),
    penaltyFee: pickNumber(raw.penaltyFee, raw.PenaltyFee) ?? 0,
    currency: pickString(raw.currency, raw.Currency) || 'VND',
  };
}

function mapComponentPenaltyDetail(raw: RawComponentPenaltyDetail): ComponentPenaltyDetail {
  return {
    componentId: pickString(
      raw.componentId,
      raw.ComponentId,
      raw.gameComponentTemplateId,
      raw.GameComponentTemplateId,
      raw.id,
      raw.Id,
    ),
    componentName: pickString(raw.componentName, raw.ComponentName),
    type: pickString(raw.type, raw.Type) || 'Component',
    quantityInBox:
      pickNumber(raw.quantityInBox, raw.QuantityInBox, raw.defaultQuantity, raw.DefaultQuantity) ?? 0,
    penaltyFeePerUnit:
      pickNumber(raw.penaltyFeePerUnit, raw.PenaltyFeePerUnit, raw.penaltyFee, raw.PenaltyFee) ?? 0,
  };
}

function pickInventoryImage(raw: RawInventoryListItem): string | null {
  return (
    pickString(
      raw.thumbnailUrl as string | undefined,
      raw.ThumbnailUrl as string | undefined,
      raw.imageUrl as string | undefined,
      raw.ImageUrl as string | undefined,
      raw.coverUrl as string | undefined,
      raw.CoverUrl as string | undefined,
      raw.coverImageUrl as string | undefined,
      raw.CoverImageUrl as string | undefined,
    ) || null
  );
}

export function mapApiInventoryListItem(raw: RawInventoryListItem): InventoryListItem {
  const penalties =
    raw.componentPenalties ??
    raw.ComponentPenalties ??
    raw.components ??
    raw.Components ??
    [];

  return {
    inventoryId: pickString(raw.id, raw.Id, raw.inventoryId, raw.InventoryId),
    gameTemplateId: pickString(raw.gameTemplateId, raw.GameTemplateId),
    name: pickString(raw.gameName, raw.GameName, raw.name, raw.Name) || 'Chưa có tên game',
    imageUrl: pickInventoryImage(raw),
    status: pickString(raw.status, raw.Status) || 'Available',
    barcode: raw.barcode ?? raw.Barcode ?? null,
    condition: raw.condition ?? raw.Condition ?? null,
    isFullMode: pickBoolean(raw.isFullMode ?? raw.IsFullMode, true),
    isActive: pickBoolean(raw.isActive ?? raw.IsActive, true),
    boxQuantity: pickNumber(raw.boxQuantity, raw.BoxQuantity) ?? 0,
    minPlayers: pickNumber(raw.minPlayers, raw.MinPlayers) ?? 0,
    maxPlayers: pickNumber(raw.maxPlayers, raw.MaxPlayers) ?? 0,
    playTime: pickNumber(raw.playTime, raw.PlayTime, raw.playingTime, raw.PlayingTime) ?? 0,
    componentPenalties: penalties.map(mapComponentPenaltySummary),
  };
}

function mapGameTemplateImage(raw: Record<string, unknown>): string | null {
  const imageUrl = pickString(
    raw.thumbnailUrl as string | undefined,
    raw.ThumbnailUrl as string | undefined,
    raw.imageUrl as string | undefined,
    raw.ImageUrl as string | undefined,
    raw.coverUrl as string | undefined,
    raw.CoverUrl as string | undefined,
    raw.coverImageUrl as string | undefined,
    raw.CoverImageUrl as string | undefined,
  );

  return imageUrl || null;
}

function mapGameTemplate(raw: Record<string, unknown>): GameTemplateDetail {
  return {
    gameTemplateId: pickString(
      raw.gameTemplateId as string,
      raw.GameTemplateId as string,
      raw.id as string,
      raw.Id as string,
    ),
    title: pickString(
      raw.title as string,
      raw.Title as string,
      raw.gameName as string,
      raw.GameName as string,
      raw.name as string,
      raw.Name as string,
    ),
    description: (raw.description as string | null) ?? (raw.Description as string | null) ?? null,
    imageUrl: mapGameTemplateImage(raw),
    minPlayers: pickNumber(raw.minPlayers as number, raw.MinPlayers as number) ?? 0,
    maxPlayers: pickNumber(raw.maxPlayers as number, raw.MaxPlayers as number) ?? 0,
    playingTime:
      pickNumber(
        raw.playTime as number,
        raw.PlayTime as number,
        raw.playingTime as number,
        raw.PlayingTime as number,
      ) ?? 0,
  };
}

export function mapApiInventoryDetail(raw: RawInventoryDetail): InventoryDetail {
  const templateRaw = (raw.gameTemplate ?? raw.GameTemplate) as Record<string, unknown> | undefined;
  const penalties =
    raw.componentPenalties ??
    raw.ComponentPenalties ??
    raw.components ??
    raw.Components ??
    [];

  // API list/detail thường flat (gameName, thumbnailUrl...) — không có nested gameTemplate
  const gameTemplate = templateRaw
    ? mapGameTemplate(templateRaw)
    : mapGameTemplate(raw as unknown as Record<string, unknown>);

  if (!gameTemplate.gameTemplateId) {
    gameTemplate.gameTemplateId = pickString(raw.gameTemplateId, raw.GameTemplateId);
  }
  if (!gameTemplate.imageUrl) {
    gameTemplate.imageUrl = pickInventoryImage(raw);
  }
  if (!gameTemplate.title) {
    gameTemplate.title = pickString(raw.gameName, raw.GameName, raw.name, raw.Name);
  }

  return {
    inventoryId: pickString(raw.id, raw.Id, raw.inventoryId, raw.InventoryId),
    cafeId: pickString(raw.cafeId, raw.CafeId),
    gameTemplate,
    barcode: raw.barcode ?? raw.Barcode ?? null,
    status: pickString(raw.status, raw.Status) || 'Available',
    condition: raw.condition ?? raw.Condition ?? null,
    purchaseDate: parseApiDate(raw.purchaseDate ?? raw.PurchaseDate ?? raw.createdAt ?? raw.CreatedAt),
    notes: raw.notes ?? raw.Notes ?? null,
    componentPenalties: penalties.map(mapComponentPenaltyDetail),
  };
}

export function mapApiNearbyCafe(raw: RawNearbyCafe): NearbyCafe {
  const distanceMeters = pickNumber(
    raw.distanceMeters,
    raw.DistanceMeters,
    raw.distance,
    raw.Distance,
  );
  const distanceKm =
    pickNumber(raw.distanceKm, raw.DistanceKm) ??
    (distanceMeters != null ? distanceMeters / 1000 : null);

  let distanceLabel = raw.distanceLabel ?? raw.DistanceLabel ?? null;
  if (!distanceLabel && distanceMeters != null) {
    distanceLabel =
      distanceMeters < 1000
        ? `${Math.round(distanceMeters)} m`
        : `${(distanceMeters / 1000).toFixed(1)} km`;
  } else if (!distanceLabel && distanceKm != null) {
    distanceLabel = `${distanceKm.toFixed(1)} km`;
  }

  return {
    id: pickString(raw.id, raw.Id, raw.cafeId, raw.CafeId),
    name: pickString(raw.name, raw.Name),
    address: raw.address ?? raw.Address ?? null,
    phoneNumber: raw.phoneNumber ?? raw.PhoneNumber ?? null,
    description: raw.description ?? raw.Description ?? null,
    latitude: pickNumber(raw.latitude, raw.Latitude) ?? null,
    longitude: pickNumber(raw.longitude, raw.Longitude) ?? null,
    distanceMeters: distanceMeters ?? null,
    distanceKm,
    distanceLabel,
    availableGameCount: pickNumber(raw.availableGameCount, raw.AvailableGameCount) ?? 0,
    totalGameBoxCount: pickNumber(raw.totalGameBoxCount, raw.TotalGameBoxCount) ?? 0,
    availableTableCount: pickNumber(raw.availableTableCount, raw.AvailableTableCount) ?? 0,
    totalTableCount: pickNumber(raw.totalTableCount, raw.TotalTableCount) ?? 0,
    selectedGameAvailabilityStatus:
      raw.selectedGameAvailabilityStatus ?? raw.SelectedGameAvailabilityStatus ?? null,
    estimatedWaitMinutes:
      pickNumber(raw.estimatedWaitMinutes, raw.EstimatedWaitMinutes) ?? null,
  };
}

function extractNearbyCafeItems(raw: unknown): RawNearbyCafe[] {
  if (!raw) return [];
  if (Array.isArray(raw)) return raw as RawNearbyCafe[];

  const r = raw as Record<string, unknown>;

  // Shape chuẩn: { cafes: { data: [...] }, emptyResultMessage, alternativeSuggestions }
  const cafesBlock = (r.cafes ?? r.Cafes) as
    | { data?: RawNearbyCafe[]; Data?: RawNearbyCafe[] }
    | RawNearbyCafe[]
    | undefined;
  if (Array.isArray(cafesBlock)) return cafesBlock;
  if (cafesBlock && typeof cafesBlock === 'object') {
    const list = cafesBlock.data ?? cafesBlock.Data;
    if (Array.isArray(list)) return list;
  }

  // Fallback các shape cũ
  const level1 = r.data;
  if (Array.isArray(level1)) return level1 as RawNearbyCafe[];
  if (level1 && typeof level1 === 'object') {
    const nested = level1 as { data?: RawNearbyCafe[]; cafes?: { data?: RawNearbyCafe[] } };
    if (Array.isArray(nested.data)) return nested.data;
    if (Array.isArray(nested.cafes?.data)) return nested.cafes.data;
  }

  return [];
}

export function normalizeNearbyCafeList(raw: unknown): NearbyCafe[] {
  return extractNearbyCafeItems(raw)
    .map(mapApiNearbyCafe)
    .sort((a, b) => {
      const da = a.distanceMeters ?? (a.distanceKm != null ? a.distanceKm * 1000 : Number.POSITIVE_INFINITY);
      const db = b.distanceMeters ?? (b.distanceKm != null ? b.distanceKm * 1000 : Number.POSITIVE_INFINITY);
      return da - db;
    });
}

export function getNearbyEmptyMessage(raw: unknown): string | null {
  if (!raw || typeof raw !== 'object') return null;
  const r = raw as Record<string, unknown>;
  const message = r.emptyResultMessage ?? r.EmptyResultMessage;
  return typeof message === 'string' && message.trim() ? message : null;
}

export function mapApiStaffWorkingCafe(raw: Record<string, unknown>): StaffWorkingCafe {
  return {
    id: pickString(raw.id as string, raw.Id as string, raw.cafeId as string, raw.CafeId as string),
    name: pickString(raw.name as string, raw.Name as string, raw.cafeName as string, raw.CafeName as string),
    address: (raw.address as string | null) ?? (raw.Address as string | null) ?? null,
  };
}

export function normalizeInventoryListResponse(
  raw: RawInventoryListItem[] | RawInventoryListResponse | null | undefined,
  params: InventoryListParams,
): PaginatedResponse<InventoryListItem> {
  const items = Array.isArray(raw)
    ? raw
    : raw?.data ?? raw?.items ?? raw?.Items ?? [];

  let mapped = items.map(mapApiInventoryListItem);

  const search = params.search?.trim().toLowerCase();
  if (search) {
    mapped = mapped.filter(
      (item) =>
        item.name.toLowerCase().includes(search) ||
        item.barcode?.toLowerCase().includes(search) ||
        item.inventoryId.toLowerCase().includes(search),
    );
  }

  if (params.status && params.status !== 'all') {
    mapped = mapped.filter(
      (item) => item.status.toUpperCase() === params.status!.toUpperCase(),
    );
  }

  const totalItems = Array.isArray(raw)
    ? mapped.length
    : pickNumber(
        raw?.meta?.totalItems,
        raw?.totalCount,
        raw?.TotalCount,
        mapped.length,
      ) ?? mapped.length;

  const page = params.page;
  const limit = params.limit;
  const totalPages = Math.max(1, Math.ceil(totalItems / limit));

  if (Array.isArray(raw)) {
    const start = (page - 1) * limit;
    return {
      data: mapped.slice(start, start + limit),
      meta: {
        currentPage: page,
        limit,
        totalItems: mapped.length,
        totalPages: Math.max(1, Math.ceil(mapped.length / limit)),
        hasPrevious: page > 1,
        hasNext: page * limit < mapped.length,
      },
    };
  }

  return {
    data: mapped,
    meta: {
      currentPage: pickNumber(raw?.meta?.currentPage, raw?.page, raw?.Page, page) ?? page,
      limit:
        pickNumber(
          raw?.meta?.limit,
          raw?.meta?.pageSize,
          raw?.meta?.PageSize,
          raw?.pageSize,
          raw?.PageSize,
          limit,
        ) ?? limit,
      totalItems,
      totalPages,
      hasPrevious:
        typeof raw?.meta?.hasPrevious === 'boolean' ? raw.meta.hasPrevious : page > 1,
      hasNext: typeof raw?.meta?.hasNext === 'boolean' ? raw.meta.hasNext : page < totalPages,
    },
  };
}

export function formatCurrencyVnd(value: number): string {
  return new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(value);
}

export function formatInventoryDate(value?: string | null): string {
  if (!value) return '—';
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? value : date.toLocaleDateString('vi-VN');
}
