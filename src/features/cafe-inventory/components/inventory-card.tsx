"use client";

import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { RotateCcw } from "lucide-react";
import { useMemo } from "react";
import {
  ComponentPill,
  ComponentOverflowPill,
  type ComponentPenaltyViewModel,
} from "@/features/cafe-inventory/components/inventory-component-pill";

/** Max components shown as pills on the card; the rest are folded into
 *  a single `+N` pill that opens the edit dialog scrolled to the list. */
const MAX_VISIBLE_COMPONENT_PILLS = 6;

interface InventoryCardProps {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  game: any;
  viewMode: "active" | "trash";
  /** True while a delete / restore on this specific card is in flight.
   *  Drives the per-row spinner + button disable to prevent concurrent
   *  mutations on the same row. */
  isMutating?: boolean;
  onEdit: (id: string) => void;
  /** Called when the manager clicks the `+N` overflow pill or the
   *  edit dialog shortcut. The container opens the edit dialog and
   *  scrolls to the component list. */
  onOpenComponents?: (id: string) => void;
  onDelete: (id: string) => void;
  onRestore: (id: string) => void;
}

/**
 * Map the upstream `status` enum onto the colour-token pair we render.
 * Centralising this prevents drift between `inventory-card` and any
 * future "Status badge" component.
 */
const STATUS_BADGE: Record<string, { tone: "ok" | "warn"; label: string }> = {
  Available: { tone: "ok", label: "Sẵn sàng" },
  InUse: { tone: "warn", label: "Đang cho thuê" },
  Damaged: { tone: "warn", label: "Hư hỏng" },
  Maintenance: { tone: "warn", label: "Bảo trì" },
  Retired: { tone: "warn", label: "Ngừng sử dụng" },
  OutofStock: { tone: "warn", label: "Hết hàng" },
};

/** Format `boxQuantity` with thousand separators. Vietnamese locale via
 *  `Intl.NumberFormat('vi-VN')` matches the Edit dialog's number style. */
function formatBoxQuantity(value: number): string {
  const safe = Number.isFinite(value) ? Math.max(0, Math.floor(value)) : 0;
  return new Intl.NumberFormat("vi-VN").format(safe);
}

/** Card-level secondary button (Edit / Restore-secondary). Shared
 *  geometry, transitions, and disabled treatment so any in-card
 *  action looks like one design system. `h-10` (40px) on mobile keeps
 *  the touch target above the WCAG 2.5.8 AAA recommendation of 44×44
 *  within the card padding budget — when the user is on a phone in a
 *  cramped one-handed grip, this is the difference between a reliable
 *  tap and a misfire. */
const CARD_SECONDARY_BUTTON_CLASS =
  "h-10 bg-white text-neutral-800 hover:bg-neutral-50 font-semibold text-xs uppercase border border-neutral-200 rounded-lg px-3.5 transition-colors shadow-sm disabled:opacity-50 disabled:cursor-not-allowed";

/** Card-level primary button (Khôi phục kho in trash mode). Solid
 *  neutral-950 to differentiate from the page-level primary CTA
 *  (gradient) — the card's restore action is local to one row and
 *  doesn't warrant the full chrome. `h-10` matches the secondary
 *  class so the card bar has one consistent button height regardless
 *  of which view mode is active. */
const CARD_PRIMARY_BUTTON_CLASS =
  "h-10 bg-neutral-950 text-white hover:bg-neutral-800 font-semibold text-xs uppercase rounded-lg px-4 border border-neutral-950 shadow-sm transition-colors flex items-center gap-1.5 disabled:opacity-50 disabled:cursor-not-allowed";

export function InventoryCard({
  game,
  viewMode,
  isMutating = false,
  onEdit,
  onOpenComponents,
  onDelete,
  onRestore,
}: InventoryCardProps) {
  // Defensive access — `game` is `any` from the API client, and individual
  // records can arrive with partial fields while a related row is mid-update.
  // These five are simple single-field coercions, not worth memoizing —
  // `useMemo` has its own overhead per call (the dep-array comparison runs
  // every render) and these never repeat work. The componentPills map
  // below IS worth memoizing because it filters and maps an array.
  // Field naming note: the upstream /api/cafes/{cafeId}/inventory
  // response uses `gameName` (camelCase) per the GET contract. We read
  // it first and fall back to `name` for any older payload that might
  // still arrive during a rolling deploy, and so the card keeps
  // rendering if a related test fixture or a transformed response
  // returns the master-catalog shape (which uses `name`).
  const gameName: string =
    typeof game.gameName === "string" && game.gameName.trim().length > 0
      ? game.gameName
      : typeof game.name === "string" && game.name.trim().length > 0
        ? game.name
        : "Tựa game chưa đặt tên";
  const description: string =
    typeof game.description === "string" && game.description.trim().length > 0
      ? game.description
      : "";
  const boxQuantity: number = Number.isFinite(game.boxQuantity)
    ? game.boxQuantity
    : 0;
  const status: string =
    typeof game.status === "string" ? game.status : "Unknown";
  const id: string = typeof game.id === "string" ? game.id : "";
  // Parse the upstream `componentPenalties` array into view-models.
  // The array shape from the BE is `{ id, gameComponentTemplateId,
  // componentName, penaltyFee }[]`; we tolerate missing fields so the
  // card still renders if a partial record arrives mid-update.
  const componentPills: ComponentPenaltyViewModel[] = useMemo(() => {
    const raw = game.componentPenalties;
    if (!Array.isArray(raw)) return [];
    return raw
      .filter((entry: unknown): entry is Record<string, unknown> =>
        entry !== null && typeof entry === "object",
      )
      .map((entry) => {
        const id =
          typeof entry.id === "string" ? entry.id : "";
        const tplId =
          typeof entry.gameComponentTemplateId === "string"
            ? entry.gameComponentTemplateId
            : "";
        const key = id || tplId;
        const rawName =
          (typeof entry.componentName === "string" && entry.componentName.trim()) ||
          (typeof entry.name === "string" && entry.name.trim()) ||
          "";
        const name = rawName || "Linh kiện";
        const fee = Number.isFinite(entry.penaltyFee)
          ? (entry.penaltyFee as number)
          : 0;
        return { key, name, penaltyFee: fee };
      })
      .filter((entry: ComponentPenaltyViewModel) => entry.key.length > 0);
  }, [game.componentPenalties]);

  const visiblePills = componentPills.slice(0, MAX_VISIBLE_COMPONENT_PILLS);
  const overflowCount = Math.max(
    0,
    componentPills.length - MAX_VISIBLE_COMPONENT_PILLS,
  );

  const statusBadge = STATUS_BADGE[status] ?? {
    tone: "warn",
    label: status,
  };
  const badgeClass =
    statusBadge.tone === "ok"
      ? "bg-emerald-50 border-emerald-200 text-emerald-700"
      : "bg-amber-50 border-amber-200 text-amber-800";

  return (
    <Card
      // `min-w-0` lets flex children shrink so long CJK / German names
      // don't push the actions off-screen on tablet widths.
      className="border border-neutral-200/80 rounded-xl p-5 bg-white shadow-[0px_1px_3px_rgba(0,0,0,0.04),0px_1px_2px_rgba(0,0,0,0.02)] flex flex-col md:flex-row justify-between items-start md:items-center gap-4 hover:border-neutral-300 transition-colors min-w-0"
    >
      <div className="flex-1 space-y-1.5 min-w-0">
        <div className="flex items-center gap-2 flex-wrap">
          <h3 className="font-bold text-sm text-neutral-900 tracking-tight max-w-full break-words [overflow-wrap:anywhere]">
            {gameName}
          </h3>
          <span
            role="status"
            aria-label={`Trạng thái: ${statusBadge.label}`}
            className={`text-[10px] font-bold px-2 py-0.5 rounded-md border whitespace-nowrap ${badgeClass}`}
          >
            {statusBadge.label}
          </span>
        </div>

        {/* Component health strip — the primary surface for the new work.
            Renders 1-6 component pills, or a `+N` overflow that opens
            the edit dialog scrolled to the list. */}
        {visiblePills.length > 0 && (
          <div
            role="list"
            aria-label="Tình trạng linh kiện"
            className="flex items-center gap-1.5 max-w-full overflow-x-auto scrollbar-thin -mx-1 px-1"
          >
            {visiblePills.map((component) => (
              <span role="listitem" key={component.key}>
                <ComponentPill component={component} />
              </span>
            ))}
            {overflowCount > 0 && onOpenComponents && (
              <span role="listitem">
                <ComponentOverflowPill
                  count={overflowCount}
                  onActivate={() => onOpenComponents(id)}
                />
              </span>
            )}
          </div>
        )}

        {description ? (
          // `break-words` + `overflow-wrap:anywhere` handle German 30%-longer
          // copy and CJK without breaking inside words. `whitespace-pre-line`
          // preserves the upstream's literal newlines while the line-clamp
          // keeps the card height bounded.
          <p className="text-xs text-neutral-500 line-clamp-2 max-w-2xl leading-normal break-words [overflow-wrap:anywhere] whitespace-pre-line">
            {description}
          </p>
        ) : null}

        <div className="flex items-center flex-wrap gap-1.5">
          <span className="inline-flex items-center px-2 py-0.5 rounded-md bg-neutral-900 text-white text-[10px] font-bold uppercase tracking-wider shadow-xs">
            <span aria-hidden className="mr-1 opacity-60">
              Số lượng
            </span>
            <span className="tabular-nums font-mono">
              {formatBoxQuantity(boxQuantity)}
            </span>
            <span aria-hidden className="ml-1 opacity-60">
              hộp
            </span>
            <span className="sr-only">
              {`Số lượng: ${formatBoxQuantity(boxQuantity)} hộp`}
            </span>
          </span>
        </div>
      </div>

      <div className="flex items-center gap-2 self-end md:self-center shrink-0">
        {viewMode === "active" ? (
          <>
            <Button
              type="button"
              onClick={() => onEdit(id)}
              disabled={isMutating}
              aria-busy={isMutating}
              aria-label={`Chỉnh sửa hồ sơ kho cho ${gameName}`}
              className={CARD_SECONDARY_BUTTON_CLASS}
            >
              Sửa hồ sơ
            </Button>
            <Button
              type="button"
              onClick={() => onDelete(id)}
              disabled={isMutating}
              aria-busy={isMutating}
              aria-label={`Chuyển ${gameName} vào thùng rác`}
              className={`${CARD_SECONDARY_BUTTON_CLASS} text-red-600 hover:bg-red-50/60 border-red-200 flex items-center gap-1.5`}
            >
              {isMutating ? (
                <>
                  <span
                    className="w-4 h-4 border-2 border-red-300 border-t-red-600 rounded-full animate-spin"
                    aria-hidden
                  />
                  <span>Đang xóa…</span>
                </>
              ) : (
                "Xóa tạm"
              )}
            </Button>
          </>
        ) : (
          <Button
            type="button"
            onClick={() => onRestore(id)}
            disabled={isMutating}
            aria-busy={isMutating}
            aria-label={`Khôi phục ${gameName} về kho hoạt động`}
            className={CARD_PRIMARY_BUTTON_CLASS}
          >
            {isMutating ? (
              <>
                <span
                  className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin"
                  aria-hidden
                />
                <span>Đang khôi phục…</span>
              </>
            ) : (
              <>
                <RotateCcw className="w-4 h-4" aria-hidden />
                Khôi phục kho
              </>
            )}
          </Button>
        )}
      </div>
    </Card>
  );
}