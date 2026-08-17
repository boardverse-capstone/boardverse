export type CafeShiftStatus = 'Open' | 'Closed';

export interface CafeShift {
  id: string;
  cafeId: string;
  cafeName?: string;
  openedByUserId?: string;
  openedByUsername?: string;
  closedByUserId?: string;
  closedByUsername?: string;
  openedAt?: string;
  closedAt?: string;
  openingCashBalance?: number;
  closingCashBalance?: number | null;
  totalRevenue?: number;
  totalSessions?: number;
  status: CafeShiftStatus;
}

export interface CafeShiftList {
  items: CafeShift[];
  page: number;
  pageSize: number;
  totalCount: number;
  totalPages: number;
}
