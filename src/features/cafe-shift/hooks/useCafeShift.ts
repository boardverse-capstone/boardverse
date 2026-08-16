'use client';

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { UserRole, normalizePortalRole } from '@/core/constants/roles';
import { useAuthStore } from '@/features/auth/store/auth.store';
import { StaffCafeService } from '@/features/staff-cafe/services/staff-cafe.service';
import { apiClient } from '@/core/api/client';
import { mapApiStaffWorkingCafe } from '@/features/staff-cafe/utils/inventory.mapper';
import type { StaffWorkingCafe } from '@/features/staff-cafe/types/cafe.interface';
import { CafeShiftService } from '../services/cafe-shift.service';

export const CAFE_SHIFT_QUERY_KEYS = {
  cafe: 'cafe-shift-operating-cafe',
  current: 'cafe-shift-current',
  history: 'cafe-shift-history',
} as const;

function unwrapCafeList(raw: unknown): Record<string, unknown>[] {
  if (Array.isArray(raw)) return raw as Record<string, unknown>[];
  if (raw && typeof raw === 'object') {
    const r = raw as Record<string, unknown>;
    const list = r.data ?? r.items ?? r.Items;
    if (Array.isArray(list)) return list as Record<string, unknown>[];
  }
  return [];
}

async function getOperatingCafe(role: UserRole | null): Promise<StaffWorkingCafe> {
  if (role === UserRole.Staff) {
    return StaffCafeService.getStaffWorkingCafe();
  }
  const raw = await apiClient.get<never, unknown>('/api/manager/my-cafes');
  const cafes = unwrapCafeList(raw);
  if (cafes.length === 0) {
    throw new Error('Chưa có quán nào để xem báo cáo ca.');
  }
  return mapApiStaffWorkingCafe(cafes[0]);
}

export function useOperatingCafe() {
  const role = normalizePortalRole(useAuthStore((s) => s.user?.role ?? ''));
  return useQuery({
    queryKey: [CAFE_SHIFT_QUERY_KEYS.cafe, role],
    queryFn: () => getOperatingCafe(role),
    enabled: role === UserRole.Staff || role === UserRole.Manager,
    staleTime: 60_000,
  });
}

export function useCurrentShift(cafeId: string | undefined) {
  return useQuery({
    queryKey: [CAFE_SHIFT_QUERY_KEYS.current, cafeId],
    queryFn: () => CafeShiftService.getCurrent(cafeId!),
    enabled: Boolean(cafeId),
  });
}

export function useShiftHistory(cafeId: string | undefined, page: number, pageSize: number) {
  return useQuery({
    queryKey: [CAFE_SHIFT_QUERY_KEYS.history, cafeId, page, pageSize],
    queryFn: () => CafeShiftService.getHistory(cafeId!, page, pageSize),
    enabled: Boolean(cafeId),
  });
}

export function useOpenShift(cafeId: string | undefined) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (openingCashBalance: number) => {
      if (!cafeId) throw new Error('Thiếu quán.');
      return CafeShiftService.open(cafeId, openingCashBalance);
    },
    onSuccess: async () => {
      toast.success('Đã mở ca.');
      await queryClient.invalidateQueries({ queryKey: [CAFE_SHIFT_QUERY_KEYS.current] });
      await queryClient.invalidateQueries({ queryKey: [CAFE_SHIFT_QUERY_KEYS.history] });
    },
    onError: (error: Error) => {
      toast.error(error.message || 'Không mở được ca.');
    },
  });
}

export function useCloseShift() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({
      shiftId,
      closingCashBalance,
    }: {
      shiftId: string;
      closingCashBalance: number;
    }) => CafeShiftService.close(shiftId, closingCashBalance),
    onSuccess: async () => {
      toast.success('Đã đóng ca.');
      await queryClient.invalidateQueries({ queryKey: [CAFE_SHIFT_QUERY_KEYS.current] });
      await queryClient.invalidateQueries({ queryKey: [CAFE_SHIFT_QUERY_KEYS.history] });
    },
    onError: (error: Error) => {
      toast.error(error.message || 'Không đóng được ca.');
    },
  });
}
