import type {
  UpdateOperationalStatusRequest,
  UpdateOperationalStatusResponse,
} from '../types/admin-cafe.interface';

const delay = () => new Promise((resolve) => setTimeout(resolve, 400));

export const AdminCafeMockService = {
  updateOperationalStatus: async (
    cafeId: string,
    payload: UpdateOperationalStatusRequest,
  ): Promise<UpdateOperationalStatusResponse> => {
    await delay();
    if (payload.status === 'BANNED' && !payload.reason?.trim()) {
      throw new Error('Vui lòng nhập lý do khi cấm quán.');
    }
    return {
      cafeId,
      status: payload.status,
      reason: payload.reason ?? null,
      updatedAt: new Date().toISOString(),
    };
  },
};
