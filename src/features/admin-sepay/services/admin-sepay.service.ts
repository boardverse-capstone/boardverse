import apiClient from '@/core/api/client';
import type {
  CreateSePayAccountRequest,
  SePayAccount,
  SePayAccountListParams,
  UpdateSePayAccountRequest,
  UpdateSePayEnvironmentRequest,
} from '../types/sepay-account.interface';

export const ADMIN_SEPAY_QUERY_KEYS = {
  list: 'admin-sepay-accounts',
  detail: 'admin-sepay-account-detail',
  master: 'admin-sepay-master',
} as const;

function normalizeList(
  raw: SePayAccount[] | { data?: SePayAccount[]; items?: SePayAccount[] },
): SePayAccount[] {
  if (Array.isArray(raw)) return raw;
  return raw.items ?? raw.data ?? [];
}

export const AdminSePayService = {
  /** GET /api/sepay-accounts */
  getAccounts: async (params: SePayAccountListParams = {}): Promise<SePayAccount[]> => {
    const raw = await apiClient.get<
      never,
      SePayAccount[] | { data?: SePayAccount[]; items?: SePayAccount[] }
    >('/api/sepay-accounts', {
      params: {
        accountType:
          params.accountType && params.accountType !== 'all' ? params.accountType : undefined,
        cafeId: params.cafeId?.trim() || undefined,
        isActive:
          params.isActive === undefined || params.isActive === 'all'
            ? undefined
            : params.isActive,
      },
    });
    return normalizeList(raw);
  },

  /** GET /api/sepay-accounts/{id} */
  getAccountById: async (id: string): Promise<SePayAccount> => {
    return apiClient.get<never, SePayAccount>(`/api/sepay-accounts/${id}`);
  },

  /** GET /api/sepay-accounts/master */
  getMasterAccount: async (): Promise<SePayAccount> => {
    return apiClient.get<never, SePayAccount>('/api/sepay-accounts/master');
  },

  /** POST /api/sepay-accounts */
  createAccount: async (payload: CreateSePayAccountRequest): Promise<SePayAccount> => {
    return apiClient.post<never, SePayAccount>('/api/sepay-accounts', payload);
  },

  /** PUT /api/sepay-accounts/{id} */
  updateAccount: async (
    id: string,
    payload: UpdateSePayAccountRequest,
  ): Promise<SePayAccount> => {
    return apiClient.put<never, SePayAccount>(`/api/sepay-accounts/${id}`, payload);
  },

  /** DELETE /api/sepay-accounts/{id} */
  deleteAccount: async (id: string): Promise<void> => {
    await apiClient.delete(`/api/sepay-accounts/${id}`);
  },

  /** PUT /api/sepay-accounts/{id}/environment */
  updateEnvironment: async (
    id: string,
    payload: UpdateSePayEnvironmentRequest,
  ): Promise<SePayAccount> => {
    return apiClient.put<never, SePayAccount>(
      `/api/sepay-accounts/${id}/environment`,
      payload,
    );
  },
};
