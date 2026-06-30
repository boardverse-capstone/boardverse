"use client";

import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";

interface InventoryCardProps {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  game: any;
  viewMode: "active" | "trash";
  onEdit: (id: string) => void;
  onDelete: (id: string) => void;
  onRestore: (id: string) => void;
}

export function InventoryCard({
  game,
  viewMode,
  onEdit,
  onDelete,
  onRestore,
}: InventoryCardProps) {
  return (
    <Card className="border border-neutral-200/80 rounded-xl p-5 bg-white shadow-[0px_1px_3px_rgba(0,0,0,0.04),0px_1px_2px_rgba(0,0,0,0.02)] flex flex-col md:flex-row justify-between items-start md:items-center gap-4 hover:border-neutral-300 transition-colors">
      <div className="flex-1 space-y-1.5 min-w-0">
        <div className="flex items-center gap-2 flex-wrap">
          <h3 className="font-bold text-sm text-neutral-900 uppercase tracking-tight truncate">
            {game.gameName}
          </h3>
          <span
            className={`text-[10px] font-bold px-2 py-0.5 rounded-md border ${
              game.status === "Available"
                ? "bg-emerald-50 border-emerald-200 text-emerald-700"
                : "bg-amber-50 border-neutral-200 text-neutral-600"
            }`}
          >
            {game.status}
          </span>
        </div>
        <p className="text-xs text-neutral-500 line-clamp-1 max-w-2xl leading-normal">
          {game.description}
        </p>
        <div className="flex items-center">
          <span className="inline-flex items-center px-2 py-0.5 rounded-md bg-neutral-900 text-white text-[10px] font-bold uppercase tracking-wider shadow-xs">
            Số lượng: {game.boxQuantity} hộp
          </span>
        </div>
      </div>

      <div className="flex items-center gap-2 self-end md:self-center shrink-0">
        {viewMode === "active" ? (
          <>
            <Button
              onClick={() => onEdit(game.id)}
              className="h-8 bg-white text-neutral-800 hover:bg-neutral-50 font-semibold text-xs uppercase border border-neutral-200 rounded-lg px-3.5 transition-colors shadow-sm"
            >
              Sửa hồ sơ
            </Button>
            <Button
              onClick={() => onDelete(game.id)}
              className="h-8 bg-white text-red-600 hover:bg-red-50/60 font-semibold text-xs uppercase border border-red-200 rounded-lg px-3.5 transition-colors"
            >
              Xóa tạm
            </Button>
          </>
        ) : (
          <Button
            onClick={() => onRestore(game.id)}
            className="h-8 bg-neutral-950 text-white hover:bg-neutral-800 font-semibold text-xs uppercase rounded-lg px-4 border border-neutral-950 shadow-sm transition-colors"
          >
            ↺ Khôi phục kho
          </Button>
        )}
      </div>
    </Card>
  );
}
