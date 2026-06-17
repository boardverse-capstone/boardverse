import type {

  PaginatedResponse,

  PaginationMeta,

} from '@/shared/types/pagination.interface';

import type {

  ApplicationStatus,

  BillingModel,

  OperationalStatus,

  PartnerApplication,

  PartnerApplicationListParams,

  RawCafePartnerApplication,

  Registration,

  WorkingHours,

} from '../types/partner.interface';



interface RawPartnerListResponse {

  data?: RawCafePartnerApplication[] | RawPartnerListResponse;

  items?: RawCafePartnerApplication[];

  Items?: RawCafePartnerApplication[];

  TotalCount?: number;

  totalCount?: number;

  totalItems?: number;

  Page?: number;

  page?: number;

  currentPage?: number;

  PageSize?: number;

  pageSize?: number;

  limit?: number;

  TotalPages?: number;

  totalPages?: number;

  HasPrevious?: boolean;

  hasPrevious?: boolean;

  HasNext?: boolean;

  hasNext?: boolean;

  meta?: Partial<PaginationMeta> & {

    pageSize?: number;

    PageSize?: number;

  };

}



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



function isRecord(value: unknown): value is Record<string, unknown> {

  return typeof value === 'object' && value !== null;

}



function parseApiDate(value?: string | null): string | null {

  if (!value) return null;

  const normalized = value.includes('T') ? value : value.replace(' ', 'T');

  const date = new Date(normalized);

  return Number.isNaN(date.getTime()) ? value : date.toISOString();

}



function normalizeWorkingHours(raw?: WorkingHours | null): WorkingHours | undefined {

  if (!raw) return undefined;



  const weekdayStart = pickString(raw.weekdayStart);

  const weekdayEnd = pickString(raw.weekdayEnd);

  const weekendStart = pickString(raw.weekendStart);

  const weekendEnd = pickString(raw.weekendEnd);



  if (!weekdayStart && !weekdayEnd && !weekendStart && !weekendEnd) {

    return undefined;

  }



  return { weekdayStart, weekdayEnd, weekendStart, weekendEnd };

}



function normalizeApplicationStatus(value?: string | null): ApplicationStatus {

  const normalized = (value ?? 'PENDING').toUpperCase() as ApplicationStatus;

  if (normalized === 'APPROVED' || normalized === 'REJECTED' || normalized === 'PENDING') {

    return normalized;

  }

  return 'PENDING';

}



function normalizeOperationalStatus(value?: string | null): OperationalStatus | null {

  if (!value) return null;

  const normalized = value.toUpperCase() as OperationalStatus;

  if (normalized === 'DATA_BLANK' || normalized === 'ACTIVE' || normalized === 'SUSPENDED') {

    return normalized;

  }

  return null;

}



function normalizeBillingModel(value?: string | null): BillingModel {

  return value === 'PER_DRINK' ? 'PER_DRINK' : 'BY_HOUR';

}



export function normalizePartnerDetailResponse(raw: unknown): PartnerApplication {
  if (!isRecord(raw)) {
    throw new Error('Phản hồi chi tiết đơn không hợp lệ.');
  }

  if (raw.id || raw.cafeName || raw.CafeName) {
    return mapApiPartnerApplication(raw as RawCafePartnerApplication);
  }

  const nested = raw.data;
  if (isRecord(nested) && (nested.id || nested.cafeName || nested.CafeName)) {
    return mapApiPartnerApplication(nested as RawCafePartnerApplication);
  }

  throw new Error('Phản hồi chi tiết đơn không hợp lệ.');
}

export function mapApiPartnerApplication(raw: RawCafePartnerApplication): PartnerApplication {

  return {

    id: pickString(raw.id),

    cafeName: pickString(raw.cafeName),

    address: pickString(raw.address),

    hotline: pickString(raw.hotline),

    representativeEmail: pickString(raw.representativeEmail),

    workingHours: normalizeWorkingHours(raw.workingHours),

    businessLicense: pickString(raw.businessLicense),

    businessLicenseImageUrl: pickString(raw.businessLicenseImageUrl),

    numberOfTables: pickNumber(raw.numberOfTables) ?? 0,

    numberOfPrivateRooms: pickNumber(raw.numberOfPrivateRooms) ?? 0,

    spaceImageUrls: raw.spaceImageUrls ?? [],

    numberOfGamesOwned: pickNumber(raw.numberOfGamesOwned) ?? 0,

    popularGamesList: pickString(raw.popularGamesList),

    hasGameMaster: pickBoolean(raw.hasGameMaster),

    billingModel: normalizeBillingModel(raw.billingModel),

    tableNames: raw.tableNames ?? [],

    applicationStatus: normalizeApplicationStatus(raw.applicationStatus),

    operationalStatus: normalizeOperationalStatus(raw.operationalStatus),

    rejectionReason: raw.rejectionReason ?? null,

    requiresCsSupport: pickBoolean(raw.requiresCsSupport),

    isTableLayoutConfigured: pickBoolean(raw.isTableLayoutConfigured),

    canActivate: pickBoolean(raw.canActivate),

    activationBlockers: raw.activationBlockers ?? [],

    submittedByUserId: raw.submittedByUserId ?? null,

    submittedByUsername: raw.submittedByUsername ?? null,

    reviewedByAdminId: raw.reviewedByAdminId ?? null,

    reviewedByAdminUsername: raw.reviewedByAdminUsername ?? null,

    createdManagerUserId: raw.createdManagerUserId ?? null,

    createdCafeId: raw.createdCafeId ?? null,

    submittedAt: parseApiDate(raw.submittedAt) ?? '',

    updatedAt: parseApiDate(raw.updatedAt) ?? '',

    reviewedAt: parseApiDate(raw.reviewedAt),

    approvedAt: parseApiDate(raw.approvedAt),

    operationalProfileUpdatedAt: parseApiDate(raw.operationalProfileUpdatedAt),

  };

}



function extractItems(raw: RawPartnerListResponse): RawCafePartnerApplication[] {

  const nestedData = raw.data;

  if (isRecord(nestedData) && !Array.isArray(nestedData)) {

    return extractItems(nestedData as RawPartnerListResponse);

  }



  return raw.Items ?? raw.items ?? (Array.isArray(raw.data) ? raw.data : []) ?? [];

}



function extractMeta(

  raw: RawPartnerListResponse,

  params: PartnerApplicationListParams,

  itemCount: number,

): PaginationMeta {

  const meta = raw.meta;

  const page =

    pickNumber(meta?.currentPage, raw.Page, raw.page, raw.currentPage, params.page) ?? params.page;

  const limit =

    pickNumber(meta?.limit, meta?.pageSize, meta?.PageSize, raw.PageSize, raw.pageSize, raw.limit, params.limit) ??

    params.limit;

  const totalItems =

    pickNumber(meta?.totalItems, raw.TotalCount, raw.totalCount, raw.totalItems, itemCount) ??

    itemCount;

  const totalPages = Math.max(

    1,

    pickNumber(meta?.totalPages, raw.TotalPages, raw.totalPages) ?? Math.ceil(totalItems / limit),

  );



  return {

    currentPage: page,

    limit,

    totalItems,

    totalPages,

    hasPrevious: meta?.hasPrevious ?? raw.HasPrevious ?? raw.hasPrevious ?? page > 1,

    hasNext: meta?.hasNext ?? raw.HasNext ?? raw.hasNext ?? page < totalPages,

  };

}



export function normalizePartnerListResponse(

  raw: RawPartnerListResponse | RawCafePartnerApplication[],

  params: PartnerApplicationListParams,

): PaginatedResponse<PartnerApplication> {

  if (Array.isArray(raw)) {

    const data = raw.map(mapApiPartnerApplication);

    const totalItems = data.length;

    const totalPages = Math.max(1, Math.ceil(totalItems / params.limit));



    return {

      data,

      meta: {

        currentPage: params.page,

        limit: params.limit,

        totalItems,

        totalPages,

        hasPrevious: params.page > 1,

        hasNext: params.page < totalPages,

      },

    };

  }



  const items = extractItems(raw).map(mapApiPartnerApplication);



  return {

    data: items,

    meta: extractMeta(raw, params, items.length),

  };

}



export function formatWorkingHours(hours?: WorkingHours): string {

  if (!hours) return 'Chưa nhập';



  const weekday = [hours.weekdayStart, hours.weekdayEnd].filter(Boolean).join('–');

  const weekend = [hours.weekendStart, hours.weekendEnd].filter(Boolean).join('–');



  if (weekday && weekend) {

    return `T2–T6: ${weekday} · T7–CN: ${weekend}`;

  }



  return weekday || weekend || 'Chưa nhập';

}



function mapLegacyRegistrationStatus(registration: Registration): {

  applicationStatus: ApplicationStatus;

  operationalStatus: OperationalStatus | null;

} {

  switch (registration.status) {

    case 'REJECTED':

    case 'CANCELLED':

    case 'EXPIRED_CANCELLED':

      return { applicationStatus: 'REJECTED', operationalStatus: null };

    case 'ACTIVE':

      return { applicationStatus: 'APPROVED', operationalStatus: 'ACTIVE' };

    case 'DATA_BLANK':

      return { applicationStatus: 'APPROVED', operationalStatus: 'DATA_BLANK' };

    default:

      return { applicationStatus: 'PENDING', operationalStatus: null };

  }

}



export function mapRegistrationToPartnerApplication(registration: Registration): PartnerApplication {

  const { applicationStatus, operationalStatus } = mapLegacyRegistrationStatus(registration);



  return {

    id: registration.id,

    cafeName: registration.basicInfo.cafeName,

    address: registration.basicInfo.address,

    hotline: registration.basicInfo.hotline,

    representativeEmail: registration.basicInfo.representativeEmail,

    businessLicense: registration.basicInfo.businessLicense,

    businessLicenseImageUrl: registration.basicInfo.businessLicenseImage,

    numberOfTables: registration.infrastructure.numberOfTables,

    numberOfPrivateRooms: registration.infrastructure.numberOfPrivateRooms,

    spaceImageUrls: registration.infrastructure.spaceImages,

    numberOfGamesOwned: registration.boardGameCatalog.numberOfGamesOwned,

    popularGamesList: registration.boardGameCatalog.listOfPopularGames,

    hasGameMaster: registration.additionalServices.hasGameMaster,

    billingModel: registration.additionalServices.billingModel,

    tableNames: [],

    applicationStatus,

    operationalStatus,

    rejectionReason: registration.rejectionReason ?? null,

    requiresCsSupport: registration.alerts.some((alert) => alert.type === 'CS_SUPPORT'),

    isTableLayoutConfigured: false,

    canActivate: operationalStatus === 'DATA_BLANK',

    activationBlockers: [],

    submittedByUserId: null,

    submittedByUsername: null,

    reviewedByAdminId: null,

    reviewedByAdminUsername: null,

    createdManagerUserId: registration.managerAccount ? registration.id : null,

    createdCafeId: null,

    submittedAt: registration.createdAt,

    updatedAt: registration.updatedAt,

    reviewedAt: null,

    approvedAt: registration.contractSignedAt ?? null,

    operationalProfileUpdatedAt: null,

  };

}



/** @deprecated Dùng mapRegistrationToPartnerApplication */

export function toPartnerApplication(registration: Registration): PartnerApplication {

  return mapRegistrationToPartnerApplication(registration);

}



export function toPartnerActionTarget(application: PartnerApplication) {

  return {

    id: application.id,

    cafeName: application.cafeName,

    applicationStatus: application.applicationStatus,

    operationalStatus: application.operationalStatus,

    canActivate: application.canActivate,

  };

}



export function formatApiDate(value?: string | null): string {

  if (!value) return '—';

  const date = new Date(value);

  return Number.isNaN(date.getTime()) ? value : date.toLocaleString('vi-VN');

}


