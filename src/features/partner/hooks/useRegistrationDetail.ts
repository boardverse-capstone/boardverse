'use client';

import { useQuery } from '@tanstack/react-query';
import { PartnerService, PARTNER_QUERY_KEYS } from '../services/partner.service';

export function useRegistrationDetail(id: string) {
  return useQuery({
    queryKey: [PARTNER_QUERY_KEYS.detail, id],
    queryFn: () => PartnerService.getRegistrationById(id),
    enabled: !!id,
    staleTime: 5000,
  });
}
