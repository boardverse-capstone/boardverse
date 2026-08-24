import { apiClient } from '@/core/api/client';
import type { CafeShift, CafeShiftList } from '../types/cafe-shift.interface';

function rec(raw: unknown): Record<string, unknown> {
  if (raw && typeof raw === 'object' && !Array.isArray(raw)) {
    return raw as Record<string, unknown>;
  }
  return {};
}

function str(r: Record<string, unknown>, ...keys: string[]): string {
  for (const key of keys) {
    const v = r[key];
    if (v != null && String(v).trim()) return String(v);
  }
  return '';
}

function num(r: Record<string, unknown>, ...keys: string[]): number {
  for (const key of keys) {
    const n = Number(r[key]);
    if (Number.isFinite(n)) return n;
  }
  return 0;
}

function mapShift(raw: unknown): CafeShift | null {
  const r = rec(raw);
  const id = str(r, 'id', 'Id');
  if (!id) return null;
  const statusRaw = str(r, 'status', 'Status').toLowerCase();
  return {
    id,
    cafeId: str(r, 'cafeId', 'CafeId'),
    cafeName: str(r, 'cafeName', 'CafeName') || undefined,
    openedByUserId: str(r, 'openedByUserId', 'OpenedByUserId') || undefined,
    openedByUsername: str(r, 'openedByUsername', 'OpenedByUsername') || undefined,
    closedByUserId: str(r, 'closedByUserId', 'ClosedByUserId') || undefined,
    closedByUsername: str(r, 'closedByUsername', 'ClosedByUsername') || undefined,
    openedAt: str(r, 'openedAt', 'OpenedAt') || undefined,
    closedAt: str(r, 'closedAt', 'ClosedAt') || undefined,
    openingCashBalance: num(r, 'openingCashBalance', 'OpeningCashBalance'),
    closingCashBalance:
      r.closingCashBalance == null && r.ClosingCashBalance == null
        ? null
        : num(r, 'closingCashBalance', 'ClosingCashBalance'),
    totalRevenue: num(r, 'totalRevenue', 'TotalRevenue'),
    totalSessions: num(r, 'totalSessions', 'TotalSessions'),
    status: statusRaw === 'closed' ? 'Closed' : 'Open',
  };
}

export const CafeShiftService = {
  getCurrent: async (cafeId: string): Promise<CafeShift | null> => {
    try {
      const raw = await apiClient.get<never, unknown>('/api/shifts/current', {
        params: { cafeId },
      });
      if (raw == null) return null;
      return mapShift(raw);
    } catch (error) {
      const message = error instanceof Error ? error.message.toLowerCase() : '';
      if (
        message.includes('not found') ||
        message.includes('không tìm thấy') ||
        message.includes('no open') ||
        message.includes('không có ca')
      ) {
        return null;
      }
      throw error;
    }
  },

  getHistory: async (
    cafeId: string,
    page = 1,
    pageSize = 10,
  ): Promise<CafeShiftList> => {
    const raw = await apiClient.get<never, unknown>('/api/shifts', {
      params: { cafeId, page, pageSize },
    });
    const r = rec(raw);
    const list = r.items ?? r.Items;
    const items = Array.isArray(list)
      ? list.map(mapShift).filter((s): s is CafeShift => Boolean(s))
      : [];
    return {
      items,
      page: num(r, 'page', 'Page') || page,
      pageSize: num(r, 'pageSize', 'PageSize') || pageSize,
      totalCount: num(r, 'totalCount', 'TotalCount') || items.length,
      totalPages: num(r, 'totalPages', 'TotalPages') || 1,
    };
  },

  open: async (cafeId: string, openingCashBalance: number): Promise<CafeShift> => {
    const raw = await apiClient.post<never, unknown>('/api/shifts', {
      cafeId,
      openingCashBalance,
    });
    const mapped = mapShift(raw);
    if (!mapped) throw new Error('Không mở được ca.');
    return mapped;
  },

  close: async (
    shiftId: string,
    closingCashBalance: number,
  ): Promise<CafeShift> => {
    const raw = await apiClient.post<never, unknown>(
      `/api/shifts/${shiftId}/close`,
      { closingCashBalance },
    );
    const mapped = mapShift(raw);
    if (!mapped) throw new Error('Không đóng được ca.');
    return mapped;
  },
};
