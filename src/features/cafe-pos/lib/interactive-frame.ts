import type { PointerEvent as ReactPointerEvent } from "react";

/** Click vùng trống trong khung → focus khung để viền sáng. */
const SKIP_FOCUS_SELECTOR =
  'button,a,input,select,textarea,label,[role="tab"],[role="menuitem"],[role="option"],[data-slot="dropdown-menu-trigger"],[contenteditable="true"]';

export function focusFrameOnPointerDown(
  event: ReactPointerEvent<HTMLElement>,
) {
  const target = event.target as HTMLElement | null;
  if (!target) return;
  if (target.closest(SKIP_FOCUS_SELECTOR)) return;
  event.currentTarget.focus({ preventScroll: true });
}

/** Viền sáng khi focus / thao tác bên trong khung. */
export const interactiveFrameClass =
  "outline-none transition-[box-shadow,ring-color,ring-width,border-color] duration-150 focus:ring-2 focus:ring-emerald-500/50 focus:shadow-md focus-within:ring-2 focus-within:ring-emerald-500/50 focus-within:shadow-md";

export const interactiveFrameAmberClass =
  "outline-none transition-[box-shadow,ring-color,ring-width,border-color] duration-150 focus:ring-2 focus:ring-amber-500/45 focus:shadow-md focus-within:ring-2 focus-within:ring-amber-500/45 focus-within:shadow-md";
