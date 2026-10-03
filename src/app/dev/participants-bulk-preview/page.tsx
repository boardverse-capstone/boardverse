"use client";

import * as React from "react";
import { TournamentParticipantsTable } from "@/features/cafe-tournament/components/tournament-participants-table";
import type { TournamentParticipant } from "@/features/cafe-tournament/types/tournament.types";
import { toast } from "sonner";

/**
 * Dev-only harness cho bulk check-in. Mô phỏng danh sách VĐV với
 * mix các trạng thái (Registered / CheckedIn / NoShow / Withdrawn)
 * để Playwright có thể cover mọi flow:
 *  - chọn từng người
 *  - chọn tất cả
 *  - check-in thành công
 *  - check-in 1 phần fail (BE trả 500 cho 1 id)
 *  - selection tự dọn khi refresh
 *
 * API call được intercept ở trang này (không gọi BE thật).
 */

type BulkResponse = { ok: number; failed: string[] };

export default function ParticipantsBulkPreviewPage() {
  const [participants, setParticipants] =
    React.useState<TournamentParticipant[]>(seedParticipants);
  const [actionLoadingId, setActionLoadingId] = React.useState<string | null>(
    null,
  );
  const [bulkLoadingIds, setBulkLoadingIds] = React.useState<
    ReadonlySet<string>
  >(() => new Set());
  const [pendingFailures, setPendingFailures] = React.useState<Set<string>>(
    () => new Set(),
  );

  // Toggle id sẽ fail lần bulk kế tiếp — để test partial failure path.
  const toggleFailure = (id: string) => {
    setPendingFailures((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const onCheckIn = async (id: string) => {
    setActionLoadingId(id);
    await new Promise((r) => setTimeout(r, 200));
    setParticipants((prev) =>
      prev.map((p) => (p.id === id ? { ...p, status: "CheckedIn" } : p)),
    );
    toast.success(`Đã check-in ${id.slice(0, 6)}.`);
    setActionLoadingId(null);
  };

  const onNoShow = async (id: string) => {
    setActionLoadingId(id);
    await new Promise((r) => setTimeout(r, 200));
    setParticipants((prev) =>
      prev.map((p) => (p.id === id ? { ...p, status: "NoShow" } : p)),
    );
    toast.success(`Đã đánh dấu vắng mặt ${id.slice(0, 6)}.`);
    setActionLoadingId(null);
  };

  const onKick = async () => {
    // Không cần test sâu ở harness này
  };

  const onBulkCheckIn = async (ids: string[]): Promise<BulkResponse> => {
    setBulkLoadingIds(new Set(ids));
    await new Promise((r) => setTimeout(r, 400));
    const failed: string[] = [];
    const ok: string[] = [];
    ids.forEach((id) => {
      if (pendingFailures.has(id)) failed.push(id);
      else ok.push(id);
    });
    setParticipants((prev) =>
      prev.map((p) => (ok.includes(p.id) ? { ...p, status: "CheckedIn" } : p)),
    );
    setBulkLoadingIds(new Set());
    return { ok: ok.length, failed };
  };

  const onRefresh = () => {
    // No-op: state đã được cập nhật trực tiếp ở trên.
    toast.info("Đã làm mới.");
  };

  const reset = () => {
    setParticipants(seedParticipants);
    setPendingFailures(new Set());
    toast.info("Đã reset danh sách.");
  };

  const registeredCount = participants.filter(
    (p) => p.status === "Registered",
  ).length;

  return (
    <main
      data-testid="participants-bulk-root"
      className="min-h-screen bg-neutral-100 p-6 flex flex-col gap-4 items-center"
    >
      <header className="max-w-4xl w-full">
        <h1 className="text-lg font-black text-neutral-900">
          Bulk Check-in — Playwright preview
        </h1>
        <p className="text-xs text-neutral-600">
          Dev-only harness. Bấm checkbox từng VĐV hoặc &quot;Chọn tất cả&quot; ở
          header, rồi bấm nút xanh trên thanh floating bên dưới để
          check-in hàng loạt.
        </p>
      </header>

      <div className="max-w-4xl w-full flex flex-wrap items-center gap-2 text-[11px] font-bold">
        <span className="px-2 py-1 rounded-lg bg-emerald-50 text-emerald-800 border border-emerald-200 tabular-nums">
          Còn {registeredCount} VĐV chưa check-in
        </span>
        <button
          type="button"
          onClick={reset}
          className="px-2 py-1 rounded-lg border border-neutral-300 bg-white hover:bg-neutral-50"
          data-testid="reset-roster"
        >
          Reset danh sách
        </button>

        <div className="ml-auto flex items-center gap-2">
          <span className="text-neutral-600">Đánh dấu fail khi bulk:</span>
          {participants
            .filter((p) => p.status === "Registered")
            .map((p) => (
              <button
                key={p.id}
                type="button"
                onClick={() => toggleFailure(p.id)}
                className={
                  pendingFailures.has(p.id)
                    ? "px-2 py-1 rounded-lg border border-rose-300 bg-rose-50 text-rose-700"
                    : "px-2 py-1 rounded-lg border border-neutral-300 bg-white text-neutral-700"
                }
                data-testid={`toggle-fail-${p.id}`}
              >
                {p.username}
              </button>
            ))}
        </div>
      </div>

      <div className="max-w-4xl w-full">
        <TournamentParticipantsTable
          participants={participants}
          loading={false}
          actionLoadingId={actionLoadingId}
          bulkLoadingIds={bulkLoadingIds}
          onCheckIn={onCheckIn}
          onNoShow={onNoShow}
          onKick={onKick}
          onBulkCheckIn={onBulkCheckIn}
          onRefresh={onRefresh}
        />
      </div>
    </main>
  );
}

// ====== Seed data: 8 VĐV ở nhiều trạng thái khác nhau ======

const seedParticipants: TournamentParticipant[] = [
  mkP("p-001", "player1", "Registered"),
  mkP("p-002", "player2", "Registered"),
  mkP("p-003", "player3", "Registered"),
  mkP("p-004", "player4", "Registered"),
  mkP("p-005", "player5", "Registered"),
  mkP("p-006", "player6", "CheckedIn"),
  mkP("p-007", "player7", "NoShow"),
  mkP("p-008", "player8", "Withdrawn"),
];

function mkP(
  id: string,
  username: string,
  status: TournamentParticipant["status"],
): TournamentParticipant {
  return {
    id,
    tournamentId: "t-1",
    userId: `u-${id}`,
    username,
    avatarUrl: null,
    walkInDisplayName: null,
    walkInPhoneNumber: null,
    isWalkIn: false,
    joinedRoundNumber: 1,
    registeredAt: "2026-10-01T00:00:00Z",
    karmaAtRegistration: 100,
    checkedInAt: null,
    checkedInByStaffId: null,
    registeredByStaffId: null,
    status,
    swissScore: 0,
    totalPrestigePoints: 0,
    totalCardsBought: 0,
    finalRank: null,
    initialElo: 1200,
    currentElo: 1200,
    eloDelta: 0,
    finalElo: 1200,
    swissWins: 0,
    swissDraws: 0,
    swissLosses: 0,
    isWaitlisted: false,
    waitlistPosition: null,
  };
}
