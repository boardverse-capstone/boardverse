/* eslint-disable @typescript-eslint/no-explicit-any */
"use client";

import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import {
  mergePlayerRange,
  readPresentCount,
} from "../lib/player-range";
import {
  Clock,
  Users,
  Boxes,
  CreditCard,
  Info,
  LogOut,
  History,
  ArrowRight,
  CheckCircle2,
} from "lucide-react";

export interface ActiveSessionsTabProps {
  sessions: any[];
  onEndSession: (sessionId: string) => void;
  onViewDetail: (sessionId: string) => void;
  onInitiatePaymentFlow: (session: any) => void;
  onShowBoxHistory?: (boxId: string) => void;
}

function normStatus(value: unknown) {
  return String(value ?? "")
    .toLowerCase()
    .replace(/[_\s-]/g, "");
}

function sessionLifecycle(ses: any) {
  return normStatus(
    ses.status ?? ses.sessionStatus ?? ses.Status ?? ses.SessionStatus,
  );
}

function gameCheckStatus(game: any) {
  return normStatus(game?.checkStatus ?? game?.CheckStatus);
}

/** Trả bàn xong: BE đã đưa phiên sang CHECKING / UNPAID / PAID. */
function isReturnedByApi(ses: any) {
  const status = sessionLifecycle(ses);
  return (
    status === "checking" ||
    status === "unpaid" ||
    status === "paid" ||
    status === "completed" ||
    ses.isCheckingInventory === true ||
    ses.IsCheckingInventory === true
  );
}

/** Kiểm kê xong: mọi game đều checkStatus = Verified từ BE. */
function isCheckDoneByApi(ses: any) {
  const games = ses.games || ses.Games || ses.sessionGames || [];
  if (!Array.isArray(games) || games.length === 0) {
    return gameCheckStatus(ses) === "verified";
  }
  return games.some((g: any) => gameCheckStatus(g) === "verified");
}

function isPaidByApi(ses: any) {
  const status = sessionLifecycle(ses);
  return status === "paid" || status === "completed";
}

export function ActiveSessionsTab({
  sessions,
  onEndSession,
  onViewDetail,
  onInitiatePaymentFlow,
  onShowBoxHistory,
}: ActiveSessionsTabProps) {
  const activeSessions = (sessions || []).filter((s) => !isPaidByApi(s));

  if (!activeSessions || activeSessions.length === 0) {
    return (
      <div className="bg-white border border-neutral-200 rounded-2xl p-12 text-center space-y-3 shadow-2xs">
        <Users className="w-10 h-10 text-neutral-400 mx-auto" />
        <h3 className="font-bold text-sm text-neutral-900">
          Không có bàn nào đang hoạt động
        </h3>
        <p className="text-xs text-neutral-500">
          Vào tab Sơ đồ bàn để bắt đầu gán bàn cho lượt khách mới.
        </p>
      </div>
    );
  }

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
      {activeSessions.map((ses: any) => {
        const isUnpaid = sessionLifecycle(ses) === "unpaid";
        const isChecking = sessionLifecycle(ses) === "checking";
        const primaryGame = ses.games?.[0];
        const isReturned = isReturnedByApi(ses);
        const isCheckDone = isCheckDoneByApi(ses);
        const isPaidDone = isPaidByApi(ses);

        const openDetail = () => {
          onViewDetail(ses.id);
        };

        const openPay = () => {
          if (isPaidDone) return;
          if (!isReturned) {
            toast.error(
              "Chưa trả bàn. Thứ tự: Trả bàn → Chi tiết (kiểm kê) → Thanh toán.",
              {
                duration: 8000,
                action: {
                  label: "Trả bàn",
                  onClick: () => onEndSession(ses.id),
                },
              },
            );
            return;
          }
          if (!isCheckDone) {
            toast.error(
              "Chưa kiểm kê. Mở Chi tiết để kiểm kê linh kiện trước khi thanh toán.",
              {
                duration: 8000,
                action: {
                  label: "Chi tiết",
                  onClick: () => openDetail(),
                },
              },
            );
            return;
          }
          onInitiatePaymentFlow(ses);
        };

        return (
          <div
            key={ses.id}
            className={`bg-white border rounded-2xl p-4 shadow-2xs flex flex-col justify-between space-y-4 transition-all ${
              isUnpaid
                ? "border-amber-300 bg-amber-50/20"
                : "border-neutral-200 hover:border-neutral-300"
            }`}
          >
            {/* HEADER PHIÊN & TRẠNG THÁI */}
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <h3 className="font-extrabold text-base text-neutral-950">
                    {ses.tableName}
                  </h3>
                  <span className="text-[11px] font-mono text-neutral-400">
                    #{ses.id.slice(0, 6)}
                  </span>
                </div>

                <span
                  className={`px-2 py-0.5 rounded-full text-[9px] font-extrabold uppercase border ${
                    isUnpaid
                      ? "bg-amber-100 text-amber-800 border-amber-300 animate-pulse"
                      : isChecking
                        ? "bg-blue-50 text-blue-700 border-blue-200"
                        : "bg-emerald-50 text-emerald-700 border-emerald-200"
                  }`}
                >
                  {isUnpaid
                    ? "UNPAID"
                    : isChecking
                      ? "CHECKING"
                      : ses.status || "Playing"}
                </span>
              </div>

              {/* BƯỚC THỜI GIAN VÀ KHÁCH */}
              <div className="grid grid-cols-2 gap-2 p-2.5 bg-neutral-50 rounded-xl border border-neutral-100 text-xs">
                <div>
                  <span className="text-[10px] font-bold text-neutral-400 uppercase flex items-center gap-1">
                    <Clock className="w-3 h-3" /> ĐÃ CHƠI
                  </span>
                  <div className="font-mono font-bold text-neutral-900 mt-0.5">
                    {ses.elapsedMinutes} phút
                  </div>
                </div>

                <div>
                  <span className="text-[10px] font-bold text-neutral-400 uppercase flex items-center gap-1">
                    <Users className="w-3 h-3" /> SỐ KHÁCH
                  </span>
                  <div className="font-semibold text-neutral-800 mt-0.5">
                    {(() => {
                      const present = readPresentCount(ses);
                      const range = mergePlayerRange(
                        primaryGame,
                        ses.game,
                        ses,
                      );
                      const presentLabel =
                        present != null ? `${present}` : "—";
                      if (range.min != null && range.max != null) {
                        return `${presentLabel} · ${range.min}–${range.max} người`;
                      }
                      if (range.max != null) {
                        return `${presentLabel}/${range.max} người`;
                      }
                      return present != null
                        ? `${present} người`
                        : "Chưa có số khách";
                    })()}
                  </div>
                </div>
              </div>

              {/* THÔNG TIN HỘP GAME (NẾU CÓ) */}
              {primaryGame && (
                <div className="p-2.5 bg-neutral-50 rounded-xl border border-neutral-200/80 flex items-center justify-between text-xs">
                  <div className="space-y-0.5 min-w-0 pr-2">
                    <div className="font-bold text-neutral-900 truncate flex items-center gap-1">
                      <Boxes className="w-3.5 h-3.5 text-neutral-500 shrink-0" />
                      {primaryGame.gameName}
                    </div>
                    <div className="text-[10px] font-mono text-neutral-400">
                      Mã: {primaryGame.boxBarcode}
                    </div>
                  </div>

                  {onShowBoxHistory && primaryGame.cafeInventoryBoxId && (
                    <Button
                      type="button"
                      size="sm"
                      variant="ghost"
                      onClick={() =>
                        onShowBoxHistory(primaryGame.cafeInventoryBoxId)
                      }
                      title="Xem lịch sử kiểm kê"
                      className="h-7 w-7 p-0 text-amber-600 hover:bg-amber-100/60 rounded-lg shrink-0"
                    >
                      <History className="w-4 h-4" />
                    </Button>
                  )}
                </div>
              )}
            </div>

            {/* CỤM FOOTER ACTION BUTTONS: DÙNG GRID CỐ ĐỊNH HOẶC FLEX CHUẨN ĐỂ KHÔNG BAO GIỜ ĐÈ NHAU */}
            <div className="pt-3 border-t border-neutral-100 flex flex-wrap items-center gap-1.5 w-full">
              <Button
                type="button"
                size="sm"
                variant="ghost"
                disabled={isReturned}
                onClick={() => onEndSession(ses.id)}
                aria-label={
                  isReturned
                    ? "Đã trả bàn — phiên đang CHECKING hoặc chờ thu tiền"
                    : "Trả bàn: kết thúc giờ chơi, chuyển phiên sang CHECKING để kiểm kê (chưa thu tiền)"
                }
                title={
                  isReturned
                    ? "Đã trả bàn"
                    : "Trả bàn — kết thúc giờ chơi, chuyển sang CHECKING để kiểm kê. Chưa thu tiền, bàn chưa trống."
                }
                className={`h-8 px-2.5 text-[11px] font-bold rounded-lg shrink-0 flex items-center gap-1 shadow-none disabled:opacity-100 ${
                  isReturned
                    ? "text-emerald-700 bg-emerald-50 hover:bg-emerald-50 hover:text-emerald-700"
                    : "text-neutral-500 hover:text-rose-700 hover:bg-rose-50"
                }`}
              >
                {isReturned ? (
                  <CheckCircle2 className="w-3.5 h-3.5 shrink-0" />
                ) : (
                  <LogOut className="w-3.5 h-3.5 shrink-0" />
                )}
                <span>Trả bàn</span>
              </Button>

              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={openDetail}
                className={`h-8 px-2.5 text-[11px] font-bold rounded-lg shrink-0 flex items-center gap-1 shadow-none ${
                  isCheckDone
                    ? "text-emerald-800 border-emerald-200 bg-emerald-50"
                    : "text-neutral-700 border-neutral-200"
                }`}
              >
                {isCheckDone ? (
                  <CheckCircle2 className="w-3.5 h-3.5 shrink-0 text-emerald-600" />
                ) : (
                  <Info className="w-3.5 h-3.5 text-neutral-400 shrink-0" />
                )}
                <span>Chi tiết</span>
              </Button>

              <Button
                type="button"
                size="sm"
                disabled={isPaidDone}
                onClick={openPay}
                className={`h-8 px-3 text-[11px] font-bold rounded-lg flex items-center gap-1 shadow-none ml-auto ${
                  isPaidDone
                    ? "bg-emerald-50 text-emerald-800 border border-emerald-200 hover:bg-emerald-50"
                    : "bg-emerald-600 hover:bg-emerald-700 text-white"
                }`}
              >
                {isPaidDone ? (
                  <CheckCircle2 className="w-3.5 h-3.5 shrink-0" />
                ) : (
                  <CreditCard className="w-3.5 h-3.5 shrink-0" />
                )}
                <span>
                  {isPaidDone
                    ? "Thanh toán"
                    : isUnpaid
                      ? "Thu Tiền"
                      : "Thanh toán"}
                </span>
                {!isPaidDone && <ArrowRight className="w-3 h-3 shrink-0" />}
              </Button>
            </div>
          </div>
        );
      })}
    </div>
  );
}
