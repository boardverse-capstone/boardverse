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
    componentId: pickString(raw.componentId, raw.ComponentId),
    componentName: pickString(raw.componentName, raw.ComponentName),
    penaltyFee: pickNumber(raw.penaltyFee, raw.PenaltyFee) ?? 0,
    currency: pickString(raw.currency, raw.Currency) || 'VND',
  };
}

function mapComponentPenaltyDetail(raw: RawComponentPenaltyDetail): ComponentPenaltyDetail {
  return {
    componentId: pickString(raw.componentId, raw.ComponentId),
    componentName: pickString(raw.componentName, raw.ComponentName),
    type: pickString(raw.type, raw.Type),
    quantityInBox: pickNumber(raw.quantityInBox, raw.QuantityInBox) ?? 0,
    penaltyFeePerUnit: pickNumber(raw.penaltyFeePerUnit, raw.PenaltyFeePerUnit) ?? 0,
  };
}

export function mapApiInventoryListItem(raw: RawInventoryListItem): InventoryListItem {
  const penalties = raw.componentPenalties ?? raw.ComponentPenalties ?? [];

  return {
    inventoryId: pickString(raw.inventoryId, raw.InventoryId),
    gameTemplateId: pickString(raw.gameTemplateId, raw.GameTemplateId),
    name: pickString(raw.name, raw.Name),
    imageUrl: raw.imageUrl ?? raw.ImageUrl ?? null,
    status: pickString(raw.status, raw.Status) || 'AVAILABLE',
    barcode: raw.barcode ?? raw.Barcode ?? null,
    condition: raw.condition ?? raw.Condition ?? null,
    isFullMode: pickBoolean(raw.isFullMode ?? raw.IsFullMode, true),
    componentPenalties: penalties.map(mapComponentPenaltySummary),
  };
}

function mapGameTemplate(raw: Record<string, unknown>): GameTemplateDetail {
  return {
    gameTemplateId: pickString(raw.gameTemplateId as string, raw.GameTemplateId as string, raw.id as string, raw.Id as string),
    title: pickString(raw.title as string, raw.Title as string, raw.name as string, raw.Name as string),
    description: (raw.description as string | null) ?? (raw.Description as string | null) ?? null,
    minPlayers: pickNumber(raw.minPlayers as number, raw.MinPlayers as number) ?? 0,
    maxPlayers: pickNumber(raw.maxPlayers as number, raw.MaxPlayers as number) ?? 0,
    playingTime: pickNumber(raw.playingTime as number, raw.PlayingTime as number) ?? 0,
  };
}

export function mapApiInventoryDetail(raw: RawInventoryDetail): InventoryDetail {
  const templateRaw = (raw.gameTemplate ?? raw.GameTemplate ?? {}) as Record<string, unknown>;
  const penalties = raw.componentPenalties ?? raw.ComponentPenalties ?? [];

  return {
    inventoryId: pickString(raw.inventoryId, raw.InventoryId),
    cafeId: pickString(raw.cafeId, raw.CafeId),
    gameTemplate: mapGameTemplate(templateRaw),
    barcode: raw.barcode ?? raw.Barcode ?? null,
    status: pickString(raw.status, raw.Status) || 'AVAILABLE',
    condition: raw.condition ?? raw.Condition ?? null,
    purchaseDate: parseApiDate(raw.purchaseDate ?? raw.PurchaseDate),
    notes: raw.notes ?? raw.Notes ?? null,
    componentPenalties: penalties.map(mapComponentPenaltyDetail),
  };
}

export function mapApiNearbyCafe(raw: RawNearbyCafe): NearbyCafe {
  const distanceKm =
    pickNumber(raw.distanceKm, raw.DistanceKm, raw.distance, raw.Distance) ?? null;

  return {
    id: pickString(raw.id, raw.Id, raw.cafeId, raw.CafeId),
    name: pickString(raw.name, raw.Name),
    address: raw.address ?? raw.Address ?? null,
    distanceKm,
    distanceLabel:
      raw.distanceLabel ??
      raw.DistanceLabel ??
      (distanceKm != null ? `${distanceKm.toFixed(1)} km` : null),
  };
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
      limit: pickNumber(raw?.meta?.limit, raw?.pageSize, raw?.PageSize, limit) ?? limit,
      totalItems,
      totalPages,
      hasPrevious: page > 1,
      hasNext: page < totalPages,
    },
  };
}

export function normalizeNearbyCafeList(raw: RawNearbyCafe[] | { data?: RawNearbyCafe[] } | null | undefined): NearbyCafe[] {
  if (!raw) return [];
  const items = Array.isArray(raw) ? raw : raw.data ?? [];
  return items.map(mapApiNearbyCafe).sort((a, b) => (a.distanceKm ?? 999) - (b.distanceKm ?? 999));
}

export function formatCurrencyVnd(value: number): string {
  return new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(value);
}

export function formatInventoryDate(value?: string | null): string {
  if (!value) return '—';
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? value : date.toLocaleDateString('vi-VN');
}
