import type {
  RawUpdateOperationalStatusResponse,
  UpdateOperationalStatusResponse,
} from '../types/admin-cafe.interface';

function pickString(...values: (string | null | undefined)[]): string {
  for (const value of values) {
    if (value != null && value !== '') return value;
  }
  return '';
}

export function mapOperationalStatusResponse(
  raw: RawUpdateOperationalStatusResponse,
): UpdateOperationalStatusResponse {
  return {
    cafeId: pickString(raw.cafeId, raw.CafeId),
    status: pickString(raw.status, raw.Status) as UpdateOperationalStatusResponse['status'],
    reason: raw.reason ?? raw.Reason ?? null,
    updatedAt: raw.updatedAt ?? raw.UpdatedAt,
  };
}
