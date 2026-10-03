---
target: manager/cafes/me route group
timestamp: 2026-10-03T03-04-00Z
slug: manager-cafes-me-route-audit
---

# Route audit: Manager cafe API surface

## Spec under audit

7 endpoints for the Manager cafe surface, role-prefixed paths under `/api/manager/cafes/me/...`:

| # | Verb | Path | Purpose |
|---|---|---|---|
| 1 | GET | `/api/manager/cafes/me` | Read cafe profile. Source: `Cafe` aggregate. |
| 2 | PUT | `/api/manager/cafes/me/operational-profile` | Update operational profile before activation. |
| 3 | POST | `/api/manager/cafes/me/activate` | DATA_BLANK → ACTIVE. |
| 4 | POST | `/api/manager/cafes/me/deactivate` | ACTIVE → DATA_BLANK. |
| 5 | POST | `/api/manager/cafes/me/close` | ACTIVE/DATA_BLANK → INACTIVE. Reopenable. |
| 6 | POST | `/api/manager/cafes/me/reopen` | INACTIVE → ACTIVE. |
| 7 | PATCH | `/api/manager/cafes/me/operational-status` | Unified 3-state. BANNED is Admin-only. |

## What the client does today

| Verb | Path | File | State |
|---|---|---|---|
| GET | `/api/cafe-partner/me/operational-profile` | `src/features/partner/services/partner.service.ts:118-126` | wired |
| PUT | `/api/cafe-partner/me/operational-profile` | `src/features/partner/services/partner.service.ts:128-140` | wired |
| — | (no activate/deactivate/close/reopen client methods) | — | missing |
| — | (no PATCH .../operational-status client method) | — | missing |
| PUT | `/api/v1/admin/cafes/{cafeId}/operational-status` | `src/features/admin-cafe/services/admin-cafe.service.ts:115-130` | wired (admin) |
| GET | `/api/v1/admin/cafes` | admin-cafe.service.ts:34-52 | wired (admin) |

## Findings

### F1. Path-group conflict (real risk)

New spec uses `/api/manager/cafes/me/...`; current code uses `/api/cafe-partner/me/...`. This is a routing-convention change, not a rename. Two conventions are now in the codebase:
- **Service-grouped** (old): `/api/cafe-partner/me/...` — resource name, role implicit.
- **Role-prefixed** (new): `/api/manager/cafes/me/...` — role first, then resource.

TanStack Query cache keys will collide if both endpoints exist with the same data shape. **The cutover must be atomic on the client side.** A safe pattern: remove the old client code in the same commit that adds the new client code, and let the backend swap URLs the same day.

### F2. State machine coverage is consistent with the type system

`OperationalStatus` in `src/features/partner/types/partner.interface.ts:33-35` is `DATA_BLANK | ACTIVE | INACTIVE | BANNED | SUSPENDED`. The new endpoints expose 3 to Manager (DATA_BLANK, ACTIVE, INACTIVE) and reserve BANNED for Admin. SUSPENDED is in the type but **not** in `CAFE_OPERATIONAL_STATUS_OPTIONS` (`src/core/constants/admin-cafe.ts:1-6`) — backend-only, never user-facing. The 3-state Manager surface is consistent.

### F3. Two edges the spec does not cover

1. **INACTIVE → DATA_BLANK** ("reset"): no POST covers this. The PATCH is the only way back. Confirm the backend allows PATCH to DATA_BLANK from INACTIVE.
2. **ACTIVE → DATA_BLANK** that bypasses the "no open sessions" check: the PATCH must enforce the same constraint as `deactivate`. Confirm.

### F4. The 4 POSTs are not redundant with the PATCH

The 4 POSTs likely emit richer SignalR events or write audit records. Don't deprecate them without checking the backend's event-publishing strategy. The PATCH is for "set me to ACTIVE"; the POSTs are for "transition me, please record this as an activation."

### F5. Admin endpoint and Manager endpoint coexist

`PUT /api/v1/admin/cafes/{cafeId}/operational-status` is path-id-based and used in `src/app/admin/registrations/[id]/page.tsx`. It's a different endpoint with different authorization. Both must coexist.

## Client change plan (locked decisions)

### Decision 1 — service location

**New `ManagerCafeService` in `src/features/manager-cafe/services/manager-cafe.service.ts`.** Rationale: the `PartnerService` was named for the pre-approval registration flow. Post-approval cafe management is a different aggregate (`Cafe` vs `PartnerApplication`). A new service keeps the boundary clean.

### Decision 2 — BANNED handling

**Server is the source of truth.** Client types include all 4 values (`DATA_BLANK | ACTIVE | INACTIVE | BANNED`). Manager UI never offers BANNED as a user-selectable value; the type is permissive so the client can render a BANNED state when it appears. If a PATCH with `BANNED` is sent, the server rejects it.

### Decision 3 — old endpoints

**Remove the same day the new ones ship.** The old `cafe-partner/me/...` calls in `PartnerService` are deleted in the same commit. No deprecation window. This requires a backend cutover on the same day.

## Concrete file changes

### New files (5)

```
src/features/manager-cafe/
├── services/
│   └── manager-cafe.service.ts          # 6 methods
├── hooks/
│   ├── useCafeMe.ts                     # TanStack Query for GET me
│   └── useCafeStatusMutation.ts         # 1 hook, 5 actions
├── components/
│   ├── cafe-status-banner.tsx           # status badge + actions
│   ├── activate-cafe-dialog.tsx         # DATA_BLANK → ACTIVE
│   ├── close-cafe-dialog.tsx            # → INACTIVE
│   └── reopen-cafe-dialog.tsx           # INACTIVE → ACTIVE
└── types/
    └── manager-cafe.interface.ts         # GET response, mutation shapes
```

### Modified files (2)

```
src/features/partner/components/partner-operational-profile-form.tsx
  - Add <CafeStatusBanner> at the top (above PageHeader)
  - Wire useCafeMe to read canActivate + activationBlockers
  - Replace the "Lưu hồ sơ vận hành" submit button: split into
    a quieter secondary "Lưu hồ sơ" + a scarlet primary
    "Kích hoạt quán" when status is DATA_BLANK + canActivate
  - When status is ACTIVE: keep "Lưu hồ sơ", add "Tạm dừng" / "Đóng quán"
  - When status is INACTIVE: keep "Lưu hồ sơ", add "Mở lại"
  - Apply the polish findings from
    .impeccable/critique/2026-10-02T17-45-47Z__ents-partner-operational-profile-form-tsx-85a3257c.md
    in the same edit (D1 split the modal, D2 promote gallery,
    D3 flatten the submit button, D4-D7 already enumerated)

src/features/partner/services/partner.service.ts
  - DELETE getOperationalProfile (lines 117-126)
  - DELETE updateOperationalProfile (lines 128-140)
  - Re-export OperationalProfileResponse from the new manager-cafe
    types file so existing consumers keep working
  - Keep the PartnerService for partner-registration / approval flow
```

### Unchanged files

- `src/features/admin-cafe/services/admin-cafe.service.ts` — admin endpoint is separate.
- `src/app/admin/registrations/[id]/page.tsx` — uses the admin endpoint, not affected.
- `src/features/partner/types/partner.interface.ts` — keep `OperationalStatus` here (it's the union type for both pre- and post-approval flows).

## ManagerCafeService contract

```ts
// src/features/manager-cafe/services/manager-cafe.service.ts
import apiClient from '@/core/api/client';
import type { ManagerCafe, OperationalStatus, StatusChangeResponse } from '../types/manager-cafe.interface';

export const ManagerCafeService = {
  /** GET /api/manager/cafes/me */
  getCafeMe: () =>
    apiClient.get<never, ManagerCafe>('/api/manager/cafes/me'),

  /** PUT /api/manager/cafes/me/operational-profile */
  updateOperationalProfile: (payload: OperationalProfileUpdate) =>
    apiClient.put<never, ManagerCafe>('/api/manager/cafes/me/operational-profile', payload),

  /** POST /api/manager/cafes/me/activate (DATA_BLANK → ACTIVE) */
  activate: () =>
    apiClient.post<never, StatusChangeResponse>('/api/manager/cafes/me/activate'),

  /** POST /api/manager/cafes/me/deactivate (ACTIVE → DATA_BLANK) */
  deactivate: () =>
    apiClient.post<never, StatusChangeResponse>('/api/manager/cafes/me/deactivate'),

  /** POST /api/manager/cafes/me/close (ACTIVE/DATA_BLANK → INACTIVE) */
  close: (reason?: string) =>
    apiClient.post<never, StatusChangeResponse>('/api/manager/cafes/me/close', { reason }),

  /** POST /api/manager/cafes/me/reopen (INACTIVE → ACTIVE) */
  reopen: () =>
    apiClient.post<never, StatusChangeResponse>('/api/manager/cafes/me/reopen'),

  /** PATCH /api/manager/cafes/me/operational-status (unified 3-state) */
  setOperationalStatus: (payload: { status: OperationalStatus; reason?: string }) =>
    apiClient.patch<never, StatusChangeResponse>(
      '/api/manager/cafes/me/operational-status',
      payload,
    ),
} as const;
```

## Open questions to confirm with the backend team

1. Is `GET /api/manager/cafes/me` returning `canActivate` and `activationBlockers`? (Or is that still on the partner-application endpoint only?)
2. Is `GET /api/manager/cafes/me` returning `operationalProfileUpdatedAt`? (Useful for the "Saved at HH:mm" stamp from the prior critique.)
3. Does PATCH allow INACTIVE → DATA_BLANK? Does it require a reason?
4. Does PATCH reject BANNED for Manager, or does it just return 403?
5. Are the 4 POSTs emitting SignalR events? If so, what payload?
6. Can the cutover be atomic, or is there a transition period where both URL groups must work?
7. Will the old `cafe-partner/me/operational-profile` endpoints be removed the same day, or do they remain as aliases?

## Sequencing

1. **Confirm open questions 1–7 with the backend team.** No client code until then.
2. **Service + types:** create `src/features/manager-cafe/`. Implement `ManagerCafeService` and `manager-cafe.interface.ts` with mock fallbacks for development.
3. **Hooks:** `useCafeMe` and `useCafeStatusMutation`. Wire TanStack Query cache invalidation: any status mutation invalidates the `manager-cafe-me` query and any `partner-application-{id}` query (the partner application surfaces the cafe's status).
4. **Status banner:** a small component at the top of the operational profile page. Cinnabar for ACTIVE, neutral for DATA_BLANK, muted for INACTIVE, destructive for BANNED.
5. **Activation dialog + button:** primary CTA when status is DATA_BLANK and canActivate is true. Disabled with the activationBlockers list when canActivate is false.
6. **Close dialog:** a secondary action. Confirms the user understands "no incoming bookings will be honored."
7. **Reopen dialog:** visible when status is INACTIVE.
8. **Remove the old `PartnerService.getOperationalProfile` and `updateOperationalProfile`.** This must ship in the same release as the backend's URL cutover.
9. **Apply the polish findings** from the partner-operational-profile-form critique in the same edit pass. The form is being rewritten anyway; doing the polish once is cheaper.

## Out of scope (explicitly)

- Admin-side changes. `src/app/admin/registrations/[id]/page.tsx` already has the right wiring.
- Tournament, POS, inventory, and other feature surfaces.
- The `partner-landing.tsx` page.
- The `OperationalStatus` type definition (unchanged).
- The `CAFE_OPERATIONAL_STATUS_OPTIONS` constant (unchanged).
- Auth/JWT changes.
- SignalR client wiring beyond what's needed to invalidate the cafe query on status change.
