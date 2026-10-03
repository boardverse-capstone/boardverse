// src/app/api/cafes/[cafeId]/inventory/[inventoryId]/sync-boxes/route.ts
/**
 * POST /api/cafes/{cafeId}/inventory/{inventoryId}/sync-boxes
 *   Roles: Manager (must be the cafe owner).
 *   Forwards to upstream: POST /api/cafes/{cafeId}/inventory/{inventoryId}/sync-boxes
 *
 *   Body: SyncBoxesSchema — `{ overwriteBarcodes?: boolean }`. The upstream
 *   creates/updates physical box records (each with its own barcode) based on
 *   the current `boxQuantity`. If `overwriteBarcodes` is true (forward-compat),
 *   existing barcodes are regenerated.
 */
import type { NextResponse as NextResponseType } from 'next/server';
import { NextResponse } from 'next/server';

import { proxyToBackend, toNextResponse } from '@/core/api/proxy';
import {
  CafeInventoryItemParamsSchema,
  SyncBoxesSchema,
  toSyncBoxesPayload,
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

async function readOptionalJson(request: Request): Promise<unknown> {
  const contentLength = request.headers.get('content-length');
  if (contentLength === '0') return undefined;
  const contentType = request.headers.get('content-type') ?? '';
  if (!contentType.toLowerCase().includes('application/json')) return undefined;
  try {
    return await request.json();
  } catch {
    return undefined;
  }
}

export async function POST(
  request: Request,
  context: { params: Promise<{ cafeId: string; inventoryId: string }> },
): Promise<NextResponseType> {
  const { cafeId, inventoryId } = await context.params;
  const parsedParams = CafeInventoryItemParamsSchema.safeParse({ cafeId, inventoryId });
  if (!parsedParams.success) {
    return badRequest('Mã quán hoặc mã mục kho không hợp lệ.');
  }

  const rawBody = (await readOptionalJson(request)) ?? {};
  const parsedBody = SyncBoxesSchema.safeParse(rawBody);
  if (!parsedBody.success) {
    const issue = parsedBody.error.issues[0];
    return badRequest(issue?.message ?? 'Dữ liệu đầu vào không hợp lệ.');
  }

  const result = await proxyToBackend(
    request,
    `/api/cafes/${cafeId}/inventory/${inventoryId}/sync-boxes`,
    {
      jsonBody: toSyncBoxesPayload(parsedBody.data),
    },
  );
  return toNextResponse(result);
}