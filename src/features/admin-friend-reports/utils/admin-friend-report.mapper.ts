import type {
  AdminFriendReport,
  AdminFriendReportListParams,
  AdminFriendReportListResult,
} from '../types/admin-friend-report.interface';

type UnknownRecord = Record<string, unknown>;

function asRecord(value: unknown): UnknownRecord {
  return value && typeof value === 'object' ? (value as UnknownRecord) : {};
}

function stringValue(record: UnknownRecord, ...keys: string[]): string {
  for (const key of keys) {
    const value = record[key];
    if (typeof value === 'string') return value;
  }
  return '';
}

function nullableString(record: UnknownRecord, ...keys: string[]): string | null {
  const value = stringValue(record, ...keys);
  return value || null;
}

function numberValue(record: UnknownRecord, fallback: number, ...keys: string[]): number {
  for (const key of keys) {
    const value = record[key];
    if (typeof value === 'number' && Number.isFinite(value)) return value;
  }
  return fallback;
}

export function mapAdminFriendReport(value: unknown): AdminFriendReport {
  const raw = asRecord(value);
  return {
    id: stringValue(raw, 'id', 'reportId', 'Id', 'ReportId'),
    reporterUserId: stringValue(raw, 'reporterUserId', 'reporterId', 'ReporterUserId'),
    reporterUsername: stringValue(
      raw,
      'reporterUsername',
      'reporterName',
      'ReporterUsername',
    ),
    targetUserId: stringValue(raw, 'targetUserId', 'reportedUserId', 'TargetUserId'),
    targetUsername: stringValue(
      raw,
      'targetUsername',
      'reportedUsername',
      'targetName',
      'TargetUsername',
    ),
    category: stringValue(raw, 'category', 'Category'),
    reason: stringValue(raw, 'reason', 'Reason'),
    status: stringValue(raw, 'status', 'Status') || 'Pending',
    adminNote: nullableString(raw, 'adminNote', 'AdminNote'),
    resolvedBy: nullableString(raw, 'resolvedBy', 'resolvedByUserId', 'ResolvedBy'),
    resolvedAt: nullableString(raw, 'resolvedAt', 'reviewedAt', 'ResolvedAt'),
    createdAt: stringValue(raw, 'createdAt', 'reportedAt', 'CreatedAt'),
  };
}

export function normalizeAdminFriendReports(
  value: unknown,
  params: AdminFriendReportListParams,
): AdminFriendReportListResult {
  if (Array.isArray(value)) {
    return {
      items: value.map(mapAdminFriendReport),
      offset: params.offset,
      limit: params.limit,
      totalItems: value.length,
      totalPages: Math.max(1, Math.ceil(value.length / params.limit)),
    };
  }

  const raw = asRecord(value);
  const list = raw.items ?? raw.data ?? raw.reports;
  const items = Array.isArray(list) ? list.map(mapAdminFriendReport) : [];
  const offset = numberValue(raw, params.offset, 'offset', 'skip');
  const limit = numberValue(raw, params.limit, 'limit', 'pageSize');
  const totalItems = numberValue(raw, items.length, 'totalItems', 'totalCount', 'count');

  return {
    items,
    offset,
    limit,
    totalItems,
    totalPages: Math.max(1, Math.ceil(totalItems / Math.max(1, limit))),
  };
}
