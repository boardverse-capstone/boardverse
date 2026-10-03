// src/app/api/cafes/[cafeId]/inventory/deleted/route.ts
/**
 * GET /api/cafes/{cafeId}/inventory/deleted
 *   Roles: Manager (must be the cafe owner).
 *   Forwards to upstream: GET /api/cafes/{cafeId}/inventory/deleted
 */
import type { NextResponse as NextResponseType } from 'next/server';
import { NextResponse } from 'next/server';

import { proxyToBackend, toNextResponse } from '@/core/api/proxy';
import { CafeInventoryParamsSchema } from '@/shared/validators/cafe-inventory.validator';

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

export async function GET(
  request: Request,
  context: { params: Promise<{ cafeId: string }> },
): Promise<NextResponseType> {
  const { cafeId } = await context.params;
  const parsed = CafeInventoryParamsSchema.safeParse({ cafeId });
  if (!parsed.success) {
    return badRequest('Mã quán không hợp lệ.');
  }

  const result = await proxyToBackend(
    request,
    `/api/cafes/${cafeId}/inventory/deleted`,
  );
  return toNextResponse(result);
}