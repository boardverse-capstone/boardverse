'use client';

import { useQuery } from '@tanstack/react-query';
import { STAFF_CAFE_QUERY_KEYS, StaffCafeService } from '../services/staff-cafe.service';

export function useInventoryDetail(cafeId: string | undefined, inventoryId: string | undefined) {
  return useQuery({
    queryKey: [STAFF_CAFE_QUERY_KEYS.inventoryDetail, cafeId, inventoryId],
    queryFn: () => StaffCafeService.getInventoryDetail(cafeId!, inventoryId!),
    enabled: Boolean(cafeId && inventoryId),
    staleTime: 30_000,
  });
}
