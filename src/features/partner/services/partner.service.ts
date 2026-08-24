import apiClient from '@/core/api/client';
import type { PaginatedResponse } from '@/shared/types/pagination.interface';
import type {
  ApproveRegistrationResult,
  PartnerApplication,
  PartnerApplicationListParams,
  PartnerRegistrationRequest,
  RejectRegistrationRequest,
  SubmitRegistrationResponse,
  TransitionRegistrationRequest,
  TransitionRegistrationResponse,
} from '../types/partner.interface';
import {
  normalizeApproveRegistrationResponse,
  normalizePartnerDetailResponse,
  normalizePartnerListResponse,
  normalizePartnerMutationResponse,
} from '../utils/partner.mapper';

export const PARTNER_QUERY_KEYS = {
  pending: 'partner-pending',
  detail: 'partner-detail',
} as const;

export const PartnerService = {
  getPendingApplications: async (
    params: PartnerApplicationListParams,
  ): Promise<PaginatedResponse<PartnerApplication>> => {
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
} as const;
