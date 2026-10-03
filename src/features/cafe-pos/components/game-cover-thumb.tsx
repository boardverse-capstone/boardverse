"use client";

import * as React from "react";
import { Package } from "lucide-react";
import { cn } from "@/lib/utils";

export interface GameCoverThumbProps {
  src: string | null | undefined;
  alt: string;
  size?: "xs" | "sm" | "md" | "lg";
  /** Render ô fallback kiểu initials khi không có ảnh. */
  initials?: string;
  className?: string;
}

const sizeMap: Record<
  NonNullable<GameCoverThumbProps["size"]>,
  { box: string; icon: string; text: string }
> = {
  xs: { box: "h-8 w-8", icon: "size-4", text: "text-[10px]" },
  sm: { box: "h-10 w-10", icon: "size-4", text: "text-xs" },
  md: { box: "h-14 w-14", icon: "size-5", text: "text-sm" },
  lg: { box: "h-20 w-20", icon: "size-7", text: "text-base" },
};

function pickInitials(text: string): string {
  const trimmed = text.trim();
  if (!trimmed) return "?";
  // Lấy chữ cái đầu tiên của 2 từ đầu (vd "Catan Traders" → "CT")
  const tokens = trimmed.split(/\s+/).filter(Boolean);
  if (tokens.length === 1) return tokens[0].slice(0, 2).toUpperCase();
  return (tokens[0][0] + tokens[1][0]).toUpperCase();
}

/** Ảnh bìa game hoặc fallback icon. */
export function GameCoverThumb({
  src,
  alt,
  size = "sm",
  initials,
  className,
}: GameCoverThumbProps) {
  const dims = sizeMap[size];

  if (src) {
    return (
      // eslint-disable-next-line @next/next/no-img-element
      <img
        src={src}
        alt={alt}
        className={cn(
          "shrink-0 rounded-md border border-neutral-200 bg-neutral-100 object-cover",
          dims.box,
          className,
        )}
        loading="lazy"
        onError={(event) => {
          // Tự ẩn ảnh lỗi, fallback span sẽ hiển thị
          (event.currentTarget as HTMLImageElement).style.display = "none";
          const parent = (event.currentTarget as HTMLImageElement).parentElement;
          const fallback = parent?.querySelector(
            "[data-cover-fallback]",
          ) as HTMLElement | null;
          if (fallback) fallback.style.display = "flex";
        }}
      />
    );
  }

  return (
    <span
      data-cover-fallback
      role="img"
      aria-label={alt}
      className={cn(
        "flex shrink-0 items-center justify-center rounded-md border border-neutral-200 bg-neutral-100 font-bold text-neutral-500",
        dims.box,
        dims.text,
        className,
      )}
    >
      {initials ? pickInitials(initials) : <Package className={dims.icon} />}
    </span>
  );
}
