'use client';

// src/features/lobby-merge/hooks/useMergeRequestMutations.ts
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { AxiosError } from 'axios';
import {
  LOBBY_MERGE_QUERY_KEYS,
  LobbyMergeService,
} from '../services/lobby-merge.service';
import type {
  ApproveMergeRequestPayload,
  ApproveMergeRequestResult,
  CancelMergeRequestResult,
  CreateMergeRequestPayload,
  DemoBypassOptions,
  LobbyMergeRequestDto,
  RejectMergeRequestPayload,
  RejectMergeRequestResult,
} from '../types/lobby-merge.interface';

/**
 * Mã lỗi từ BE (theo `APIs/lobby-merge.md` §POST /merge-requests).
 * Map sang message tiếng Việt + hướng dẫn hành động cho staff POS.
 */
const MERGE_ERROR_MESSAGES: Record<
  string,
  { title: string; hint?: string }
> = {
  // 400 — Source lobby còn box InUse của game khác (Gap 4 fix 2026-09-29).
  // Staff phải EndGame + ComponentCheck trước khi merge cross-game.
  MergeDifferentGames: {
    title:
      'Lobby nguồn đang chơi game khác và chưa trả hộp về quán.',
    hint: 'Vào POS → bấm "Trả game" + "Kiểm kê linh kiện" cho lobby nguồn, rồi thử lại.',
  },
  // 409 — request không còn ở trạng thái Pending (đã Approve/Reject/Expire/Cancel).
  // Staff khác đã xử lý trước, double-action bị BE chặn.
  MergeRequestNotPending: {
    title: 'Yêu cầu ghép đã được staff khác xử lý.',
    hint: 'Vào tab "Yêu cầu ghép" → reload → chọn yêu cầu còn Pending để duyệt.',
  },
  // 500 (hoặc 400) — hệ thống thiếu config bắt buộc (vd: thiếu SePay bank, thiếu policy…).
  // Staff không thể tự xử lý, cần escalate admin.
  MissingConfiguration: {
    title: 'Thiếu cấu hình bắt buộc của hệ thống.',
    hint: 'Liên hệ admin để kiểm tra SePay bank / policy / setting trên trang Admin → Settings.',
  },
  // 400 — validation chung
  ValidationFailed: {
    title: 'Dữ liệu không hợp lệ.',
  },
  // 409 — conflict nghiệp vụ
  TargetLobbyNotActive: {
    title: 'Lobby đích không đang hoạt động.',
    hint: 'Chỉ merge vào lobby đang InProgress (đang chơi tại quán).',
  },
  MergeRequestAlreadyExists: {
    title: 'Đã có yêu cầu Pending cho cặp lobby nguồn → đích này.',
    hint: 'Vào tab "Yêu cầu ghép" duyệt hoặc huỷ yêu cầu cũ trước.',
  },
  InsufficientSeatsForMerge: {
    title: 'Lobby đích không đủ ghế trống.',
    hint: 'Chọn lobby đích khác có nhiều ghế hơn.',
  },
};

/** Trích error code BE từ response body — server trả `message` hoặc `Message`. */
function extractApiErrorCode(err: AxiosError): string | undefined {
  const data: any = err.response?.data;
  if (!data) return undefined;

  // Ưu tiên `errorCode` (nếu BE có trả), fallback `message` đã map thẳng.
  const code = data?.errorCode ?? data?.ErrorCode;
  if (typeof code === 'string' && code.trim()) return code.trim();

  const msg = data?.message ?? data?.Message;
  if (typeof msg === 'string') return msg.trim();
  return undefined;
}

/**
 * Format lỗi từ BE — gom status code + body message + gợi ý hành động.
 * Nếu BE trả code đã biết → hiển thị message tiếng Việt thân thiện.
 */
function formatApiError(err: unknown): string {
  if (err instanceof AxiosError) {
    const status = err.response?.status;
    const code = extractApiErrorCode(err);

    // [FIX #vi-message] BE có thể trả message tiếng Việt mà không có errorCode.
    // Detect pattern để fallback về message VN đã biết (kèm hướng dẫn hành động).
    const rawMessage =
      (err.response?.data as any)?.message ??
      (err.response?.data as any)?.Message ??
      '';

    // 1) MergeDifferentGames — cross-game conflict
    if (
      typeof rawMessage === 'string' &&
      /chơi\s*game\s*khác|khác\s*game|game\s*khác|không\s*giống\s*nhau/i.test(rawMessage)
    ) {
      const known = MERGE_ERROR_MESSAGES.MergeDifferentGames;
      const statusPrefix = status ? `[${status}] ` : '';
      return known.hint
        ? `${statusPrefix}${known.title} ${known.hint}`
        : `${statusPrefix}${known.title}`;
    }

    // 2) MergeRequestNotPending — staff khác đã xử lý trước
    if (
      typeof rawMessage === 'string' &&
      /không\s*còn\s*ở\s*trạng\s*thái\s*chờ\s*xử\s*lý|not\s*pending|already\s*(approved|rejected|cancelled|expired)/i.test(
        rawMessage,
      )
    ) {
      const known = MERGE_ERROR_MESSAGES.MergeRequestNotPending;
      const statusPrefix = status ? `[${status}] ` : '';
      return known.hint
        ? `${statusPrefix}${known.title} ${known.hint}`
        : `${statusPrefix}${known.title}`;
    }

    // 3) MissingConfiguration — hệ thống thiếu config
    if (
      typeof rawMessage === 'string' &&
      /thiếu\s*cấu\s*hình\s*bắt\s*buộc|missing\s*configuration|system\s*config/i.test(
        rawMessage,
      )
    ) {
      const known = MERGE_ERROR_MESSAGES.MissingConfiguration;
      const statusPrefix = status ? `[${status}] ` : '';
      return known.hint
        ? `${statusPrefix}${known.title} ${known.hint}`
        : `${statusPrefix}${known.title}`;
    }

    // Ưu tiên match lỗi nghiệp vụ đã biết
    if (code && MERGE_ERROR_MESSAGES[code]) {
      const known = MERGE_ERROR_MESSAGES[code];
      const statusPrefix = status ? `[${status}] ` : '';
      return known.hint
        ? `${statusPrefix}${known.title} ${known.hint}`
        : `${statusPrefix}${known.title}`;
    }

    // Fallback: hiển thị message thô từ BE
    if (code) {
      return status ? `${status} — ${code}` : code;
    }

    if (status) {
      return `${status} — ${err.response?.statusText || 'Request failed'}`;
    }
    return err.message || 'Lỗi kết nối tới server.';
  }
  if (err instanceof Error) return err.message;
  return 'Lỗi không xác định.';
}

/**
 * Kiểm tra 1 error từ `Promise.allSettled` có phải `MergeDifferentGames` không.
 * Dùng cho bulk path — staff sẽ thấy toast riêng về game conflict thay vì lỗi chung.
 *
 * [FIX #vi-message] BE có thể trả 2 dạng:
 *  - Có `errorCode: "MergeDifferentGames"` (ưu tiên)
 *  - Chỉ có `message` tiếng Việt (vd "Hai nhóm đang chơi game khác nhau") do BE i18n
 * Check cả 2 để dedup-toast hoạt động trong mọi trường hợp.
 */
export function isMergeDifferentGamesError(err: unknown): boolean {
  if (!(err instanceof AxiosError)) return false;
  const code = extractApiErrorCode(err);
  if (code === 'MergeDifferentGames') return true;
  // Fallback: kiểm tra message tiếng Việt phổ biến
  const message = (err.response?.data as any)?.message
    ?? (err.response?.data as any)?.Message
    ?? '';
  return /chơi\s*game\s*khác|khác\s*game|game\s*khác|không\s*giống\s*nhau/i.test(
    String(message),
  );
}

function invalidateMergeQueries(
  queryClient: ReturnType<typeof useQueryClient>,
  cafeId?: string,
) {
  queryClient.invalidateQueries({
    queryKey: [LOBBY_MERGE_QUERY_KEYS.pending, cafeId],
  });
  queryClient.invalidateQueries({
    queryKey: [LOBBY_MERGE_QUERY_KEYS.detail, cafeId],
  });
  queryClient.invalidateQueries({
    queryKey: [LOBBY_MERGE_QUERY_KEYS.forLobby, cafeId],
  });
  queryClient.invalidateQueries({
    queryKey: [LOBBY_MERGE_QUERY_KEYS.history, cafeId],
  });
}

/**
 * Mutation: tạo yêu cầu ghép nhóm.
 */
export function useCreateMergeRequest() {
  const queryClient = useQueryClient();

  return useMutation<LobbyMergeRequestDto, Error, CreateMergeRequestPayload & { cafeId: string }>({
    mutationFn: ({ cafeId, ...payload }) =>
      LobbyMergeService.createMergeRequest(cafeId, payload),
    onSuccess: (data, vars) => {
      invalidateMergeQueries(queryClient, vars.cafeId);
      toast.success(
        data.statusText
          ? `Đã tạo yêu cầu ghép nhóm — ${data.statusText}`
          : 'Đã tạo yêu cầu ghép nhóm.',
      );
    },
    onError: (error) => {
      // eslint-disable-next-line no-console
      console.error('[lobby-merge] createMergeRequest error', error);
      toast.error(formatApiError(error));
    },
  });
}

/**
 * Mutation: duyệt yêu cầu ghép nhóm.
 * - opts.bypassDemoLocks = true → ?bypassDemoLocks=true (bỏ qua BR-USER-LIMIT-02/03).
 * - Sau khi duyệt, cần invalidate các query liên quan tới lobby/session (active sessions).
 */
export function useApproveMergeRequest() {
  const queryClient = useQueryClient();

  return useMutation<
    ApproveMergeRequestResult,
    Error,
    {
      cafeId: string;
      requestId: string;
      payload?: ApproveMergeRequestPayload;
      opts?: DemoBypassOptions;
    }
  >({
    mutationFn: ({ cafeId, requestId, payload, opts }) =>
      LobbyMergeService.approveMergeRequest(cafeId, requestId, payload, opts),
    onSuccess: (result, vars) => {
      invalidateMergeQueries(queryClient, vars.cafeId);
      // Ghép thành công → refetch session + lobby members của Target (lobby đích).
      queryClient.invalidateQueries({
        queryKey: ['pos-active-sessions', vars.cafeId],
      });
      queryClient.invalidateQueries({
        queryKey: ['pos-session', vars.cafeId],
      });
      toast.success(
        `Ghép nhóm thành công (${result.membersTransferred} thành viên).`,
      );
    },
    onError: (error, vars) => {
      // eslint-disable-next-line no-console
      console.error('[lobby-merge] approveMergeRequest error', error);
      toast.error(formatApiError(error));
      // [FIX #race-invalidate] Staff khác có thể đã Approve/Reject request này
      // ngay trước khi mình gọi → BE trả 409. Refetch để tab "Yêu cầu ghép"
      // đồng bộ status thật (Pending → Rejected) thay vì hiển thị stale.
      if (vars.cafeId) {
        invalidateMergeQueries(queryClient, vars.cafeId);
      }
    },
  });
}

/**
 * Mutation: từ chối yêu cầu ghép nhóm.
 */
export function useRejectMergeRequest() {
  const queryClient = useQueryClient();

  return useMutation<
    RejectMergeRequestResult,
    Error,
    { cafeId: string; requestId: string; payload?: RejectMergeRequestPayload }
  >({
    mutationFn: ({ cafeId, requestId, payload }) =>
      LobbyMergeService.rejectMergeRequest(cafeId, requestId, payload),
    onSuccess: (_result, vars) => {
      invalidateMergeQueries(queryClient, vars.cafeId);
      toast.success('Đã từ chối yêu cầu ghép nhóm.');
    },
    onError: (error, vars) => {
      // eslint-disable-next-line no-console
      console.error('[lobby-merge] rejectMergeRequest error', error);
      toast.error(formatApiError(error));
      // [FIX #race-invalidate] Staff khác có thể đã Approve/Cancel request này
      // ngay trước → refetch cache để đồng bộ status.
      if (vars.cafeId) {
        invalidateMergeQueries(queryClient, vars.cafeId);
      }
    },
  });
}

/**
 * Mutation: hủy yêu cầu ghép nhóm (chỉ Pending).
 */
export function useCancelMergeRequest() {
  const queryClient = useQueryClient();

  return useMutation<
    CancelMergeRequestResult,
    Error,
    { cafeId: string; requestId: string }
  >({
    mutationFn: ({ cafeId, requestId }) =>
      LobbyMergeService.cancelMergeRequest(cafeId, requestId),
    onSuccess: (_result, vars) => {
      invalidateMergeQueries(queryClient, vars.cafeId);
      toast.success('Đã hủy yêu cầu ghép nhóm.');
    },
    onError: (error) => {
      // eslint-disable-next-line no-console
      console.error('[lobby-merge] cancelMergeRequest error', error);
      toast.error(formatApiError(error));
    },
  });
}

/**
 * Mutation: ghép nhiều member cùng lúc.
 * Trả về kết quả từng member (ok / fail).
 */
export function useBulkCreateMergeRequests() {
  const queryClient = useQueryClient();

  return useMutation<
    Array<
      | { ok: true; memberUserId: string; request: LobbyMergeRequestDto }
      | { ok: false; memberUserId: string; error: string }
    >,
    Error,
    {
      cafeId: string;
      sourceLobbyId: string;
      targetLobbyId: string;
      memberUserIds: string[];
      reason?: string;
    }
  >({
    mutationFn: ({ cafeId, ...params }) =>
      LobbyMergeService.createBulkMergeRequests(cafeId, params),
    onSuccess: (results, vars) => {
      invalidateMergeQueries(queryClient, vars.cafeId);
      const success = results.filter((r) => r.ok).length;
      const fail = results.length - success;
      if (fail === 0) {
        toast.success(`Đã gửi ${success} yêu cầu ghép nhóm.`);
      } else if (success === 0) {
        toast.error(`Không thể gửi yêu cầu ghép nhóm (${fail} lỗi).`);
      } else {
        toast.warning(`Đã gửi ${success}/${results.length} yêu cầu — ${fail} lỗi.`);
      }
    },
    onError: (error) => {
      // eslint-disable-next-line no-console
      console.error('[lobby-merge] createBulkMergeRequests error', error);
      toast.error(formatApiError(error));
    },
  });
}
