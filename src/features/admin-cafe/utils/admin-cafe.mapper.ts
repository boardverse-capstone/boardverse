import type { PaginatedResponse } from '@/shared/types/pagination.interface';
import type {
  AdminCafe,
  AdminCafeDetail,
  AdminCafeListParams,
  RawAdminCafe,
  RawAdminCafeListResponse,
  RawUpdateOperationalStatusResponse,
  UpdateOperationalStatusResponse,
} from '../types/admin-cafe.interface';
import type { CafeOperationalStatusValue } from '@/core/constants/admin-cafe';

function pickString(...values: (string | null | undefined)[]): string {
  for (const value of values) {
    if (value != null && value !== '') return value;
  }
  return '';
}

function pickNullableString(...values: (string | null | undefined)[]): string | null {
  for (const value of values) {
    if (value == null) continue;
    if (typeof value === 'string') {
      const trimmed = value.trim();
      if (trimmed) return trimmed;
    }
  }
  return null;
}

function pickNumber(...values: (number | null | undefined)[]): number {
  for (const value of values) {
    if (typeof value === 'number' && !Number.isNaN(value)) return value;
  }
  return 0;
}

function pickNullableNumber(...values: (number | null | undefined)[]): number | null {
  for (const value of values) {
    if (typeof value === 'number' && !Number.isNaN(value)) return value;
  }
  return null;
}

function pickBoolean(...values: (boolean | null | undefined)[]): boolean {
  for (const value of values) {
    if (typeof value === 'boolean') return value;
  }
  return false;
}

const KNOWN_OPERATIONAL_STATUS = new Set<string>([
  'DATA_BLANK',
  'ACTIVE',
  'INACTIVE',
  'BANNED',
]);

/** partnerOperationalStatus → operationalStatus → status → isActive */
function resolveOperationalStatus(raw: RawAdminCafe): CafeOperationalStatusValue | string {
  const fromField = pickString(
    raw.partnerOperationalStatus,
    raw.PartnerOperationalStatus,
    raw.operationalStatus,
    raw.OperationalStatus,
    raw.status,
    raw.Status,
  ).toUpperCase();

  if (KNOWN_OPERATIONAL_STATUS.has(fromField)) return fromField;

  const isActive = raw.isActive ?? raw.IsActive;
  if (isActive === true) return 'ACTIVE';
  if (isActive === false) return 'INACTIVE';

  return fromField || 'INACTIVE';
}

export function mapApiAdminCafe(raw: RawAdminCafe): AdminCafe {
  return {
    id: pickString(raw.id, raw.Id),
    name: pickString(raw.name, raw.Name),
    address: pickString(raw.address, raw.Address),
    latitude: pickNumber(raw.latitude, raw.Latitude),
    longitude: pickNumber(raw.longitude, raw.Longitude),
    phoneNumber: pickString(raw.phoneNumber, raw.PhoneNumber, raw.phone, raw.Phone),
    managerId: pickString(raw.managerId, raw.ManagerId),
    managerName: (() => {
      const name = pickString(raw.managerName, raw.ManagerName);
      if (!name || name.toUpperCase() === 'N/A') return '—';
      return name;
    })(),
    operationalStatus: resolveOperationalStatus(raw),
    depositRefundPolicy:
      pickString(
        raw.refundPolicy,
        raw.RefundPolicy,
        raw.depositRefundPolicy,
        raw.DepositRefundPolicy,
      ) || '—',
    createdAt: pickString(raw.createdAt, raw.CreatedAt),
    isActive: pickBoolean(raw.isActive, raw.IsActive),
  };
}

export function mapApiAdminCafeDetail(raw: RawAdminCafe): AdminCafeDetail {
  return {
    ...mapApiAdminCafe(raw),
    description: pickNullableString(raw.description, raw.Description),
    managerEmail: pickNullableString(raw.managerEmail, raw.ManagerEmail),
    operationalStatusReason: pickNullableString(
      raw.partnerOperationalStatusReason,
      raw.PartnerOperationalStatusReason,
      raw.operationalStatusReason,
      raw.OperationalStatusReason,
    ),
    operationalStatusChangedAt: pickNullableString(
      raw.partnerOperationalStatusChangedAt,
      raw.PartnerOperationalStatusChangedAt,
    ),
    weekdayOpen: pickNullableString(raw.weekdayOpen, raw.WeekdayOpen),
    weekdayClose: pickNullableString(raw.weekdayClose, raw.WeekdayClose),
    weekendOpen: pickNullableString(raw.weekendOpen, raw.WeekendOpen),
    weekendClose: pickNullableString(raw.weekendClose, raw.WeekendClose),
    numberOfTables: pickNullableNumber(raw.numberOfTables, raw.NumberOfTables),
    numberOfPrivateRooms: pickNullableNumber(
      raw.numberOfPrivateRooms,
      raw.NumberOfPrivateRooms,
    ),
    totalSeats: pickNullableNumber(raw.totalSeats, raw.TotalSeats),
    numberOfGamesOwned: pickNullableNumber(
      raw.numberOfGamesOwned,
      raw.NumberOfGamesOwned,
    ),
    popularGamesList: pickNullableString(raw.popularGamesList, raw.PopularGamesList),
    hasGameMaster: pickBoolean(raw.hasGameMaster, raw.HasGameMaster),
    billingModel: pickNullableString(raw.billingModel, raw.BillingModel),
    basePrice: pickNullableNumber(raw.basePrice, raw.BasePrice),
    tieredBlockRate: pickNullableNumber(raw.tieredBlockRate, raw.TieredBlockRate),
    tieredBlockMinutes: pickNullableNumber(
      raw.tieredBlockMinutes,
      raw.TieredBlockMinutes,
    ),
    isPricingLocked: pickBoolean(raw.isPricingLocked, raw.IsPricingLocked),
    depositPercentage: pickNullableNumber(raw.depositPercentage, raw.DepositPercentage),
    defaultHoldDurationMinutes: pickNullableNumber(
      raw.defaultHoldDurationMinutes,
      raw.DefaultHoldDurationMinutes,
    ),
    hasSePayConfigured: pickBoolean(raw.hasSePayConfigured, raw.HasSePayConfigured),
    updatedAt: pickNullableString(raw.updatedAt, raw.UpdatedAt),
  };
}

export function normalizeAdminCafeListResponse(
  raw: RawAdminCafeListResponse | RawAdminCafe[] | null | undefined,
  params: AdminCafeListParams,
): PaginatedResponse<AdminCafe> {
  const items = Array.isArray(raw)
    ? raw
    : (raw?.items ?? raw?.Items ?? raw?.data ?? []);

  const data = items.map(mapApiAdminCafe);

  const totalItems = Array.isArray(raw)
    ? data.length
    : pickNumber(raw?.totalCount, raw?.TotalCount, raw?.totalItems, raw?.TotalItems, data.length);

  const page = Array.isArray(raw)
    ? params.page
    : pickNumber(raw?.page, raw?.Page, params.page) || params.page;
  const limit = Array.isArray(raw)
    ? params.limit
    : pickNumber(raw?.pageSize, raw?.PageSize, params.limit) || params.limit;
  const totalPages =
    (!Array.isArray(raw) && pickNumber(raw?.totalPages, raw?.TotalPages)) ||
    Math.max(1, Math.ceil(totalItems / Math.max(limit, 1)));

  return {
    data,
    meta: {
      currentPage: page,
      limit,
      totalItems,
      totalPages,
      hasPrevious: page > 1,
      hasNext: page < totalPages,
    },
  };
}

export function mapOperationalStatusResponse(
  raw: RawUpdateOperationalStatusResponse,
): UpdateOperationalStatusResponse {
  // Response thật: { cafeId, operationalStatus, isActive, reason }
  const status = pickString(
    raw.operationalStatus,
    raw.OperationalStatus,
    raw.partnerOperationalStatus,
    raw.PartnerOperationalStatus,
    raw.status,
    raw.Status,
  ).toUpperCase() as CafeOperationalStatusValue;

  return {
    cafeId: pickString(raw.cafeId, raw.CafeId, raw.id, raw.Id),
    status,
    isActive: raw.isActive ?? raw.IsActive,
    reason: raw.reason ?? raw.Reason ?? null,
    updatedAt: raw.updatedAt ?? raw.UpdatedAt ?? undefined,
  };
}

export function formatCafeDate(value?: string | null): string {
  if (!value) return '—';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return date.toLocaleString('vi-VN');
}

export function formatCafeCoordinate(value: number): string {
  if (!Number.isFinite(value)) return '—';
  return value.toFixed(6);
}

export function formatCafeMoney(value?: number | null): string {
  if (value == null || !Number.isFinite(value)) return '—';
  return `${value.toLocaleString('vi-VN')} đ`;
}

export function formatCafePercent(value?: number | null): string {
  if (value == null || !Number.isFinite(value)) return '—';
  return `${Math.round(value * 100)}%`;
}

export function formatCafeHours(open?: string | null, close?: string | null): string {
  if (!open && !close) return '—';
  return `${open || '—'} – ${close || '—'}`;
}

export function formatCafeYesNo(value: boolean): string {
  return value ? 'Có' : 'Không';
}
