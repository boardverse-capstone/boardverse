"use client";

import { useState } from "react";
import {
  ArrowDown,
  ArrowUp,
  LayoutGrid,
  Loader2,
  Plus,
  Save,
  Trash2,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { toast } from "sonner";
import { apiClient } from "@/core/api/client";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { cn } from "@/lib/utils";
import type { CafeTable } from "@/features/pos-check-in/types/pos-check-in.interface";

export interface TablesManageDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  cafeId: string;
}

interface EditableTable {
  /** Server id (nếu đã tồn tại). */
  id?: string;
  name: string;
  seatCount: number;
  sortOrder: number;
}

/**
 * Dialog quản lý sơ đồ bàn — bulk sync với
 * PUT /api/cafes/{cafeId}/pos/tables. Endpoint này REPLACE toàn bộ
 * layout, nên UI lấy danh sách hiện tại về, để manager sửa, rồi
 * gửi lại mảng mới.
 */
export function TablesManageDialog({
  open,
  onOpenChange,
  cafeId,
}: TablesManageDialogProps) {
  const queryClient = useQueryClient();
  const tablesQuery = useQuery({
    queryKey: ["manager-cafe", cafeId, "pos-tables"],
    queryFn: async () => {
      const raw = await apiClient.get<never, unknown>(
        `/api/cafes/${cafeId}/pos/tables`,
        { params: { includeOnlyAvailable: false, includeInactive: true } },
      );
      return extractTables(raw);
    },
    enabled: open && !!cafeId,
    staleTime: 30_000,
  });

  const existingTables = tablesQuery.data ?? [];

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent
        side="right"
        className="bg-white text-neutral-900 p-0 gap-0 w-full sm:max-w-xl border-l border-neutral-200 flex flex-col"
      >
        <SheetHeader className="px-5 pt-5 pb-3 border-b border-neutral-100">
          <SheetTitle className="text-base font-bold tracking-tight flex items-center gap-2">
            <LayoutGrid className="h-4 w-4 text-neutral-600" aria-hidden />
            Sơ đồ bàn
          </SheetTitle>
          <SheetDescription className="text-helper">
            PUT /api/cafes/{cafeId}/pos/tables
          </SheetDescription>
        </SheetHeader>
        <TablesEditor
          cafeId={cafeId}
          initial={existingTables.map(toEditable)}
          isLoadingInitial={tablesQuery.isLoading}
          onSaved={() => {
            void queryClient.invalidateQueries({
              queryKey: ["manager-cafe", cafeId, "pos-tables"],
            });
            void queryClient.invalidateQueries({
              queryKey: ["manager-cafe", cafeId, "me"],
            });
          }}
          onClose={() => onOpenChange(false)}
        />
      </SheetContent>
    </Sheet>
  );
}

function TablesEditor({
  cafeId,
  initial,
  isLoadingInitial,
  onSaved,
  onClose,
}: {
  cafeId: string;
  initial: EditableTable[];
  isLoadingInitial: boolean;
  onSaved: () => void;
  onClose: () => void;
}) {
  // Tách initial thành "khoá ban đầu" để remount khi initial thay đổi
  // thật sự — tránh setState trong render. `signature` dùng id+sortOrder
  // nối lại để nhận biết đã sync hay chưa.
  const signature = initial.map((r) => `${r.id ?? "new"}:${r.sortOrder}`).join("|");
  return (
    <TablesEditorInner
      key={signature || "empty"}
      cafeId={cafeId}
      initial={initial}
      isLoadingInitial={isLoadingInitial}
      onSaved={onSaved}
      onClose={onClose}
    />
  );
}

function TablesEditorInner({
  cafeId,
  initial,
  isLoadingInitial,
  onSaved,
  onClose,
}: {
  cafeId: string;
  initial: EditableTable[];
  isLoadingInitial: boolean;
  onSaved: () => void;
  onClose: () => void;
}) {
  const [rows, setRows] = useState<EditableTable[]>(initial);
  const [saving, setSaving] = useState(false);

  function addRow() {
    setRows((prev) => {
      const nextSort = prev.length
        ? Math.max(...prev.map((r) => r.sortOrder)) + 10
        : 10;
      return [...prev, { name: `Bàn ${prev.length + 1}`, seatCount: 4, sortOrder: nextSort }];
    });
  }

  function removeRow(idx: number) {
    setRows((prev) => prev.filter((_, i) => i !== idx));
  }

  function moveRow(idx: number, dir: -1 | 1) {
    setRows((prev) => {
      const next = [...prev];
      const j = idx + dir;
      if (j < 0 || j >= next.length) return prev;
      [next[idx], next[j]] = [next[j], next[idx]];
      // Re-assign sortOrder for visual stability
      next.forEach((r, i) => {
        r.sortOrder = (i + 1) * 10;
      });
      return next;
    });
  }

  function updateRow(idx: number, patch: Partial<EditableTable>) {
    setRows((prev) => prev.map((r, i) => (i === idx ? { ...r, ...patch } : r)));
  }

  async function handleSave() {
    if (rows.length === 0) {
      toast.error("Phải có ít nhất 1 bàn hoặc bấm Huỷ để giữ layout cũ.");
      return;
    }
    setSaving(true);
    try {
      const payload = {
        tables: rows.map((r, i) => ({
          name: r.name.trim() || `Bàn ${i + 1}`,
          seatCount: Math.max(1, Math.min(50, r.seatCount || 1)),
          sortOrder: r.sortOrder || (i + 1) * 10,
        })),
      };
      await apiClient.put(`/api/cafes/${cafeId}/pos/tables`, payload);
      toast.success("Đã đồng bộ sơ đồ bàn.");
      onSaved();
      onClose();
    } catch (err) {
      const msg =
        err instanceof Error ? err.message : "Lưu sơ đồ bàn thất bại.";
      toast.error(msg);
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="flex-1 flex flex-col min-h-0">
      <div className="flex-1 overflow-y-auto px-5 py-4 space-y-3">
        {isLoadingInitial ? (
          <div
            role="status"
            aria-live="polite"
            className="flex items-center gap-2 text-helper px-3 py-2 rounded-lg border border-neutral-200 bg-neutral-50"
          >
            <Loader2 className="h-3.5 w-3.5 animate-spin" aria-hidden />
            Đang tải sơ đồ bàn…
          </div>
        ) : rows.length === 0 ? (
          <p className="text-helper px-3 py-3 rounded-lg border border-dashed border-neutral-300 bg-neutral-50">
            Chưa có bàn nào. Nhấn <strong>+ Thêm bàn</strong> bên dưới để
            khởi tạo sơ đồ POS.
          </p>
        ) : (
          <ul className="space-y-2">
            {rows.map((row, idx) => (
              <li
                key={`row-${idx}-${row.id ?? "new"}`}
                className="rounded-lg border border-neutral-200 bg-white p-2.5 flex items-center gap-2"
              >
                <div className="flex flex-col">
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    onClick={() => moveRow(idx, -1)}
                    disabled={idx === 0 || saving}
                    className="h-5 w-5 p-0"
                    aria-label="Lên"
                  >
                    <ArrowUp className="h-3 w-3" aria-hidden />
                  </Button>
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    onClick={() => moveRow(idx, 1)}
                    disabled={idx === rows.length - 1 || saving}
                    className="h-5 w-5 p-0"
                    aria-label="Xuống"
                  >
                    <ArrowDown className="h-3 w-3" aria-hidden />
                  </Button>
                </div>
                <Input
                  value={row.name}
                  onChange={(e) => updateRow(idx, { name: e.target.value })}
                  placeholder="Tên bàn"
                  disabled={saving}
                  className="h-9 text-sm flex-1"
                />
                <Input
                  type="number"
                  min={1}
                  max={50}
                  value={String(row.seatCount)}
                  onChange={(e) =>
                    updateRow(idx, { seatCount: Number(e.target.value) || 1 })
                  }
                  disabled={saving}
                  className="h-9 w-20 text-sm tabular-nums"
                  aria-label="Số ghế"
                />
                <span className="text-xs text-neutral-500 shrink-0">ghế</span>
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  onClick={() => removeRow(idx)}
                  disabled={saving}
                  className="h-9 w-9 p-0 text-neutral-500 hover:text-destructive"
                  aria-label="Xoá bàn"
                >
                  <Trash2 className="h-3.5 w-3.5" aria-hidden />
                </Button>
              </li>
            ))}
          </ul>
        )}
      </div>

      <div className="border-t border-neutral-100 px-5 py-3 space-y-2 bg-white">
        <Button
          type="button"
          variant="outline"
          size="sm"
          onClick={addRow}
          disabled={saving}
          className={cn(
            "w-full h-9 text-sm font-medium",
            "border-dashed border-neutral-300 text-neutral-700",
          )}
        >
          <Plus className="h-3.5 w-3.5 mr-1.5" aria-hidden />
          Thêm bàn
        </Button>
        <div className="flex flex-col sm:flex-row gap-2">
          <Button
            type="button"
            variant="ghost"
            onClick={onClose}
            disabled={saving}
            className="h-11 text-xs font-medium flex-1 sm:flex-none"
          >
            Huỷ
          </Button>
          <Button
            type="button"
            onClick={handleSave}
            disabled={saving || rows.length === 0}
            className="h-11 px-5 text-sm font-medium flex items-center justify-center gap-2 flex-1 sm:flex-none"
          >
            {saving ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin" aria-hidden />
                Đang lưu…
              </>
            ) : (
              <>
                <Save className="h-4 w-4" aria-hidden />
                Lưu sơ đồ
              </>
            )}
          </Button>
        </div>
      </div>
    </div>
  );
}

/* ─── Helpers ─────────────────────────────────────────────────────── */

function extractTables(raw: unknown): CafeTable[] {
  if (Array.isArray(raw)) return raw as CafeTable[];
  if (raw && typeof raw === "object" && "tables" in raw) {
    const t = (raw as { tables?: unknown }).tables;
    if (Array.isArray(t)) return t as CafeTable[];
  }
  if (raw && typeof raw === "object" && "data" in raw) {
    const d = (raw as { data?: unknown }).data;
    if (Array.isArray(d)) return d as CafeTable[];
    if (d && typeof d === "object" && "tables" in d) {
      const t = (d as { tables?: unknown }).tables;
      if (Array.isArray(t)) return t as CafeTable[];
    }
  }
  return [];
}

function toEditable(t: CafeTable): EditableTable {
  return {
    id: t.id,
    name: t.label,
    seatCount: t.seats,
    sortOrder: t.sortOrder ?? 0,
  };
}