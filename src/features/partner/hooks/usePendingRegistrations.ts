'use client';

import { useQuery } from '@tanstack/react-query';
import { PartnerService, PARTNER_QUERY_KEYS } from '../services/partner.service';
import type { PaginationParams } from '@/shared/types/pagination.interface';

export function usePendingRegistrations(params: PaginationParams) {
  return useQuery({
    queryKey: [PARTNER_QUERY_KEYS.pending, params.page, params.limit, params.search],
    queryFn: () => PartnerService.getPendingApplications(params),
    placeholderData: (previousData) => previousData,
    staleTime: 5000,
  });
}
