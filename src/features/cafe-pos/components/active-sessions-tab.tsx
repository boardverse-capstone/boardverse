/* eslint-disable @typescript-eslint/no-explicit-any */
"use client";

import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Card,
  CardAction,
  CardContent,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
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

function isCompletedCheckStatus(status: string) {
  return status === "verified" || status === "missingcomponents";
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

/** Kiểm kê xong: hợp lệ hoặc đã ghi nhận linh kiện bị thiếu. */
function isCheckDoneByApi(ses: any) {
  const games = ses.games || ses.Games || ses.sessionGames || [];
  if (!Array.isArray(games) || games.length === 0) {
    return isCompletedCheckStatus(gameCheckStatus(ses));
  }
  return games.every((g: any) => isCompletedCheckStatus(gameCheckStatus(g)));
}

function isPaidByApi(ses: any) {
  const status = sessionLifecycle(ses);
  return status === "paid" || status === "completed";
}

function formatSessionStatusLabel(status?: string | null) {
  switch (String(status ?? "")
    .toLowerCase()
    .replace(/[_\s-]/g, "")) {
    case "playing":
    case "active":
      return "Đang chơi";
    case "checking":
      return "Đang kiểm kê";
    case "unpaid":
      return "Chờ thanh toán";
    case "paid":
      return "Đã thanh toán";
    case "completed":
      return "Đã hoàn tất";
    default:
      return status?.trim() || "";
  }
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
      <Card>
        <CardContent className="space-y-3 py-12 text-center">
          <Users className="mx-auto size-10 text-neutral-400" />
          <h3 className="font-bold text-neutral-900">Không có bàn nào đang hoạt động</h3>
          <p className="text-sm text-neutral-500">
            Vào tab Sơ đồ bàn để bắt đầu phiên cho lượt khách mới.
          </p>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3">
      {activeSessions.map((ses: any) => {
        const isUnpaid = sessionLifecycle(ses) === "unpaid";
        const isChecking = sessionLifecycle(ses) === "checking";
        const primaryGame = ses.games?.[0];
        const isReturned = isReturnedByApi(ses);
        const isCheckDone = isCheckDoneByApi(ses);
        const isPaidDone = isPaidByApi(ses);
        const nextAction = !isReturned
          ? "return"
          : !isCheckDone
            ? "inventory"
            : "pay";
        const lifecycleSteps = [
          { label: "Đang chơi", done: isReturned, current: !isReturned },
          {
            label: "Trả bàn",
            done: isReturned,
            current: isReturned && !isCheckDone,
          },
          {
            label: "Kiểm kê",
            done: isCheckDone,
            current: isReturned && !isCheckDone,
          },
          {
            label: "Thanh toán",
            done: isPaidDone,
            current: isCheckDone && !isPaidDone,
          },
        ];

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
          <Card
            key={ses.id}
            size="sm"
            className={`gap-0 transition-colors ${
              isUnpaid
                ? "border-amber-300 bg-amber-50/30"
                : "border-neutral-200 hover:border-neutral-300"
            }`}
          >
            <CardHeader className="border-b">
              <div className="flex items-center gap-2">
                  <CardTitle className="text-lg font-bold text-neutral-950">
                    {ses.tableName}
                  </CardTitle>
                  <span className="font-mono text-xs font-medium text-neutral-700">
                    #{ses.id.slice(0, 6)}
                  </span>
              </div>
              <CardAction>
                  <Badge
                    variant="outline"
                    className={`${
                      isUnpaid
                        ? "border-amber-300 bg-amber-100 text-amber-800"
                        : isChecking
                          ? "border-blue-200 bg-blue-50 text-blue-700"
                          : "border-emerald-200 bg-emerald-50 text-emerald-700"
                    }`}
                  >
                    {isUnpaid
                      ? "Chờ thanh toán"
                      : isChecking
                        ? "Đang kiểm kê"
                        : formatSessionStatusLabel(ses.status) || "Đang chơi"}
                  </Badge>
              </CardAction>
            </CardHeader>

            <CardContent className="space-y-4 py-4">
              <ol
                className="grid grid-cols-4 gap-1"
                aria-label="Quy trình phiên chơi"
              >
                {lifecycleSteps.map((step, index) => (
                  <li
                    key={step.label}
                    className="relative flex min-w-0 flex-col items-center gap-1 text-center"
                    aria-current={step.current ? "step" : undefined}
                  >
                    <span
                      className={`relative z-10 flex size-7 items-center justify-center rounded-full border text-xs font-bold ${
                        step.done
                          ? "border-emerald-600 bg-emerald-600 text-white"
                          : step.current
                            ? "border-neutral-900 bg-neutral-900 text-white"
                            : "border-neutral-200 bg-white text-neutral-400"
                      }`}
                    >
                      {step.done ? <CheckCircle2 className="size-4" /> : index + 1}
                    </span>
                    <span
                      className={`text-xs font-medium ${
                        step.current || step.done
                          ? "text-neutral-900"
                          : "text-neutral-400"
                      }`}
                    >
                      {step.label}
                    </span>
                  </li>
                ))}
              </ol>

              <div className="grid grid-cols-2 gap-3 rounded-xl border bg-neutral-50 p-3 text-sm">
                <div>
                  <span className="flex items-center gap-1 text-xs font-bold uppercase text-neutral-700">
                    <Clock className="size-3.5" /> Đã chơi
                  </span>
                  <div className="mt-1 font-mono font-bold text-neutral-900">
                    {ses.elapsedMinutes} phút
                  </div>
                </div>

                <div>
                  <span className="flex items-center gap-1 text-xs font-bold uppercase text-neutral-700">
                    <Users className="size-3.5" /> Số khách
                  </span>
                  <div className="mt-1 font-semibold text-neutral-900">
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

              {primaryGame && (
                <div className="flex items-center justify-between rounded-xl border bg-neutral-50 p-3 text-sm">
                  <div className="min-w-0 space-y-1 pr-2">
                    <div className="flex items-center gap-1.5 truncate font-bold text-neutral-900">
                      <Boxes className="size-4 shrink-0 text-neutral-700" />
                      {primaryGame.gameName}
                    </div>
                    <div className="font-mono text-xs font-medium text-neutral-700">
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
                      aria-label={`Xem lịch sử kiểm kê của ${primaryGame.gameName}`}
                      className="size-10 shrink-0 rounded-lg p-0 text-amber-700 hover:bg-amber-100"
                    >
                      <History className="size-4" />
                    </Button>
                  )}
                </div>
              )}
            </CardContent>

            <CardFooter className="grid grid-cols-2 gap-2 border-t">
              <Button
                type="button"
                size="sm"
                variant="ghost"
                disabled={isReturned}
                onClick={() => onEndSession(ses.id)}
                aria-label={
                  isReturned
                    ? "Đã trả bàn — phiên đang kiểm kê hoặc chờ thu tiền"
                    : "Trả bàn: kết thúc giờ chơi, chuyển sang kiểm kê (chưa thu tiền)"
                }
                title={
                  isReturned
                    ? "Đã trả bàn"
                    : "Trả bàn — kết thúc giờ chơi, chuyển sang kiểm kê. Chưa thu tiền, bàn chưa trống."
                }
                className={`min-h-11 gap-2 rounded-lg font-semibold shadow-none disabled:opacity-100 ${
                  isReturned
                    ? "text-emerald-700 bg-emerald-50 hover:bg-emerald-50 hover:text-emerald-700"
                    : nextAction === "return"
                      ? "bg-amber-500 text-white ring-2 ring-amber-200 ring-offset-2 hover:bg-amber-600 hover:text-white"
                      : "text-neutral-500 hover:text-rose-700 hover:bg-rose-50"
                }`}
              >
                {isReturned ? (
                  <CheckCircle2 className="size-4 shrink-0" />
                ) : (
                  <LogOut className="size-4 shrink-0" />
                )}
                <span>Trả bàn</span>
              </Button>

              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={openDetail}
                className={`min-h-11 gap-2 rounded-lg font-semibold shadow-none ${
                  isCheckDone
                    ? "text-emerald-800 border-emerald-200 bg-emerald-50"
                    : nextAction === "inventory"
                      ? "border-amber-500 bg-amber-500 text-white ring-2 ring-amber-200 ring-offset-2 hover:bg-amber-600 hover:text-white"
                      : "text-neutral-500 border-neutral-200"
                }`}
              >
                {isCheckDone ? (
                  <CheckCircle2 className="size-4 shrink-0 text-emerald-600" />
                ) : (
                  <Info className="size-4 shrink-0 text-neutral-500" />
                )}
                <span>Chi tiết</span>
              </Button>

              <Button
                type="button"
                size="sm"
                disabled={isPaidDone}
                onClick={openPay}
                className={`col-span-2 min-h-11 gap-2 rounded-lg font-semibold shadow-none ${
                  isPaidDone
                    ? "bg-emerald-50 text-emerald-800 border border-emerald-200 hover:bg-emerald-50"
                    : nextAction === "pay"
                      ? "bg-emerald-600 text-white ring-2 ring-emerald-200 ring-offset-2 hover:bg-emerald-700"
                      : "bg-neutral-100 text-neutral-400 hover:bg-neutral-100"
                }`}
              >
                {isPaidDone ? (
                  <CheckCircle2 className="size-4 shrink-0" />
                ) : (
                  <CreditCard className="size-4 shrink-0" />
                )}
                <span>
                  Thanh toán
                </span>
                {!isPaidDone && <ArrowRight className="size-4 shrink-0" />}
              </Button>
            </CardFooter>
          </Card>
        );
      })}
    </div>
  );
}
