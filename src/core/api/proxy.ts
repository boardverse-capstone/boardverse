// src/core/api/proxy.ts
/**
 * Lightweight proxy helper for Next.js Route Handlers that forward the
 * incoming client request to the upstream BoardVerse .NET backend.
 *
 * The frontend axios instance (`src/core/api/client.ts`) already attaches
 * `Authorization: Bearer <jwt>` before each request, so this proxy simply
 * passes the header through. The upstream is the canonical source of
 * authorization (role / cafe ownership), so this layer intentionally does
 * not re-implement RBAC — it only validates request shape via Zod and
 * forwards the call.
 *
 * Note: because these route handlers exist in `src/app/api/...`, they take
 * priority over the catch-all rewrite in `next.config.ts` that maps
 * `/api/:path*` → backend. We still proxy to the same backend, but now we
 * can layer validation and observability on top.
 */
import { NextResponse } from 'next/server';

import type { ApiResponse } from '@/shared/types/api.interface';

/** Method allow-list for proxying. Other methods return 405. */
const ALLOWED_METHODS = new Set([
  'GET',
  'POST',
  'PUT',
  'PATCH',
  'DELETE',
  'HEAD',
  'OPTIONS',
]);

/** Headers that must NOT be forwarded to the upstream. */
const HOP_BY_HOP = new Set([
  'connection',
  'keep-alive',
  'proxy-authenticate',
  'proxy-authorization',
  'te',
  'trailer',
  'transfer-encoding',
  'upgrade',
  'host',
  'content-length',
  // `Expect: 100-continue` is a client request header that some HTTP
  // stacks (notably Node's `fetch`) cannot handle as an upstream request.
  // Strip it so we don't surface `expect header not supported` from the
  // upstream fetch call.
  'expect',
]);

/** Result shape returned to the calling route handler. */
export interface ProxyResult<T = unknown> {
  ok: boolean;
  status: number;
  data: T | null;
  message: string;
  raw: Response;
}

export interface ProxyOptions {
  /** Override the upstream base URL (defaults to `NEXT_PUBLIC_API_BASE_URL`). */
  baseUrl?: string;
  /** Optional override of the request timeout in ms. Default: 30s. */
  timeoutMs?: number;
  /**
   * If provided, this JSON value is sent as the upstream request body and
   * `request.body` is ignored. Use this when the caller has already
   * consumed the incoming body for validation and wants to forward a
   * transformed shape. Required for non-GET/HEAD methods that have a body.
   */
  jsonBody?: unknown;
  /**
   * If provided, this raw text is sent as the upstream request body and
   * `request.body` is ignored. Mutually exclusive with `jsonBody`.
   */
  rawBody?: string;
}

/**
 * Get the upstream base URL from environment. Falls back to an empty string
 * when running on localhost (the dev server uses `next.config.ts` rewrites,
 * so an empty base makes this a no-op relative URL — useful for tests).
 */
function resolveBaseUrl(override?: string): string {
  if (override !== undefined) return override;
  return process.env.NEXT_PUBLIC_API_BASE_URL ?? '';
}

/** Build the upstream URL preserving the incoming query string. */
function buildUpstreamUrl(base: string, path: string, request: Request): string {
  const incomingUrl = new URL(request.url);
  const query = incomingUrl.search; // includes leading "?" or empty
  const normalizedBase = base.replace(/\/+$/, '');
  const normalizedPath = path.startsWith('/') ? path : `/${path}`;
  return `${normalizedBase}${normalizedPath}${query}`;
}

/**
 * Copy safe request headers onto the upstream `Headers`. Drops hop-by-hop
 * headers and `host` so the upstream receives a clean request.
 */
function buildUpstreamHeaders(request: Request): Headers {
  const headers = new Headers();
  request.headers.forEach((value, key) => {
    if (HOP_BY_HOP.has(key.toLowerCase())) return;
    headers.set(key, value);
  });
  return headers;
}

/**
 * Read the upstream body as either JSON or text. Tries JSON first because
 * every endpoint on the BoardVerse backend speaks `application/json`.
 */
async function readUpstreamBody(response: Response): Promise<unknown> {
  const contentType = response.headers.get('content-type') ?? '';
  if (contentType.includes('application/json')) {
    try {
      return await response.json();
    } catch {
      return null;
    }
  }
  try {
    return await response.text();
  } catch {
    return null;
  }
}

/**
 * Forward `request` to `<baseUrl><path>` (query string preserved) and
 * return a typed proxy result. Never throws — all error paths produce a
 * `ProxyResult` with `ok: false` so the caller can convert it to a
 * consistent envelope response.
 */
export async function proxyToBackend<T = unknown>(
  request: Request,
  path: string,
  options: ProxyOptions = {},
): Promise<ProxyResult<T>> {
  const method = request.method.toUpperCase();
  if (!ALLOWED_METHODS.has(method)) {
    const raw = NextResponse.json(
      { statusCode: 405, message: 'Method Not Allowed' },
      { status: 405 },
    );
    return { ok: false, status: 405, data: null, message: 'Method Not Allowed', raw };
  }

  const base = resolveBaseUrl(options.baseUrl);
  const url = buildUpstreamUrl(base, path, request);
  const headers = buildUpstreamHeaders(request);
  const timeoutMs = options.timeoutMs ?? 30_000;

  // Resolve body: explicit options > original request body stream.
  let body: BodyInit | null = request.body;
  if (options.jsonBody !== undefined) {
    body = JSON.stringify(options.jsonBody);
    if (!headers.has('content-type')) {
      headers.set('content-type', 'application/json');
    }
  } else if (options.rawBody !== undefined) {
    body = options.rawBody;
  }

  // Build an AbortController so a hung upstream does not block forever.
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), timeoutMs);

  let upstream: Response;
  try {
    // `duplex: 'half'` is required by Node's fetch when the request body
    // is a stream. It is non-standard but supported by undici. We only
    // set it when there's actually a body to forward (POST/PUT/PATCH/
    // DELETE with payload) to keep GET/HEAD requests simple.
    const init: RequestInit & { duplex?: 'half' } = {
      method,
      headers,
      body,
      signal: controller.signal,
    };
    if (body !== null && body !== undefined) {
      init.duplex = 'half';
    }
    upstream = await fetch(url, init);
  } catch (error) {
    clearTimeout(timeoutId);
    const isAbort = error instanceof DOMException && error.name === 'AbortError';
    // Node's fetch failure is an `AggregateError` whose `.cause` carries the
    // real underlying reason (DNS, TLS, ECONNREFUSED, etc.). Surface that
    // so log readers can diagnose upstream connectivity.
    const cause = (error as Error & { cause?: unknown })?.cause;
    const causeMessage =
      cause instanceof Error
        ? cause.message
        : typeof cause === 'string'
          ? cause
          : cause
            ? String(cause)
            : '';
    const errorMessage =
      error instanceof Error
        ? error.message
        : typeof error === 'string'
          ? error
          : 'Unknown fetch error';
    const message = isAbort
      ? 'Yêu cầu hết thời gian chờ. Vui lòng thử lại.'
      : `Không thể kết nối tới máy chủ (${method} ${path}): ${errorMessage}${causeMessage ? ` — ${causeMessage}` : ''}`;
    console.error('[proxy] upstream fetch failed', {
      method,
      path,
      url,
      error: errorMessage,
      cause: causeMessage,
    });
    const raw = NextResponse.json(
      { statusCode: 503, message },
      { status: 503 },
    );
    return { ok: false, status: 503, data: null, message, raw };
  }
  clearTimeout(timeoutId);

  const upstreamBody = await readUpstreamBody(upstream);

  // If the upstream returned the standard `{ statusCode, message, data }`
  // envelope, surface the inner data and the upstream status as-is.
  if (
    upstreamBody !== null &&
    typeof upstreamBody === 'object' &&
    'statusCode' in upstreamBody &&
    'message' in upstreamBody
  ) {
    const envelope = upstreamBody as unknown as ApiResponse<T>;
    return {
      ok: upstream.ok,
      status: upstream.status,
      data: (envelope.data ?? null) as T | null,
      message: typeof envelope.message === 'string' ? envelope.message : '',
      raw: upstream as unknown as Response,
    };
  }

  // Non-envelope payload (unlikely for this backend, but possible for 204s).
  return {
    ok: upstream.ok,
    status: upstream.status,
    data: (upstreamBody as T) ?? null,
    message: upstream.ok ? '' : 'Yêu cầu thất bại.',
    raw: upstream as unknown as Response,
  };
}

/**
 * Wrap a `ProxyResult` into a `NextResponse` matching the backend envelope
 * so the FE interceptor (`src/core/api/client.ts`) can unwrap it the same
 * way it unwraps direct backend responses.
 */
export function toNextResponse<T>(result: ProxyResult<T>): NextResponse {
  // Mirror upstream status when upstream succeeded, but force 4xx/5xx on
  // local failures so the FE surfaces the error correctly.
  const status = result.ok ? result.status : result.status >= 400 ? result.status : 500;

  const payload: ApiResponse<T | unknown> = {
    statusCode: status,
    message: result.message || (result.ok ? 'OK' : 'Yêu cầu thất bại.'),
    data: result.data,
    timestamp: new Date().toISOString(),
    path: '',
  };

  return NextResponse.json(payload, { status });
}