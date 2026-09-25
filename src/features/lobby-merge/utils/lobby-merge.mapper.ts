// src/features/lobby-merge/utils/lobby-merge.mapper.ts

/**
 * Mapper giữa payload BE (snake/camel/Pascal, có thể lồng data envelope)
 * và UI types trong `types/lobby-merge.interface.ts`.
 *
 * Dựa trên envelope mà `apiClient` đã unwrap (response.data hoặc response.data.data).
 * Tuy nhiên một số endpoint có thể trả về object/array phẳng — `unwrapData` xử lý cả 2.
 */

import type {
  ApproveMergeRequestResult,
  CancelMergeRequestResult,
  LobbyMergeAuditAction,
  LobbyMergeAuditLogDto,
  LobbyMergeRequestDto,
  LobbyMergeRequestStatus,
  RejectMergeRequestResult,
} from '../types/lobby-merge.interface';

function unwrapData(raw: unknown): unknown {
  if (raw == null) return raw;
  if (Array.isArray(raw)) return raw;
  if (typeof raw === 'object') {
    const r = raw as Record<string, unknown>;
    if ('data' in r && r.data !== undefined && r.data !== null) {
      return r.data;
    }
  }
  return raw;
}

function pickString(obj: Record<string, unknown>, ...keys: string[]): string {
  for (const k of keys) {
    const v = obj[k];
    if (v == null) continue;
    const s = String(v).trim();
    if (s) return s;
  }
  return '';
}

function pickStringOrNull(obj: Record<string, unknown>, ...keys: string[]): string | null {
  for (const k of keys) {
    const v = obj[k];
    if (v == null || v === '') return null;
    return String(v);
  }
  return null;
}

function pickNumber(obj: Record<string, unknown>, ...keys: string[]): number {
  for (const k of keys) {
    const v = obj[k];
    if (v == null) continue;
    const n = Number(v);
    if (Number.isFinite(n)) return n;
  }
  return 0;
}

function pickBool(obj: Record<string, unknown>, ...keys: string[]): boolean | null {
  for (const k of keys) {
    const v = obj[k];
    if (v == null) continue;
    if (typeof v === 'boolean') return v;
    if (v === 'true' || v === 1 || v === '1') return true;
    if (v === 'false' || v === 0 || v === '0') return false;
  }
  return null;
}

const VALID_STATUSES: ReadonlySet<LobbyMergeRequestStatus> = new Set([
  'Pending',
  'Approved',
  'Rejected',
  'Expired',
  'Cancelled',
]);

function normalizeStatus(raw: unknown): LobbyMergeRequestStatus {
  const s = raw == null ? '' : String(raw).trim();
  if (!s) return 'Pending';
  // Match exact, fallback capitalized
  if (VALID_STATUSES.has(s as LobbyMergeRequestStatus)) {
    return s as LobbyMergeRequestStatus;
  }
  const lower = s.toLowerCase();
  if (lower === 'pending') return 'Pending';
  if (lower === 'approved') return 'Approved';
  if (lower === 'rejected') return 'Rejected';
  if (lower === 'expired') return 'Expired';
  if (lower === 'cancelled' || lower === 'canceled') return 'Cancelled';
  return 'Pending';
}

const VALID_AUDIT_ACTIONS: ReadonlySet<LobbyMergeAuditAction> = new Set([
  'MergeRequested',
  'MergeApproved',
  'MergeRejected',
  'MergeExpired',
  'MemberTransferred',
  'ReservationAbsorbed',
  'SourceLobbyDissolved',
]);

function normalizeAuditAction(raw: unknown): LobbyMergeAuditAction {
  const s = raw == null ? '' : String(raw).trim();
  if (VALID_AUDIT_ACTIONS.has(s as LobbyMergeAuditAction)) {
    return s as LobbyMergeAuditAction;
  }
  return 'MergeRequested';
}

/** Map 1 LobbyMergeRequestDto */
export function mapApiMergeRequest(raw: unknown): LobbyMergeRequestDto | null {
  if (!raw || typeof raw !== 'object') return null;
  const r = raw as Record<string, unknown>;

  const id = pickString(r, 'id', 'Id', 'mergeRequestId', 'MergeRequestId');
  if (!id) return null;

  return {
    id,
    sourceLobbyId: pickString(r, 'sourceLobbyId', 'SourceLobbyId'),
    targetLobbyId: pickString(r, 'targetLobbyId', 'TargetLobbyId'),
    memberUserId: pickStringOrNull(r, 'memberUserId', 'MemberUserId'),
    sourceLobbyName: pickStringOrNull(r, 'sourceLobbyName', 'SourceLobbyName'),
    targetLobbyName: pickStringOrNull(r, 'targetLobbyName', 'TargetLobbyName'),
    requestedByUserId: pickString(r, 'requestedByUserId', 'RequestedByUserId'),
    requestedByUserName: pickStringOrNull(
      r,
      'requestedByUserName',
      'RequestedByUserName',
    ),
    reviewedByUserId: pickStringOrNull(r, 'reviewedByUserId', 'ReviewedByUserId'),
    reviewedByUserName: pickStringOrNull(
      r,
      'reviewedByUserName',
      'ReviewedByUserName',
    ),
    status: normalizeStatus(r.status ?? r.Status),
    statusText: pickStringOrNull(r, 'statusText', 'StatusText'),
    reason: pickStringOrNull(r, 'reason', 'Reason'),
    reviewNote: pickStringOrNull(r, 'reviewNote', 'ReviewNote'),
    idempotencyKey: pickStringOrNull(r, 'idempotencyKey', 'IdempotencyKey'),
    sourceMembersCount: pickNumber(
      r,
      'sourceMembersCount',
      'SourceMembersCount',
    ),
    sourceActiveMembersAtRequest: pickNumber(
      r,
      'sourceActiveMembersAtRequest',
      'SourceActiveMembersAtRequest',
    ),
    expiresAt:
      pickStringOrNull(r, 'expiresAt', 'ExpiresAt') ||
      pickString(r, 'createdAt', 'CreatedAt') ||
      new Date().toISOString(),
    combinedCount:
      pickNumber(r, 'combinedCount', 'CombinedCount') || null,
    seatCapacity:
      pickNumber(r, 'seatCapacity', 'SeatCapacity') || null,
    fitsCapacity: pickBool(r, 'fitsCapacity', 'FitsCapacity'),
    createdAt:
      pickString(r, 'createdAt', 'CreatedAt') || new Date().toISOString(),
    reviewedAt: pickStringOrNull(r, 'reviewedAt', 'ReviewedAt'),
  };
}

/** Map danh sách — chấp nhận cả array phẳng lẫn envelope { data: [...] } */
export function mapApiMergeRequestList(raw: unknown): LobbyMergeRequestDto[] {
  const data = unwrapData(raw);
  let items: unknown[] = [];
  if (Array.isArray(data)) {
    items = data;
  } else if (data && typeof data === 'object') {
    const obj = data as Record<string, unknown>;
    if (Array.isArray(obj.items)) items = obj.items as unknown[];
    else if (Array.isArray(obj.Items)) items = obj.Items as unknown[];
    else if (Array.isArray(obj.data)) items = obj.data as unknown[];
  }
  return items
    .map(mapApiMergeRequest)
    .filter((d): d is LobbyMergeRequestDto => d !== null);
}

/** Map response approve */
export function mapApiApproveResult(raw: unknown): ApproveMergeRequestResult {
  const data = unwrapData(raw);
  const r = data && typeof data === 'object' ? (data as Record<string, unknown>) : {};
  return {
    mergeRequestId: pickString(r, 'mergeRequestId', 'MergeRequestId', 'id', 'Id'),
    sourceLobbyId: pickString(r, 'sourceLobbyId', 'SourceLobbyId'),
    targetLobbyId: pickString(r, 'targetLobbyId', 'TargetLobbyId'),
    membersTransferred: pickNumber(r, 'membersTransferred', 'MembersTransferred', 'membersCount', 'MembersCount'),
    targetActiveSessionId: pickStringOrNull(
      r,
      'targetActiveSessionId',
      'TargetActiveSessionId',
    ),
    idempotencyKey: pickStringOrNull(r, 'idempotencyKey', 'IdempotencyKey'),
  };
}

/** Map response reject */
export function mapApiRejectResult(raw: unknown): RejectMergeRequestResult {
  const data = unwrapData(raw);
  const r = data && typeof data === 'object' ? (data as Record<string, unknown>) : {};
  return {
    mergeRequestId: pickString(r, 'mergeRequestId', 'MergeRequestId', 'id', 'Id'),
    status: normalizeStatus(r.status ?? r.Status),
    reviewedByUserName: pickStringOrNull(
      r,
      'reviewedByUserName',
      'ReviewedByUserName',
    ),
    reviewedAt: pickStringOrNull(r, 'reviewedAt', 'ReviewedAt'),
    reviewNote: pickStringOrNull(r, 'reviewNote', 'ReviewNote'),
  };
}

/** Map response cancel */
export function mapApiCancelResult(raw: unknown): CancelMergeRequestResult {
  const data = unwrapData(raw);
  const r = data && typeof data === 'object' ? (data as Record<string, unknown>) : {};
  return {
    mergeRequestId: pickString(r, 'mergeRequestId', 'MergeRequestId', 'id', 'Id'),
    status: normalizeStatus(r.status ?? r.Status),
  };
}

/** Map 1 audit log */
export function mapApiMergeAuditLog(raw: unknown): LobbyMergeAuditLogDto | null {
  if (!raw || typeof raw !== 'object') return null;
  const r = raw as Record<string, unknown>;
  const id = pickString(r, 'id', 'Id');
  if (!id) return null;
  return {
    id,
    mergeRequestId: pickStringOrNull(r, 'mergeRequestId', 'MergeRequestId'),
    sourceLobbyId: pickStringOrNull(r, 'sourceLobbyId', 'SourceLobbyId'),
    targetLobbyId: pickStringOrNull(r, 'targetLobbyId', 'TargetLobbyId'),
    sourceReservationId: pickStringOrNull(r, 'sourceReservationId', 'SourceReservationId'),
    targetReservationId: pickStringOrNull(r, 'targetReservationId', 'TargetReservationId'),
    sourceActiveSessionId: pickStringOrNull(r, 'sourceActiveSessionId', 'SourceActiveSessionId'),
    targetActiveSessionId: pickStringOrNull(r, 'targetActiveSessionId', 'TargetActiveSessionId'),
    performedByUserId: pickStringOrNull(r, 'performedByUserId', 'PerformedByUserId'),
    performedByUserName: pickStringOrNull(r, 'performedByUserName', 'PerformedByUserName'),
    action: normalizeAuditAction(r.action ?? r.Action),
    metadata: pickStringOrNull(r, 'metadata', 'Metadata'),
    success: pickBool(r, 'success', 'Success') ?? true,
    errorMessage: pickStringOrNull(r, 'errorMessage', 'ErrorMessage'),
    createdAt: pickString(r, 'createdAt', 'CreatedAt') || new Date().toISOString(),
  };
}

export function mapApiMergeAuditLogList(raw: unknown): LobbyMergeAuditLogDto[] {
  const data = unwrapData(raw);
  let items: unknown[] = [];
  if (Array.isArray(data)) {
    items = data;
  } else if (data && typeof data === 'object') {
    const obj = data as Record<string, unknown>;
    if (Array.isArray(obj.items)) items = obj.items as unknown[];
    else if (Array.isArray(obj.Items)) items = obj.Items as unknown[];
  }
  return items
    .map(mapApiMergeAuditLog)
    .filter((d): d is LobbyMergeAuditLogDto => d !== null);
}
