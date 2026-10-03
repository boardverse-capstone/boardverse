"use client";

import { cn } from "@/lib/utils";

export interface ComponentPenaltyViewModel {
  /** Unique key — prefer the upstream `id`, fall back to `gameComponentTemplateId`. */
  key: string;
  /** Display name. The upstream's `componentName` already localises. */
  name: string;
  /** Current fee in VND. */
  penaltyFee: number;
}

/** A small pill that summarises a single component's penalty fee on the
 *  inventory card and the edit dialog. Used in two contexts:
 *
 *  - card: a horizontal strip of up to 6 pills below the status badge.
 *  - dialog: each row's leading affordance (the row also has an input
 *    and a ✓ save button; this pill is the readable summary).
 *
 *  Tone rules:
 *  - fee > 0: emerald dot
 *  - fee === 0: amber dot, amber-50 background tint
 *  - the pill background tints the same as the dot when fee === 0 so
 *    the manager can scan for "missing fees" without reading.
 */
export function ComponentPill({
  component,
  className,
}: {
  component: ComponentPenaltyViewModel;
  className?: string;
}) {
  const hasFee = component.penaltyFee > 0;
  const dotClass = hasFee ? "bg-emerald-500" : "bg-amber-500";
  const pillClass = hasFee
    ? "bg-neutral-50 border-neutral-200/60 text-neutral-700"
    : "bg-amber-50 border-amber-200/60 text-amber-800";

  // Truncate to 8 chars + ellipsis so the pill stays a fixed visual
  // budget for the strip's first 6 components. CJK glyphs are wider
  // than Latin; we measure by char count, not bytes, which is the
  // standard heuristic for this trade-off.
  const displayedName =
    component.name.length > 8 ? `${component.name.slice(0, 8)}…` : component.name;

  // Vietnamese locale for the fee so it matches the dialog.
  const formattedFee = new Intl.NumberFormat("vi-VN").format(
    Number.isFinite(component.penaltyFee) ? Math.max(0, Math.floor(component.penaltyFee)) : 0,
  );

  return (
    <span
      role="status"
      aria-label={`${component.name}: phí ${formattedFee} đồng`}
      className={cn(
        "inline-flex items-center gap-1 h-7 px-2 rounded-md border text-[11px] font-bold whitespace-nowrap",
        "shrink-0",
        pillClass,
        className,
      )}
    >
      <span
        aria-hidden
        className={cn("w-1.5 h-1.5 rounded-full", dotClass)}
      />
      <span
        className={cn(
          "truncate max-w-[7.5rem]",
          "[overflow-wrap:anywhere]",
        )}
      >
        {displayedName}
      </span>
      <span aria-hidden className="text-neutral-400 mx-0.5">
        ·
      </span>
      <span className="font-mono tabular-nums">
        {hasFee ? `${formattedFee}đ` : "0đ"}
      </span>
    </span>
  );
}

/** A "+N" overflow pill used when a game has more components than the
 *  strip's first-viewport max (currently 6). */
export function ComponentOverflowPill({
  count,
  onActivate,
}: {
  count: number;
  onActivate: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onActivate}
      aria-label={`Mở danh sách ${count} linh kiện còn lại`}
      // `h-9` (36px) brings the overflow pill above the WCAG 2.5.8 AA
      // minimum of 24×24 and closer to the 44×44 AAA recommendation.
      // It stays 8px taller than the displayed ComponentPill chips
      // (h-7 = 28px) which makes the overflow visually "punchier"
      // and signals interactivity, while still aligning to the same
      // `items-center` row as the chips. `touch-manipulation`
      // disables the 300ms tap delay on legacy mobile browsers.
      className="inline-flex items-center justify-center h-9 px-2.5 rounded-md border border-neutral-200/60 bg-white text-[11px] font-bold text-neutral-700 whitespace-nowrap shrink-0 hover:bg-neutral-50 hover:border-neutral-300 transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-neutral-400 touch-manipulation"
    >
      +{count}
    </button>
  );
}