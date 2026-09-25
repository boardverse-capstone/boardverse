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
 * Format lỗi từ BE cho dễ đọc — gom status code + body message thành 1 dòng.
 */
function formatApiError(err: unknown): string {
  if (err instanceof AxiosError) {
    const status = err.response?.status;
    const data: any = err.response?.data;
    const bodyMsg =
      data?.message ??
      data?.Message ??
      data?.title ??
      data?.error ??
      (typeof data === 'string' ? data : null);
    if (status && bodyMsg) {
      return `${status} — ${bodyMsg}`;
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
    onError: (error) => {
      // eslint-disable-next-line no-console
      console.error('[lobby-merge] approveMergeRequest error', error);
      toast.error(formatApiError(error));
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
    onError: (error) => {
      // eslint-disable-next-line no-console
      console.error('[lobby-merge] rejectMergeRequest error', error);
      toast.error(formatApiError(error));
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
