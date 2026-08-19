import type {
  AdminRefundListPage,
  AdminRefundListParams,
  AdminRefundRequest,
  RawAdminRefundRequest,
} from '../types/refund.interface';

function pickString(...values: (string | null | undefined)[]): string {
  for (const value of values) {
    if (value != null && value !== '') return value;
  }
  return '';
}

function pickNumber(...values: (number | null | undefined)[]): number {
  for (const value of values) {
    if (value != null && !Number.isNaN(value)) return value;
  }
  return 0;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null;
}

export function mapApiRefundRequest(raw: RawAdminRefundRequest): AdminRefundRequest {
  return {
    id: pickString(raw.id, raw.Id),
    userId: pickString(raw.userId, raw.UserId),
    relatedLedgerEntryId: pickString(raw.relatedLedgerEntryId, raw.RelatedLedgerEntryId),
    requestedAmountBvc: pickNumber(raw.requestedAmountBvc, raw.RequestedAmountBvc),
    approvedAmountBvc:
      raw.approvedAmountBvc ?? raw.ApprovedAmountBvc ?? null,
    playerReason: pickString(raw.playerReason, raw.PlayerReason),
    adminNote: raw.adminNote ?? raw.AdminNote ?? null,
    status: pickString(raw.status, raw.Status) || 'Pending',
    resolvedByAdminId: raw.resolvedByAdminId ?? raw.ResolvedByAdminId ?? null,
    resolvedAt: raw.resolvedAt ?? raw.ResolvedAt ?? null,
    resultLedgerEntryId: raw.resultLedgerEntryId ?? raw.ResultLedgerEntryId ?? null,
    createdAt: pickString(raw.createdAt, raw.CreatedAt),
    updatedAt: pickString(raw.updatedAt, raw.UpdatedAt),
  };
}

export function normalizeRefundListResponse(
  raw: unknown,
  params: AdminRefundListParams,
): AdminRefundListPage {
  if (!raw) {
    return {
      items: [],
      page: params.page,
      pageSize: params.limit,
      totalItems: 0,
      totalPages: 1,
    };
  }

  if (Array.isArray(raw)) {
    const items = raw.map((item) => mapApiRefundRequest(item as RawAdminRefundRequest));
    return {
      items,
      page: params.page,
      pageSize: params.limit,
      totalItems: items.length,
      totalPages: Math.max(1, Math.ceil(items.length / params.limit)),
    };
  }

  if (!isRecord(raw)) {
    return {
      items: [],
      page: params.page,
      pageSize: params.limit,
      totalItems: 0,
      totalPages: 1,
    };
  }

  const nested = isRecord(raw.data) ? raw.data : raw;
  const itemsRaw = Array.isArray(nested.items)
    ? nested.items
    : Array.isArray(nested.data)
      ? nested.data
      : [];

  const items = (itemsRaw as RawAdminRefundRequest[]).map(mapApiRefundRequest);
  const page = Number(nested.page ?? params.page) || params.page;
  const pageSize = Number(nested.pageSize ?? params.limit) || params.limit;
  const totalItems = Number(nested.totalItems ?? nested.totalCount ?? items.length) || items.length;
  const totalPages =
    Number(nested.totalPages) || Math.max(1, Math.ceil(totalItems / pageSize));

  return { items, page, pageSize, totalItems, totalPages };
}
