// src/app/api/cafes/[cafeId]/inventory/[inventoryId]/restore/route.ts
/**
 * POST /api/cafes/{cafeId}/inventory/{inventoryId}/restore
 *   Roles: Manager (must be the cafe owner).
 *   Forwards to upstream: POST /api/cafes/{cafeId}/inventory/{inventoryId}/restore
 *   No body — the upstream simply flips the soft-delete flag back to false.
 */
import type { NextResponse as NextResponseType } from 'next/server';
import { NextResponse } from 'next/server';

import { proxyToBackend, toNextResponse } from '@/core/api/proxy';
import { CafeInventoryItemParamsSchema } from '@/shared/validators/cafe-inventory.validator';

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

export async function POST(
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
    `/api/cafes/${cafeId}/inventory/${inventoryId}/restore`,
  );
  return toNextResponse(result);
}