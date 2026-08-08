'use client';

import {
  HttpTransportType,
  HubConnection,
  HubConnectionBuilder,
  HubConnectionState,
  LogLevel,
} from '@microsoft/signalr';
import { useAuthStore } from '@/features/auth/store/auth.store';

const BASE_URL = process.env.NEXT_PUBLIC_API_BASE_URL ?? '';

let connection: HubConnection | null = null;
let startPromise: Promise<HubConnection> | null = null;

function buildConnection(skipNegotiation = true): HubConnection {
  const url = `${BASE_URL}/hubs/pos`;
  const options = skipNegotiation
    ? {
        accessTokenFactory: () => useAuthStore.getState().token ?? '',
        skipNegotiation: true,
        transport: HttpTransportType.WebSockets,
      }
    : {
        accessTokenFactory: () => useAuthStore.getState().token ?? '',
      };

  return new HubConnectionBuilder()
    .withUrl(url, options)
    .withAutomaticReconnect([0, 2000, 5000, 10000, 30000])
    .configureLogging(LogLevel.Warning)
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
    connection = buildConnection(true);
    startPromise = connection
      .start()
      .then(() => connection!)
      .catch(async () => {
        // Fallback sang negotiate chuẩn nếu direct WebSockets thất bại
        connection = buildConnection(false);
        try {
          await connection.start();
          return connection;
        } catch (err) {
          startPromise = null;
          connection = null;
          throw err;
        }
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
  await conn.invoke('JoinUserNotifications', userId);
}

export async function joinPosSession(sessionId: string): Promise<void> {
  if (!sessionId) return;
  const conn = await getPosHubConnection();
  await conn.invoke('JoinSession', sessionId);
}

export async function leavePosSession(sessionId: string): Promise<void> {
  if (!sessionId || !connection) return;
  if (connection.state !== HubConnectionState.Connected) return;
  await connection.invoke('LeaveSession', sessionId);
}
