'use client';

import { useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { StaffCafeService, STAFF_CAFE_QUERY_KEYS } from '../services/staff-cafe.service';
import type { StaffWorkingCafe } from '../types/cafe.interface';

export interface StaffDashboardStats {
  /** Tổng số ca đã làm */
  totalShifts: number;
  /** Số ca hôm nay */
  shiftsToday: number;
  /** Tổng doanh thu tất cả ca (BVC) */
  totalRevenue: number;
  /** Tổng số phiên chơi */
  totalSessions: number;
  /** Quán đang làm việc */
  currentCafe: StaffWorkingCafe | null;
  /** Loading states */
  isLoadingCafe: boolean;
  isLoadingShifts: boolean;
}

function isToday(dateStr: string | null | undefined): boolean {
  if (!dateStr) return false;
  const date = new Date(dateStr);
  const today = new Date();
  return (
    date.getFullYear() === today.getFullYear() &&
    date.getMonth() === today.getMonth() &&
    date.getDate() === today.getDate()
  );
}

function getThisMonthRange() {
  const now = new Date();
  const start = new Date(now.getFullYear(), now.getMonth(), 1);
  const end = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59);
  return { start, end };
}

export function useStaffDashboardStats(): StaffDashboardStats {
  // 1. Lấy quán đang làm việc
  const cafeQuery = useQuery({
    queryKey: [STAFF_CAFE_QUERY_KEYS.workingCafe],
    queryFn: () => StaffCafeService.getStaffWorkingCafe(),
    staleTime: 60_000,
    retry: false,
  });

  const cafeId = cafeQuery.data?.id ?? '';
  const currentCafe = cafeQuery.data ?? null;

  // 2. Lấy lịch sử ca (lấy nhiều để tính stats)
  const shiftsQuery = useQuery({
    queryKey: ['staff-dashboard-shifts', cafeId],
    queryFn: async () => {
      if (!cafeId) return { items: [] };
      // Lấy page size lớn để có đủ data thống kê
      const res = await fetch(
        `/api/shifts?cafeId=${encodeURIComponent(cafeId)}&page=1&pageSize=100`,
        { credentials: 'include' },
      );
      if (!res.ok) return { items: [] };
      return res.json();
    },
    enabled: Boolean(cafeId),
    staleTime: 30_000,
  });

  // 3. Tính toán stats
  const stats = useMemo(() => {
    const shifts = shiftsQuery.data?.items ?? [];

    let totalShifts = 0;
    let shiftsToday = 0;
    let totalRevenue = 0;
    let totalSessions = 0;

    for (const shift of shifts) {
      const openedAt = shift.openedAt ?? shift.opened_at ?? null;
      if (!openedAt) continue;

      totalShifts++;
      if (isToday(openedAt)) shiftsToday++;
      totalRevenue += Number(shift.totalRevenue ?? shift.total_revenue ?? 0);
      totalSessions += Number(shift.totalSessions ?? shift.total_sessions ?? 0);
    }

    return { totalShifts, shiftsToday, totalRevenue, totalSessions };
  }, [shiftsQuery.data]);

  return {
    ...stats,
    currentCafe,
    isLoadingCafe: cafeQuery.isLoading,
    isLoadingShifts: shiftsQuery.isLoading,
  };
}
