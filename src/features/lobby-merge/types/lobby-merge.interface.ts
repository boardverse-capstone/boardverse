// src/features/lobby-merge/types/lobby-merge.interface.ts

/**
 * Lobby Merge — DTO/UI types.
 * Dựa trên tài liệu `APIs/lobby-merge.md` (LobbyMergeController.cs).
 *
 * FE chỉ wrap lại response từ BE để UI dùng.
 * KHÔNG mock — mọi data đều từ `apiClient` (axios → BE thật).
 */

/** Trạng thái yêu cầu ghép — khớp enum LobbyMergeRequestStatus */
export type LobbyMergeRequestStatus =
  | 'Pending'
  | 'Approved'
  | 'Rejected'
  | 'Expired'
  | 'Cancelled';

export const LOBBY_MERGE_STATUS_LABELS: Record<LobbyMergeRequestStatus, string> = {
  Pending: 'Đang chờ duyệt',
  Approved: 'Đã duyệt',
  Rejected: 'Bị từ chối',
  Expired: 'Hết hạn',
  Cancelled: 'Đã hủy',
};

/** Action log — khớp enum LobbyMergeAuditAction */
export type LobbyMergeAuditAction =
  | 'MergeRequested'
  | 'MergeApproved'
  | 'MergeRejected'
  | 'MergeExpired'
  | 'MemberTransferred'
  | 'ReservationAbsorbed'
  | 'SourceLobbyDissolved';

/** DTO LobbyMergeRequestDto — response của các endpoint merge-requests */
export interface LobbyMergeRequestDto {
  id: string;
  sourceLobbyId: string;
  targetLobbyId: string;
  /** Member muốn chuyển (nullable cho backward compat — BE có thể bỏ) */
  memberUserId?: string | null;
  sourceLobbyName?: string | null;
  targetLobbyName?: string | null;
  requestedByUserId: string;
  requestedByUserName?: string | null;
  reviewedByUserId?: string | null;
  reviewedByUserName?: string | null;
  status: LobbyMergeRequestStatus;
  statusText?: string | null;
  reason?: string | null;
  reviewNote?: string | null;
  idempotencyKey?: string | null;
  /** Tổng member (kể cả guest) ở lobby Nguồn tại thời điểm tạo request */
  sourceMembersCount: number;
  /** Member đang active (IsActive = true) ở Nguồn */
  sourceActiveMembersAtRequest: number;
  expiresAt: string;
  /** Tổng = sourceActiveMembers + targetCurrentPlayers */
  combinedCount?: number | null;
  /** AvailableSeats + targetCurrent = chỗ ngồi tối đa */
  seatCapacity?: number | null;
  /** Validate ghế khả dụng tại thời điểm tạo request */
  fitsCapacity?: boolean | null;
  createdAt: string;
  reviewedAt?: string | null;
}

/** Body POST /merge-requests */
export interface CreateMergeRequestPayload {
  sourceLobbyId: string;
  targetLobbyId: string;
  reason?: string;
  idempotencyKey?: string;
}

/** Body POST /merge-requests/{id}/approve */
export interface ApproveMergeRequestPayload {
  reviewNote?: string;
}

/** Body POST /merge-requests/{id}/reject */
export interface RejectMergeRequestPayload {
  reviewNote?: string;
}

/** Response 200 — POST /approve */
export interface ApproveMergeRequestResult {
  mergeRequestId: string;
  sourceLobbyId: string;
  targetLobbyId: string;
  membersTransferred: number;
  targetActiveSessionId?: string | null;
  idempotencyKey?: string | null;
}

/** Response 200 — POST /reject */
export interface RejectMergeRequestResult {
  mergeRequestId: string;
  status: LobbyMergeRequestStatus;
  reviewedByUserName?: string | null;
  reviewedAt?: string | null;
  reviewNote?: string | null;
}

/** Response 200 — DELETE /merge-requests/{id} */
export interface CancelMergeRequestResult {
  mergeRequestId: string;
  status: LobbyMergeRequestStatus;
}

/** DTO LobbyMergeAuditLogDto — response GET /lobbies/{id}/merge-history */
export interface LobbyMergeAuditLogDto {
  id: string;
  mergeRequestId?: string | null;
  sourceLobbyId?: string | null;
  targetLobbyId?: string | null;
  sourceReservationId?: string | null;
  targetReservationId?: string | null;
  sourceActiveSessionId?: string | null;
  targetActiveSessionId?: string | null;
  performedByUserId?: string | null;
  performedByUserName?: string | null;
  action: LobbyMergeAuditAction;
  /** JSON string — tùy action có shape khác nhau */
  metadata?: string | null;
  success: boolean;
  errorMessage?: string | null;
  createdAt: string;
}

/** Tùy chọn gọi approve/reject với demo bypass */
export interface DemoBypassOptions {
  /** true → gửi `?bypassDemoLocks=true` (BE bỏ qua BR-USER-LIMIT-02/03) */
  bypassDemoLocks?: boolean;
}
