import type { PaginatedResponse } from '@/shared/types/pagination.interface';
import type {
  AdminWallet,
  AdminWalletDetail,
  AdminWalletListParams,
  AdminWalletTransaction,
  AdminWalletTransactionParams,
  AdminWalletTransactionsPage,
  RawAdminWallet,
  RawAdminWalletListResponse,
  RawAdminWalletTransaction,
  RawAdminWalletTransactionsPage,
} from '../types/wallet.interface';

function pickString(...values: (string | null | undefined)[]): string {
  for (const value of values) {
    if (typeof value === 'string' && value.trim()) return value.trim();
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

function pickBoolean(value: boolean | null | undefined, fallback = false): boolean {
  return value ?? fallback;
}

export function mapApiAdminWallet(raw: RawAdminWallet): AdminWallet {
  return {
    userId: pickString(raw.userId, raw.UserId),
    userEmail: pickString(raw.userEmail, raw.UserEmail),
    availableBalance: pickNumber(raw.availableBalance, raw.AvailableBalance),
    heldBalance: pickNumber(raw.heldBalance, raw.HeldBalance),
    totalActiveDeposit: pickNumber(raw.totalActiveDeposit, raw.TotalActiveDeposit),
    riskMultiplier: pickNumber(raw.riskMultiplier, raw.RiskMultiplier) || 1,
    riskLevel: pickString(raw.riskLevel, raw.RiskLevel) || 'Low',
    isCoolingOff: pickBoolean(raw.isCoolingOff ?? raw.IsCoolingOff),
    accountStatus: pickString(raw.accountStatus, raw.AccountStatus) || 'Active',
    createdAt: pickString(raw.createdAt, raw.CreatedAt),
  };
}

export function mapApiAdminWalletDetail(raw: RawAdminWallet): AdminWalletDetail {
  return {
    ...mapApiAdminWallet(raw),
    userPhoneNumber: pickNullableString(raw.userPhoneNumber, raw.UserPhoneNumber),
    riskScore: pickNumber(raw.riskScore, raw.RiskScore),
    coolingOffExpiresAt: pickNullableString(raw.coolingOffExpiresAt, raw.CoolingOffExpiresAt),
    updatedAt: pickNullableString(raw.updatedAt, raw.UpdatedAt),
  };
}

export function normalizeAdminWalletListResponse(
  raw: RawAdminWalletListResponse | RawAdminWallet[] | null | undefined,
  params: AdminWalletListParams,
): PaginatedResponse<AdminWallet> {
  const items = Array.isArray(raw)
    ? raw
    : (raw?.items ?? raw?.Items ?? raw?.data ?? []);

  const data = items.map(mapApiAdminWallet);

  const totalItems = Array.isArray(raw)
    ? data.length
    : pickNumber(raw?.totalItems, raw?.TotalItems, raw?.TotalCount, data.length);

  const page = Array.isArray(raw) ? params.page : pickNumber(raw?.page, raw?.Page, params.page) || params.page;
  const limit = Array.isArray(raw)
    ? params.limit
    : pickNumber(raw?.pageSize, raw?.PageSize, params.limit) || params.limit;
  const totalPages =
    (!Array.isArray(raw) && pickNumber(raw?.totalPages, raw?.TotalPages)) ||
    Math.max(1, Math.ceil(totalItems / limit));

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

export function formatWalletBalance(value: number): string {
  return new Intl.NumberFormat('vi-VN', { maximumFractionDigits: 2 }).format(value);
}

export function formatWalletDate(value?: string | null): string {
  if (!value) return '—';
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? value : date.toLocaleString('vi-VN');
}

export function mapApiAdminWalletTransaction(
  raw: RawAdminWalletTransaction,
): AdminWalletTransaction {
  return {
    id: pickString(raw.id, raw.Id),
    type: pickString(raw.type, raw.Type) || 'Adjustment',
    amount: pickNumber(raw.amount, raw.Amount),
    relatedLobbyId: pickNullableString(raw.relatedLobbyId, raw.RelatedLobbyId),
    relatedBookingId: pickNullableString(raw.relatedBookingId, raw.RelatedBookingId),
    relatedPaymentRef: pickNullableString(raw.relatedPaymentRef, raw.RelatedPaymentRef),
    balanceSnapshot: pickNumber(raw.balanceSnapshot, raw.BalanceSnapshot),
    note: pickNullableString(raw.note, raw.Note),
    createdAt: pickString(raw.createdAt, raw.CreatedAt),
  };
}

export function normalizeAdminWalletTransactionsPage(
  raw: RawAdminWalletTransactionsPage | null | undefined,
  params: AdminWalletTransactionParams,
): AdminWalletTransactionsPage {
  const items = raw?.items ?? raw?.Items ?? [];
  const data = items.map(mapApiAdminWalletTransaction);
  const page = pickNumber(raw?.page, raw?.Page, params.page) || params.page;
  const limit = pickNumber(raw?.pageSize, raw?.PageSize, params.limit) || params.limit;
  const totalItems = pickNumber(raw?.totalItems, raw?.TotalItems, data.length);
  const totalPages = Math.max(
    1,
    pickNumber(raw?.totalPages, raw?.TotalPages) || Math.ceil(totalItems / limit) || 1,
  );

  return {
    userId: pickString(raw?.userId, raw?.UserId, params.userId),
    userDisplayName: pickNullableString(raw?.userDisplayName, raw?.UserDisplayName),
    data,
    meta: {
      currentPage: page,
      limit,
      totalItems,
      totalPages: totalItems === 0 ? 1 : totalPages,
      hasPrevious: page > 1,
      hasNext: page < (totalItems === 0 ? 1 : totalPages),
    },
  };
}
