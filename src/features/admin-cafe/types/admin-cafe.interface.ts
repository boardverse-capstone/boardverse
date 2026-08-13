import type { CafeOperationalStatusValue } from '@/core/constants/admin-cafe';
import type { PaginationParams } from '@/shared/types/pagination.interface';

export interface AdminCafeListParams extends PaginationParams {
  status?: CafeOperationalStatusValue | 'all';
  managerId?: string;
}

export interface AdminCafe {
  id: string;
  name: string;
  address: string;
  latitude: number;
  longitude: number;
  phoneNumber: string;
  managerId: string;
  managerName: string;
  operationalStatus: CafeOperationalStatusValue | string;
  depositRefundPolicy: string;
  createdAt: string;
  isActive: boolean;
}

export interface AdminCafeDetail extends AdminCafe {
  description: string | null;
  managerEmail: string | null;
  operationalStatusReason: string | null;
  operationalStatusChangedAt: string | null;
  weekdayOpen: string | null;
  weekdayClose: string | null;
  weekendOpen: string | null;
  weekendClose: string | null;
  numberOfTables: number | null;
  numberOfPrivateRooms: number | null;
  totalSeats: number | null;
  numberOfGamesOwned: number | null;
  popularGamesList: string | null;
  hasGameMaster: boolean;
  billingModel: string | null;
  basePrice: number | null;
  tieredBlockRate: number | null;
  tieredBlockMinutes: number | null;
  isPricingLocked: boolean;
  depositPercentage: number | null;
  defaultHoldDurationMinutes: number | null;
  hasSePayConfigured: boolean;
  updatedAt: string | null;
}

export interface CreateAdminCafeRequest {
  name: string;
  address: string;
  latitude: number;
  longitude: number;
  phoneNumber: string;
  managerId: string;
  description?: string;
}

export interface UpdateAdminCafeRequest {
  name?: string;
  address?: string;
  latitude?: number;
  longitude?: number;
  phoneNumber?: string;
  description?: string;
}

export interface UpdateOperationalStatusRequest {
  status: CafeOperationalStatusValue;
  reason?: string;
}

export interface UpdateOperationalStatusResponse {
  cafeId: string;
  status: CafeOperationalStatusValue;
  isActive?: boolean;
  reason?: string | null;
  updatedAt?: string;
}

/** Raw list item / detail từ API (camelCase hoặc PascalCase) */
export interface RawAdminCafe {
  id?: string;
  Id?: string;
  name?: string;
  Name?: string;
  address?: string;
  Address?: string;
  latitude?: number;
  Latitude?: number;
  longitude?: number;
  Longitude?: number;
  phoneNumber?: string;
  PhoneNumber?: string;
  phone?: string;
  Phone?: string;
  description?: string | null;
  Description?: string | null;
  managerId?: string;
  ManagerId?: string;
  managerName?: string;
  ManagerName?: string;
  managerEmail?: string | null;
  ManagerEmail?: string | null;
  operationalStatus?: string;
  OperationalStatus?: string;
  partnerOperationalStatus?: string;
  PartnerOperationalStatus?: string;
  status?: string;
  Status?: string;
  isActive?: boolean;
  IsActive?: boolean;
  operationalStatusReason?: string | null;
  OperationalStatusReason?: string | null;
  partnerOperationalStatusReason?: string | null;
  PartnerOperationalStatusReason?: string | null;
  partnerOperationalStatusChangedAt?: string | null;
  PartnerOperationalStatusChangedAt?: string | null;
  weekdayOpen?: string | null;
  WeekdayOpen?: string | null;
  weekdayClose?: string | null;
  WeekdayClose?: string | null;
  weekendOpen?: string | null;
  WeekendOpen?: string | null;
  weekendClose?: string | null;
  WeekendClose?: string | null;
  numberOfTables?: number | null;
  NumberOfTables?: number | null;
  numberOfPrivateRooms?: number | null;
  NumberOfPrivateRooms?: number | null;
  totalSeats?: number | null;
  TotalSeats?: number | null;
  numberOfGamesOwned?: number | null;
  NumberOfGamesOwned?: number | null;
  popularGamesList?: string | null;
  PopularGamesList?: string | null;
  hasGameMaster?: boolean;
  HasGameMaster?: boolean;
  depositRefundPolicy?: string;
  DepositRefundPolicy?: string;
  refundPolicy?: string;
  RefundPolicy?: string;
  billingModel?: string | null;
  BillingModel?: string | null;
  basePrice?: number | null;
  BasePrice?: number | null;
  tieredBlockRate?: number | null;
  TieredBlockRate?: number | null;
  tieredBlockMinutes?: number | null;
  TieredBlockMinutes?: number | null;
  isPricingLocked?: boolean;
  IsPricingLocked?: boolean;
  depositPercentage?: number | null;
  DepositPercentage?: number | null;
  defaultHoldDurationMinutes?: number | null;
  DefaultHoldDurationMinutes?: number | null;
  hasSePayConfigured?: boolean;
  HasSePayConfigured?: boolean;
  createdAt?: string;
  CreatedAt?: string;
  updatedAt?: string | null;
  UpdatedAt?: string | null;
}

export interface RawAdminCafeListResponse {
  items?: RawAdminCafe[];
  Items?: RawAdminCafe[];
  data?: RawAdminCafe[];
  page?: number;
  Page?: number;
  pageSize?: number;
  PageSize?: number;
  totalCount?: number;
  TotalCount?: number;
  totalItems?: number;
  TotalItems?: number;
  totalPages?: number;
  TotalPages?: number;
}

export interface RawUpdateOperationalStatusResponse extends RawAdminCafe {
  cafeId?: string;
  CafeId?: string;
  operationalStatus?: string;
  OperationalStatus?: string;
  isActive?: boolean;
  IsActive?: boolean;
  reason?: string | null;
  Reason?: string | null;
}
