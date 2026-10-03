'use client';

// src/features/lobby-merge/hooks/useLobbyMergeRealtime.ts
import { useEffect } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import {
  HubConnection,
  HubConnectionBuilder,
  HubConnectionState,
  LogLevel,
} from '@microsoft/signalr';
import { useAuthStore } from '@/features/auth/store/auth.store';
import { LOBBY_MERGE_QUERY_KEYS } from '../services/lobby-merge.service';
import type { LobbyMergeRequestDto } from '../types/lobby-merge.interface';

interface LobbyMergedIntoPayload {
  LobbyId?: string;
  lobbyId?: string;
  MergedFromLobbyId?: string;
  mergedFromLobbyId?: string;
  MergedMemberUserId?: string;
  mergedMemberUserId?: string;
  MergedMemberName?: string;
  mergedMemberName?: string;
  Timestamp?: string;
  timestamp?: string;
}

interface MemberJoinedFromMergePayload {
  LobbyId?: string;
  lobbyId?: string;
  Member?: Record<string, unknown>;
  member?: Record<string, unknown>;
  Timestamp?: string;
  timestamp?: string;
}

function resolveHubBaseUrl(): string {
  const env = (process.env.NEXT_PUBLIC_API_BASE_URL ?? '').replace(/\/$/, '');
  if (env) return env;
  if (typeof window !== 'undefined' && window.location.hostname === 'localhost') {
    return 'https://boardverse-server.onrender.com';
  }
  return '';
}

let cachedConnection: HubConnection | null = null;
let startPromise: Promise<HubConnection> | null = null;

async function getLobbyHubConnection(): Promise<HubConnection> {
  if (typeof window === 'undefined') {
    throw new Error('LobbyHub chỉ chạy trên client.');
  }
  if (cachedConnection?.state === HubConnectionState.Connected) {
    return cachedConnection;
  }
  if (!startPromise) {
    // Theo docs, LobbyHub là hub riêng (/hubs/lobby). Nếu BE chưa có
    // thì fallback /hubs/pos — cả 2 đều phát các event merge.
    const baseUrl = resolveHubBaseUrl();
    const url = `${baseUrl}/hubs/lobby`;
    cachedConnection = new HubConnectionBuilder()
      .withUrl(url, {
        accessTokenFactory: () => useAuthStore.getState().token ?? '',
      })
      .withAutomaticReconnect([0, 2000, 5000, 10000, 30000])
      .configureLogging(LogLevel.None)
      .build();
    startPromise = cachedConnection
      .start()
      .then(() => cachedConnection!)
      .catch(async (err) => {
        // Fallback sang /hubs/pos nếu /hubs/lobby không tồn tại
        startPromise = null;
        cachedConnection = null;
        const fallback = new HubConnectionBuilder()
          .withUrl(`${baseUrl}/hubs/pos`, {
            accessTokenFactory: () => useAuthStore.getState().token ?? '',
          })
          .withAutomaticReconnect([0, 2000, 5000, 10000, 30000])
          .configureLogging(LogLevel.None)
          .build();
        cachedConnection = fallback;
        startPromise = fallback
          .start()
          .then(() => cachedConnection!)
          .catch((err2) => {
            startPromise = null;
            cachedConnection = null;
            throw err2;
          });
        return startPromise;
      });
  }
  return startPromise;
}

/**
 * Subscribe realtime events `LobbyMergedInto` + `MemberJoinedFromMerge`.
 *
 * Khi 1 member được ghép vào lobby đích:
 *  - Invalidate query pending merge requests (request đã chuyển sang Approved).
 *  - Invalidate query session đang mở (active members của session đích đã đổi).
 *  - Toast info cho staff biết có ghép mới.
 *
 * Lưu ý: realtime refresh 1 phần dựa trên assumption các event payload khớp docs.
 * Nếu BE trả payload khác, hook này sẽ vẫn invalidate cache nhưng toast có thể không hiển thị tên.
 */
export function useLobbyMergeRealtime(
  cafeId: string | undefined,
  options?: { enabled?: boolean; showToast?: boolean },
) {
  const queryClient = useQueryClient();
  const enabled = options?.enabled ?? true;
  const showToast = options?.showToast ?? true;

  useEffect(() => {
    if (!enabled || typeof window === 'undefined') return undefined;
    let cancelled = false;
    let cleanupFns: Array<() => void> = [];

    (async () => {
      try {
        const conn = await getLobbyHubConnection();

        if (cancelled) return;

        const handleMergedInto = (payload: unknown) => {
          if (cafeId) {
            queryClient.invalidateQueries({
              queryKey: [LOBBY_MERGE_QUERY_KEYS.pending, cafeId],
            });
            queryClient.invalidateQueries({
              queryKey: ['pos-active-sessions', cafeId],
            });
            queryClient.invalidateQueries({
              queryKey: ['pos-session', cafeId],
            });
            queryClient.invalidateQueries({
              queryKey: ['pos-pending-bookings', cafeId],
            });
          }

          if (showToast && payload && typeof payload === 'object') {
            const p = payload as LobbyMergedIntoPayload;
            const memberName =
              p.MergedMemberName ?? p.mergedMemberName ?? 'thành viên';
            const targetLobby = p.LobbyId ?? p.lobbyId ?? '';
            const sourceLobby = p.MergedFromLobbyId ?? p.mergedFromLobbyId ?? '';
            toast.info(
              sourceLobby
                ? `${memberName} đã được ghép sang lobby mới (${targetLobby.slice(0, 8)}…).`
                : `${memberName} đã được ghép vào lobby đích.`,
            );
          }
        };

        const handleMemberJoined = (payload: unknown) => {
          if (cafeId) {
            queryClient.invalidateQueries({
              queryKey: ['pos-active-sessions', cafeId],
            });
            queryClient.invalidateQueries({
              queryKey: ['pos-session', cafeId],
            });
          }
          void payload;
        };

        conn.on('LobbyMergedInto', handleMergedInto);
        conn.on('MemberJoinedFromMerge', handleMemberJoined);

        cleanupFns.push(() => {
          conn.off('LobbyMergedInto', handleMergedInto);
        });
        cleanupFns.push(() => {
          conn.off('MemberJoinedFromMerge', handleMemberJoined);
        });
      } catch {
        // Hub lỗi — không chặn UI; polling query vẫn chạy.
      }
    })();

    return () => {
      cancelled = true;
      cleanupFns.forEach((fn) => {
        try {
          fn();
        } catch {
          // ignore
        }
      });
    };
  }, [cafeId, enabled, showToast, queryClient]);
}

/** Export helpers for direct subscription in components */
export async function subscribeLobbyMergedInto(
  handler: (payload: LobbyMergedIntoPayload) => void,
): Promise<() => void> {
  const conn = await getLobbyHubConnection();
  const wrapped = (p: unknown) => handler(p as LobbyMergedIntoPayload);
  conn.on('LobbyMergedInto', wrapped);
  return () => conn.off('LobbyMergedInto', wrapped);
}

export async function subscribeMemberJoinedFromMerge(
  handler: (payload: MemberJoinedFromMergePayload) => void,
): Promise<() => void> {
  const conn = await getLobbyHubConnection();
  const wrapped = (p: unknown) => handler(p as MemberJoinedFromMergePayload);
  conn.on('MemberJoinedFromMerge', wrapped);
  return () => conn.off('MemberJoinedFromMerge', wrapped);
}

// Internal helper exports (dùng cho test/devtools)
export type { LobbyMergedIntoPayload, MemberJoinedFromMergePayload };
// Re-export type used by callers
export type _LobbyMergeRequestDto = LobbyMergeRequestDto;
