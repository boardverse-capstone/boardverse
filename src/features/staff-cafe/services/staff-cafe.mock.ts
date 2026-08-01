import type { PaginatedResponse } from '@/shared/types/pagination.interface';
import type {
  InventoryDetail,
  InventoryListItem,
  InventoryListParams,
  NearbyCafe,
  StaffWorkingCafe,
} from '../types/cafe.interface';

const delay = (ms = 300) => new Promise((resolve) => setTimeout(resolve, ms));

export const MOCK_STAFF_CAFE: StaffWorkingCafe = {
  id: 'cafe-demo-001',
  name: 'BoardVerse Cafe — Quận 1',
  address: '123 Nguyễn Huệ, Q.1, TP.HCM',
};

const MOCK_INVENTORY: InventoryListItem[] = [
  {
    inventoryId: 'inv-001',
    gameTemplateId: 'game-catan',
    name: 'Catan',
    imageUrl: 'https://picsum.photos/seed/catan/400/300',
    status: 'AVAILABLE',
    barcode: 'BV-CATAN-001',
    condition: 'GOOD',
    isFullMode: true,
    componentPenalties: [
      { componentId: 'cmp-001', componentName: 'Xúc xắc', penaltyFee: 50000, currency: 'VND' },
      { componentId: 'cmp-002', componentName: 'Thẻ tài nguyên', penaltyFee: 30000, currency: 'VND' },
    ],
  },
  {
    inventoryId: 'inv-002',
    gameTemplateId: 'game-azul',
    name: 'Azul',
    imageUrl: 'https://picsum.photos/seed/azul/400/300',
    status: 'RENTED',
    barcode: 'BV-AZUL-002',
    condition: 'GOOD',
    isFullMode: true,
    componentPenalties: [
      { componentId: 'cmp-003', componentName: 'Gạch mosaic', penaltyFee: 25000, currency: 'VND' },
    ],
  },
  {
    inventoryId: 'inv-003',
    gameTemplateId: 'game-ticket',
    name: 'Ticket to Ride',
    imageUrl: 'https://picsum.photos/seed/ticket/400/300',
    status: 'MAINTENANCE',
    barcode: 'BV-TTR-003',
    condition: 'WORN',
    isFullMode: true,
    componentPenalties: [
      { componentId: 'cmp-004', componentName: 'Toa tàu', penaltyFee: 40000, currency: 'VND' },
      { componentId: 'cmp-005', componentName: 'Thẻ địa điểm', penaltyFee: 20000, currency: 'VND' },
    ],
  },
  {
    inventoryId: 'inv-004',
    gameTemplateId: 'game-codenames',
    name: 'Codenames',
    imageUrl: 'https://picsum.photos/seed/codenames/400/300',
    status: 'DAMAGED',
    barcode: 'BV-CODE-004',
    condition: 'WORN',
    isFullMode: true,
    componentPenalties: [
      { componentId: 'cmp-006', componentName: 'Thẻ từ khóa', penaltyFee: 15000, currency: 'VND' },
    ],
  },
  {
    inventoryId: 'inv-005',
    gameTemplateId: 'game-scythe',
    name: 'Scythe',
    imageUrl: 'https://picsum.photos/seed/scythe/400/300',
    status: 'AVAILABLE',
    barcode: 'BV-SCY-005',
    condition: 'NEW',
    isFullMode: true,
    componentPenalties: [
      { componentId: 'cmp-007', componentName: 'Miniature', penaltyFee: 120000, currency: 'VND' },
      { componentId: 'cmp-008', componentName: 'Token tài nguyên', penaltyFee: 35000, currency: 'VND' },
    ],
  },
];

const MOCK_NEARBY: NearbyCafe[] = [
  { id: MOCK_STAFF_CAFE.id, name: MOCK_STAFF_CAFE.name, address: MOCK_STAFF_CAFE.address, distanceKm: 0.8, distanceLabel: '0.8 km' },
  { id: 'cafe-demo-002', name: 'BoardVerse Cafe — Quận 3', address: '45 Võ Văn Tần, Q.3', distanceKm: 2.4, distanceLabel: '2.4 km' },
  { id: 'cafe-demo-003', name: 'BoardVerse Cafe — Bình Thạnh', address: '88 Xô Viết Nghệ Tĩnh', distanceKm: 4.1, distanceLabel: '4.1 km' },
];

function buildMeta(totalItems: number, page: number, limit: number) {
  const totalPages = Math.max(1, Math.ceil(totalItems / limit));
  return {
    currentPage: page,
    limit,
    totalItems,
    totalPages,
    hasPrevious: page > 1,
    hasNext: page < totalPages,
  };
}

export const StaffCafeMockService = {
  getStaffWorkingCafe: async (): Promise<StaffWorkingCafe> => {
    await delay();
    return MOCK_STAFF_CAFE;
  },

  getNearbyCafes: async (): Promise<NearbyCafe[]> => {
    await delay();
    return MOCK_NEARBY;
  },

  getInventoryList: async (
    _cafeId: string,
    params: InventoryListParams,
  ): Promise<PaginatedResponse<InventoryListItem>> => {
    await delay();

    let filtered = [...MOCK_INVENTORY];
    const search = params.search?.trim().toLowerCase();
    if (search) {
      filtered = filtered.filter(
        (item) =>
          item.name.toLowerCase().includes(search) ||
          item.barcode?.toLowerCase().includes(search),
      );
    }
    if (params.status && params.status !== 'all') {
      filtered = filtered.filter(
        (item) => item.status.toUpperCase() === params.status!.toUpperCase(),
      );
    }

    const start = (params.page - 1) * params.limit;
    const data = filtered.slice(start, start + params.limit);

    return {
      data,
      meta: buildMeta(filtered.length, params.page, params.limit),
    };
  },

  getInventoryDetail: async (cafeId: string, inventoryId: string): Promise<InventoryDetail> => {
    await delay();
    const item = MOCK_INVENTORY.find((entry) => entry.inventoryId === inventoryId);
    if (!item) {
      throw new Error('Không tìm thấy mục kho game.');
    }

    return {
      inventoryId: item.inventoryId,
      cafeId,
      gameTemplate: {
        gameTemplateId: item.gameTemplateId,
        title: item.name,
        description: `Mô tả demo cho ${item.name}.`,
        imageUrl: item.imageUrl,
        minPlayers: item.name === 'Scythe' ? 4 : 2,
        maxPlayers: item.name === 'Codenames' ? 8 : item.name === 'Scythe' ? 5 : 4,
        playingTime: item.name === 'Scythe' ? 115 : 60,
      },
      barcode: item.barcode,
      status: item.status,
      condition: item.condition,
      purchaseDate: '2025-08-15T00:00:00.000Z',
      notes: 'Dữ liệu mock cho Staff Portal.',
      componentPenalties: item.componentPenalties.map((penalty) => ({
        componentId: penalty.componentId,
        componentName: penalty.componentName,
        type: 'PHYSICAL',
        quantityInBox: 1,
        penaltyFeePerUnit: penalty.penaltyFee,
      })),
    };
  },
};
