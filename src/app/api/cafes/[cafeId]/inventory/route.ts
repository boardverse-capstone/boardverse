// src/app/api/cafes/[cafeId]/inventory/route.ts
/**
 * POST /api/cafes/{cafeId}/inventory
 *   Body: AddInventorySchema
 *   Roles: Manager (must be the cafe owner).
 *   Forwards to upstream: POST /api/cafes/{cafeId}/inventory
 *
 * GET /api/cafes/{cafeId}/inventory
 *   Query: searchTerm?, status?, sortBy?, sortDescending?, pageNumber?, pageSize?
 *   Roles: Public/Player (browse); CafeStaff/Manager (full incl. penalty fees).
 *   Forwards to upstream: GET /api/cafes/{cafeId}/inventory?...query
 */
import type { NextResponse as NextResponseType } from 'next/server';
import { NextResponse } from 'next/server';

import { proxyToBackend, toNextResponse } from '@/core/api/proxy';
import {
  AddInventorySchema,
  CafeInventoryParamsSchema,
  toAddInventoryPayload,
} from '@/shared/validators/cafe-inventory.validator';

/** Build a 400 envelope matching the upstream `{statusCode, message, data}`. */
function badRequest(message: string): NextResponseType {
  return NextResponse.json(
    {
      statusCode: 400,
      message,
      data: null,
      timestamp: new Date().toISOString(),
      path: '',
    },
    { status: 400 },
  );
}

/** Safe JSON parse for POST bodies — returns null on malformed input. */
async function safeJson(request: Request): Promise<unknown> {
  const contentType = request.headers.get('content-type') ?? '';
  if (!contentType.toLowerCase().includes('application/json')) return null;
  try {
    return await request.json();
  } catch {
    return null;
  }
}

/**
 * POST handler — add a board game from the master catalog to the cafe
 * inventory. Validates `cafeId` and the JSON body with Zod before forwarding
 * upstream; the upstream enforces role/ownership.
 */
export async function POST(
  request: Request,
  context: { params: Promise<{ cafeId: string }> },
): Promise<NextResponseType> {
  const { cafeId } = await context.params;
  const parsedParams = CafeInventoryParamsSchema.safeParse({ cafeId });
  if (!parsedParams.success) {
    return badRequest('Mã quán không hợp lệ.');
  }

  const rawBody = await safeJson(request);
  if (rawBody === null) {
    return badRequest('Body phải là JSON hợp lệ.');
  }

  const parsed = AddInventorySchema.safeParse(rawBody);
  if (!parsed.success) {
    const issue = parsed.error.issues[0];
    return badRequest(
      issue?.message ?? 'Dữ liệu đầu vào không hợp lệ.',
    );
  }

  const result = await proxyToBackend(request, `/api/cafes/${cafeId}/inventory`, {
    // The body stream has already been consumed by `safeJson` for Zod
    // validation, so we forward the validated + transformed payload as
    // `jsonBody` instead of the now-empty `request.body`.
    jsonBody: toAddInventoryPayload(parsed.data),
  });
  return toNextResponse(result);
}

/**
 * GET handler — list inventory for the cafe. No body validation, just forward
 * with the same query string (searchTerm, status, sort, page, etc.).
 */
export async function GET(
  request: Request,
  context: { params: Promise<{ cafeId: string }> },
): Promise<NextResponseType> {
  const { cafeId } = await context.params;
  const parsedParams = CafeInventoryParamsSchema.safeParse({ cafeId });
  if (!parsedParams.success) {
    return badRequest('Mã quán không hợp lệ.');
  }

  const result = await proxyToBackend(request, `/api/cafes/${cafeId}/inventory`);
  return toNextResponse(result);
}