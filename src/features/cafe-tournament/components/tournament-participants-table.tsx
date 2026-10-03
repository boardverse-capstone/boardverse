"use client";

import { useMemo, useState } from "react";
import { TournamentParticipant } from "../types/tournament.types";
import { CancelReasonDialog } from "./cancel-reason-dialog";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";
import {
  Users,
  Search,
  CheckCircle2,
  UserX,
  ShieldAlert,
  RefreshCw,
} from "lucide-react";

interface Props {
  participants: TournamentParticipant[];
  loading: boolean;
  onCheckIn: (participantId: string) => Promise<void>;
  onNoShow: (participantId: string) => Promise<void>;
  onKick: (participantId: string, reason: string) => Promise<void>;
  actionLoadingId: string | null;
  onRefresh?: () => void;
  isTournamentCompleted?: boolean;
}

function getParticipantStatusLabel(status: string) {
  switch (status) {
    case "Active":
    case "CheckedIn":
      return "Sẵn sàng";
    case "Registered":
      return "Chưa điểm danh";
    case "NoShow":
      return "Vắng mặt";
    case "Eliminated":
      return "Đã loại";
    case "Withdrawn":
      return "Đã rời giải";
    case "Kicked":
      return "Đã xóa";
    default:
      return status;
  }
}

function getParticipantStatusBadgeClass(status: string) {
  switch (status) {
    case "Active":
    case "CheckedIn":
      return "border-emerald-200 bg-emerald-50 text-emerald-700";
    case "Registered":
      return "border-border bg-muted/60 text-muted-foreground";
    case "NoShow":
      return "border-amber-200 bg-amber-50 text-amber-700";
    case "Eliminated":
    case "Withdrawn":
    case "Kicked":
      return "border-destructive/20 bg-destructive/10 text-destructive";
    default:
      return "border-border bg-muted/60 text-muted-foreground";
  }
}

function ParticipantStatusBadge({ status }: { status: string }) {
  return (
    <Badge
      variant="outline"
      className={cn(
        "h-6 rounded-full px-2.5 text-xs font-semibold",
        getParticipantStatusBadgeClass(status),
      )}
    >
      {getParticipantStatusLabel(status)}
    </Badge>
  );
}

export function TournamentParticipantsTable({
  participants,
  loading,
  onCheckIn,
  onNoShow,
  onKick,
  actionLoadingId,
  onRefresh,
  isTournamentCompleted = false,
}: Props) {
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("ALL");
  const [kickTarget, setKickTarget] = useState<{
    id: string;
    name: string;
  } | null>(null);

  // Single pass over participants computes BOTH the filtered roster and the
  // status counts that power the filter tabs. Replaces the previous 6-array
  // filter pipeline (filteredList + 5 status counts) that re-ran on every
  // render — including every search keystroke. See audit P0-2.
  const { filteredList, filterTabs } = useMemo(() => {
    const needle = search.trim().toLowerCase();
    const counts = {
      all: participants.length,
      checkedIn: 0,
      registered: 0,
      noShow: 0,
      withdrawn: 0,
    };
    const filtered: TournamentParticipant[] = [];

    for (const p of participants) {
      const name = (p.username || "").toLowerCase();
      const status = p.status as string;

      if (status === "CheckedIn" || status === "Active") counts.checkedIn++;
      else if (status === "Registered") counts.registered++;
      else if (status === "NoShow") counts.noShow++;
      else if (
        status === "Eliminated" ||
        status === "Withdrawn" ||
        status === "Kicked"
      )
        counts.withdrawn++;

      if (needle && !name.includes(needle)) continue;

      if (statusFilter === "ALL") filtered.push(p);
      else if (statusFilter === "CheckedIn") {
        if (status === "CheckedIn" || status === "Active") filtered.push(p);
      } else if (statusFilter === "Withdrawn") {
        if (
          status === "Eliminated" ||
          status === "NoShow" ||
          status === "Withdrawn" ||
          status === "Kicked"
        ) {
          filtered.push(p);
        }
      } else if (status === statusFilter) filtered.push(p);
    }

    return {
      filteredList: filtered,
      filterTabs: [
        { id: "ALL", label: `Tất cả (${counts.all})` },
        { id: "CheckedIn", label: `Đã đến (${counts.checkedIn})` },
        { id: "Registered", label: `Chưa đến (${counts.registered})` },
        { id: "NoShow", label: `Vắng (${counts.noShow})` },
        { id: "Withdrawn", label: `Đã rời (${counts.withdrawn})` },
      ],
    };
  }, [participants, search, statusFilter]);
  const showActionColumn = !isTournamentCompleted;
  const tableColSpan = showActionColumn ? 5 : 4;

  return (
    <div className="flex flex-col overflow-hidden rounded-2xl border border-border bg-card shadow-sm">
      {/* Header */}
      <div className="flex flex-col gap-3 border-b border-border p-4">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <div className="flex size-9 items-center justify-center rounded-xl bg-primary/10 text-primary">
              <Users className="h-4 w-4" />
            </div>
            <div>
              <h3 className="text-sm font-semibold text-foreground">
                Quản lý tuyển thủ tham gia
              </h3>
              <p className="text-xs text-muted-foreground">
                {participants.length} VĐV trong danh sách giải đấu
              </p>
            </div>
          </div>

          {onRefresh && (
            <Button
              size="sm"
              variant="outline"
              onClick={onRefresh}
              disabled={loading}
              className="h-8 rounded-xl border-border px-3 text-xs font-semibold hover:bg-muted/70"
            >
              <RefreshCw
                className={cn("h-3.5 w-3.5", loading && "animate-spin")}
              />
              Làm mới
            </Button>
          )}
        </div>

        {/* Search & Tabs */}
        <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
          <div className="flex flex-wrap items-center gap-1.5">
            {filterTabs.map((tab) => (
              <button
                key={tab.id}
                type="button"
                onClick={() => setStatusFilter(tab.id)}
                className={cn(
                  "h-8 rounded-xl px-3 text-xs font-semibold transition-colors",
                  statusFilter === tab.id
                    ? "bg-primary text-primary-foreground shadow-sm"
                    : "bg-muted text-muted-foreground hover:bg-muted/80 hover:text-foreground",
                )}
              >
                {tab.label}
              </button>
            ))}
          </div>

          <div className="relative w-full lg:w-72">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              type="text"
              placeholder="Tìm theo tên tuyển thủ..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="h-10 rounded-xl border-border bg-background pl-9 text-sm shadow-sm placeholder:text-muted-foreground"
            />
          </div>
        </div>
      </div>

      {/* Danh sách dữ liệu */}
      <div className="overflow-x-auto">
        <table className="w-full text-left text-sm">
          <thead className="border-b border-border bg-muted/30 text-xs font-semibold text-muted-foreground">
            <tr>
              <th className="px-4 py-3">Tuyển thủ</th>
              <th className="px-4 py-3">Chỉ số Elo</th>
              <th className="px-4 py-3">Điểm Swiss</th>
              <th className="px-4 py-3">Trạng thái</th>
              {showActionColumn && (
                <th className="px-4 py-3 text-right">Thao tác quản trị</th>
              )}
            </tr>
          </thead>
          <tbody className="divide-y divide-border/70 text-foreground">
            {loading ? (
              <tr>
                <td
                  colSpan={tableColSpan}
                  className="px-4 py-12 text-center text-sm font-medium text-muted-foreground"
                >
                  Đang nạp danh sách tuyển thủ...
                </td>
              </tr>
            ) : filteredList.length === 0 ? (
              <tr>
                <td colSpan={tableColSpan} className="px-4 py-14">
                  <div className="mx-auto flex max-w-sm flex-col items-center text-center">
                    <div className="flex size-12 items-center justify-center rounded-full bg-muted text-muted-foreground">
                      <Users className="h-5 w-5" />
                    </div>
                    <h4 className="mt-3 text-sm font-semibold text-foreground">
                      Không tìm thấy tuyển thủ
                    </h4>
                    <p className="mt-1 text-sm text-muted-foreground">
                      Thử đổi bộ lọc hoặc từ khóa tìm kiếm để xem danh sách phù
                      hợp.
                    </p>
                    {onRefresh && (
                      <Button
                        type="button"
                        size="sm"
                        variant="outline"
                        onClick={onRefresh}
                        className="mt-4 h-8 rounded-xl border-border px-3 text-xs font-semibold"
                      >
                        <RefreshCw className="h-3.5 w-3.5" /> Làm mới danh sách
                      </Button>
                    )}
                  </div>
                </td>
              </tr>
            ) : (
              filteredList.map((p) => {
                const displayName = p.username || "VĐV";
                const isReady =
                  p.status === "CheckedIn" || p.status === "Active";
                const isOut =
                  p.status === "Eliminated" ||
                  (p.status as string) === "Withdrawn" ||
                  (p.status as string) === "Kicked";
                const isActionLoading = actionLoadingId === p.id;

                return (
                  <tr
                    key={p.id}
                    className={cn(
                      "transition-colors hover:bg-muted/30",
                      isOut && "bg-muted/30 opacity-70",
                    )}
                  >
                    {/* Tuyển thủ info */}
                    <td className="px-4 py-3.5">
                      <div className="flex items-center gap-2.5">
                        <div className="flex size-8 shrink-0 items-center justify-center rounded-full bg-primary/10 text-xs font-semibold text-primary">
                          {displayName.charAt(0).toUpperCase()}
                        </div>
                        <div>
                          <div className="text-sm font-semibold text-foreground">
                            {displayName}
                          </div>
                          <div className="font-mono text-xs text-muted-foreground">
                            #{p.userId ? p.userId.slice(0, 6) : p.id.slice(0, 6)}
                          </div>
                        </div>
                      </div>
                    </td>

                    {/* Elo */}
                    <td className="px-4 py-3.5 font-mono text-sm font-medium text-foreground">
                      {p.currentElo || p.initialElo || 1200}
                    </td>

                    {/* Điểm Swiss */}
                    <td className="px-4 py-3.5 font-mono text-sm font-semibold text-foreground">
                      {p.swissScore ?? 0}đ
                    </td>

                    {/* Trạng thái */}
                    <td className="px-4 py-3.5">
                      <ParticipantStatusBadge status={p.status} />
                    </td>

                    {/* Thao tác quản trị */}
                    {showActionColumn && (
                      <td className="px-4 py-3.5 text-right">
                        <div className="flex items-center justify-end gap-1.5">
                          {p.status === "Registered" && (
                            <>
                              <Button
                                size="sm"
                                disabled={isActionLoading}
                                onClick={() => onCheckIn(p.id)}
                                className="h-9 min-h-9 rounded-lg bg-primary px-3 text-xs font-semibold text-primary-foreground hover:bg-primary/90"
                              >
                                Check-in
                              </Button>

                              <Button
                                size="sm"
                                variant="outline"
                                disabled={isActionLoading}
                                onClick={() => onNoShow(p.id)}
                                className="h-9 min-h-9 rounded-lg border-border px-2.5 text-xs font-semibold text-foreground hover:bg-muted/70"
                                title="Đánh dấu vắng mặt"
                              >
                                <UserX className="h-3.5 w-3.5" /> Vắng mặt
                              </Button>

                              <Button
                                size="sm"
                                variant="outline"
                                disabled={isActionLoading}
                                onClick={() =>
                                  setKickTarget({
                                    id: p.id,
                                    name: displayName,
                                  })
                                }
                                className="h-9 min-h-9 rounded-lg border-destructive/30 px-2.5 text-xs font-semibold text-destructive hover:bg-destructive/5 hover:text-destructive"
                                title="Xóa VĐV khỏi giải đấu"
                              >
                                <ShieldAlert className="h-3.5 w-3.5" /> Xóa VĐV
                              </Button>
                            </>
                          )}

                          {isReady && (
                            <span className="inline-flex h-9 min-h-9 items-center gap-1 rounded-lg border border-emerald-200 bg-emerald-50 px-2.5 text-xs font-semibold text-emerald-700">
                              <CheckCircle2 className="h-3.5 w-3.5" /> Đã check-in
                            </span>
                          )}

                          {isOut && (
                            <span className="text-xs font-medium text-muted-foreground">
                              Đã loại khỏi giải
                            </span>
                          )}
                        </div>
                      </td>
                    )}
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>

      <CancelReasonDialog
        open={!!kickTarget}
        onOpenChange={(open) => {
          if (!open) setKickTarget(null);
        }}
        scope="participant"
        subjectName={kickTarget?.name}
        submitting={!!kickTarget && actionLoadingId === kickTarget.id}
        onConfirm={async (reason) => {
          if (!kickTarget) return;
          await onKick(kickTarget.id, reason);
        }}
      />
    </div>
  );
}
