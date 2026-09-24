// src/features/lobby-merge/services/lobby-merge.service.ts
/**
 * Lobby Merge Service — gọi API thật của `LobbyMergeController`.
 *
 * Base route: /api/cafes/{cafeId}/lobby-merge
 * Role: Manager, CafeStaff — phải thuộc quán đang vận hành.
 *
 * Tất cả request đi qua `apiClient` (axios) → BE thật.
 * KHÔNG mock, KHÔNG hardcode data, KHÔNG Promise.resolve() giả.
 *
 * Docs tham chiếu: `APIs/lobby-merge.md`.
 */

import apiClient from '@/core/api/client';
import type {
  ApproveMergeRequestPayload,
  ApproveMergeRequestResult,
  CancelMergeRequestResult,
  CreateMergeRequestPayload,
  DemoBypassOptions,
  LobbyMergeAuditLogDto,
  LobbyMergeRequestDto,
  RejectMergeRequestPayload,
  RejectMergeRequestResult,
} from '../types/lobby-merge.interface';
import {
  mapApiApproveResult,
  mapApiCancelResult,
  mapApiMergeAuditLogList,
  mapApiMergeRequest,
  mapApiMergeRequestList,
  mapApiRejectResult,
} from '../utils/lobby-merge.mapper';

/** React Query keys — UI subscribe qua các hook tương ứng */
export const LOBBY_MERGE_QUERY_KEYS = {
  pending: 'lobby-merge-pending',
  detail: 'lobby-merge-detail',
  forLobby: 'lobby-merge-for-lobby',
  history: 'lobby-merge-history',
} as const;

function basePath(cafeId: string): string {
  return `/api/cafes/${cafeId}/lobby-merge`;
}

function requestPath(cafeId: string, id: string): string {
  return `${basePath(cafeId)}/merge-requests/${id}`;
}

function lobbyPath(cafeId: string, lobbyId: string, suffix = ''): string {
  return `${basePath(cafeId)}/lobbies/${lobbyId}${suffix}`;
}

/**
 * Validate id trước khi gọi — tránh gửi "undefined"/"" lên BE (404 không rõ ràng).
 * Trả về chuỗi đã trim. Throw nếu rỗng.
 */
function requireId(label: string, value: string | null | undefined): string {
  const v = (value ?? '').trim();
  if (!v) {
    throw new Error(`Thiếu mã ${label}.`);
  }
  return v;
}

function buildBypassParams(opts?: DemoBypassOptions) {
  return opts?.bypassDemoLocks ? { bypassDemoLocks: true } : undefined;
}

export const LobbyMergeService = {
  /**
   * POST /api/cafes/{cafeId}/lobby-merge/merge-requests
   * Tạo yêu cầu ghép nhóm.
   */
  createMergeRequest: async (
    cafeId: string,
    payload: CreateMergeRequestPayload,
  ): Promise<LobbyMergeRequestDto> => {
    const cid = requireId('quán', cafeId);
    const sourceLobbyId = requireId('lobby nguồn', payload.sourceLobbyId);
    const targetLobbyId = requireId('lobby đích', payload.targetLobbyId);

    if (sourceLobbyId === targetLobbyId) {
      throw new Error('Lobby nguồn và lobby đích phải khác nhau.');
    }

    const body: Record<string, unknown> = {
      sourceLobbyId,
      targetLobbyId,
    };
    if (payload.reason?.trim()) body.reason = payload.reason.trim();
    if (payload.idempotencyKey?.trim()) {
      body.idempotencyKey = payload.idempotencyKey.trim();
    }

    const raw = await apiClient.post<never, unknown>(
      `${basePath(cid)}/merge-requests`,
      body,
    );
    const mapped = mapApiMergeRequest(raw);
    if (!mapped) {
      throw new Error('BE không trả về LobbyMergeRequestDto hợp lệ.');
    }
    return mapped;
  },

  /**
   * GET /api/cafes/{cafeId}/lobby-merge/merge-requests/{requestId}
   * Lấy chi tiết 1 request.
   */
  getMergeRequest: async (
    cafeId: string,
    requestId: string,
  ): Promise<LobbyMergeRequestDto> => {
    const cid = requireId('quán', cafeId);
    const id = requireId('yêu cầu', requestId);

    const raw = await apiClient.get<never, unknown>(requestPath(cid, id));
    const mapped = mapApiMergeRequest(raw);
    if (!mapped) {
      throw new Error('Không tìm thấy yêu cầu ghép nhóm.');
    }
    return mapped;
  },

  /**
   * GET /api/cafes/{cafeId}/lobby-merge/merge-requests/pending
   * Danh sách request đang chờ duyệt.
   */
  getPendingMergeRequests: async (
    cafeId: string,
  ): Promise<LobbyMergeRequestDto[]> => {
    const cid = requireId('quán', cafeId);
    const raw = await apiClient.get<never, unknown>(
      `${basePath(cid)}/merge-requests/pending`,
    );
    return mapApiMergeRequestList(raw);
  },

  /**
   * POST /api/cafes/{cafeId}/lobby-merge/merge-requests/{requestId}/approve
   * Duyệt yêu cầu ghép nhóm (atomic, có FOR UPDATE lock trên ActiveSession đích).
   *
   * `opts.bypassDemoLocks = true` → gửi `?bypassDemoLocks=true` để bỏ qua BR-USER-LIMIT-02/03.
   */
  approveMergeRequest: async (
    cafeId: string,
    requestId: string,
    payload?: ApproveMergeRequestPayload,
    opts?: DemoBypassOptions,
  ): Promise<ApproveMergeRequestResult> => {
    const cid = requireId('quán', cafeId);
    const id = requireId('yêu cầu', requestId);

    const body: Record<string, unknown> = {};
    if (payload?.reviewNote?.trim()) {
      body.reviewNote = payload.reviewNote.trim();
    }

    const raw = await apiClient.post<never, unknown>(
      `${requestPath(cid, id)}/approve`,
      body,
      {
        params: buildBypassParams(opts),
      },
    );
    return mapApiApproveResult(raw);
  },

  /**
   * POST /api/cafes/{cafeId}/lobby-merge/merge-requests/{requestId}/reject
   * Từ chối yêu cầu — không thay đổi lobby/session/reservation.
   */
  rejectMergeRequest: async (
    cafeId: string,
    requestId: string,
    payload?: RejectMergeRequestPayload,
  ): Promise<RejectMergeRequestResult> => {
    const cid = requireId('quán', cafeId);
    const id = requireId('yêu cầu', requestId);

    const body: Record<string, unknown> = {};
    if (payload?.reviewNote?.trim()) {
      body.reviewNote = payload.reviewNote.trim();
    }

    const raw = await apiClient.post<never, unknown>(
      `${requestPath(cid, id)}/reject`,
      body,
    );
    return mapApiRejectResult(raw);
  },

  /**
   * DELETE /api/cafes/{cafeId}/lobby-merge/merge-requests/{requestId}
   * Hủy yêu cầu — chỉ Pending mới hủy được.
   */
  cancelMergeRequest: async (
    cafeId: string,
    requestId: string,
  ): Promise<CancelMergeRequestResult> => {
    const cid = requireId('quán', cafeId);
    const id = requireId('yêu cầu', requestId);

    const raw = await apiClient.delete<never, unknown>(requestPath(cid, id));
    return mapApiCancelResult(raw);
  },

  /**
   * GET /api/cafes/{cafeId}/lobby-merge/lobbies/{lobbyId}/merge-history
   * Lịch sử ghép nhóm (audit log) của 1 lobby.
   */
  getLobbyMergeHistory: async (
    cafeId: string,
    lobbyId: string,
  ): Promise<LobbyMergeAuditLogDto[]> => {
    const cid = requireId('quán', cafeId);
    const id = requireId('lobby', lobbyId);

    const raw = await apiClient.get<never, unknown>(
      lobbyPath(cid, id, '/merge-history'),
    );
    return mapApiMergeAuditLogList(raw);
  },

  /**
   * GET /api/cafes/{cafeId}/lobby-merge/lobbies/{lobbyId}/merge-requests
   * Tất cả request của 1 lobby (bất kể status).
   */
  getLobbyMergeRequests: async (
    cafeId: string,
    lobbyId: string,
  ): Promise<LobbyMergeRequestDto[]> => {
    const cid = requireId('quán', cafeId);
    const id = requireId('lobby', lobbyId);

    const raw = await apiClient.get<never, unknown>(
      lobbyPath(cid, id, '/merge-requests'),
    );
    return mapApiMergeRequestList(raw);
  },

  /**
   * Helper: ghép nhiều member cùng lúc (B1, B2, B3) sang lobby A.
   * BE chỉ hỗ trợ 1 member / request — UI loop qua helper này.
   *
   * Dùng `Promise.allSettled` để 1 member fail không chặn các member còn lại.
   * `idempotencyKey` được tạo tự động cho mỗi member.
   */
  createBulkMergeRequests: async (
    cafeId: string,
    params: {
      sourceLobbyId: string;
      targetLobbyId: string;
      memberUserIds: string[];
      reason?: string;
    },
  ): Promise<
    Array<
      | { ok: true; memberUserId: string; request: LobbyMergeRequestDto }
      | { ok: false; memberUserId: string; error: string }
    >
  > => {
    const results = await Promise.allSettled(
      params.memberUserIds.map(async (memberUserId) => {
        const idempotencyKey = `MERGE-${memberUserId}-${Date.now()}`;
        return LobbyMergeService.createMergeRequest(cafeId, {
          sourceLobbyId: params.sourceLobbyId,
          targetLobbyId: params.targetLobbyId,
          reason: params.reason,
          idempotencyKey,
        });
      }),
    );

    return params.memberUserIds.map((memberUserId, idx) => {
      const r = results[idx];
      if (r.status === 'fulfilled') {
        return { ok: true, memberUserId, request: r.value };
      }
      const msg =
        r.reason instanceof Error ? r.reason.message : String(r.reason ?? 'Lỗi');
      return { ok: false, memberUserId, error: msg };
    });
  },
};

export default LobbyMergeService;
