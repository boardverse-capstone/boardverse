'use client';

// src/features/lobby-merge/hooks/useMergeRequests.ts
import { useQuery } from '@tanstack/react-query';
import { LOBBY_MERGE_QUERY_KEYS, LobbyMergeService } from '../services/lobby-merge.service';
import type { LobbyMergeRequestDto } from '../types/lobby-merge.interface';

/**
 * GET /api/cafes/{cafeId}/lobby-merge/merge-requests/pending
 * Trả về danh sách request đang chờ duyệt.
 */
export function usePendingMergeRequests(
  cafeId: string | undefined,
  options?: {
    refetchInterval?: number;
    enabled?: boolean;
    /**
     * Nếu true, KHÔNG refetch khi tab ở background — tiết kiệm tài nguyên.
     * Mặc định `true` cho polling.
     */
    pauseWhenHidden?: boolean;
  },
) {
  return useQuery<LobbyMergeRequestDto[]>({
    queryKey: [LOBBY_MERGE_QUERY_KEYS.pending, cafeId],
    queryFn: () => LobbyMergeService.getPendingMergeRequests(cafeId!),
    enabled: (options?.enabled ?? true) && Boolean(cafeId),
    refetchInterval: options?.refetchInterval,
    refetchIntervalInBackground: options?.pauseWhenHidden ? false : undefined,
    // [FIX #race-condition] Refresh on window focus để staff thấy status
    // mới nhất khi quay lại tab — giảm double-action race condition.
    refetchOnWindowFocus: true,
    staleTime: 15_000,
  });
}

/**
 * GET /api/cafes/{cafeId}/lobby-merge/merge-requests/{requestId}
 */
export function useMergeRequestDetail(
  cafeId: string | undefined,
  requestId: string | undefined,
) {
  return useQuery<LobbyMergeRequestDto>({
    queryKey: [LOBBY_MERGE_QUERY_KEYS.detail, cafeId, requestId],
    queryFn: () => LobbyMergeService.getMergeRequest(cafeId!, requestId!),
    enabled: Boolean(cafeId) && Boolean(requestId),
    staleTime: 15_000,
  });
}

/**
 * GET /api/cafes/{cafeId}/lobby-merge/lobbies/{lobbyId}/merge-requests
 * Tất cả request của 1 lobby (bất kể status).
 */
export function useLobbyMergeRequests(
  cafeId: string | undefined,
  lobbyId: string | undefined,
) {
  return useQuery<LobbyMergeRequestDto[]>({
    queryKey: [LOBBY_MERGE_QUERY_KEYS.forLobby, cafeId, lobbyId],
    queryFn: () => LobbyMergeService.getLobbyMergeRequests(cafeId!, lobbyId!),
    enabled: Boolean(cafeId) && Boolean(lobbyId),
    staleTime: 15_000,
  });
}

/**
 * GET /api/cafes/{cafeId}/lobby-merge/lobbies/{lobbyId}/merge-history
 * Audit log của 1 lobby.
 */
export function useLobbyMergeHistory(
  cafeId: string | undefined,
  lobbyId: string | undefined,
) {
  return useQuery({
    queryKey: [LOBBY_MERGE_QUERY_KEYS.history, cafeId, lobbyId],
    queryFn: () => LobbyMergeService.getLobbyMergeHistory(cafeId!, lobbyId!),
    enabled: Boolean(cafeId) && Boolean(lobbyId),
    staleTime: 30_000,
  });
}
