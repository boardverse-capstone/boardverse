import apiClient from '@/core/api/client';
import type { PaginatedResponse, PaginationParams } from '@/shared/types/pagination.interface';
import type {
  ApproveRegistrationResponse,
  PartnerApplication,
  PartnerRegistrationRequest,
  Registration,
  RejectRegistrationRequest,
  SubmitRegistrationResponse,
  TransitionRegistrationRequest,
  TransitionRegistrationResponse,
} from '../types/partner.interface';
import { PartnerMockService } from './partner.mock';

const USE_MOCK = process.env.NEXT_PUBLIC_USE_MOCK_PARTNER_API === 'true';

export const PARTNER_QUERY_KEYS = {
  pending: 'partner-pending',
  detail: 'partner-detail',
} as const;

export const PartnerService = {
  getPendingApplications: async (
    params: PaginationParams,
  ): Promise<PaginatedResponse<PartnerApplication>> => {
    if (USE_MOCK) return PartnerMockService.getPendingApplications(params);

    return apiClient.get<never, PaginatedResponse<PartnerApplication>>(
      '/admin/partners/pending',
      {
        params: {
          page: params.page,
          limit: params.limit,
          q: params.search,
        },
      },
    );
  },

  getRegistrationById: async (id: string): Promise<Registration> => {
    if (USE_MOCK) return PartnerMockService.getRegistrationById(id);
    return apiClient.get<never, Registration>(`/admin/partners/${id}`);
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

  approveRegistration: async (id: string): Promise<ApproveRegistrationResponse> => {
    if (USE_MOCK) return PartnerMockService.approveRegistration(id);
    return apiClient.post<never, ApproveRegistrationResponse>(
      `/admin/partners/${id}/approve`,
    );
  },

  rejectRegistration: async (
    id: string,
    payload: RejectRegistrationRequest,
  ): Promise<Registration> => {
    if (USE_MOCK) return PartnerMockService.rejectRegistration(id, payload);
    return apiClient.post<never, Registration>(`/admin/partners/${id}/reject`, payload);
  },
} as const;
