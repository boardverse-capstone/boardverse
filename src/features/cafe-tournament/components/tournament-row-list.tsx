"use client";

import { useEffect, useMemo, useState } from "react";
import { toast } from "sonner";
import {
  Hourglass,
  ListChecks,
  MoreHorizontal,
  Eye,
  Copy,
  Power,
  Pencil,
  XCircle,
  Trophy,
  Swords,
  Users,
  CheckCircle2,
  Timer,
  CalendarClock,
  Play,
  RefreshCcw,
  Clock4,
} from "lucide-react";

import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";

import { tournamentStatusLabel } from "@/features/admin-tournament/utils/tournament.mapper";
import type {
  TournamentDetail,
  TournamentStatus,
} from "@/features/cafe-tournament/types/tournament.types";

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

interface Countdown {
  text: string;
  urgent: boolean;
  expired: boolean;
}

function pad2(n: number) {
  return n.toString().padStart(2, "0");
}

/**
 * Tính khoảng đếm ngược tới một mốc thời gian.
 * Trả text đã format tiếng Việt + cờ urgent (>60% thời lượng đã trôi qua) + expired.
 */
function computeCountdown(
  targetIso: string | null | undefined,
  windowMs?: number,
): Countdown {
  if (!targetIso) return { text: "—", urgent: false, expired: true };
  const target = new Date(targetIso).getTime();
  if (Number.isNaN(target)) {
    return { text: "—", urgent: false, expired: true };
  }
  const diff = target - Date.now();
  if (diff <= 0) return { text: "Đã qua", urgent: false, expired: true };

  const totalSeconds = Math.floor(diff / 1000);
  const days = Math.floor(totalSeconds / 86_400);
  const hours = Math.floor((totalSeconds % 86_400) / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);

  const urgent =
    typeof windowMs === "number" && windowMs > 0 && diff <= windowMs * 0.4;

  if (days >= 1) return { text: `${days} ngày nữa`, urgent, expired: false };
  if (hours >= 1)
    return { text: `${hours}g ${pad2(minutes)}p`, urgent, expired: false };
  return { text: `${Math.max(0, minutes)} phút`, urgent, expired: false };
}

function formatDateTimeVi(iso: string | null | undefined) {
  if (!iso) return "—";
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "—";
  return d.toLocaleString("vi-VN", {
    hour: "2-digit",
    minute: "2-digit",
    day: "2-digit",
    month: "2-digit",
  });
}

function formatFee(entryFee: number | null | undefined) {
  if (entryFee === null || entryFee === undefined) return null;
  if (entryFee <= 0) {
    return { label: "Miễn phí", soft: true } as const;
  }
  return {
    label: `${entryFee.toLocaleString("vi-VN")}đ`,
    soft: false,
  } as const;
}

function statusBadgeClass(status?: TournamentStatus | string) {
  switch (status) {
    case "OnGoing":
      return "border-primary/20 bg-primary/10 text-primary";
    case "Completed":
      return "border-emerald-200 bg-emerald-50 text-emerald-700";
    case "RegistrationOpen":
      return "border-amber-200 bg-amber-50 text-amber-700";
    case "RegistrationClosed":
      return "border-sky-200 bg-sky-50 text-sky-700";
    case "Cancelled":
      return "border-destructive/20 bg-destructive/10 text-destructive";
    case "Draft":
    default:
      return "border-border bg-muted text-muted-foreground";
  }
}

// ---------------------------------------------------------------------------
// Props
// ---------------------------------------------------------------------------

export interface TournamentRowListProps {
  tournaments: TournamentDetail[];
  activeTournamentId?: string | null;
  onSelect: (tournament: TournamentDetail) => void;
  /** Optional pass-through để dropdown có thể trigger luôn các action nhanh */
  onOpenRegistration?: (id: string) => void;
  onCloseRegistration?: (id: string) => void;
  onStartTournament?: (id: string) => void;
  onAdvanceRound?: (id: string) => void;
  onCancelTournament?: (id: string) => void;
  onEditTournament?: (tournament: TournamentDetail) => void;
  onViewDetails?: (tournament: TournamentDetail) => void;
  onViewPodium?: (tournament: TournamentDetail) => void;
  onRefresh?: () => void;
  refreshing?: boolean;
  loading?: boolean;
  /** Sắp xếp tùy chỉnh; mặc định theo priority của manager */
  sortStrategy?: "operational" | "startTime" | "createdAt";
}

// ---------------------------------------------------------------------------
// Sắp xếp: ưu tiên giải đang & sắp chạy
// ---------------------------------------------------------------------------

const STATUS_PRIORITY: Record<string, number> = {
  OnGoing: 0,
  RegistrationClosed: 1,
  RegistrationOpen: 2,
  Draft: 3,
  Completed: 4,
  Cancelled: 5,
};

function sortTournaments(
  list: TournamentDetail[],
  strategy: TournamentRowListProps["sortStrategy"] = "operational",
) {
  const copy = [...list];
  if (strategy === "startTime") {
    copy.sort((a, b) => {
      const aTime = a.startTime ? new Date(a.startTime).getTime() : 0;
      const bTime = b.startTime ? new Date(b.startTime).getTime() : 0;
      return aTime - bTime;
    });
    return copy;
  }
  if (strategy === "createdAt") {
    copy.sort((a, b) => {
      const aTime = a.createdAt ? new Date(a.createdAt).getTime() : 0;
      const bTime = b.createdAt ? new Date(b.createdAt).getTime() : 0;
      return bTime - aTime;
    });
    return copy;
  }
  // "operational": theo status priority, sau đó startTime gần nhất trước
  copy.sort((a, b) => {
    const pa = STATUS_PRIORITY[a.status] ?? 99;
    const pb = STATUS_PRIORITY[b.status] ?? 99;
    if (pa !== pb) return pa - pb;
    const aTime = a.startTime ? new Date(a.startTime).getTime() : 0;
    const bTime = b.startTime ? new Date(b.startTime).getTime() : 0;
    return aTime - bTime;
  });
  return copy;
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export function TournamentRowList({
  tournaments,
  activeTournamentId,
  onSelect,
  onOpenRegistration,
  onCloseRegistration,
  onStartTournament,
  onAdvanceRound,
  onCancelTournament,
  onEditTournament,
  onViewDetails,
  onViewPodium,
  onRefresh,
  refreshing,
  loading,
  sortStrategy,
}: TournamentRowListProps) {
  // Tick mỗi 30s để đếm ngược tự cập nhật
  const [, setTick] = useState(0);
  useEffect(() => {
    const id = setInterval(() => setTick((n) => n + 1), 30_000);
    return () => clearInterval(id);
  }, []);

  const ordered = useMemo(
    () => sortTournaments(tournaments, sortStrategy),
    [tournaments, sortStrategy],
  );

  return (
    <section
      aria-label="Danh sách giải đấu"
      className="space-y-2"
    >
      {/* Toolbar: tiêu đề + refresh */}
      <header className="flex items-center justify-between px-1">
        <div className="flex items-center gap-2">
          <ListChecks
            aria-hidden="true"
            className="size-3.5 text-muted-foreground"
          />
          <h2 className="text-xs font-bold uppercase tracking-wider text-section-foreground">
            Danh sách giải đấu
          </h2>
          <span className="rounded-full border border-border bg-muted px-2 py-0.5 text-[10px] font-semibold text-muted-foreground">
            {tournaments.length}
          </span>
        </div>
        {onRefresh && (
          <Button
            variant="ghost"
            size="sm"
            onClick={onRefresh}
            disabled={refreshing}
            aria-busy={refreshing || undefined}
            className="h-9 gap-1.5 px-2 text-xs font-semibold text-muted-foreground hover:text-foreground"
          >
            <RefreshCcw
              aria-hidden="true"
              className={cn(
                "size-3.5",
                refreshing && "animate-spin",
              )}
            />
            Làm mới
          </Button>
        )}
      </header>

      {/* Rows */}
      <ul
        role="list"
        className="flex flex-col gap-2"
      >
        {loading ? (
          <RowSkeleton />
        ) : ordered.length === 0 ? (
          <EmptyState />
        ) : (
          ordered.map((t) => (
            <li key={t.id}>
              <TournamentRow
                tournament={t}
                isActive={t.id === activeTournamentId}
                onSelect={onSelect}
                onOpenRegistration={onOpenRegistration}
                onCloseRegistration={onCloseRegistration}
                onStartTournament={onStartTournament}
                onAdvanceRound={onAdvanceRound}
                onCancelTournament={onCancelTournament}
                onEditTournament={onEditTournament}
                onViewDetails={onViewDetails}
                onViewPodium={onViewPodium}
              />
            </li>
          ))
        )}
      </ul>
    </section>
  );
}

// ---------------------------------------------------------------------------
// Subcomponents
// ---------------------------------------------------------------------------

interface RowProps {
  tournament: TournamentDetail;
  isActive: boolean;
  onSelect: (t: TournamentDetail) => void;
  onOpenRegistration?: (id: string) => void;
  onCloseRegistration?: (id: string) => void;
  onStartTournament?: (id: string) => void;
  onAdvanceRound?: (id: string) => void;
  onCancelTournament?: (id: string) => void;
  onEditTournament?: (t: TournamentDetail) => void;
  onViewDetails?: (t: TournamentDetail) => void;
  onViewPodium?: (t: TournamentDetail) => void;
}

function TournamentRow({
  tournament: t,
  isActive,
  onSelect,
  onOpenRegistration,
  onCloseRegistration,
  onStartTournament,
  onAdvanceRound,
  onCancelTournament,
  onEditTournament,
  onViewDetails,
  onViewPodium,
}: RowProps) {
  const isCancelled = t.status === "Cancelled";

  // Tính countdown theo ngữ cảnh (xem bảng ở mục 6 đề xuất)
  const countdown = useMemo(() => {
    switch (t.status) {
      case "RegistrationOpen":
        return {
          label: "Hạn ĐK còn",
          value: computeCountdown(t.registrationDeadline),
          icon: Hourglass,
        };
      case "RegistrationClosed":
        return {
          label: "Bắt đầu sau",
          value: computeCountdown(t.startTime),
          icon: Timer,
        };
      case "OnGoing":
        return {
          label: `Vòng #${t.currentRound || 0} còn`,
          // Round timer ước tính từ startedAt + (currentRound * roundDurationMinutes)
          value: computeCountdown(
            estimateRoundEndIso(t),
            (t.roundDurationMinutes ?? 45) * 60 * 1000,
          ),
          icon: Timer,
        };
      default:
        return null;
    }
  }, [t]);

  const progressPct = useMemo(() => {
    const max = Math.max(t.maxParticipants ?? 0, 1);
    const filled = t.registeredCount ?? 0;
    return Math.min(100, Math.round((filled / max) * 100));
  }, [t.registeredCount, t.maxParticipants]);

  const roundProgressPct = useMemo(() => {
    const total = Math.max(t.totalRounds ?? 1, 1);
    const cur = Math.max(t.currentRound ?? 0, 0);
    return Math.min(100, Math.round((cur / total) * 100));
  }, [t.currentRound, t.totalRounds]);

  const fee = formatFee(t.entryFee ?? 0);

  // Action chính nổi bật theo state machine
  const primaryQuickAction = useMemo(() => {
    switch (t.status) {
      case "Draft":
        return onOpenRegistration
          ? {
              label: "Mở ĐK",
              icon: Play,
              onClick: () => onOpenRegistration(t.id),
            }
          : null;
      case "RegistrationClosed":
        return onStartTournament
          ? {
              label: "Bắt đầu",
              icon: Swords,
              onClick: () => onStartTournament(t.id),
            }
          : null;
      case "OnGoing":
        return onAdvanceRound
          ? {
              label: "Vòng tiếp",
              icon: Trophy,
              onClick: () => onAdvanceRound(t.id),
            }
          : null;
      default:
        return null;
    }
  }, [
    t.status,
    t.id,
    onOpenRegistration,
    onStartTournament,
    onAdvanceRound,
  ]);

  return (
    <div
      role="button"
      tabIndex={isCancelled ? -1 : 0}
      aria-pressed={isActive}
      aria-disabled={isCancelled}
      aria-label={`Giải đấu ${t.title} - ${tournamentStatusLabel(t.status)}`}
      onClick={() => !isCancelled && onSelect(t)}
      onKeyDown={(e) => {
        if (isCancelled) return;
        // Chỉ react khi row đang được focus trực tiếp — tránh đè Enter/Space
        // lên các button con (Chọn, Quick action, Menu).
        if (e.target !== e.currentTarget) return;
        if (e.key === "Enter" || e.key === " ") {
          e.preventDefault();
          onSelect(t);
        }
      }}
      className={cn(
        // Base
        "group relative flex h-16 w-full items-stretch overflow-hidden rounded-xl border border-border bg-card text-left transition-colors duration-150",
        // Hover (non-active, non-cancelled) — chỉ đổi màu, KHÔNG lift
        !isCancelled &&
          !isActive &&
          "hover:border-primary/40 hover:bg-muted/40",
        // Focus — 3px halo theo design system
        "focus:outline-none focus-visible:ring-[3px] focus-visible:ring-ring/50",
        // Active state — inset left bar (theo design system)
        isActive && [
          "border-primary/40",
          "bg-primary/[0.04]",
          "shadow-[inset_3px_0_0_0_var(--primary)]",
        ],
        // Cancelled
        isCancelled && "cursor-not-allowed opacity-60",
      )}
    >
      {/* ① Status pill + Title */}
      <div className="flex min-w-0 flex-1 items-center gap-3 px-4">
        <Badge
          variant="outline"
          className={cn(
            "h-6 shrink-0 rounded-full px-2.5 text-[11px] font-semibold",
            statusBadgeClass(t.status),
            isActive && "ring-1 ring-primary/30",
          )}
        >
          {tournamentStatusLabel(t.status)}
        </Badge>
        <div className="min-w-0 flex-1">
          <p
            className={cn(
              "truncate text-sm font-semibold tracking-tight",
              isCancelled ? "text-muted-foreground line-through" : "text-foreground",
            )}
          >
            {t.title}
          </p>
          <p className="truncate text-[11px] font-medium text-muted-foreground">
            {t.gameName || "Splendor"}
            <span className="mx-1.5 text-border">·</span>
            <span className="font-mono">
              #{t.id.slice(0, 6).toUpperCase()}
            </span>
            <span className="mx-1.5 text-border">·</span>
            {t.pairingMode === "Manual" ? "Manual pairing" : "Auto pairing"}
          </p>
        </div>
      </div>

      {/* ② Participants (hidden below md) */}
      <div className="hidden w-[14%] min-w-[160px] flex-col justify-center gap-1 border-l border-border px-4 md:flex">
        <div className="flex items-baseline gap-1.5">
          <span className="font-mono text-sm font-semibold tabular-nums text-foreground">
            {t.registeredCount ?? 0}
          </span>
          <span className="text-xs font-medium text-muted-foreground">
            / {t.maxParticipants ?? 0} VĐV
          </span>
          <span className="ml-auto text-[10px] font-semibold text-muted-foreground">
            Tối thiểu {t.minParticipants ?? 0}
          </span>
        </div>
        <Progress
          value={progressPct}
          className="h-1 bg-muted"
          aria-label={`${t.registeredCount}/${t.maxParticipants} vận động viên`}
        />
      </div>

      {/* ③ Schedule */}
      <div className="hidden w-[20%] min-w-[180px] flex-col justify-center border-l border-border px-4 lg:flex">
        <div className="flex items-center gap-1.5">
          {countdown ? (
            <countdown.icon
              aria-hidden="true"
              className={cn(
                "size-3.5 shrink-0",
                countdown.value.urgent
                  ? "text-primary"
                  : "text-muted-foreground",
              )}
            />
          ) : (
            <CalendarClock
              aria-hidden="true"
              className="size-3.5 shrink-0 text-muted-foreground"
            />
          )}
          <span
            className={cn(
              "text-xs",
              countdown?.value.urgent
                ? "font-bold text-primary"
                : "font-semibold text-foreground",
            )}
          >
            {countdown
              ? `${countdown.label} ${countdown.value.text}`
              : `Bắt đầu ${formatDateTimeVi(t.startTime)}`}
          </span>
        </div>
        <span className="text-[10px] font-medium text-muted-foreground">
          {t.status === "OnGoing"
            ? `Bắt đầu lúc ${formatDateTimeVi(t.startedAt)}`
            : `Hạn ĐK ${formatDateTimeVi(t.registrationDeadline)}`}
        </span>
      </div>

      {/* ④ Fee */}
      <div className="hidden w-[10%] min-w-[90px] items-center justify-center border-l border-border px-3 xl:flex">
        {fee ? (
          <span
            className={cn(
              "rounded-full border px-2 py-0.5 text-[11px] font-semibold",
              fee.soft
                ? "border-border bg-muted text-muted-foreground"
                : "border-primary/20 bg-primary/5 text-primary",
            )}
          >
            {fee.label}
          </span>
        ) : (
          <span className="text-[11px] text-muted-foreground">—</span>
        )}
      </div>

      {/* ⑤ Current Round — nhấn mạnh cuối bên phải */}
      <div className="flex w-[14%] min-w-[120px] items-center justify-center gap-2 border-l border-border px-4">
        <div className="flex flex-col items-end gap-1">
          <div className="flex items-baseline gap-1">
            <span className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
              Vòng
            </span>
            <span className="font-mono text-base font-semibold tabular-nums tracking-tight text-foreground">
              {t.currentRound ?? 0}
            </span>
            <span className="font-mono text-sm font-medium tabular-nums text-muted-foreground">
              /{t.totalRounds ?? 4}
            </span>
          </div>
          <Progress
            value={roundProgressPct}
            className="h-0.5 w-16 bg-muted"
            aria-label={`Vòng ${t.currentRound}/${t.totalRounds}`}
          />
        </div>
      </div>

      {/* Actions */}
      <div className="flex items-center gap-1.5 border-l border-border bg-muted/10 px-3">
        {primaryQuickAction && !isCancelled ? (
          <Tooltip>
            <TooltipTrigger asChild>
              <Button
                size="sm"
                variant="outline"
                onClick={(e) => {
                  e.stopPropagation();
                  primaryQuickAction.onClick();
                }}
                className="h-9 gap-1 rounded-md px-2.5 text-xs font-semibold"
              >
                <primaryQuickAction.icon className="size-3.5" />
                <span className="hidden sm:inline">
                  {primaryQuickAction.label}
                </span>
              </Button>
            </TooltipTrigger>
            <TooltipContent side="bottom">
              {primaryQuickAction.label}
            </TooltipContent>
          </Tooltip>
        ) : null}

        {isActive ? (
          <span className="inline-flex h-9 items-center gap-1 rounded-md bg-primary/10 px-2.5 text-xs font-semibold text-primary">
            <CheckCircle2 className="size-3.5" />
            Đang vận hành
          </span>
        ) : (
          <Button
            size="sm"
            variant={isCancelled ? "ghost" : "default"}
            disabled={isCancelled}
            onClick={(e) => {
              e.stopPropagation();
              onSelect(t);
            }}
            className={cn(
              "h-9 rounded-md px-3 text-xs font-semibold",
            )}
          >
            Chọn
          </Button>
        )}

        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button
              variant="ghost"
              size="icon"
              onClick={(e) => e.stopPropagation()}
              aria-label="Thêm thao tác"
              className="size-9 rounded-md text-muted-foreground hover:bg-muted hover:text-foreground"
            >
              <MoreHorizontal className="size-4" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent
            align="end"
            sideOffset={4}
            className="w-56"
          >
            <DropdownMenuLabel className="text-xs">
              Thao tác nhanh
            </DropdownMenuLabel>
            {onViewDetails && (
              <DropdownMenuItem
                onClick={() => onViewDetails(t)}
                className="text-xs"
              >
                <Eye className="size-3.5" /> Xem chi tiết
              </DropdownMenuItem>
            )}
            <DropdownMenuItem
              onClick={() => copyToClipboard(t.id)}
              className="text-xs"
            >
              <Copy className="size-3.5" /> Sao chép ID
            </DropdownMenuItem>

            <DropdownMenuSeparator />

            {t.status === "Draft" && onOpenRegistration && (
              <DropdownMenuItem
                onClick={() => onOpenRegistration(t.id)}
                className="text-xs"
              >
                <Power className="size-3.5" /> Mở đăng ký
              </DropdownMenuItem>
            )}
            {t.status === "Draft" && onEditTournament && (
              <DropdownMenuItem
                onClick={() => onEditTournament(t)}
                className="text-xs"
              >
                <Pencil className="size-3.5" /> Chỉnh sửa
              </DropdownMenuItem>
            )}

            {t.status === "RegistrationOpen" && onCloseRegistration && (
              <DropdownMenuItem
                onClick={() => onCloseRegistration(t.id)}
                className="text-xs"
              >
                <Clock4 className="size-3.5" /> Đóng đăng ký
              </DropdownMenuItem>
            )}

            {t.status === "RegistrationClosed" && onStartTournament && (
              <DropdownMenuItem
                onClick={() => onStartTournament(t.id)}
                className="text-xs font-semibold text-primary"
              >
                <Swords className="size-3.5" /> Bắt đầu giải
              </DropdownMenuItem>
            )}

            {t.status === "OnGoing" && onAdvanceRound && (
              <DropdownMenuItem
                onClick={() => onAdvanceRound(t.id)}
                className="text-xs"
              >
                <Trophy className="size-3.5" /> Chuyển vòng tiếp
              </DropdownMenuItem>
            )}
            {t.status === "OnGoing" && (
              <DropdownMenuItem
                onClick={() => onSelect(t)}
                className="text-xs"
              >
                <Users className="size-3.5" /> Mở roster
              </DropdownMenuItem>
            )}

            {t.status === "Completed" && onViewPodium && (
              <DropdownMenuItem
                onClick={() => onViewPodium(t)}
                className="text-xs"
              >
                <Trophy className="size-3.5" /> Xem bảng vinh danh
              </DropdownMenuItem>
            )}

            {t.status === "Cancelled" && (
              <DropdownMenuItem className="text-xs" disabled>
                <XCircle className="size-3.5" /> Đã huỷ
                {t.cancellationReason && (
                  <span className="ml-auto text-[10px] text-muted-foreground">
                    {t.cancellationReason.slice(0, 24)}
                    {t.cancellationReason.length > 24 ? "…" : ""}
                  </span>
                )}
              </DropdownMenuItem>
            )}

            {t.status !== "OnGoing" &&
              t.status !== "Completed" &&
              t.status !== "Cancelled" &&
              onCancelTournament && (
                <>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem
                    onClick={() => onCancelTournament(t.id)}
                    className="text-xs text-destructive focus:bg-destructive/10 focus:text-destructive"
                  >
                    <XCircle className="size-3.5" /> Hủy giải
                  </DropdownMenuItem>
                </>
              )}
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Empty state
// ---------------------------------------------------------------------------

function EmptyState() {
  return (
    <div className="flex h-[160px] flex-col items-center justify-center gap-2 rounded-xl border border-dashed border-border bg-muted/20 px-6 text-center">
      <Trophy className="size-7 text-muted-foreground/50" />
      <p className="text-sm font-medium text-foreground">
        Chưa có giải đấu nào
      </p>
      <p className="max-w-sm text-xs text-muted-foreground">
        Bấm <strong className="text-foreground">Tạo giải mới</strong> ở góc
        trên để bắt đầu giải đầu tiên của chi nhánh.
      </p>
    </div>
  );
}

function RowSkeleton() {
  return (
    <li aria-hidden="true">
      <div className="flex h-16 animate-pulse items-center gap-4 rounded-xl border border-border bg-card px-4">
        <div className="h-5 w-20 rounded-full bg-muted" />
        <div className="flex-1 space-y-1.5">
          <div className="h-3.5 w-40 rounded bg-muted" />
          <div className="h-2.5 w-24 rounded bg-muted" />
        </div>
        <div className="hidden h-6 w-24 rounded bg-muted md:block" />
        <div className="hidden h-6 w-20 rounded bg-muted lg:block" />
        <div className="h-8 w-14 rounded-lg bg-muted" />
        <div className="h-8 w-8 rounded-lg bg-muted" />
      </div>
    </li>
  );
}

// ---------------------------------------------------------------------------
// Utils
// ---------------------------------------------------------------------------

function estimateRoundEndIso(t: TournamentDetail): string | null {
  if (!t.startedAt || !t.roundDurationMinutes) return null;
  const start = new Date(t.startedAt).getTime();
  if (Number.isNaN(start)) return null;
  const elapsedMinutes =
    (t.currentRound ?? 0) * (t.roundDurationMinutes ?? 0);
  return new Date(start + elapsedMinutes * 60_000).toISOString();
}

async function copyToClipboard(text: string) {
  try {
    await navigator.clipboard.writeText(text);
    toast.success("Đã sao chép ID giải đấu");
  } catch {
    toast.error("Không thể sao chép — vui lòng thử lại");
  }
}