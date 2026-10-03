"use client";

import {
  LayoutGrid,
  type LucideIcon,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

export interface TablesSectionProps {
  total: number;
  available: number;
  onAddClick?: () => void;
  onManageClick?: () => void;
}

/** Card tóm tắt sơ đồ bàn với CTA "Thêm bàn". */
export function TablesSection({
  total,
  available,
  onAddClick,
  onManageClick,
}: TablesSectionProps) {
  const hasTables = total > 0;
  return (
    <SectionCard
      icon={LayoutGrid}
      title="Sơ đồ bàn"
      cta={
        <Button
          type="button"
          variant="ghost"
          size="sm"
          onClick={onAddClick}
          className="h-8 px-2 text-xs font-medium text-neutral-600 hover:text-neutral-900"
        >
          {hasTables ? "+ Thêm bàn" : "Tạo sơ đồ"}
        </Button>
      }
    >
      {hasTables ? (
        <div className="grid grid-cols-2 gap-2">
          <Stat
            label="Tổng số bàn"
            value={total.toLocaleString("vi-VN")}
          />
          <Stat
            label="Đang trống"
            value={available.toLocaleString("vi-VN")}
            tone="emerald"
          />
        </div>
      ) : (
        <p className="text-helper">
          Quán chưa có bàn. Nhấn <strong>Tạo sơ đồ</strong> để khai báo vị trí
          và sức chứa cho POS.
        </p>
      )}

      {hasTables && onManageClick ? (
        <Button
          type="button"
          variant="outline"
          size="sm"
          onClick={onManageClick}
          className="w-full sm:w-auto h-9 text-xs"
        >
          Quản lý bàn (POS)
        </Button>
      ) : null}
    </SectionCard>
  );
}

/* ─── Local helpers ─────────────────────────────────────────────────── */

function SectionCard({
  icon: Icon,
  title,
  cta,
  children,
}: {
  icon: LucideIcon;
  title: string;
  cta?: React.ReactNode;
  children: React.ReactNode;
}) {
  return (
    <section
      className="rounded-2xl border border-neutral-200 bg-white p-5 space-y-3"
      aria-labelledby={`section-${slug(title)}`}
    >
      <div className="pb-1 border-b border-neutral-100 flex items-baseline gap-2">
        <Icon className="h-4 w-4 text-neutral-600 shrink-0" aria-hidden />
        <h2 id={`section-${slug(title)}`} className="text-section-header">
          {title}
        </h2>
        {cta ? <span className="ml-auto">{cta}</span> : null}
      </div>
      {children}
    </section>
  );
}

function Stat({
  label,
  value,
  tone,
}: {
  label: string;
  value: string;
  tone?: "emerald" | "amber";
}) {
  return (
    <div
      className={cn(
        "rounded-lg border p-3 space-y-0.5",
        tone === "emerald"
          ? "border-emerald-100 bg-emerald-50/40"
          : tone === "amber"
            ? "border-amber-100 bg-amber-50/40"
            : "border-neutral-200 bg-neutral-50/60",
      )}
    >
      <p className="text-sub-label">{label}</p>
      <p
        className={cn(
          "text-2xl font-bold tabular-nums",
          tone === "emerald"
            ? "text-emerald-700"
            : tone === "amber"
              ? "text-amber-700"
              : "text-neutral-900",
        )}
      >
        {value}
      </p>
    </div>
  );
}

function slug(s: string): string {
  return s
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)/g, "");
}