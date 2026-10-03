/**
 * Splendor Tournament Tiebreakers
 * --------------------------------
 * Pure, side-effect-free helpers used by the POS match-result modal
 * (and re-used by Node test scripts) to compute a stable ranking
 * consistent with the tournament's documented rule set:
 *
 *   1) Highest Prestige Points (Điểm uy tín) wins
 *   2) Tie on Prestige → FEWER development cards wins
 *      (Người chơi sở hữu ít thẻ phát triển nhất)
 *   3) Still tied → MORE Noble tiles wins
 *      (Người chơi sở hữu nhiều thẻ Quý tộc nhất)
 *   4) Still tied → MORE remaining gems wins
 *      (Người chơi còn lại nhiều viên đá quý nhất)
 *   5) Still tied → EARLIER turn order wins
 *      (Người chơi có thứ tự lượt đi sau hơn thua)
 *
 * Everything is a pure function of its inputs; no React, no DOM.
 */

export interface TiebreakerPlayer {
  /** Required: stable user id used as the canonical key. */
  userId: string;
  /** Convenience display field — kept here so test fixtures stay simple. */
  userName?: string;
}

export interface TiebreakerStats {
  prestigeScore: number;
  cardsBought: number;
  nobleCards: number;
  gemsRemaining: number;
  /** Thứ tự lượt đi: 1 = đi đầu, 2 = thứ hai, … càng lớn càng đi sau. */
  turnOrder?: number;
}

export interface ResolvedTournamentResult extends TiebreakerStats {
  userId: string;
}

/**
 * Compare two players using the documented tiebreaker chain.
 * Returns negative if A should rank ahead of B, positive if B ahead, 0 if tied.
 *
 * The chain matches the rules sent by the spec:
 *   1. prestigeScore desc (higher wins)
 *   2. cardsBought asc  (fewer cards wins)
 *   3. nobleCards desc  (more nobles wins)
 *   4. gemsRemaining desc (more leftover gems wins)
 *   5. turnOrder asc    (earlier turn wins; missing → treated as last)
 */
export function compareTiebreakers(
  a: ResolvedTournamentResult,
  b: ResolvedTournamentResult,
): number {
  // 1) Prestige Points - higher wins
  if (b.prestigeScore !== a.prestigeScore) {
    return b.prestigeScore - a.prestigeScore;
  }

  // 2) Fewer development cards wins
  if (a.cardsBought !== b.cardsBought) {
    return a.cardsBought - b.cardsBought;
  }

  // 3) More Noble tiles wins
  if (b.nobleCards !== a.nobleCards) {
    return b.nobleCards - a.nobleCards;
  }

  // 4) More remaining gems wins
  if (b.gemsRemaining !== a.gemsRemaining) {
    return b.gemsRemaining - a.gemsRemaining;
  }

  // 5) Earlier turn order wins; missing values are treated as "after
  //    everyone else" so the modal can leave the field empty until
  //    the staff records it. This keeps backward compatibility with
  //    payloads that only ship the first four stats.
  const aTurn = a.turnOrder ?? Number.POSITIVE_INFINITY;
  const bTurn = b.turnOrder ?? Number.POSITIVE_INFINITY;
  if (aTurn !== bTurn) {
    return aTurn - bTurn;
  }

  return 0;
}

/**
 * Sort an arbitrary list of players, given a stats lookup keyed by userId.
 *
 * - Players without stats are treated as all-zeros.
 * - Unknown userIds are silently ignored (the caller decides what to do).
 * - The returned array is a new array; the input is not mutated.
 */
export function sortByTiebreakers<T extends TiebreakerPlayer>(
  players: readonly T[],
  stats: Readonly<Record<string, TiebreakerStats | undefined>>,
): T[] {
  const decorated = players.map((p) => {
    const s = stats[p.userId];
    return {
      player: p,
      resolved: {
        userId: p.userId,
        prestigeScore: s?.prestigeScore ?? 0,
        cardsBought: s?.cardsBought ?? 0,
        nobleCards: s?.nobleCards ?? 0,
        gemsRemaining: s?.gemsRemaining ?? 0,
        turnOrder: s?.turnOrder,
      } satisfies ResolvedTournamentResult,
    };
  });

  decorated.sort((a, b) => compareTiebreakers(a.resolved, b.resolved));

  return decorated.map((d) => d.player);
}

/**
 * Convenience: returns the winner userId for a table, or null if the table
 * is empty. This is the single source of truth used by the modal's submit
 * handler and the test runner.
 */
export function pickWinner<T extends TiebreakerPlayer>(
  players: readonly T[],
  stats: Readonly<Record<string, TiebreakerStats | undefined>>,
): string | null {
  const ranked = sortByTiebreakers(players, stats);
  return ranked[0]?.userId ?? null;
}