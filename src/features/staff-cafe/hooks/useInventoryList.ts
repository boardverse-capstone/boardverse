'use client';

import { useQuery } from '@tanstack/react-query';
import { STAFF_CAFE_QUERY_KEYS, StaffCafeService } from '../services/staff-cafe.service';
import type { InventoryListParams } from '../types/cafe.interface';

export function useInventoryList(cafeId: string | undefined, params: InventoryListParams) {
  return useQuery({
    queryKey: [STAFF_CAFE_QUERY_KEYS.inventoryList, cafeId, params],
    queryFn: () => StaffCafeService.getInventoryList(cafeId!, params),
    enabled: Boolean(cafeId),
    staleTime: 30_000,
  });
}
