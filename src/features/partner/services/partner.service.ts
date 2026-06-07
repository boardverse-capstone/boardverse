import apiClient from '@/core/api/client';
import type { PaginatedResponse, PaginationParams } from '@/shared/types/pagination.interface';
import type {
  ApproveRegistrationResponse,
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
  ): Promise<PaginatedResponse<Registration>> => {
    if (USE_MOCK) return PartnerMockService.getPendingApplications(params);

    return apiClient.get<never, PaginatedResponse<Registration>>(
      '/api/PartnerRegistration/pending',
      {
        params: {
          Page: params.page,
          PageSize: params.limit,
          Search: params.search,
        },
      },
    );
  },

  getRegistrationById: async (id: string): Promise<Registration> => {
    if (USE_MOCK) return PartnerMockService.getRegistrationById(id);
    return apiClient.get<never, Registration>(`/api/PartnerRegistration/${id}`);
  },

  submitRegistration: async (
    payload: PartnerRegistrationRequest,
  ): Promise<SubmitRegistrationResponse> => {
    if (USE_MOCK) return PartnerMockService.submitRegistration(payload);
    return apiClient.post<never, SubmitRegistrationResponse>(
      '/api/PartnerRegistration',
      payload,
    );
  },

  transitionRegistration: async (
    id: string,
    payload: TransitionRegistrationRequest,
  ): Promise<TransitionRegistrationResponse> => {
    if (USE_MOCK) return PartnerMockService.transitionRegistration(id, payload);
    return apiClient.post<never, TransitionRegistrationResponse>(
      `/api/PartnerRegistration/${id}/transition`,
      payload,
    );
  },

  approveRegistration: async (id: string): Promise<ApproveRegistrationResponse> => {
    if (USE_MOCK) return PartnerMockService.approveRegistration(id);
    return apiClient.post<never, ApproveRegistrationResponse>(
      `/api/PartnerRegistration/${id}/approve`,
    );
  },

  rejectRegistration: async (
    id: string,
    payload: RejectRegistrationRequest,
  ): Promise<Registration> => {
    if (USE_MOCK) return PartnerMockService.rejectRegistration(id, payload);
    return apiClient.post<never, Registration>(
      `/api/PartnerRegistration/${id}/reject`,
      payload,
    );
  },
} as const;
