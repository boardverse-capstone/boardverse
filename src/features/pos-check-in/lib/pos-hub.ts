'use client';

import {
  HubConnection,
  HubConnectionBuilder,
  HubConnectionState,
  LogLevel,
} from '@microsoft/signalr';
import { useAuthStore } from '@/features/auth/store/auth.store';

function resolveHubBaseUrl(): string {
  const env = (process.env.NEXT_PUBLIC_API_BASE_URL ?? '').replace(/\/$/, '');
  if (env) return env;
  // REST đi qua Next rewrite `/api`; `/hubs` không được proxy — localhost phải hit BE.
  if (typeof window !== 'undefined' && window.location.hostname === 'localhost') {
    return 'https://boardverse-server.onrender.com';
  }
  return '';
}

let connection: HubConnection | null = null;
let startPromise: Promise<HubConnection> | null = null;

function buildConnection(): HubConnection {
  const url = `${resolveHubBaseUrl()}/hubs/pos`;
  return new HubConnectionBuilder()
    .withUrl(url, {
      accessTokenFactory: () => useAuthStore.getState().token ?? '',
    })
    .withAutomaticReconnect([0, 2000, 5000, 10000, 30000])
    .configureLogging(LogLevel.None)
    .build();
}

/** Singleton HubConnection tới `/hubs/pos` */
export async function getPosHubConnection(): Promise<HubConnection> {
  if (typeof window === 'undefined') {
    throw new Error('PosHub chỉ chạy trên client.');
  }

  if (connection?.state === HubConnectionState.Connected) {
    return connection;
  }

  if (!startPromise) {
    connection = buildConnection();
    startPromise = connection
      .start()
      .then(() => connection!)
      .catch((err) => {
        startPromise = null;
        connection = null;
        throw err;
      });
  }

  return startPromise;
}

export async function stopPosHubConnection(): Promise<void> {
  startPromise = null;
  if (!connection) return;
  const conn = connection;
  connection = null;
  if (conn.state !== HubConnectionState.Disconnected) {
    await conn.stop();
  }
}

export type PosHubEventHandler = (payload: unknown) => void;

export async function subscribePosHubEvent(
  eventName: string,
  handler: PosHubEventHandler,
): Promise<() => void> {
  const conn = await getPosHubConnection();
  conn.on(eventName, handler);
  return () => {
    conn.off(eventName, handler);
  };
}

export async function joinPosUserNotifications(userId: string): Promise<void> {
  if (!userId) return;
  const conn = await getPosHubConnection();
  try {
    await conn.invoke('JoinUserNotifications', userId);
  } catch {
    // legacy method — ignore if hub only supports JoinCafe
  }
}

/** Docs: JoinCafe(cafeId) */
export async function joinPosCafe(cafeId: string): Promise<void> {
  if (!cafeId) return;
  const conn = await getPosHubConnection();
  await conn.invoke('JoinCafe', cafeId);
}

export async function leavePosCafe(cafeId: string): Promise<void> {
  if (!cafeId || !connection) return;
  if (connection.state !== HubConnectionState.Connected) return;
  await connection.invoke('LeaveCafe', cafeId);
}

export async function joinPosSession(sessionId: string): Promise<void> {
  if (!sessionId) return;
  const conn = await getPosHubConnection();
  try {
    await conn.invoke('SubscribeSession', sessionId);
  } catch {
    await conn.invoke('JoinSession', sessionId);
  }
}

export async function leavePosSession(sessionId: string): Promise<void> {
  if (!sessionId || !connection) return;
  if (connection.state !== HubConnectionState.Connected) return;
  try {
    await connection.invoke('UnsubscribeSession', sessionId);
  } catch {
    await connection.invoke('LeaveSession', sessionId);
  }
}
