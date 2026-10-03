import apiClient from '@/core/api/client';
import type { PaginatedResponse } from '@/shared/types/pagination.interface';
import type {
  ApproveRegistrationResult,
  BillingModel,
  OperationalProfileResponse,
  OperationalProfileUpdate,
  PartnerApplication,
  PartnerApplicationListParams,
  PartnerRegistrationRequest,
  RejectRegistrationRequest,
  SubmitRegistrationResponse,
  TransitionRegistrationRequest,
  TransitionRegistrationResponse,
  WorkingHours,
} from '../types/partner.interface';
import {
  normalizeApproveRegistrationResponse,
  normalizeOperationalProfileResponse,
  normalizePartnerDetailResponse,
  normalizePartnerListResponse,
  normalizePartnerMutationResponse,
} from '../utils/partner.mapper';

const USE_MOCK = false;

export const PARTNER_QUERY_KEYS = {
  pending: 'partner-pending',
  detail: 'partner-detail',
} as const;

/** GET query `status` — BE enum: PendingApproval | Approved | Rejected */
function toApiApplicationStatus(status?: string): string | undefined {
  if (!status || status === 'all') return undefined;
  const map: Record<string, string> = {
    PENDING: 'PendingApproval',
    PENDING_APPROVAL: 'PendingApproval',
    APPROVED: 'Approved',
    REJECTED: 'Rejected',
  };
  return map[status] ?? map[status.toUpperCase()] ?? status;
}

export const PartnerService = {
  getPendingApplications: async (
    params: PartnerApplicationListParams,
  ): Promise<PaginatedResponse<PartnerApplication>> => {
    const raw = await apiClient.get('/api/admin/cafe-partner-applications', {
      params: {
        // GET /api/admin/cafe-partner-applications — query: search, status, page, pageSize
        search: params.search || undefined,
        status: toApiApplicationStatus(params.status),
        page: params.page,
        pageSize: params.limit,
      },
    });

    return normalizePartnerListResponse(raw, params);
  },

  getRegistrationById: async (id: string): Promise<PartnerApplication> => {
    const raw = await apiClient.get<never, unknown>(
      `/api/admin/cafe-partner-applications/${id}`,
    );

    return normalizePartnerDetailResponse(raw);
  },

  submitRegistration: async (
    payload: PartnerRegistrationRequest,
  ): Promise<SubmitRegistrationResponse> => {
    return apiClient.post<never, SubmitRegistrationResponse>('/admin/partners', payload);
  },

  transitionRegistration: async (
    id: string,
    payload: TransitionRegistrationRequest,
  ): Promise<TransitionRegistrationResponse> => {
    return apiClient.post<never, TransitionRegistrationResponse>(
      `/admin/partners/${id}/transition`,
      payload,
    );
  },

  approveRegistration: async (id: string): Promise<ApproveRegistrationResult> => {
    const raw = await apiClient.post<never, unknown>(
      `/api/admin/cafe-partner-applications/${id}/approve`,
    );

    return normalizeApproveRegistrationResponse(raw);
  },

  rejectRegistration: async (
    id: string,
    payload: RejectRegistrationRequest,
  ): Promise<PartnerApplication> => {
    const raw = await apiClient.post<never, unknown>(
      `/api/admin/cafe-partner-applications/${id}/reject`,
      payload,
    );

    return normalizePartnerMutationResponse(raw);
  },

  /**
   * PUT /api/cafe-partner/me/operational-profile
   * Writes the manager's operational configuration.
   *
   * Read path removed in 2026-10: the form now hydrates from
   * `ManagerCafeService.getMe()` (cafe aggregate) which already
   * includes the operational profile. The standalone GET is gone —
   * the partner service only writes this resource.
   */
  updateOperationalProfile: async (
    payload: OperationalProfileUpdate,
  ): Promise<OperationalProfileResponse> => {
    if (USE_MOCK) {
      throw new Error('Mock không hỗ trợ operational profile.');
    }
    const raw = await apiClient.put(
      '/api/cafe-partner/me/operational-profile',
      payload,
    );
    return normalizeOperationalProfileResponse(raw);
  },
} as const;

/** Re-export for callers that only consume types. */
export type { BillingModel, OperationalProfileResponse, OperationalProfileUpdate, WorkingHours };
