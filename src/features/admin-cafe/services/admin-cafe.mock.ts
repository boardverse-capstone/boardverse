import type { PaginatedResponse } from '@/shared/types/pagination.interface';
import type {
  AdminCafe,
  AdminCafeDetail,
  AdminCafeListParams,
  CreateAdminCafeRequest,
  UpdateAdminCafeRequest,
  UpdateOperationalStatusRequest,
  UpdateOperationalStatusResponse,
} from '../types/admin-cafe.interface';

const delay = () => new Promise((resolve) => setTimeout(resolve, 400));

const MOCK_CAFES: AdminCafeDetail[] = [
  {
    id: '11111111-1111-1111-1111-111111111111',
    name: 'BoardGame Cafe A',
    address: '123 Main Street, Quận 1, HCMC',
    latitude: 10.776889,
    longitude: 106.700806,
    phoneNumber: '0909999999',
    description: 'Best board game cafe in town',
    managerId: '22222222-2222-2222-2222-222222222222',
    managerName: 'Manager A',
    managerEmail: 'manager-a@example.com',
    operationalStatus: 'ACTIVE',
    operationalStatusReason: null,
    operationalStatusChangedAt: null,
    weekdayOpen: '09:00',
    weekdayClose: '22:00',
    weekendOpen: '10:00',
    weekendClose: '23:00',
    numberOfTables: 8,
    numberOfPrivateRooms: 1,
    totalSeats: 40,
    numberOfGamesOwned: 45,
    popularGamesList: 'Catan, Ticket to Ride',
    hasGameMaster: true,
    depositRefundPolicy: 'Full',
    billingModel: 'ByHour',
    basePrice: 60000,
    tieredBlockRate: 20000,
    tieredBlockMinutes: 30,
    isPricingLocked: false,
    depositPercentage: 0.5,
    defaultHoldDurationMinutes: 30,
    hasSePayConfigured: false,
    isActive: true,
    createdAt: '2026-01-01T10:00:00Z',
    updatedAt: '2026-08-01T14:30:00Z',
  },
  {
    id: '33333333-3333-3333-3333-333333333333',
    name: 'Dice & Coffee',
    address: '45 Nguyễn Huệ, Quận 1, HCMC',
    latitude: 10.7735,
    longitude: 106.7032,
    phoneNumber: '0918888888',
    description: 'Cafe board game gần trung tâm',
    managerId: '44444444-4444-4444-4444-444444444444',
    managerName: 'Manager B',
    managerEmail: 'manager-b@example.com',
    operationalStatus: 'DATA_BLANK',
    operationalStatusReason: null,
    operationalStatusChangedAt: null,
    weekdayOpen: null,
    weekdayClose: null,
    weekendOpen: null,
    weekendClose: null,
    numberOfTables: 0,
    numberOfPrivateRooms: 0,
    totalSeats: 0,
    numberOfGamesOwned: 0,
    popularGamesList: null,
    hasGameMaster: false,
    depositRefundPolicy: 'Partial',
    billingModel: 'ByHour',
    basePrice: 50000,
    tieredBlockRate: 15000,
    tieredBlockMinutes: 30,
    isPricingLocked: false,
    depositPercentage: 0.5,
    defaultHoldDurationMinutes: 30,
    hasSePayConfigured: false,
    isActive: false,
    createdAt: '2026-02-15T08:00:00Z',
    updatedAt: '2026-07-20T09:00:00Z',
  },
];

function toListItem(cafe: AdminCafeDetail): AdminCafe {
  return {
    id: cafe.id,
    name: cafe.name,
    address: cafe.address,
    latitude: cafe.latitude,
    longitude: cafe.longitude,
    phoneNumber: cafe.phoneNumber,
    managerId: cafe.managerId,
    managerName: cafe.managerName,
    operationalStatus: cafe.operationalStatus,
    depositRefundPolicy: cafe.depositRefundPolicy,
    createdAt: cafe.createdAt,
    isActive: cafe.isActive,
  };
}

export const AdminCafeMockService = {
  getCafes: async (params: AdminCafeListParams): Promise<PaginatedResponse<AdminCafe>> => {
    await delay();
    let filtered = [...MOCK_CAFES];

    if (params.search?.trim()) {
      const q = params.search.trim().toLowerCase();
      filtered = filtered.filter(
        (c) =>
          c.name.toLowerCase().includes(q) ||
          c.address.toLowerCase().includes(q) ||
          c.phoneNumber.includes(q),
      );
    }

    if (params.status && params.status !== 'all') {
      filtered = filtered.filter((c) => c.operationalStatus === params.status);
    }

    if (params.managerId) {
      filtered = filtered.filter((c) => c.managerId === params.managerId);
    }

    const start = (params.page - 1) * params.limit;
    const pageItems = filtered.slice(start, start + params.limit);
    const totalPages = Math.max(1, Math.ceil(filtered.length / Math.max(params.limit, 1)));

    return {
      data: pageItems.map(toListItem),
      meta: {
        currentPage: params.page,
        limit: params.limit,
        totalItems: filtered.length,
        totalPages,
        hasPrevious: params.page > 1,
        hasNext: params.page < totalPages,
      },
    };
  },

  getCafeById: async (cafeId: string): Promise<AdminCafeDetail> => {
    await delay();
    const cafe = MOCK_CAFES.find((c) => c.id === cafeId);
    if (!cafe) throw new Error('Không tìm thấy cafe.');
    return { ...cafe };
  },

  createCafe: async (payload: CreateAdminCafeRequest): Promise<AdminCafeDetail> => {
    await delay();
    const exists = MOCK_CAFES.some((c) => c.managerId === payload.managerId);
    if (exists) throw new Error('Manager đã có cafe khác.');

    const created: AdminCafeDetail = {
      id: crypto.randomUUID(),
      name: payload.name,
      address: payload.address,
      latitude: payload.latitude,
      longitude: payload.longitude,
      phoneNumber: payload.phoneNumber,
      description: payload.description ?? null,
      managerId: payload.managerId,
      managerName: 'Manager mới',
      managerEmail: null,
      operationalStatus: 'DATA_BLANK',
      operationalStatusReason: null,
      operationalStatusChangedAt: null,
      weekdayOpen: null,
      weekdayClose: null,
      weekendOpen: null,
      weekendClose: null,
      numberOfTables: 0,
      numberOfPrivateRooms: 0,
      totalSeats: 0,
      numberOfGamesOwned: 0,
      popularGamesList: null,
      hasGameMaster: false,
      depositRefundPolicy: 'Full',
      billingModel: 'ByHour',
      basePrice: null,
      tieredBlockRate: null,
      tieredBlockMinutes: 15,
      isPricingLocked: false,
      depositPercentage: 0.5,
      defaultHoldDurationMinutes: 30,
      hasSePayConfigured: false,
      isActive: false,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
    MOCK_CAFES.unshift(created);
    return created;
  },

  updateCafe: async (
    cafeId: string,
    payload: UpdateAdminCafeRequest,
  ): Promise<AdminCafeDetail> => {
    await delay();
    const index = MOCK_CAFES.findIndex((c) => c.id === cafeId);
    if (index < 0) throw new Error('Không tìm thấy cafe.');

    const updated: AdminCafeDetail = {
      ...MOCK_CAFES[index],
      ...payload,
      updatedAt: new Date().toISOString(),
    };
    MOCK_CAFES[index] = updated;
    return updated;
  },

  deleteCafe: async (cafeId: string): Promise<void> => {
    await delay();
    const index = MOCK_CAFES.findIndex((c) => c.id === cafeId);
    if (index < 0) throw new Error('Không tìm thấy cafe.');
    MOCK_CAFES.splice(index, 1);
  },

  updateOperationalStatus: async (
    cafeId: string,
    payload: UpdateOperationalStatusRequest,
  ): Promise<UpdateOperationalStatusResponse> => {
    await delay();
    if (payload.status === 'BANNED' && !payload.reason?.trim()) {
      throw new Error('Vui lòng nhập lý do khi cấm quán.');
    }

    const index = MOCK_CAFES.findIndex((c) => c.id === cafeId);
    if (index < 0) throw new Error('Không tìm thấy cafe.');

    const isActive = payload.status === 'ACTIVE';
    MOCK_CAFES[index] = {
      ...MOCK_CAFES[index],
      operationalStatus: payload.status,
      operationalStatusReason: payload.reason ?? null,
      isActive,
      updatedAt: new Date().toISOString(),
    };

    return {
      cafeId,
      status: payload.status,
      isActive,
      reason: payload.reason ?? null,
      updatedAt: MOCK_CAFES[index].updatedAt ?? undefined,
    };
  },
};
