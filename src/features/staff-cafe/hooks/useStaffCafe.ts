'use client';

import { useQuery } from '@tanstack/react-query';
import { STAFF_CAFE_QUERY_KEYS, StaffCafeService } from '../services/staff-cafe.service';

export function useStaffWorkingCafe() {
  return useQuery({
    queryKey: [STAFF_CAFE_QUERY_KEYS.workingCafe],
    queryFn: () => StaffCafeService.getStaffWorkingCafe(),
    staleTime: 60_000,
  });
}

export function useNearbyCafes() {
  return useQuery({
    queryKey: [STAFF_CAFE_QUERY_KEYS.nearbyCafes],
    queryFn: () => StaffCafeService.getNearbyCafes(),
    staleTime: 60_000,
  });
}
