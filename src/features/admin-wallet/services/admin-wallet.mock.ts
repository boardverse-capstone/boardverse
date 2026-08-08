import type { PaginatedResponse } from '@/shared/types/pagination.interface';
import type {
  AdminAdjustWalletBalanceRequest,
  AdminAdjustWalletBalanceResult,
  AdminWallet,
  AdminWalletDetail,
  AdminWalletListParams,
  AdminSetWalletStatusRequest,
  AdminSetWalletStatusResult,
  AdminWalletTransactionParams,
  AdminWalletTransactionsPage,
} from '../types/wallet.interface';
import {
  mapApiAdminWallet,
  mapApiAdminWalletDetail,
  mapApiAdminWalletTransaction,
  normalizeAdminWalletTransactionsPage,
} from '../utils/wallet.mapper';

let MOCK_WALLET_DETAILS: AdminWalletDetail[] = [
  mapApiAdminWalletDetail({
    userId: '092bbcf3-e729-43b5-8913-898961babc99',
    userEmail: 'jonnytran.working@gmail.com',
    userPhoneNumber: '0869503259',
    availableBalance: 0,
    heldBalance: 0,
    totalActiveDeposit: 0,
    riskMultiplier: 1,
    riskScore: 0,
    riskLevel: 'Low',
    isCoolingOff: false,
    coolingOffExpiresAt: null,
    accountStatus: 'Active',
    createdAt: '2026-08-03T12:41:22.632089Z',
    updatedAt: '2026-08-03T12:41:22.632113Z',
  }),
  mapApiAdminWalletDetail({
    userId: '14acc364-e60e-49b5-9399-7e3c9a823407',
    userEmail: 'player5@boardverse.dev',
    userPhoneNumber: null,
    availableBalance: 0,
    heldBalance: 0,
    totalActiveDeposit: 0,
    riskMultiplier: 1,
    riskScore: 0,
    riskLevel: 'Low',
    isCoolingOff: false,
    coolingOffExpiresAt: null,
    accountStatus: 'Active',
    createdAt: '2026-08-03T08:25:23.910026Z',
    updatedAt: '2026-08-03T08:25:23.910026Z',
  }),
  mapApiAdminWalletDetail({
    userId: '04c95c88-deea-4011-98be-3ffacc73538b',
    userEmail: 'player6@boardverse.dev',
    userPhoneNumber: null,
    availableBalance: 10,
    heldBalance: 0,
    totalActiveDeposit: 0,
    riskMultiplier: 1,
    riskScore: 0,
    riskLevel: 'Low',
    isCoolingOff: false,
    coolingOffExpiresAt: null,
    accountStatus: 'Active',
    createdAt: '2026-08-03T03:46:11.604476Z',
    updatedAt: '2026-08-03T03:46:11.604476Z',
  }),
];

const MOCK_WALLETS: AdminWallet[] = MOCK_WALLET_DETAILS.map((item) => mapApiAdminWallet(item));

const MOCK_TRANSACTIONS = [
  mapApiAdminWalletTransaction({
    id: 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa',
    type: 'TopUp',
    amount: 100,
    relatedLobbyId: null,
    relatedBookingId: null,
    relatedPaymentRef: 'SEPAY-001',
    balanceSnapshot: 100,
    note: 'Nạp BVC demo',
    createdAt: '2026-08-03T04:00:00.000Z',
  }),
  mapApiAdminWalletTransaction({
    id: 'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb',
    type: 'AdminDebit',
    amount: -10,
    relatedLobbyId: null,
    relatedBookingId: null,
    relatedPaymentRef: null,
    balanceSnapshot: 90,
    note: 'Điều chỉnh admin',
    createdAt: '2026-08-03T05:00:00.000Z',
  }),
];

function delay(ms = 250) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

export const AdminWalletMockService = {
  getWallets: async (params: AdminWalletListParams): Promise<PaginatedResponse<AdminWallet>> => {
    await delay();

    const search = params.search?.trim().toLowerCase() ?? '';
    const status =
      params.statusFilter && params.statusFilter !== 'all' ? params.statusFilter : undefined;
    const risk =
      params.riskLevelFilter && params.riskLevelFilter !== 'all'
        ? params.riskLevelFilter
        : undefined;

    const filtered = MOCK_WALLETS.filter((wallet) => {
      if (status && wallet.accountStatus !== status) return false;
      if (risk && wallet.riskLevel !== risk) return false;
      if (!search) return true;
      return (
        wallet.userId.toLowerCase().includes(search) ||
        wallet.userEmail.toLowerCase().includes(search)
      );
    });

    const start = (params.page - 1) * params.limit;
    const data = filtered.slice(start, start + params.limit);
    const totalPages = Math.max(1, Math.ceil(filtered.length / params.limit));

    return {
      data,
      meta: {
        currentPage: params.page,
        limit: params.limit,
        totalItems: filtered.length,
        totalPages,
        hasPrevious: params.page > 1,
        hasNext: params.page < totalPages,
      },
    };
  },

  getWalletByUserId: async (userId: string): Promise<AdminWalletDetail> => {
    await delay();
    const found = MOCK_WALLET_DETAILS.find((item) => item.userId === userId);
    if (!found) throw new Error('Không tìm thấy wallet.');
    return found;
  },

  getWalletTransactions: async (
    params: AdminWalletTransactionParams,
  ): Promise<AdminWalletTransactionsPage> => {
    await delay();
    const wallet = MOCK_WALLET_DETAILS.find((item) => item.userId === params.userId);
    const items =
      params.userId === '04c95c88-deea-4011-98be-3ffacc73538b' ? MOCK_TRANSACTIONS : [];

    return normalizeAdminWalletTransactionsPage(
      {
        userId: params.userId,
        userDisplayName: wallet?.userEmail ?? null,
        items,
        page: params.page,
        pageSize: params.limit,
        totalItems: items.length,
        totalPages: items.length === 0 ? 0 : 1,
      },
      params,
    );
  },

  setWalletStatus: async (payload: AdminSetWalletStatusRequest): Promise<AdminSetWalletStatusResult> => {
    await delay();

    const idx = MOCK_WALLET_DETAILS.findIndex((w) => w.userId === payload.targetUserId);
    if (idx === -1) throw new Error('Không tìm thấy wallet.');

    const previousStatus = MOCK_WALLET_DETAILS[idx].accountStatus;
    MOCK_WALLET_DETAILS = MOCK_WALLET_DETAILS.map((w) =>
      w.userId === payload.targetUserId
        ? {
            ...w,
            accountStatus: payload.newStatus,
            isCoolingOff: payload.expiresAt != null ? true : w.isCoolingOff,
            coolingOffExpiresAt: payload.expiresAt,
          }
        : w,
    );

    return {
      targetUserId: payload.targetUserId,
      previousStatus,
      newStatus: payload.newStatus,
      expiresAt: payload.expiresAt,
      changedAt: new Date().toISOString(),
    };
  },

  adjustWalletBalance: async (
    payload: AdminAdjustWalletBalanceRequest,
  ): Promise<AdminAdjustWalletBalanceResult> => {
    await delay();

    const idx = MOCK_WALLET_DETAILS.findIndex((w) => w.userId === payload.targetUserId);
    if (idx === -1) throw new Error('Không tìm thấy wallet.');

    const current = MOCK_WALLET_DETAILS[idx];
    const delta = payload.isCredit ? payload.amountBvc : -payload.amountBvc;
    const newAvailableBalance = current.availableBalance + delta;

    MOCK_WALLET_DETAILS = MOCK_WALLET_DETAILS.map((w) =>
      w.userId === payload.targetUserId
        ? {
            ...w,
            availableBalance: newAvailableBalance,
            heldBalance: current.heldBalance,
            updatedAt: new Date().toISOString(),
          }
        : w,
    );

    return {
      ledgerEntryId: crypto.randomUUID(),
      newAvailableBalance,
      newHeldBalance: current.heldBalance,
      balanceSnapshot: newAvailableBalance,
      wasIdempotentReplay: false,
    };
  },
};
