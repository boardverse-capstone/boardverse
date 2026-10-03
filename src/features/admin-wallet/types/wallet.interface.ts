import type { PaginationParams } from '@/shared/types/pagination.interface';

export type WalletAccountStatus =
  | 'Active'
  | 'Warning'
  | 'Restricted'
  | 'Suspended'
  | 'Banned'
  | string;
export type WalletRiskLevel = 'Low' | 'Medium' | 'High' | 'Critical' | string;

export interface AdminWallet {
  userId: string;
  userEmail: string;
  availableBalance: number;
  heldBalance: number;
  totalActiveDeposit: number;
  riskMultiplier: number;
  riskLevel: WalletRiskLevel;
  isCoolingOff: boolean;
  accountStatus: WalletAccountStatus;
  createdAt: string;
}

/** Chi tiết wallet — GET /api/v1/admin/wallet/{userId} */
export interface AdminWalletDetail extends AdminWallet {
  userPhoneNumber: string | null;
  riskScore: number;
  coolingOffExpiresAt: string | null;
  updatedAt: string | null;
}

/** WalletReconcileResultDto — GET /api/v1/admin/wallet/{userId}/reconcile */
export interface WalletReconcileResult {
  userId: string;
  walletBalance: number;
  ledgerSum: number;
  difference: number;
  isReconciled: boolean;
}

export interface AdminWalletListParams extends PaginationParams {
  statusFilter?: string;
  riskLevelFilter?: string;
}

export interface RawAdminWallet {
  userId?: string;
  UserId?: string;
  userEmail?: string;
  UserEmail?: string;
  userPhoneNumber?: string | null;
  UserPhoneNumber?: string | null;
  availableBalance?: number;
  AvailableBalance?: number;
  heldBalance?: number;
  HeldBalance?: number;
  totalActiveDeposit?: number;
  TotalActiveDeposit?: number;
  riskMultiplier?: number;
  RiskMultiplier?: number;
  riskScore?: number;
  RiskScore?: number;
  riskLevel?: string;
  RiskLevel?: string;
  isCoolingOff?: boolean;
  IsCoolingOff?: boolean;
  coolingOffExpiresAt?: string | null;
  CoolingOffExpiresAt?: string | null;
  accountStatus?: string;
  AccountStatus?: string;
  createdAt?: string;
  CreatedAt?: string;
  updatedAt?: string | null;
  UpdatedAt?: string | null;
}

export interface RawAdminWalletListResponse {
  items?: RawAdminWallet[];
  Items?: RawAdminWallet[];
  data?: RawAdminWallet[];
  page?: number;
  Page?: number;
  pageSize?: number;
  PageSize?: number;
  totalItems?: number;
  TotalItems?: number;
  TotalCount?: number;
  totalPages?: number;
  TotalPages?: number;
}

/** LedgerEntryType từ API */
export type LedgerEntryType =
  | 'TopUp'
  | 'DepositHold'
  | 'DepositRelease'
  | 'DepositCapture'
  | 'DepositForfeit'
  | 'Adjustment'
  | 'AdminCredit'
  | 'AdminDebit'
  | string;

/** BvcTransactionDto */
export interface AdminWalletTransaction {
  id: string;
  type: LedgerEntryType;
  amount: number;
  relatedLobbyId: string | null;
  relatedBookingId: string | null;
  relatedPaymentRef: string | null;
  balanceSnapshot: number;
  note: string | null;
  createdAt: string;
}

export interface AdminWalletTransactionParams {
  userId: string;
  page: number;
  limit: number;
}

/** AdminUserTransactionsPageDto đã normalize */
export interface AdminWalletTransactionsPage {
  userId: string;
  userDisplayName: string | null;
  data: AdminWalletTransaction[];
  meta: {
    currentPage: number;
    limit: number;
    totalItems: number;
    totalPages: number;
    hasPrevious: boolean;
    hasNext: boolean;
  };
}

export interface RawAdminWalletTransaction {
  id?: string;
  Id?: string;
  type?: string;
  Type?: string;
  amount?: number;
  Amount?: number;
  relatedLobbyId?: string | null;
  RelatedLobbyId?: string | null;
  relatedBookingId?: string | null;
  RelatedBookingId?: string | null;
  relatedPaymentRef?: string | null;
  RelatedPaymentRef?: string | null;
  balanceSnapshot?: number;
  BalanceSnapshot?: number;
  note?: string | null;
  Note?: string | null;
  createdAt?: string;
  CreatedAt?: string;
}

export interface RawAdminWalletTransactionsPage {
  userId?: string;
  UserId?: string;
  userDisplayName?: string | null;
  UserDisplayName?: string | null;
  items?: RawAdminWalletTransaction[];
  Items?: RawAdminWalletTransaction[];
  page?: number;
  Page?: number;
  pageSize?: number;
  PageSize?: number;
  totalItems?: number;
  TotalItems?: number;
  totalPages?: number;
  TotalPages?: number;
}

export interface AdminSetWalletStatusRequest {
  targetUserId: string;
  newStatus: WalletAccountStatus;
  reason: string;
  expiresAt: string | null;
  idempotencyKey: string;
}

export interface AdminSetWalletStatusResult {
  targetUserId: string;
  previousStatus: WalletAccountStatus;
  newStatus: WalletAccountStatus;
  expiresAt: string | null;
  changedAt: string;
}

export interface AdminAdjustWalletBalanceRequest {
  targetUserId: string;
  amountBvc: number;
  isCredit: boolean;
  reason: string;
  idempotencyKey: string;
}

export interface AdminAdjustWalletBalanceResult {
  ledgerEntryId: string;
  newAvailableBalance: number;
  newHeldBalance: number;
  balanceSnapshot: number;
  wasIdempotentReplay: boolean;
}
