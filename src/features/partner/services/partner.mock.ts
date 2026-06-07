import type { PaginatedResponse, PaginationParams } from '@/shared/types/pagination.interface';
import {
  ADMIN_ACTIONABLE_STATUSES,
} from '@/core/constants/partner-registration';
import type {
  ApproveRegistrationResponse,
  PartnerRegistrationRequest,
  Registration,
  RejectRegistrationRequest,
  SubmitRegistrationResponse,
  TransitionRegistrationRequest,
  TransitionRegistrationResponse,
} from '../types/partner.interface';
import {
  appendStatusHistory,
  canPerformAction,
  getPrimaryAction,
  normalizeText,
  resolveNextStatus,
  resolvePostTransitionStatus,
} from '../utils/registration-workflow';

const delay = (ms = 400) => new Promise((resolve) => setTimeout(resolve, ms));

function createManagerAccount(registration: Registration) {
  const slug = registration.basicInfo.cafeName
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '_')
    .replace(/^_|_$/g, '');

  return {
    username: registration.basicInfo.representativeEmail,
    email: registration.basicInfo.representativeEmail,
    temporaryPassword: `BV@${Math.random().toString(36).slice(2, 10)}`,
  };
}

function initialHistory(status: Registration['status']): Registration['statusHistory'] {
  return [{ status, changedAt: new Date().toISOString(), changedBy: 'System', note: 'Khởi tạo đơn' }];
}

let registrations: Registration[] = [
  {
    id: 'REG-001',
    status: 'PENDING_REVIEW',
    basicInfo: {
      cafeName: 'The Board Room Cafe',
      address: '123 Nguyen Dinh Chieu, Phuong 4, Quan 3, TP. Ho Chi Minh',
      hotline: '0908123456',
      representativeEmail: 'contact@theboardroom.vn',
      businessLicense: '0312345678',
      businessLicenseImage: '/uploads/license1.jpg',
    },
    infrastructure: {
      numberOfTables: 15,
      numberOfPrivateRooms: 2,
      maximumCapacity: 50,
      spaceImages: ['/uploads/space1.jpg', '/uploads/space2.jpg', '/uploads/space3.jpg'],
    },
    boardGameCatalog: {
      numberOfGamesOwned: 150,
      listOfPopularGames: 'Catan, Ticket to Ride, Wingspan',
    },
    additionalServices: { hasGameMaster: true, billingModel: 'BY_HOUR' },
    createdAt: '2026-06-05T10:00:00Z',
    updatedAt: '2026-06-05T10:00:00Z',
    statusHistory: initialHistory('PENDING_REVIEW'),
    alerts: [],
  },
  {
    id: 'REG-002',
    status: 'NEEDS_OPS_VERIFICATION',
    basicInfo: {
      cafeName: 'Meeples & More',
      address: '456 Xo Viet Nghe Tinh, Quan Binh Thanh, TP. Ho Chi Minh',
      hotline: '0987654321',
      representativeEmail: 'hello@meeples.com',
      businessLicense: '0311122333',
      businessLicenseImage: '/uploads/license2.jpg',
    },
    infrastructure: {
      numberOfTables: 20,
      numberOfPrivateRooms: 0,
      maximumCapacity: 60,
      spaceImages: ['/uploads/space4.jpg', '/uploads/space5.jpg', '/uploads/space6.jpg'],
    },
    boardGameCatalog: {
      numberOfGamesOwned: 200,
      listOfPopularGames: 'Gloomhaven, Scythe, Terraforming Mars',
    },
    additionalServices: { hasGameMaster: false, billingModel: 'PER_DRINK' },
    createdAt: '2026-06-06T14:30:00Z',
    updatedAt: '2026-06-06T15:00:00Z',
    statusHistory: initialHistory('PENDING_REVIEW'),
    alerts: [
      {
        id: 'ALT-002',
        type: 'DUPLICATE_SUSPECT',
        message: 'Tên quán trùng với chi nhánh khác — cần Ops gọi điện xác minh pháp lý.',
        createdAt: '2026-06-06T15:00:00Z',
      },
    ],
  },
  {
    id: 'REG-003',
    status: 'PENDING_NEGOTIATION',
    basicInfo: {
      cafeName: 'Dice & Coffee',
      address: '789 Nguyen Hue, Quan 1, TP. Ho Chi Minh',
      hotline: '0911223344',
      representativeEmail: 'info@dicecoffee.vn',
      businessLicense: '0399887766',
      businessLicenseImage: '/uploads/license3.jpg',
    },
    infrastructure: {
      numberOfTables: 10,
      numberOfPrivateRooms: 1,
      maximumCapacity: 35,
      spaceImages: ['/uploads/space7.jpg', '/uploads/space8.jpg', '/uploads/space9.jpg'],
    },
    boardGameCatalog: {
      numberOfGamesOwned: 80,
      listOfPopularGames: 'Azul, Splendor, Codenames',
    },
    additionalServices: { hasGameMaster: true, billingModel: 'BY_HOUR' },
    createdAt: '2026-06-07T09:15:00Z',
    updatedAt: '2026-06-08T11:00:00Z',
    statusHistory: [
      ...initialHistory('PENDING_REVIEW'),
      {
        status: 'PENDING_NEGOTIATION',
        changedAt: '2026-06-08T11:00:00Z',
        changedBy: 'Ops',
        note: 'Đạt tiêu chuẩn thẩm định thực tế',
      },
    ],
    alerts: [],
    commissionRate: 12,
    contractSentAt: '2026-06-08T11:30:00Z',
  },
  {
    id: 'REG-004',
    status: 'DATA_BLANK',
    basicInfo: {
      cafeName: 'Tabletop Haven',
      address: '12 Le Loi, Quan Hai Chau, Da Nang',
      hotline: '0933445566',
      representativeEmail: 'ops@tabletophaven.vn',
      businessLicense: '0400111222',
      businessLicenseImage: '/uploads/license4.jpg',
    },
    infrastructure: {
      numberOfTables: 12,
      numberOfPrivateRooms: 1,
      maximumCapacity: 40,
      spaceImages: ['/uploads/space10.jpg', '/uploads/space11.jpg', '/uploads/space12.jpg'],
    },
    boardGameCatalog: {
      numberOfGamesOwned: 60,
      listOfPopularGames: 'Pandemic, 7 Wonders, Dixit',
    },
    additionalServices: { hasGameMaster: true, billingModel: 'BY_HOUR' },
    createdAt: '2026-05-20T08:00:00Z',
    updatedAt: '2026-05-25T16:00:00Z',
    statusHistory: initialHistory('PENDING_REVIEW'),
    alerts: [],
    managerAccount: {
      username: 'ops@tabletophaven.vn',
      email: 'ops@tabletophaven.vn',
      temporaryPassword: 'BV@temp2026',
    },
    contractSignedAt: '2026-05-25T14:00:00Z',
  },
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

function filterRegistrations(params: PaginationParams): PaginatedResponse<Registration> {
  const search = params.search?.trim().toLowerCase() ?? '';
  const filtered = registrations.filter((item) => {
    if (!ADMIN_ACTIONABLE_STATUSES.includes(item.status)) return false;
    if (!search) return true;
    return (
      item.basicInfo.cafeName.toLowerCase().includes(search) ||
      item.basicInfo.address.toLowerCase().includes(search) ||
      item.id.toLowerCase().includes(search)
    );
  });

  const start = (params.page - 1) * params.limit;
  return {
    data: filtered.slice(start, start + params.limit),
    meta: buildMeta(filtered.length, params.page, params.limit),
  };
}

function findIndex(id: string) {
  return registrations.findIndex((item) => item.id === id);
}

function detectDuplicateOnSubmit(payload: PartnerRegistrationRequest): {
  blocked: boolean;
  status?: Registration['status'];
  message?: string;
  alerts?: Registration['alerts'];
} {
  const license = normalizeText(payload.basicInfo.businessLicense);
  const address = normalizeText(payload.basicInfo.address);
  const cafeName = normalizeText(payload.basicInfo.cafeName);
  const hotline = normalizeText(payload.basicInfo.hotline);

  const activeOrPending = registrations.filter(
    (item) => !['REJECTED', 'CANCELLED', 'EXPIRED_CANCELLED'].includes(item.status),
  );

  const severeDuplicate = activeOrPending.find(
    (item) =>
      normalizeText(item.basicInfo.businessLicense) === license ||
      normalizeText(item.basicInfo.address) === address,
  );

  if (severeDuplicate) {
    return {
      blocked: true,
      status: 'REJECTED',
      message: 'Thông tin Mã số thuế hoặc Địa chỉ này đã tồn tại trong hệ thống',
    };
  }

  const nameDuplicate = activeOrPending.find(
    (item) => normalizeText(item.basicInfo.cafeName) === cafeName &&
      normalizeText(item.basicInfo.address) !== address,
  );

  const phoneDuplicate = activeOrPending.find(
    (item) => normalizeText(item.basicInfo.hotline) === hotline &&
      normalizeText(item.basicInfo.cafeName) !== cafeName,
  );

  if (nameDuplicate || phoneDuplicate) {
    return {
      blocked: false,
      status: 'NEEDS_OPS_VERIFICATION',
      alerts: [
        {
          id: `ALT-${Date.now()}`,
          type: 'DUPLICATE_SUSPECT',
          message: nameDuplicate
            ? 'Tên quán trùng nhưng địa chỉ khác — cần Ops xác minh thủ công.'
            : 'Hotline trùng nhưng tên quán khác — cần Ops kiểm tra chéo thông tin.',
          createdAt: new Date().toISOString(),
        },
      ],
    };
  }

  const incompleteDocs =
    !payload.basicInfo.businessLicenseImage ||
    payload.infrastructure.spaceImages.length < 3;

  if (incompleteDocs) {
    return {
      blocked: false,
      status: 'PENDING_INFO',
      alerts: [
        {
          id: `ALT-${Date.now()}`,
          type: 'INCOMPLETE_DOCUMENTS',
          message: 'Hồ sơ thiếu tài liệu đính kèm hợp lệ — đã gửi email yêu cầu bổ sung.',
          createdAt: new Date().toISOString(),
        },
      ],
    };
  }

  return { blocked: false, status: 'PENDING_REVIEW' };
}

function applyTransition(
  registration: Registration,
  payload: TransitionRegistrationRequest,
): TransitionRegistrationResponse {
  if (!canPerformAction(registration.status, payload.action)) {
    throw new Error('Hành động không hợp lệ với trạng thái hiện tại của đơn.');
  }

  if (payload.action === 'REJECT' && !payload.reason?.trim()) {
    throw new Error('Vui lòng nhập lý do từ chối.');
  }

  if (payload.action === 'CANCEL_NEGOTIATION' && !payload.reason?.trim()) {
    throw new Error('Vui lòng nhập lý do hủy đàm phán.');
  }

  let nextStatus = resolveNextStatus(registration.status, payload.action);
  let managerAccount: TransitionRegistrationResponse['managerAccount'];

  const updated: Registration = {
    ...registration,
    status: nextStatus,
    updatedAt: new Date().toISOString(),
    statusHistory: appendStatusHistory(
      registration,
      nextStatus,
      payload.note ?? payload.reason,
      'Admin',
    ),
  };

  if (payload.action === 'REJECT') {
    updated.rejectionReason = payload.reason?.trim();
  }

  if (payload.action === 'CANCEL_NEGOTIATION') {
    updated.cancelReason = payload.reason?.trim();
  }

  if (payload.action === 'RECORD_CONTRACT_SIGNED') {
    updated.commissionRate = payload.commissionRate ?? 10;
    updated.contractSignedAt = new Date().toISOString();
    nextStatus = resolvePostTransitionStatus(nextStatus);
    updated.status = nextStatus;
    managerAccount = createManagerAccount(updated);
    updated.managerAccount = managerAccount;
    updated.statusHistory = appendStatusHistory(
      { ...updated, statusHistory: updated.statusHistory.slice(0, -1) },
      nextStatus,
      'Tự động cấp tài khoản CAFE_MANAGER và gửi email bàn giao',
      'System',
    );
  }

  return { registration: updated, managerAccount };
}

export const PartnerMockService = {
  getPendingApplications: async (params: PaginationParams): Promise<PaginatedResponse<Registration>> => {
    await delay();
    return filterRegistrations(params);
  },

  getRegistrationById: async (id: string): Promise<Registration> => {
    await delay();
    const registration = registrations.find((item) => item.id === id);
    if (!registration) throw new Error('Không tìm thấy đơn đăng ký.');
    return registration;
  },

  submitRegistration: async (
    payload: PartnerRegistrationRequest,
  ): Promise<SubmitRegistrationResponse> => {
    await delay(700);
    const duplicate = detectDuplicateOnSubmit(payload);

    if (duplicate.blocked) {
      throw new Error(duplicate.message ?? 'Đơn đăng ký bị từ chối do trùng dữ liệu.');
    }

    const status = duplicate.status ?? 'PENDING_REVIEW';
    const id = `REG-${String(registrations.length + 1).padStart(3, '0')}`;
    const now = new Date().toISOString();

    const registration: Registration = {
      id,
      status,
      ...payload,
      createdAt: now,
      updatedAt: now,
      statusHistory: initialHistory(status),
      alerts: duplicate.alerts ?? [],
    };

    registrations = [registration, ...registrations];

    return {
      registration,
      message:
        status === 'PENDING_REVIEW'
          ? 'Đơn đăng ký đã được gửi thành công. Chúng tôi sẽ liên hệ trong 3–5 ngày làm việc.'
          : 'Đơn đã được tiếp nhận và chuyển sang quy trình xử lý phù hợp.',
    };
  },

  transitionRegistration: async (
    id: string,
    payload: TransitionRegistrationRequest,
  ): Promise<TransitionRegistrationResponse> => {
    await delay(600);
    const index = findIndex(id);
    if (index === -1) throw new Error('Không tìm thấy đơn đăng ký.');

    const result = applyTransition(registrations[index], payload);
    registrations[index] = result.registration;
    return result;
  },

  approveRegistration: async (id: string): Promise<ApproveRegistrationResponse> => {
    const registration = registrations[findIndex(id)];
    if (!registration) throw new Error('Không tìm thấy đơn đăng ký.');

    const action = getPrimaryAction(registration.status);
    if (!action) throw new Error('Đơn không có hành động duyệt phù hợp ở trạng thái hiện tại.');

    const result = await PartnerMockService.transitionRegistration(id, { action });
    return {
      registration: result.registration,
      managerAccount: result.managerAccount,
    };
  },

  rejectRegistration: async (
    id: string,
    payload: RejectRegistrationRequest,
  ): Promise<Registration> => {
    const result = await PartnerMockService.transitionRegistration(id, {
      action: 'REJECT',
      reason: payload.reason,
    });
    return result.registration;
  },
} as const;
