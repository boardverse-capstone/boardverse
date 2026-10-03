// src/shared/validators/cafe-inventory.validator.ts
/**
 * Zod schemas + payload transformers used by:
 *   1. The Next.js Route Handlers under `src/app/api/cafes/[cafeId]/inventory/*`
 *      to validate request bodies BEFORE forwarding to the upstream backend.
 *   2. The frontend dialogs/forms under `src/features/cafe-inventory/**`
 *      (re-exported as needed) to give early client-side feedback.
 *
 * Schemas here mirror the contract documented in:
 *   - POST   /api/cafes/{cafeId}/inventory         (add board game to cafe stock)
 *   - PUT    /api/cafes/{cafeId}/inventory/{id}   (update box count, status, penalties)
 *   - POST   /api/cafes/{cafeId}/inventory/{id}/sync-penalties
 *   - POST   /api/cafes/{cafeId}/inventory/{id}/sync-boxes
 *
 * GET/DELETE/restore have no JSON body so they only need path-param validation
 * (handled by the route handler with `params`).
 */
import { z } from 'zod';

/* ──────────────────────────────────────────────────────────────────────────
 * Shared primitives
 * ────────────────────────────────────────────────────────────────────────── */

/**
 * UUID validator for `cafeId` and `inventoryId`. We accept any non-empty
 * UUID-like string here — the upstream does strict validation.
 */
export const UuidSchema = z
  .string()
  .min(1, 'Thiếu mã định danh.')
  .max(64, 'Mã định danh không hợp lệ.');

/**
 * Allowed inventory statuses — must match the backend enum so we reject
 * bogus values locally with a clear Vietnamese message instead of waiting
 * for a 4xx from the upstream.
 */
export const InventoryStatusSchema = z.enum([
  'Available',
  'InUse',
  'Damaged',
  'Maintenance',
  'Retired',
  'OutofStock',
]);

export type InventoryStatusValue = z.infer<typeof InventoryStatusSchema>;

/**
 * Per-component penalty payload. Matches what the backend stores for the
 * `cafe_inventory_component_penalty` table.
 */
export const ComponentPenaltySchema = z.object({
  gameComponentTemplateId: z
    .string()
    .min(1, 'Thiếu mã linh kiện.')
    .max(64, 'Mã linh kiện không hợp lệ.'),
  penaltyFee: z.coerce
    .number()
    .int('Phí phạt phải là số nguyên.')
    .min(0, 'Phí phạt không được âm.')
    .max(2_147_483_647, 'Phí phạt vượt quá giới hạn.'),
});

export type ComponentPenaltyValue = z.infer<typeof ComponentPenaltySchema>;

/* ──────────────────────────────────────────────────────────────────────────
 * POST /api/cafes/{cafeId}/inventory
 * ────────────────────────────────────────────────────────────────────────── */

export const AddInventorySchema = z.object({
  gameTemplateId: UuidSchema,
  boxQuantity: z.coerce
    .number()
    .int('Số hộp phải là số nguyên.')
    .min(1, 'Phải có ít nhất 1 hộp.')
    .max(1000, 'Số hộp tối đa là 1000.'),
  status: InventoryStatusSchema,
  componentPenalties: z
    .array(ComponentPenaltySchema)
    .max(500, 'Không thể gán quá 500 linh kiện cho một tựa game.')
    .optional()
    .default([]),
});

export type AddInventoryRequest = z.infer<typeof AddInventorySchema>;

/** Convert validated form values to the exact JSON payload sent to the upstream. */
export function toAddInventoryPayload(values: AddInventoryRequest) {
  return {
    gameTemplateId: values.gameTemplateId,
    boxQuantity: values.boxQuantity,
    status: values.status,
    componentPenalties: (values.componentPenalties ?? []).map((p) => ({
      gameComponentTemplateId: p.gameComponentTemplateId,
      penaltyFee: p.penaltyFee,
    })),
  };
}

/* ──────────────────────────────────────────────────────────────────────────
 * PUT /api/cafes/{cafeId}/inventory/{inventoryId}
 * ────────────────────────────────────────────────────────────────────────── */

export const UpdateInventorySchema = z
  .object({
    boxQuantity: z.coerce
      .number()
      .int('Số hộp phải là số nguyên.')
      .min(1, 'Phải có ít nhất 1 hộp.')
      .max(1000, 'Số hộp tối đa là 1000.')
      .optional(),
    status: InventoryStatusSchema.optional(),
    componentPenalties: z
      .array(ComponentPenaltySchema)
      .max(500, 'Không thể gán quá 500 linh kiện cho một tựa game.')
      .optional(),
  })
  .refine(
    (data) =>
      data.boxQuantity !== undefined ||
      data.status !== undefined ||
      data.componentPenalties !== undefined,
    {
      message: 'Cần cung cấp ít nhất một trường cần cập nhật.',
    },
  );

export type UpdateInventoryRequest = z.infer<typeof UpdateInventorySchema>;

export function toUpdateInventoryPayload(values: UpdateInventoryRequest) {
  const payload: Record<string, unknown> = {};
  if (values.boxQuantity !== undefined) payload.boxQuantity = values.boxQuantity;
  if (values.status !== undefined) payload.status = values.status;
  if (values.componentPenalties !== undefined) {
    payload.componentPenalties = values.componentPenalties.map((p) => ({
      gameComponentTemplateId: p.gameComponentTemplateId,
      penaltyFee: p.penaltyFee,
    }));
  }
  return payload;
}

/* ──────────────────────────────────────────────────────────────────────────
 * POST /api/cafes/{cafeId}/inventory/{inventoryId}/sync-penalties
 *
 * The contract is "no body needed" — the upstream pulls the latest component
 * templates from the master game and inserts any missing ones with fee 0.
 * We still define a schema that accepts an optional no-op body for forward
 * compatibility (e.g. a future override flag).
 * ────────────────────────────────────────────────────────────────────────── */

export const SyncPenaltiesSchema = z
  .object({
    /** Optional — when true, reset all existing penalties to 0 instead of merging. */
    resetExisting: z.boolean().optional().default(false),
  })
  .optional()
  .default({ resetExisting: false });

export type SyncPenaltiesRequest = z.infer<typeof SyncPenaltiesSchema>;

export function toSyncPenaltiesPayload(values: SyncPenaltiesRequest) {
  return { resetExisting: values?.resetExisting ?? false };
}

/* ──────────────────────────────────────────────────────────────────────────
 * POST /api/cafes/{cafeId}/inventory/{inventoryId}/sync-boxes
 *
 * The contract is also "no body needed" — the upstream creates physical box
 * records based on `boxQuantity`. Same forward-compatible pattern as above.
 * ────────────────────────────────────────────────────────────────────────── */

export const SyncBoxesSchema = z
  .object({
    /** Optional — when true, overwrite existing barcodes for re-print. */
    overwriteBarcodes: z.boolean().optional().default(false),
  })
  .optional()
  .default({ overwriteBarcodes: false });

export type SyncBoxesRequest = z.infer<typeof SyncBoxesSchema>;

export function toSyncBoxesPayload(values: SyncBoxesRequest) {
  return { overwriteBarcodes: values?.overwriteBarcodes ?? false };
}

/* ──────────────────────────────────────────────────────────────────────────
 * Path-param validators (reused in route handlers)
 * ────────────────────────────────────────────────────────────────────────── */

export const CafeInventoryParamsSchema = z.object({
  cafeId: UuidSchema,
});

export const CafeInventoryItemParamsSchema = z.object({
  cafeId: UuidSchema,
  inventoryId: UuidSchema,
});

/* ──────────────────────────────────────────────────────────────────────────
 * Re-export the auth zodResolver workaround for callers that want to bind
  the validators to react-hook-form from the FE.
 * ────────────────────────────────────────────────────────────────────────── */
export { zodResolverCompat } from './auth.validator';