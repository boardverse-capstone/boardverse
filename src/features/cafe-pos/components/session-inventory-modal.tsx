/* eslint-disable @typescript-eslint/no-explicit-any */
"use client";

import { ClipboardCheck, X, Zap, RotateCcw, CheckCircle2, AlertTriangle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import {
  backdropCloseHandler,
  useDismissOnBackdrop,
} from "../lib/use-dismiss-on-backdrop";

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
  if (status === "verified") return { text: "Đã kiểm kê · Đủ", color: "emerald" };
  if (status === "missingcomponents") return { text: "Đã kiểm kê · Thiếu", color: "amber" };
  return { text: "Chưa kiểm kê", color: "violet" };
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
  useDismissOnBackdrop(isOpen, onClose);

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
      className="fixed inset-0 z-50 flex items-center justify-center bg-neutral-950/70 p-3 backdrop-blur-xs sm:p-4"
      onClick={backdropCloseHandler(onClose)}
    >
      <div
        className="flex max-h-[88vh] w-full max-w-lg flex-col overflow-hidden rounded-2xl border-2 border-amber-400 bg-gradient-to-br from-amber-50 via-yellow-50 to-orange-50 shadow-[6px_6px_0_rgba(234,179,8,0.4)]"
        onClick={(event) => event.stopPropagation()}
      >
        {/* CRT scanlines + LED corners */}
        <div className="pointer-events-none absolute inset-0 bg-[repeating-linear-gradient(0deg,transparent_0,transparent_3px,rgba(255,255,255,0.05)_3px,rgba(255,255,255,0.05)_4px)]" />
        <span className="pointer-events-none absolute -left-0.5 -top-0.5 size-2 animate-pulse rounded-full bg-amber-500 shadow-[0_0_10px_currentColor]" />
        <span className="pointer-events-none absolute -right-0.5 -bottom-0.5 size-2 animate-pulse rounded-full bg-orange-500 shadow-[0_0_10px_currentColor] [animation-delay:0.4s]" />
        <span className="pointer-events-none absolute -right-0.5 -top-0.5 size-1.5 animate-pulse rounded-full bg-yellow-400 shadow-[0_0_8px_currentColor]" />
        <span className="pointer-events-none absolute -left-0.5 -bottom-0.5 size-1.5 animate-pulse rounded-full bg-violet-500 shadow-[0_0_8px_currentColor] [animation-delay:0.2s]" />

        {/* HEADER */}
        <div className="relative flex shrink-0 items-center justify-between border-b-2 border-amber-300/70 bg-gradient-to-r from-amber-100 via-yellow-100 to-orange-100 px-5 py-3">
          <div className="flex items-center gap-3">
            {/* Icon với glow */}
            <div className="relative p-2.5 rounded-xl border-2 border-amber-400 bg-gradient-to-br from-amber-400 to-orange-500 shadow-[inset_0_-2px_0_rgba(0,0,0,0.2),0_0_12px_rgba(234,179,8,0.5)]">
              <ClipboardCheck className="size-5 text-white" />
              <span className="absolute -right-1 -top-1 size-2 animate-pulse rounded-full bg-yellow-400 shadow-[0_0_8px_currentColor]" />
            </div>
            <div>
              <h3 className="font-mono text-sm font-extrabold uppercase tracking-widest text-amber-950">
                ► Kiểm kê hộp game
              </h3>
              <p className="font-mono text-[10px] font-bold uppercase tracking-widest text-amber-700">
                <span className="text-amber-400">▸</span> {session.tableName || "Phiên"} · {games.length} hộp
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="rounded-xl border-2 border-amber-300 bg-white p-1.5 font-mono text-amber-500 shadow-[2px_2px_0_rgba(234,179,8,0.3)] transition-all hover:border-amber-500 hover:bg-amber-50"
            aria-label="Đóng"
          >
            <X className="size-5" />
          </button>
        </div>

        {/* GAME LIST */}
        <div className="relative min-h-0 flex-1 space-y-2 overflow-y-auto px-4 py-3">
          {games.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-12">
              <span className="size-16 rounded-full border-4 border-dashed border-amber-300 bg-amber-50 flex items-center justify-center mb-4 shadow-[inset_0_-2px_0_rgba(0,0,0,0.08)]">
                <ClipboardCheck className="size-8 text-amber-400" />
              </span>
              <p className="font-mono text-sm font-extrabold uppercase tracking-widest text-amber-600">
                ▸ Phiên chưa có hộp game.
              </p>
            </div>
          ) : (
            games.map((game: any) => {
              const id = gameId(game);
              const checked = isGameChecked(game);
              const { text: statusText, color } = statusLabel(game);
              return (
                <div
                  key={id || game.gameName}
                  className={[
                    "relative overflow-hidden rounded-xl border-2 p-3 shadow-[2px_2px_0_rgba(0,0,0,0.15)] transition-all",
                    checked
                      ? "border-emerald-400 bg-gradient-to-br from-emerald-50 via-white to-teal-50 shadow-[2px_2px_0_rgba(16,185,129,0.3)]"
                      : "border-amber-400 bg-gradient-to-br from-amber-50 via-white to-orange-50 shadow-[2px_2px_0_rgba(234,179,8,0.3)]",
                  ].join(" ")}
                >
                  {/* LED indicator */}
                  <span className={[
                    "pointer-events-none absolute right-3 top-3 size-1.5 animate-pulse rounded-full shadow-[0_0_6px_currentColor]",
                    checked ? "bg-emerald-500" : "bg-amber-500",
                  ].join(" ")} />

                  <div className="flex items-start justify-between gap-2 pr-6">
                    <div className="min-w-0">
                      <p className="truncate font-mono text-xs font-extrabold uppercase tracking-wide text-amber-950">
                        ► {game.gameName || "Game"}
                      </p>
                      <p className="truncate font-mono text-[10px] font-bold uppercase tracking-widest text-amber-600">
                        <span className="text-amber-400">#</span> {game.boxBarcode || game.barcode || id}
                      </p>
                    </div>
                    <span
                      className={[
                        "shrink-0 rounded-lg border-2 px-2 py-0.5 font-mono text-[10px] font-extrabold uppercase tracking-widest shadow-[inset_0_-1px_0_rgba(0,0,0,0.1)]",
                        color === "emerald"
                          ? "border-emerald-400 bg-gradient-to-b from-emerald-400 to-emerald-600 text-white shadow-[0_0_8px_rgba(16,185,129,0.4),inset_0_-1px_0_rgba(0,0,0,0.2)]"
                          : color === "amber"
                          ? "border-amber-400 bg-gradient-to-b from-amber-400 to-orange-500 text-white shadow-[0_0_8px_rgba(234,179,8,0.4),inset_0_-1px_0_rgba(0,0,0,0.2)]"
                          : "border-violet-400 bg-gradient-to-b from-violet-400 to-purple-600 text-white shadow-[0_0_8px_rgba(139,92,246,0.4),inset_0_-1px_0_rgba(0,0,0,0.2)]",
                      ].join(" ")}
                    >
                      {color === "emerald" && <CheckCircle2 className="inline w-3 h-3 mr-0.5" />}
                      {color === "amber" && <AlertTriangle className="inline w-3 h-3 mr-0.5" />}
                      {statusText}
                    </span>
                  </div>

                  <div className="mt-2.5 flex flex-wrap gap-2">
                    {!checked ? (
                      <button
                        type="button"
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
                        className="inline-flex h-8 items-center gap-1 rounded-lg border-2 border-amber-600 bg-gradient-to-b from-amber-500 to-orange-600 px-3 font-mono text-[11px] font-extrabold uppercase tracking-widest text-white shadow-[inset_0_-2px_0_rgba(0,0,0,0.25),2px_2px_0_rgba(0,0,0,0.15)] transition-all hover:from-amber-400 hover:to-orange-500"
                      >
                        <Zap className="w-3.5 h-3.5 text-yellow-300" />
                        Kiểm kê
                      </button>
                    ) : (
                      <button
                        type="button"
                        onClick={() => {
                          if (!id) return;
                          void (async () => {
                            const result = await onResetComponentCheck(id);
                            if (result == null) return;
                            onOpenChecklist(id);
                          })();
                        }}
                        className="inline-flex h-8 items-center gap-1 rounded-lg border-2 border-violet-400 bg-gradient-to-b from-violet-400 to-purple-600 px-3 font-mono text-[11px] font-extrabold uppercase tracking-widest text-white shadow-[inset_0_-2px_0_rgba(0,0,0,0.25),2px_2px_0_rgba(139,92,246,0.35)] transition-all hover:from-violet-300 hover:to-purple-500"
                      >
                        <RotateCcw className="w-3.5 h-3.5" />
                        Kiểm kê lại
                      </button>
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
