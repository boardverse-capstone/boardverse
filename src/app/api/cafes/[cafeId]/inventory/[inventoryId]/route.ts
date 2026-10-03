// src/app/api/cafes/[cafeId]/inventory/[inventoryId]/route.ts
/**
 * GET    /api/cafes/{cafeId}/inventory/{inventoryId}
 *   Roles: Public/Player (browse); CafeStaff/Manager (full incl. penalties).
 *   Forwards to upstream: GET /api/cafes/{cafeId}/inventory/{inventoryId}
 *
 * PUT    /api/cafes/{cafeId}/inventory/{inventoryId}
 *   Body: UpdateInventorySchema
 *   Roles: Manager (must be the cafe owner).
 *   Forwards to upstream: PUT /api/cafes/{cafeId}/inventory/{inventoryId}
 *
 * DELETE /api/cafes/{cafeId}/inventory/{inventoryId}
 *   Roles: Manager (must be the cafe owner).
 *   Forwards to upstream: DELETE /api/cafes/{cafeId}/inventory/{inventoryId}
 */
import type { NextResponse as NextResponseType } from 'next/server';
import { NextResponse } from 'next/server';

import { proxyToBackend, toNextResponse } from '@/core/api/proxy';
import {
  CafeInventoryItemParamsSchema,
  UpdateInventorySchema,
  toUpdateInventoryPayload,
} from '@/shared/validators/cafe-inventory.validator';

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

async function safeJson(request: Request): Promise<unknown> {
  const contentType = request.headers.get('content-type') ?? '';
  if (!contentType.toLowerCase().includes('application/json')) return null;
  try {
    return await request.json();
  } catch {
    return null;
  }
}

/** GET — fetch one inventory item with all its component penalties. */
export async function GET(
  request: Request,
  context: { params: Promise<{ cafeId: string; inventoryId: string }> },
): Promise<NextResponseType> {
  const { cafeId, inventoryId } = await context.params;
  const parsed = CafeInventoryItemParamsSchema.safeParse({ cafeId, inventoryId });
  if (!parsed.success) {
    return badRequest('Mã quán hoặc mã mục kho không hợp lệ.');
  }

  const result = await proxyToBackend(
    request,
    `/api/cafes/${cafeId}/inventory/${inventoryId}`,
  );
  return toNextResponse(result);
}

/** PUT — update boxQuantity / status / componentPenalties on an item. */
export async function PUT(
  request: Request,
  context: { params: Promise<{ cafeId: string; inventoryId: string }> },
): Promise<NextResponseType> {
  const { cafeId, inventoryId } = await context.params;
  const parsed = CafeInventoryItemParamsSchema.safeParse({ cafeId, inventoryId });
  if (!parsed.success) {
    return badRequest('Mã quán hoặc mã mục kho không hợp lệ.');
  }

  const rawBody = await safeJson(request);
  if (rawBody === null) {
    return badRequest('Body phải là JSON hợp lệ.');
  }

  const parsedBody = UpdateInventorySchema.safeParse(rawBody);
  if (!parsedBody.success) {
    const issue = parsedBody.error.issues[0];
    return badRequest(issue?.message ?? 'Dữ liệu đầu vào không hợp lệ.');
  }

  const result = await proxyToBackend(
    request,
    `/api/cafes/${cafeId}/inventory/${inventoryId}`,
    {
      jsonBody: toUpdateInventoryPayload(parsedBody.data),
    },
  );
  return toNextResponse(result);
}

/** DELETE — soft-delete an inventory item. */
export async function DELETE(
  request: Request,
  context: { params: Promise<{ cafeId: string; inventoryId: string }> },
): Promise<NextResponseType> {
  const { cafeId, inventoryId } = await context.params;
  const parsed = CafeInventoryItemParamsSchema.safeParse({ cafeId, inventoryId });
  if (!parsed.success) {
    return badRequest('Mã quán hoặc mã mục kho không hợp lệ.');
  }

  const result = await proxyToBackend(
    request,
    `/api/cafes/${cafeId}/inventory/${inventoryId}`,
  );
  return toNextResponse(result);
}