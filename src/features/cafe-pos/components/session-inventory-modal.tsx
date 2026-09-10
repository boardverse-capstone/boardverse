/* eslint-disable @typescript-eslint/no-explicit-any */
"use client";

import { ClipboardCheck, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";

function gameCheckStatus(game: any) {
  return String(game?.checkStatus ?? game?.CheckStatus ?? "")
    .toLowerCase()
    .replace(/[_\s-]/g, "");
}

function isGameChecked(game: any) {
  const status = gameCheckStatus(game);
  return status === "verified" || status === "missingcomponents";
}

function statusLabel(game: any) {
  const status = gameCheckStatus(game);
  if (status === "verified") return "Đã kiểm kê · Đủ";
  if (status === "missingcomponents") return "Đã kiểm kê · Thiếu";
  return "Chưa kiểm kê";
}

function gameId(game: any) {
  return String(game?.id || game?.sessionGameId || game?.SessionGameId || "");
}

export function SessionInventoryModal({
  isOpen,
  session,
  onClose,
  onOpenChecklist,
  onResetComponentCheck,
}: {
  isOpen: boolean;
  session: any | null;
  onClose: () => void;
  onOpenChecklist: (sessionGameId: string) => void;
  onResetComponentCheck: (sessionGameId: string) => Promise<unknown>;
}) {
  if (!isOpen || !session) return null;

  const games = session.games || session.Games || [];
  const lifecycle = String(
    session.status ?? session.Status ?? session.sessionStatus ?? "",
  )
    .toLowerCase()
    .replace(/[_\s-]/g, "");
  const canCheck =
    lifecycle === "checking" ||
    lifecycle === "unpaid" ||
    lifecycle === "paid" ||
    Boolean(session.isCheckingInventory);

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-neutral-950/40 p-3 backdrop-blur-xs sm:p-4"
      onClick={onClose}
    >
      <div
        className="flex max-h-[88vh] w-full max-w-lg flex-col overflow-hidden rounded-2xl border border-neutral-200 bg-white shadow-xl"
        onClick={(event) => event.stopPropagation()}
      >
        <div className="flex shrink-0 items-center justify-between border-b border-neutral-100 px-5 py-3">
          <div>
            <h3 className="flex items-center gap-2 text-base font-bold text-neutral-950">
              <ClipboardCheck className="size-5 text-amber-600" />
              Kiểm kê hộp game
            </h3>
            <p className="text-xs text-neutral-500">
              {session.tableName || "Phiên"} · {games.length} hộp
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="rounded-lg p-1 text-neutral-400 hover:text-neutral-950"
            aria-label="Đóng"
          >
            <X className="size-5" />
          </button>
        </div>

        <div className="min-h-0 flex-1 space-y-2 overflow-y-auto px-5 py-4">
          {games.length === 0 ? (
            <p className="py-8 text-center text-sm text-neutral-500">
              Phiên chưa có hộp game.
            </p>
          ) : (
            games.map((game: any) => {
              const id = gameId(game);
              const checked = isGameChecked(game);
              return (
                <div
                  key={id || game.gameName}
                  className="space-y-2 rounded-xl border border-neutral-200 p-3"
                >
                  <div className="flex items-start justify-between gap-2">
                    <div className="min-w-0">
                      <p className="truncate font-semibold text-neutral-950">
                        {game.gameName || "Game"}
                      </p>
                      <p className="truncate font-mono text-[11px] text-neutral-500">
                        {game.boxBarcode || game.barcode || id}
                      </p>
                    </div>
                    <span
                      className={`shrink-0 rounded px-2 py-0.5 text-[10px] font-bold uppercase ${
                        checked
                          ? "border border-emerald-200 bg-emerald-50 text-emerald-700"
                          : "border border-amber-200 bg-amber-50 text-amber-800"
                      }`}
                    >
                      {statusLabel(game)}
                    </span>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    {!checked ? (
                      <Button
                        type="button"
                        size="sm"
                        className="h-8 bg-amber-500 text-xs font-semibold text-white hover:bg-amber-600"
                        onClick={() => {
                          if (!canCheck) {
                            toast.error("Trả bàn trước khi kiểm kê.");
                            return;
                          }
                          if (!id) {
                            toast.error("Thiếu mã hộp trên phiên.");
                            return;
                          }
                          onOpenChecklist(id);
                        }}
                      >
                        Kiểm kê
                      </Button>
                    ) : (
                      <Button
                        type="button"
                        size="sm"
                        variant="outline"
                        className="h-8 text-xs font-semibold"
                        onClick={() => {
                          if (!id) return;
                          void (async () => {
                            const result = await onResetComponentCheck(id);
                            if (result == null) return;
                            onOpenChecklist(id);
                          })();
                        }}
                      >
                        Kiểm kê lại
                      </Button>
                    )}
                  </div>
                </div>
              );
            })
          )}
        </div>
      </div>
    </div>
  );
}
