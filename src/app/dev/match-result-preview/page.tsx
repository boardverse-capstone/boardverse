/* eslint-disable @typescript-eslint/no-explicit-any */
"use client";

/**
 * Dev-only preview harness for Playwright E2E tests.
 *
 * Mounts <MatchResultModal /> with up to 4 player names that the user
 * (or the test) types into the form on this page. The toolbar of
 * "preset scenarios" below the form applies a tiebreaker scenario
 * without anyone having to fill in 4×4=16 numeric inputs by hand.
 *
 * Tests in tests/match-result.spec.ts mock the
 * `/api/v1/pos/tournaments/.../result` endpoint with page.route() and
 * then drive the modal — either by typing names + clicking a preset,
 * or by filling individual inputs via the data-testid hooks.
 *
 * Rendered ONLY when NODE_ENV !== "production".
 */

import { useMemo, useState } from "react";
import { MatchResultModal } from "@/features/cafe-tournament/components/match-result-modal";
import {
  DevPresetScenario,
  DevPresetOverrides,
} from "@/features/cafe-tournament/components/match-result-modal";
import {
  TournamentMatch,
  RecordMatchResultDto,
} from "@/features/cafe-tournament/types/tournament.types";

if (process.env.NODE_ENV === "production") {
  throw new Error(
    "MatchResultPreviewPage must not be reachable in production builds.",
  );
}

const MATCH_ID = "match-1d4f";

type PlayerSlot = { name: string };

const DEFAULT_SLOTS: PlayerSlot[] = [
  { name: "Alice" },
  { name: "Bob" },
  { name: "Carol" },
  { name: "Dave" },
];

const DEFAULT_STATS = {
  prestigeScore: 15,
  cardsBought: 10,
  nobleCards: 0,
  gemsRemaining: 0,
  turnOrder: 1,
};

/**
 * Per-scenario win-target index. The toolbar uses the player list as the
 * roster, so the "winner" of each scenario is always whichever player
 * sits at the given slot index. This keeps the keys 100% data-driven —
 * no hard-coded userIds in the source.
 */
/**
 * Per-scenario win-target index. The toolbar uses the player list as the
 * roster, so the "winner" of each scenario is always whichever player
 * sits at the given slot index. This keeps the keys 100% data-driven —
 * no hard-coded userIds in the source.
 */
const SCENARIOS: DevPresetScenario[] = [
  {
    testId: "scenario-r1",
    label: "R1 — Điểm cao thắng (P1)",
    overrides: [
      { prestigeScore: 15, cardsBought: 11, nobleCards: 2, gemsRemaining: 6 },
      { prestigeScore: 14, cardsBought: 9, nobleCards: 1, gemsRemaining: 4 },
      { prestigeScore: 12, cardsBought: 8 },
      { prestigeScore: 13, cardsBought: 10, nobleCards: 1, gemsRemaining: 5 },
    ],
  },
  {
    testId: "scenario-r2",
    label: "R2 — Ít thẻ thắng (P2)",
    overrides: [
      { prestigeScore: 15, cardsBought: 12 },
      { prestigeScore: 15, cardsBought: 8 },
      { prestigeScore: 15, cardsBought: 10 },
      { prestigeScore: 15, cardsBought: 14 },
    ],
  },
  {
    testId: "scenario-r3",
    label: "R3 — Quý tộc nhiều thắng (P2)",
    overrides: [
      { prestigeScore: 15, cardsBought: 10, nobleCards: 1 },
      { prestigeScore: 15, cardsBought: 10, nobleCards: 3 },
      { prestigeScore: 15, cardsBought: 10, nobleCards: 0 },
      { prestigeScore: 15, cardsBought: 10, nobleCards: 2 },
    ],
  },
  {
    testId: "scenario-r4",
    label: "R4 — Đá quý nhiều thắng (P2)",
    overrides: [
      { prestigeScore: 15, cardsBought: 10, nobleCards: 1, gemsRemaining: 5 },
      { prestigeScore: 15, cardsBought: 10, nobleCards: 1, gemsRemaining: 8 },
      { prestigeScore: 15, cardsBought: 10, nobleCards: 1, gemsRemaining: 0 },
      { prestigeScore: 15, cardsBought: 10, nobleCards: 1, gemsRemaining: 2 },
    ],
  },
  {
    testId: "scenario-r5",
    label: "R5 — Lượt đi sau thua (P1 thắng)",
    overrides: [
      { prestigeScore: 15, cardsBought: 10, nobleCards: 1, gemsRemaining: 5 },
      { prestigeScore: 15, cardsBought: 10, nobleCards: 1, gemsRemaining: 5 },
      { prestigeScore: 15, cardsBought: 10, nobleCards: 1, gemsRemaining: 5 },
      { prestigeScore: 15, cardsBought: 10, nobleCards: 1, gemsRemaining: 5 },
    ],
  },
  {
    testId: "scenario-tie",
    label: "Full tie (P1 mặc định)",
    overrides: [null, null, null, null],
  },
];

export default function MatchResultPreviewPage() {
  const [slots, setSlots] = useState<PlayerSlot[]>(DEFAULT_SLOTS);
  const [isOpen, setIsOpen] = useState(true);
  const [lastSubmitted, setLastSubmitted] = useState<RecordMatchResultDto | null>(
    null,
  );
  const [submitError, setSubmitError] = useState<string | null>(null);
  // Bumping this counter forces <MatchResultModal key=…/> to remount and
  // re-initialize its internal state from the new match.players payload.
  const [matchSeed, setMatchSeed] = useState(0);

  /**
   * Players are the source of truth for the modal. The user can edit the
   * four name fields here, then press a scenario button — that calls
   * `applyScenario`, which mutates a hidden `initialStats` payload on
   * each player, bumps the seed, and the modal remounts with the new
   * defaults.
   *
   * The `score`, `cardsBought`, `nobleCards`, `gemsRemaining` fields are
   * read by the modal's `useState` initializer, so changing them and
   * remounting is enough — no imperative API needed.
   */
  const [initialStats, setInitialStats] = useState<
    Array<{
      prestigeScore: number;
      cardsBought: number;
      nobleCards: number;
      gemsRemaining: number;
      turnOrder: number;
    }>
  >(() => slots.map((_, idx) => ({ ...DEFAULT_STATS, turnOrder: idx + 1 })));

  const match: TournamentMatch = useMemo(() => {
    return {
      id: MATCH_ID,
      roundNumber: 1,
      tableNumber: 1,
      tableName: "Bàn #1",
      status: "InProgress" as any,
      players: slots.map((slot, idx) => ({
        userId: `slot-${idx}`,
        userName: slot.name || `Player ${idx + 1}`,
        score: initialStats[idx]?.prestigeScore,
        cardsBought: initialStats[idx]?.cardsBought,
        nobleCards: initialStats[idx]?.nobleCards,
        gemsRemaining: initialStats[idx]?.gemsRemaining,
        turnOrder: initialStats[idx]?.turnOrder,
      })) as any,
      notes: null,
    };
    // We intentionally key on matchSeed so the memo re-evaluates after a
    // scenario remount.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [slots, matchSeed, initialStats]);

  const applyScenario = (overrides: DevPresetOverrides) => {
    const nextStats = overrides.map((override, idx) => {
      if (!override) return { ...DEFAULT_STATS, turnOrder: idx + 1 };
      return { ...DEFAULT_STATS, turnOrder: idx + 1, ...override };
    });
    setInitialStats(nextStats);
    setMatchSeed((s) => s + 1);
  };

  const handleSave = async (dto: RecordMatchResultDto): Promise<boolean> => {
    setSubmitError(null);
    try {
      const res = await fetch(
        `/api/v1/pos/tournaments/matches/${MATCH_ID}/result`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(dto),
        },
      );

      if (!res.ok) {
        setSubmitError(`HTTP ${res.status}`);
        return false;
      }

      setLastSubmitted(dto);
      return true;
    } catch (err) {
      setSubmitError((err as Error).message);
      return false;
    }
  };

  const handleCancelMatch = async (
    _matchId: string,
    reason: string,
  ): Promise<boolean> => {
    try {
      const res = await fetch(
        `/api/v1/pos/tournaments/matches/${MATCH_ID}/cancel`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ reason }),
        },
      );
      if (!res.ok) {
        setSubmitError(`HTTP ${res.status}`);
        return false;
      }
      return true;
    } catch (err) {
      setSubmitError((err as Error).message);
      return false;
    }
  };

  const updateSlot = (idx: number, name: string) => {
    setSlots((prev) => {
      const next = [...prev];
      next[idx] = { name };
      return next;
    });
    setMatchSeed((s) => s + 1);
  };

  return (
    <main
      data-testid="match-result-preview-root"
      className="min-h-screen bg-neutral-100 p-8"
    >
      <header className="mx-auto mb-6 max-w-2xl">
        <h1 className="text-lg font-black text-neutral-900">
          Match Result Modal — Playwright preview
        </h1>
        <p className="text-xs text-neutral-600">
          Dev-only harness. Sửa tên 4 tuyển thủ rồi bấm preset để áp dụng
          nhanh 1 kịch bản tiebreaker. Không cần nhập tay 16 ô số.
        </p>
      </header>

      <section
        data-testid="player-roster"
        className="mx-auto mb-4 grid max-w-2xl grid-cols-2 gap-2 rounded-2xl border border-neutral-200 bg-white p-3"
      >
        {slots.map((slot, idx) => (
          <label
            key={idx}
            className="flex items-center gap-2 text-[11px] font-bold text-neutral-700"
          >
            <span className="w-12 shrink-0 text-neutral-500">
              P{idx + 1}
            </span>
            <input
              type="text"
              data-testid={`roster-name-${idx}`}
              value={slot.name}
              onChange={(e) => updateSlot(idx, e.target.value)}
              placeholder={`Tuyển thủ ${idx + 1}`}
              className="w-full rounded-lg border border-neutral-200 bg-neutral-50 px-2 py-1.5 text-xs font-bold text-neutral-900 outline-none focus:border-indigo-400"
            />
          </label>
        ))}
      </section>

      <div className="mx-auto flex max-w-2xl flex-col gap-3">
        {lastSubmitted && (
          <pre
            data-testid="last-payload"
            className="overflow-x-auto rounded-2xl border border-emerald-200 bg-emerald-50 p-3 text-[11px] font-mono text-emerald-950"
          >
            {JSON.stringify(lastSubmitted, null, 2)}
          </pre>
        )}

        {submitError && (
          <p
            data-testid="submit-error"
            className="rounded-2xl border border-rose-200 bg-rose-50 p-3 text-[11px] font-bold text-rose-900"
          >
            Submit error: {submitError}
          </p>
        )}
      </div>

      <MatchResultModal
        key={matchSeed}
        isOpen={isOpen}
        onClose={() => setIsOpen(false)}
        match={match}
        staffId="staff-test"
        onSaveResult={handleSave}
        onCancelMatch={handleCancelMatch}
        devPresetScenarios={SCENARIOS}
        devApplyPreset={applyScenario}
      />
    </main>
  );
}