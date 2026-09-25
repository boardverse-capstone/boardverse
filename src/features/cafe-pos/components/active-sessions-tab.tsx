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
import { arcadeCardClass, scoreNumberClass } from "../lib/game-theme";
import { cn } from "@/lib/utils";
import {
  Clock,
  Users,
  CreditCard,
  LogOut,
  ArrowRight,
  CheckCircle2,
  ClipboardCheck,
  Pause,
  Play,
} from "lucide-react";

export interface ActiveSessionsTabProps {
  sessions: any[];
  onEndSession: (sessionId: string) => void;
  onViewDetail: (sessionId: string) => void;
  onOpenInventory: (session: any) => void;
  onInitiatePaymentFlow: (session: any) => void;
  onResumeSession?: (sessionId: string) => void;
  onPauseSession?: (sessionId: string) => void;
  onResumePause?: (sessionId: string) => void;
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
    status === "closed" ||
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
  return (
    status === "paid" || status === "completed" || status === "closed"
  );
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
    case "closed":
      return "Đã đóng";
    default:
      return status?.trim() || "";
  }
}

export function ActiveSessionsTab({
  sessions,
  onEndSession,
  onViewDetail,
  onOpenInventory,
  onInitiatePaymentFlow,
  onResumeSession,
  onPauseSession,
  onResumePause,
}: ActiveSessionsTabProps) {
  const activeSessions = (sessions || []).filter((s) => !isPaidByApi(s));

  if (!activeSessions || activeSessions.length === 0) {
    return (
      <Card className="border-2 border-dashed border-neutral-300 bg-neutral-50/40">
        <CardContent className="space-y-3 py-12 text-center">
          <Users className="mx-auto size-10 text-neutral-400" />
          <h3 className="font-mono text-xs font-bold uppercase tracking-widest text-neutral-700">
            ▸ KHÔNG CÓ PHIÊN HOẠT ĐỘNG
          </h3>
          <p className="font-mono text-[11px] uppercase text-neutral-500">
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
        const isPaused = Boolean(ses.isPaused ?? ses.IsPaused);
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
              "Chưa trả bàn. Thứ tự: Trả bàn → Kiểm kê → Thanh toán.",
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
              "Chưa kiểm kê. Bấm Kiểm kê trên thẻ phiên trước khi thanh toán.",
              {
                duration: 8000,
                action: {
                  label: "Kiểm kê",
                  onClick: () => onOpenInventory(ses),
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
            role="button"
            tabIndex={0}
            onClick={openDetail}
            onKeyDown={(event) => {
              if (event.key === "Enter" || event.key === " ") {
                event.preventDefault();
                openDetail();
              }
            }}
            className={cn(
              arcadeCardClass,
              "cursor-pointer gap-0 transition-all hover:translate-y-[-2px]",
              isUnpaid
                ? "border-2 border-amber-400 bg-amber-50/40 shadow-[2px_2px_0_rgba(245,158,11,0.3)]"
                : "border-2 border-neutral-300 bg-white hover:border-neutral-400",
            )}
          >
            <CardHeader className="border-b-2 border-current/10">
              <div className="flex items-center gap-2">
                  <CardTitle className="font-mono text-lg font-extrabold tracking-tight text-neutral-950">
                    {ses.tableName}
                  </CardTitle>
                  <span className="font-mono text-[10px] font-bold uppercase tracking-widest text-neutral-500">
                    #{ses.id.slice(0, 6)}
                  </span>
              </div>
              <CardAction>
                  <Badge
                    variant="outline"
                    className={cn(
                      "gap-1 border-2 px-2 py-0.5 font-mono text-[10px] font-extrabold uppercase tracking-widest shadow-[inset_0_-2px_0_rgba(0,0,0,0.08)]",
                      isUnpaid || (isChecking && isCheckDone)
                        ? "border-amber-400 bg-amber-100 text-amber-900"
                        : isChecking
                          ? "border-orange-400 bg-orange-100 text-orange-800"
                          : "border-orange-400 bg-orange-100 text-orange-800",
                    )}
                  >
                    <span
                      className={cn(
                        "inline-block size-1.5 rounded-full shadow-[0_0_6px_currentColor]",
                        isUnpaid || (isChecking && isCheckDone)
                          ? "bg-amber-500"
                          : isChecking
                            ? "bg-orange-500"
                            : "bg-orange-500 animate-pulse",
                      )}
                    />
                    {isUnpaid || (isChecking && isCheckDone)
                      ? "CHỜ THANH TOÁN"
                      : isChecking
                        ? "ĐANG KIỂM KÊ"
                        : isPaused
                          ? "TẠM DỪNG"
                          : "ĐANG CHƠI"}
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
                      className={cn(
                        "relative z-10 flex size-7 items-center justify-center border-2 font-mono text-xs font-extrabold shadow-[inset_0_-2px_0_rgba(0,0,0,0.2)]",
                        step.done
                          ? "border-orange-700 bg-orange-500 text-white"
                          : step.current
                            ? "border-neutral-700 bg-gradient-to-b from-neutral-500 to-neutral-600 text-white shadow-[inset_0_-2px_0_rgba(0,0,0,0.25),0_0_8px_rgba(120,120,120,0.4)]"
                            : "border-neutral-300 bg-white text-neutral-400",
                      )}
                    >
                      {step.done ? <CheckCircle2 className="size-4" /> : index + 1}
                    </span>
                    <span
                      className={cn(
                        "text-[10px] font-mono font-bold uppercase tracking-widest",
                        step.current || step.done
                          ? "text-neutral-900"
                          : "text-neutral-400",
                      )}
                    >
                      {step.label}
                    </span>
                  </li>
                ))}
              </ol>

              <div className="grid grid-cols-2 gap-3 rounded-md border-2 border-neutral-900/15 bg-neutral-100/60 p-3 font-mono text-sm shadow-[inset_0_2px_4px_rgba(0,0,0,0.06)]">
                <div>
                  <span className="flex items-center gap-1 text-[10px] font-bold uppercase tracking-widest text-neutral-700">
                    <Clock className="size-3.5" /> THỜI GIAN
                  </span>
                  <div className={cn(scoreNumberClass, "mt-1 text-neutral-900")}>
                    {Number(ses.elapsedMinutes ?? ses.ElapsedMinutes ?? 0)} MIN
                  </div>
                </div>

                <div>
                  <span className="flex items-center gap-1 text-[10px] font-bold uppercase tracking-widest text-neutral-700">
                    <Users className="size-3.5" /> NHÓM
                  </span>
                  <div className={cn(scoreNumberClass, "mt-1 text-neutral-900")}>
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
                        return `${presentLabel}/${range.max} PPL`;
                      }
                      if (range.max != null) {
                        return `${presentLabel}/${range.max} PPL`;
                      }
                      return present != null
                        ? `${present} PPL`
                        : "—";
                    })()}
                  </div>
                </div>
              </div>

            </CardContent>

            <CardFooter
              className="grid grid-cols-2 gap-2 border-t-2 border-current/10"
              onClick={(event) => event.stopPropagation()}
            >
              {isChecking && !isUnpaid && !isPaidDone && onResumeSession ? (
                <Button
                  type="button"
                  size="sm"
                  variant="outline"
                  onClick={() => onResumeSession(ses.id)}
                  className="col-span-2 min-h-11 gap-2 border-2 border-orange-400 bg-orange-100 font-bold uppercase tracking-wider text-orange-800 shadow-[inset_0_-2px_0_rgba(0,0,0,0.08)] hover:bg-orange-200"
                >
                  ► Tiếp tục phiên
                </Button>
              ) : null}
              {!isReturned && (onPauseSession || onResumePause) ? (
                <Button
                  type="button"
                  size="sm"
                  variant="outline"
                  onClick={() =>
                    isPaused
                      ? onResumePause?.(ses.id)
                      : onPauseSession?.(ses.id)
                  }
                  className={cn(
                    "col-span-2 min-h-11 gap-2 border-2 font-bold uppercase tracking-wider shadow-[inset_0_-2px_0_rgba(0,0,0,0.08)]",
                    isPaused
                      ? "border-orange-400 bg-orange-100 text-orange-800"
                      : "border-amber-400 bg-amber-100 text-amber-900",
                  )}
                >
                  {isPaused ? (
                    <Play className="size-4 shrink-0" />
                  ) : (
                    <Pause className="size-4 shrink-0" />
                  )}
                  <span>
                    {isPaused
                      ? "► Chạy tiếp đồng hồ"
                      : "⏸ Tạm dừng đồng hồ"}
                  </span>
                </Button>
              ) : null}
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
                className={cn(
                  "min-h-11 gap-2 border-2 font-bold uppercase tracking-wider shadow-none disabled:opacity-100",
                  isReturned
                    ? "border-orange-400 bg-orange-50 text-orange-800"
                    : nextAction === "return"
                      ? "border-amber-500 bg-gradient-to-b from-amber-500 to-amber-600 text-white shadow-[inset_0_-3px_0_rgba(0,0,0,0.2),0_0_12px_rgba(245,158,11,0.4)] ring-2 ring-amber-200 ring-offset-2 hover:from-amber-500 hover:to-amber-500"
                      : "border-neutral-300 bg-white text-neutral-600 hover:border-orange-300 hover:text-orange-700 hover:bg-orange-50",
                )}
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
                size="sm"
                onClick={() => {
                  if (!isReturned) {
                    toast.error(
                      "Chưa trả bàn. Thứ tự: Trả bàn → Kiểm kê → Thanh toán.",
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
                  onOpenInventory(ses);
                }}
                className={cn(
                  "min-h-11 gap-2 border-2 font-bold uppercase tracking-wider shadow-none",
                  nextAction === "inventory"
                    ? "border-amber-500 bg-gradient-to-b from-amber-500 to-amber-600 text-white shadow-[inset_0_-3px_0_rgba(0,0,0,0.2),0_0_12px_rgba(245,158,11,0.4)] ring-2 ring-amber-200 ring-offset-2 hover:from-amber-500 hover:to-amber-500"
                    : isCheckDone
                      ? "border-orange-400 bg-orange-100 text-orange-800"
                      : "border-neutral-300 bg-white text-neutral-600",
                )}
              >
                {isCheckDone ? (
                  <CheckCircle2 className="size-4 shrink-0" />
                ) : (
                  <ClipboardCheck className="size-4 shrink-0" />
                )}
                <span>Kiểm kê</span>
              </Button>

              <Button
                type="button"
                size="sm"
                disabled={isPaidDone}
                onClick={openPay}
                className={cn(
                  "col-span-2 min-h-11 gap-2 border-2 font-bold uppercase tracking-wider shadow-none",
                  isPaidDone
                    ? "border-orange-400 bg-orange-100 text-orange-800 hover:bg-orange-100"
                    : nextAction === "pay"
                      ? "border-orange-700 bg-gradient-to-b from-orange-500 to-orange-600 text-white shadow-[inset_0_-3px_0_rgba(0,0,0,0.2),0_0_12px_rgba(249,115,22,0.4)] ring-2 ring-orange-200 ring-offset-2 hover:from-orange-500 hover:to-orange-500"
                      : "border-neutral-300 bg-neutral-100 text-neutral-400 hover:bg-neutral-100",
                )}
              >
                {isPaidDone ? (
                  <CheckCircle2 className="size-4 shrink-0" />
                ) : (
                  <CreditCard className="size-4 shrink-0" />
                )}
                <span>{isPaidDone ? "ĐÃ THANH TOÁN" : "THANH TOÁN NGAY"}</span>
                {!isPaidDone && <ArrowRight className="size-4 shrink-0" />}
              </Button>
            </CardFooter>
          </Card>
        );
      })}
    </div>
  );
}
