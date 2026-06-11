'use client';

import { useQuery } from '@tanstack/react-query';
import { PartnerService, PARTNER_QUERY_KEYS } from '../services/partner.service';
import type { PaginationParams } from '@/shared/types/pagination.interface';

export function usePendingPartners(params: PaginationParams) {
  return useQuery({
    queryKey: [PARTNER_QUERY_KEYS.pending, params.page, params.limit, params.search],
    queryFn: () => PartnerService.getPendingApplications(params),
    placeholderData: (previousData, previousQuery) => {
      if (!previousQuery) return undefined;
      const [, prevPage, prevLimit] = previousQuery.queryKey as [
        string,
        number,
        number,
        ...unknown[],
      ];
      if (prevPage === params.page && prevLimit === params.limit) {
        return previousData;
      }
      return undefined;
    },
    staleTime: 5000,
  });
}
