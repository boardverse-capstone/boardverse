import type { QueryClient } from '@tanstack/react-query';
import type { PaginatedResponse } from '@/shared/types/pagination.interface';
import type { PartnerApplication } from '../types/partner.interface';
import { PARTNER_QUERY_KEYS } from '../services/partner.service';
import { isAdminListVisible } from './registration-workflow';

export function removePartnerFromPendingCaches(queryClient: QueryClient, id: string) {
  queryClient.setQueriesData<PaginatedResponse<PartnerApplication>>(
    { queryKey: [PARTNER_QUERY_KEYS.pending] },
    (old) => {
      if (!old) return old;
      const nextData = old.data.filter((item) => item.id !== id);
      if (nextData.length === old.data.length) return old;
      return {
        ...old,
        data: nextData,
        meta: {
          ...old.meta,
          totalItems: Math.max(0, old.meta.totalItems - 1),
        },
      };
    },
  );
}

export function syncPartnerInPendingCaches(
  queryClient: QueryClient,
  partner: PartnerApplication,
) {
  queryClient.setQueriesData<PaginatedResponse<PartnerApplication>>(
    { queryKey: [PARTNER_QUERY_KEYS.pending] },
    (old) => {
      if (!old) return old;

      if (!isAdminListVisible(partner.status)) {
        return {
          ...old,
          data: old.data.filter((item) => item.id !== partner.id),
          meta: {
            ...old.meta,
            totalItems: Math.max(0, old.meta.totalItems - 1),
          },
        };
      }

      const exists = old.data.some((item) => item.id === partner.id);
      if (!exists) return old;

      return {
        ...old,
        data: old.data.map((item) => (item.id === partner.id ? partner : item)),
      };
    },
  );
}
