"use client";

import * as React from "react";
import { Minus, Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

/**
 * Bộ điều chỉnh số lượng dạng `− [n] +`.
 *
 * - Thay thế `<input type="number">` mặc định của trình duyệt (khó bấm, lệch focus trên POS tablet).
 * - Clamp theo [min, max], snap về số nguyên.
 * - Có thể kèm icon phụ (`ariaLabelDec`/`ariaLabelInc`) hoặc label đơn vị (`unit`).
 * - Dùng được trong cả form (đồng bộ onChange) và nút standalone.
 */
export interface NumberStepperProps
  extends Omit<React.ComponentProps<"div">, "onChange"> {
  value: number;
  onChange: (next: number) => void;
  min?: number;
  max?: number;
  /** Bước tăng/giảm. Mặc định 1. */
  step?: number;
  /** Khóa mọi tương tác (vd khi parent đang submit). */
  disabled?: boolean;
  /** Kích thước ô số — mặc định `min-w-8` (~32px). */
  size?: "sm" | "md" | "lg";
  /** Text đơn vị hiển thị bên phải (vd: "chỗ", "người", "hộp"). */
  unit?: string;
  ariaLabelDec?: string;
  ariaLabelInc?: string;
  className?: string;
}

const sizeMap: Record<
  NonNullable<NumberStepperProps["size"]>,
  { container: string; cell: string; btnSize: "icon-sm" | "icon" | "icon-lg" }
> = {
  sm: {
    container: "h-8",
    cell: "min-w-7 text-xs",
    btnSize: "icon-sm",
  },
  md: {
    container: "h-9",
    cell: "min-w-9 text-sm",
    btnSize: "icon-sm",
  },
  lg: {
    container: "h-10",
    cell: "min-w-11 text-base",
    btnSize: "icon",
  },
};

export function NumberStepper({
  value,
  onChange,
  min = 0,
  max = Number.MAX_SAFE_INTEGER,
  step = 1,
  disabled = false,
  size = "md",
  unit,
  ariaLabelDec = "Giảm",
  ariaLabelInc = "Tăng",
  className,
}: NumberStepperProps) {
  const clamp = React.useCallback(
    (raw: number) => {
      if (!Number.isFinite(raw)) return min;
      const stepped = Math.round(raw / step) * step;
      return Math.max(min, Math.min(max, stepped));
    },
    [min, max, step],
  );

  const dec = () => onChange(clamp(value - step));
  const inc = () => onChange(clamp(value + step));
  const dims = sizeMap[size];

  const decDisabled = disabled || value <= min;
  const incDisabled = disabled || value >= max;

  return (
    <div
      role="group"
      aria-label="Bộ chỉnh số lượng"
      className={cn(
        "inline-flex items-center overflow-hidden rounded-md border border-input bg-background shadow-xs",
        "dark:bg-input/30",
        dims.container,
        className,
      )}
    >
      <Button
        type="button"
        variant="ghost"
        size={dims.btnSize}
        onClick={dec}
        disabled={decDisabled}
        aria-label={ariaLabelDec}
        className="rounded-none border-0 text-base font-bold hover:bg-muted"
      >
        <Minus />
      </Button>
      <span
        aria-live="polite"
        aria-atomic="true"
        className={cn(
          "flex-1 select-none text-center font-bold tabular-nums",
          "border-x border-input",
          dims.cell,
        )}
      >
        {value}
        {unit ? (
          <span className="ml-1 text-[10px] font-medium text-muted-foreground">
            {unit}
          </span>
        ) : null}
      </span>
      <Button
        type="button"
        variant="ghost"
        size={dims.btnSize}
        onClick={inc}
        disabled={incDisabled}
        aria-label={ariaLabelInc}
        className="rounded-none border-0 text-base font-bold hover:bg-muted"
      >
        <Plus />
      </Button>
    </div>
  );
}
