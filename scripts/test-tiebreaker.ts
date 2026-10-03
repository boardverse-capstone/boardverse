/**
 * Splendor tiebreaker test runner.
 *
 * Runs against the pure module `src/features/cafe-tournament/lib/tiebreaker.ts`
 * so we can verify the chain matches the rules in the spec without booting
 * the React app. Invoke with:
 *
 *   npx tsx scripts/test-tiebreaker.ts
 *
 * Exit code 0 = all green; non-zero = at least one assertion failed.
 */

import {
  compareTiebreakers,
  pickWinner,
  sortByTiebreakers,
  TiebreakerStats,
  ResolvedTournamentResult,
} from "../src/features/cafe-tournament/lib/tiebreaker";

type Player = { userId: string; userName: string };

let passed = 0;
let failed = 0;
const failures: string[] = [];

function assert(label: string, actual: unknown, expected: unknown) {
  const ok =
    Array.isArray(expected) && Array.isArray(actual)
      ? expected.length === actual.length &&
        expected.every((v, i) => v === actual[i])
      : actual === expected;

  if (ok) {
    passed += 1;
    console.log(`  \u2713 ${label}`);
  } else {
    failed += 1;
    const msg = `  \u2717 ${label}\n      actual:   ${JSON.stringify(actual)}\n      expected: ${JSON.stringify(expected)}`;
    failures.push(msg);
    console.log(msg);
  }
}

function makeStats(
  prestigeScore: number,
  cardsBought: number,
  nobleCards = 0,
  gemsRemaining = 0,
): TiebreakerStats {
  return { prestigeScore, cardsBought, nobleCards, gemsRemaining };
}

function makeResolved(
  userId: string,
  prestigeScore: number,
  cardsBought: number,
  nobleCards = 0,
  gemsRemaining = 0,
): ResolvedTournamentResult {
  return { userId, prestigeScore, cardsBought, nobleCards, gemsRemaining };
}

console.log("\n=== Splendor tiebreaker — compareTiebreakers ===\n");

// Rule 1: Higher prestige wins.
assert(
  "R1: prestige 20 beats prestige 15",
  compareTiebreakers(
    makeResolved("A", 20, 10, 0, 0),
    makeResolved("B", 15, 10, 0, 0),
  ) < 0,
  true,
);

assert(
  "R1: prestige 10 loses to prestige 15",
  compareTiebreakers(
    makeResolved("A", 10, 10, 0, 0),
    makeResolved("B", 15, 10, 0, 0),
  ) > 0,
  true,
);

// Rule 2: tied prestige → FEWER cards wins.
assert(
  "R2: tied prestige 20, fewer cards (8) beats more cards (12)",
  compareTiebreakers(
    makeResolved("A", 20, 8, 0, 0),
    makeResolved("B", 20, 12, 0, 0),
  ) < 0,
  true,
);

assert(
  "R2: tied prestige 20, more cards (15) loses to fewer (10)",
  compareTiebreakers(
    makeResolved("A", 20, 15, 0, 0),
    makeResolved("B", 20, 10, 0, 0),
  ) > 0,
  true,
);

// Rule 3: tied prestige + tied cards → MORE nobles wins.
assert(
  "R3: tied 20pts/10cards, more nobles (2) beats fewer (0)",
  compareTiebreakers(
    makeResolved("A", 20, 10, 2, 0),
    makeResolved("B", 20, 10, 0, 0),
  ) < 0,
  true,
);

// Rule 4: tied through R3 → MORE remaining gems wins.
assert(
  "R4: tied through R3, more gems (8) beats fewer (3)",
  compareTiebreakers(
    makeResolved("A", 20, 10, 1, 8),
    makeResolved("B", 20, 10, 1, 3),
  ) < 0,
  true,
);

// Rule 5: fully tied → defer (return 0).
assert(
  "R5: fully tied returns 0 (backend decides)",
  compareTiebreakers(
    makeResolved("A", 20, 10, 1, 5),
    makeResolved("B", 20, 10, 1, 5),
  ),
  0,
);

// Rule ordering: prestige dominates over cards even when A has MORE cards.
assert(
  "Order: prestige dominates cards (high score + many cards still beats low score + few cards)",
  compareTiebreakers(
    makeResolved("A", 25, 15, 0, 0),
    makeResolved("B", 20, 5, 0, 0),
  ) < 0,
  true,
);

// Rule ordering: cards dominates nobles.
assert(
  "Order: cards dominates nobles (fewer cards + 0 nobles beats many cards + 3 nobles at same prestige)",
  compareTiebreakers(
    makeResolved("A", 20, 5, 0, 0),
    makeResolved("B", 20, 12, 3, 0),
  ) < 0,
  true,
);

// Rule ordering: nobles dominates gems.
assert(
  "Order: nobles dominates gems (0 nobles + 30 gems loses to 3 nobles + 0 gems)",
  compareTiebreakers(
    makeResolved("A", 20, 10, 0, 30),
    makeResolved("B", 20, 10, 3, 0),
  ) > 0,
  true,
);

console.log("\n=== Splendor tiebreaker — sortByTiebreakers ===\n");

const ROSTER: Player[] = [
  { userId: "alice", userName: "Alice" },
  { userId: "bob", userName: "Bob" },
  { userId: "carol", userName: "Carol" },
  { userId: "dave", userName: "Dave" },
];

// Case A: clear winner by prestige.
{
  const stats: Record<string, TiebreakerStats> = {
    alice: makeStats(15, 10),
    bob: makeStats(22, 10),
    carol: makeStats(18, 10),
    dave: makeStats(15, 10),
  };
  const ranked = sortByTiebreakers(ROSTER, stats).map((p) => p.userId);
  assert(
    "A.1 highest prestige (Bob=22) wins",
    ranked[0],
    "bob",
  );
  assert(
    "A.2 ranking top-to-bottom respects prestige desc",
    ranked,
    ["bob", "carol", "alice", "dave"],
  );
}

// Case B: tied prestige → fewer cards wins.
{
  const stats: Record<string, TiebreakerStats> = {
    alice: makeStats(20, 10),
    bob: makeStats(20, 14),
    carol: makeStats(20, 8), // fewer cards
    dave: makeStats(20, 12),
  };
  const ranked = sortByTiebreakers(ROSTER, stats).map((p) => p.userId);
  assert(
    "B.1 tied at 20pts → Carol (8 cards) wins over Bob (14)",
    ranked[0],
    "carol",
  );
  assert(
    "B.2 ranking (asc cards): Carol, Alice, Dave, Bob",
    ranked,
    ["carol", "alice", "dave", "bob"],
  );
}

// Case C: tied prestige + tied cards → more nobles wins.
{
  const stats: Record<string, TiebreakerStats> = {
    alice: makeStats(20, 10, 1, 0),
    bob: makeStats(20, 10, 3, 0), // most nobles
    carol: makeStats(20, 10, 0, 0),
    dave: makeStats(20, 10, 2, 0),
  };
  const ranked = sortByTiebreakers(ROSTER, stats).map((p) => p.userId);
  assert(
    "C.1 tied at 20/10 → Bob (3 nobles) wins",
    ranked[0],
    "bob",
  );
  assert(
    "C.2 ranking (desc nobles): Bob, Dave, Alice, Carol",
    ranked,
    ["bob", "dave", "alice", "carol"],
  );
}

// Case D: full tiebreak chain — different gems decide.
{
  const stats: Record<string, TiebreakerStats> = {
    alice: makeStats(20, 10, 1, 5),
    bob: makeStats(20, 10, 1, 8), // more gems
    carol: makeStats(20, 10, 1, 0),
    dave: makeStats(20, 10, 1, 2),
  };
  const ranked = sortByTiebreakers(ROSTER, stats).map((p) => p.userId);
  assert(
    "D.1 tied through 3 rules → Bob (8 gems) wins",
    ranked[0],
    "bob",
  );
  assert(
    "D.2 ranking (desc gems): Bob, Alice, Dave, Carol",
    ranked,
    ["bob", "alice", "dave", "carol"],
  );
}

// Case E: completely tied stats → order falls back to input order (stable sort).
{
  const stats: Record<string, TiebreakerStats> = {
    alice: makeStats(20, 10, 1, 5),
    bob: makeStats(20, 10, 1, 5),
    carol: makeStats(20, 10, 1, 5),
    dave: makeStats(20, 10, 1, 5),
  };
  const ranked = sortByTiebreakers(ROSTER, stats).map((p) => p.userId);
  assert(
    "E.1 full tie keeps input order (stable sort)",
    ranked,
    ["alice", "bob", "carol", "dave"],
  );
  assert(
    "E.2 pickWinner falls back to first listed user",
    pickWinner(ROSTER, stats),
    "alice",
  );
}

// Case F: missing stats treated as all-zeros.
{
  const stats: Record<string, TiebreakerStats> = {
    alice: makeStats(0, 0, 0, 0),
    // bob, carol, dave intentionally missing
  };
  const ranked = sortByTiebreakers(ROSTER, stats).map((p) => p.userId);
  assert(
    "F.1 missing stats fall back to zero → fully tied → input order wins (alice first)",
    ranked[0],
    "alice",
  );
  assert(
    "F.2 pickWinner on all-zero table returns the first listed user (alice)",
    pickWinner(ROSTER, stats),
    "alice",
  );
}

// Case F2: Alice has 1 point, others missing → Alice is uniquely ahead.
{
  const stats: Record<string, TiebreakerStats> = {
    alice: makeStats(1, 0, 0, 0),
    // bob, carol, dave missing → treated as 0
  };
  const ranked = sortByTiebreakers(ROSTER, stats).map((p) => p.userId);
  assert(
    "F2.1 non-zero player beats missing-stats players",
    ranked[0],
    "alice",
  );
  assert(
    "F2.2 missing-stats players fall to the bottom in input order",
    ranked,
    ["alice", "bob", "carol", "dave"],
  );
}

// Case G: real-world scenario from the spec example payload (all four
// players report the SAME numbers → backend should decide).
{
  const stats: Record<string, TiebreakerStats> = {
    alice: makeStats(30, 50, 10, 100),
    bob: makeStats(30, 50, 10, 100),
    carol: makeStats(30, 50, 10, 100),
    dave: makeStats(30, 50, 10, 100),
  };
  assert(
    "G.1 spec payload tie → pickWinner is input-order first",
    pickWinner(ROSTER, stats),
    "alice",
  );
}

console.log("\n=== Summary ===");
console.log(`  passed: ${passed}`);
console.log(`  failed: ${failed}`);
if (failed > 0) {
  console.log("\nFailures:");
  for (const m of failures) console.log(m);
  process.exit(1);
} else {
  console.log("\nAll tiebreaker assertions green.\n");
}