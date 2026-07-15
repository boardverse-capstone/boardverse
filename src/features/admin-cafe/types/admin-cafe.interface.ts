import type { CafeOperationalStatusValue } from '@/core/constants/admin-cafe';

export interface UpdateOperationalStatusRequest {
  status: CafeOperationalStatusValue;
  reason?: string;
}

export interface UpdateOperationalStatusResponse {
  cafeId: string;
  status: CafeOperationalStatusValue;
  reason?: string | null;
  updatedAt?: string;
}

export interface RawUpdateOperationalStatusResponse {
  cafeId?: string;
  CafeId?: string;
  status?: string;
  Status?: string;
  reason?: string | null;
  Reason?: string | null;
  updatedAt?: string;
  UpdatedAt?: string;
}
