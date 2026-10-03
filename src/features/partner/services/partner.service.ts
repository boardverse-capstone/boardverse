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
import { PartnerMockService } from './partner.mock';

const USE_MOCK = false;

export const PARTNER_QUERY_KEYS = {
  pending: 'partner-pending',
  detail: 'partner-detail',
} as const;

export const PartnerService = {
  getPendingApplications: async (
    params: PartnerApplicationListParams,
  ): Promise<PaginatedResponse<PartnerApplication>> => {
    if (USE_MOCK) return PartnerMockService.getPendingApplications(params);

    const raw = await apiClient.get('/api/admin/cafe-partner-applications', {
      params: {
        // GET /api/admin/cafe-partner-applications — query: search, status, page, pageSize
        search: params.search || undefined,
        status: params.status && params.status !== 'all' ? params.status : undefined,
        page: params.page,
        pageSize: params.limit,
      },
    });

    return normalizePartnerListResponse(raw, params);
  },

  getRegistrationById: async (id: string): Promise<PartnerApplication> => {
    if (USE_MOCK) return PartnerMockService.getRegistrationById(id);

    const raw = await apiClient.get<never, unknown>(
      `/api/admin/cafe-partner-applications/${id}`,
    );

    return normalizePartnerDetailResponse(raw);
  },

  submitRegistration: async (
    payload: PartnerRegistrationRequest,
  ): Promise<SubmitRegistrationResponse> => {
    if (USE_MOCK) return PartnerMockService.submitRegistration(payload);
    return apiClient.post<never, SubmitRegistrationResponse>('/admin/partners', payload);
  },

  transitionRegistration: async (
    id: string,
    payload: TransitionRegistrationRequest,
  ): Promise<TransitionRegistrationResponse> => {
    if (USE_MOCK) return PartnerMockService.transitionRegistration(id, payload);
    return apiClient.post<never, TransitionRegistrationResponse>(
      `/admin/partners/${id}/transition`,
      payload,
    );
  },

  approveRegistration: async (id: string): Promise<ApproveRegistrationResult> => {
    if (USE_MOCK) {
      const mock = await PartnerMockService.approveRegistration(id);
      return normalizeApproveRegistrationResponse(mock);
    }

    const raw = await apiClient.post<never, unknown>(
      `/api/admin/cafe-partner-applications/${id}/approve`,
    );

    return normalizeApproveRegistrationResponse(raw);
  },

  rejectRegistration: async (
    id: string,
    payload: RejectRegistrationRequest,
  ): Promise<PartnerApplication> => {
    if (USE_MOCK) {
      const mock = await PartnerMockService.rejectRegistration(id, payload);
      return normalizePartnerMutationResponse(mock);
    }

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
