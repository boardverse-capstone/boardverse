"use client";

import { useCallback, useEffect, useState } from "react";
import { Banknote, RefreshCw } from "lucide-react";
import { Button } from "@/components/ui/button";
import { PosCheckInService } from "@/features/pos-check-in/services/pos-check-in.service";
import type { CafeSettlementPending } from "@/features/pos-check-in/types/pos-check-in.interface";

interface SettlementsTabProps {
  cafeId: string | null;
}

function formatCurrency(amount: number) {
  return new Intl.NumberFormat("vi-VN", {
    style: "currency",
    currency: "VND",
  }).format(amount);
}

function formatTime(iso: string) {
  return new Intl.DateTimeFormat("vi-VN", {
    hour: "2-digit",
    minute: "2-digit",
    day: "2-digit",
    month: "2-digit",
  }).format(new Date(iso));
}

/** Tab giải ngân — UI theo style cafe-pos, data từ PosCheckInService. */
export function SettlementsTab({ cafeId }: SettlementsTabProps) {
  const [items, setItems] = useState<CafeSettlementPending[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    if (!cafeId) return;
    setLoading(true);
    setError(null);
    try {
      const data = await PosCheckInService.getPendingSettlements(cafeId);
      setItems(data);
    } catch (err) {
      setError((err as Error)?.message || "Không tải được settlements.");
      setItems([]);
    } finally {
      setLoading(false);
    }
  }, [cafeId]);

  useEffect(() => {
    void load();
  }, [load]);

  if (!cafeId) {
    return (
      <div className="py-12 text-center text-xs text-neutral-400">
        Chưa có quán để tải giải ngân.
      </div>
    );
  }

  if (loading) {
    return (
      <div className="py-12 text-center text-xs text-neutral-400 animate-pulse">
        Đang tải giải ngân...
      </div>
    );
  }

  if (error) {
    return (
      <div className="space-y-3 rounded-2xl border border-rose-200 bg-rose-50/50 p-4 text-xs text-rose-700">
        <p>{error}</p>
        <Button
          type="button"
          size="sm"
          variant="outline"
          onClick={() => void load()}
          className="h-8 text-xs"
        >
          <RefreshCw className="mr-1.5 h-3.5 w-3.5" />
          Thử lại
        </Button>
      </div>
    );
  }

  if (items.length === 0) {
    return (
      <div className="rounded-2xl border border-dashed border-neutral-200 bg-white py-12 text-center text-xs text-neutral-400">
        Không có giải ngân đang chờ.
      </div>
    );
  }

  return (
    <div className="space-y-2">
      <div className="flex justify-end">
        <Button
          type="button"
          size="sm"
          variant="outline"
          onClick={() => void load()}
          className="h-8 border-neutral-200 text-xs font-bold"
        >
          <RefreshCw className="mr-1.5 h-3.5 w-3.5" />
          Làm mới
        </Button>
      </div>
      {items.map((item) => (
        <div
          key={item.id}
          className="flex flex-wrap items-center justify-between gap-2 rounded-2xl border border-neutral-200 bg-white px-4 py-3 shadow-2xs"
        >
          <div className="min-w-0 space-y-0.5">
            <p className="flex items-center gap-1.5 text-sm font-bold text-neutral-950">
              <Banknote className="h-4 w-4 shrink-0 text-neutral-600" />
              {formatCurrency(item.netTransferAmount || item.depositAmount)}
            </p>
            <p className="font-mono text-[11px] text-neutral-400">
              {formatTime(item.createdAt)} · {item.id.slice(0, 8)}…
            </p>
          </div>
          <span className="rounded-lg border border-neutral-200 bg-neutral-50 px-2 py-0.5 text-[10px] font-bold uppercase text-neutral-700">
            {item.status}
          </span>
        </div>
      ))}
    </div>
  );
}
