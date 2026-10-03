/**
 * Match normalization — pure functions to coerce the various raw match
 * payloads the backend has shipped over time into a single
 * `TournamentMatchCardPlayer` shape that the UI can render uniformly.
 *
 * 3 raw shapes are supported, in priority order:
 *  1. Flat slot fields: `player1Id..player4Id`, `player1Score..`, `player1CardsBought..`
 *     plus optional `winnerPlayerId`.
 *  2. `playerIds: string[]` plus optional `scores: ParticipantScoreItem[]`.
 *  3. `players: TournamentMatchPlayer[]` (current canonical contract).
 *
 * The function prefers the most specific shape available and degrades
 * gracefully when fields are missing. The output is always 0..4 players
 * (Splendor is a 4-player game) and is safe to render without further
 * normalization.
 */

import type {
  MatchStatus,
  ParticipantScoreItem,
  TournamentMatchPlayer,
  TournamentParticipant,
} from "../types/tournament.types";

/** Initial Elo a walk-in starts with when no prior rating is known. */
export const DEFAULT_INITIAL_ELO = 1200;

/** Render-side player shape — all UI components consume this. */
export interface TournamentMatchCardPlayer {
  userId: string;
  userName: string;
  avatarUrl: string | null | undefined;
  currentElo: number;
  score: number | null;
  cardsBought: number | null;
  isWinner: boolean;
}

/**
 * Loose schema covering every shape the backend has shipped. Optional
 * fields are read defensively — missing fields yield empty players.
 * Using a single type (vs discriminated union) is intentional: the BE
 * payload is a soft contract that combines shapes, and the parser
 * gracefully degrades across the field set.
 */
export interface RawMatch {
  id?: string;
  matchNumber?: number;
  tableNumber?: number;
  tableName?: string;
  status?: MatchStatus | string;
  winnerUserId?: string | null;
  winnerPlayerId?: string | null;

  // Shape 1 — flat slot fields
  player1Id?: string | null;
  player2Id?: string | null;
  player3Id?: string | null;
  player4Id?: string | null;
  player1Score?: number | null;
  player2Score?: number | null;
  player3Score?: number | null;
  player4Score?: number | null;
  player1CardsBought?: number | null;
  player2CardsBought?: number | null;
  player3CardsBought?: number | null;
  player4CardsBought?: number | null;

  // Shape 2 — flat playerIds + scores
  playerIds?: string[];
  scores?: ParticipantScoreItem[];

  // Shape 3 — canonical players[] (current contract)
  players?: TournamentMatchPlayer[];
}

/** Pre-computed participant lookup keyed by both `userId` and `id`. */
export type ParticipantLookup = Map<string, TournamentParticipant>;

/**
 * Build a `Map<userId, participant>` so per-slot lookups are O(1) instead of
 * scanning the participants array (was O(n) per slot — see audit P0-2).
 */
export function buildParticipantLookup(
  participants: TournamentParticipant[],
): ParticipantLookup {
  const lookup = new Map<string, TournamentParticipant>();
  for (const p of participants) {
    if (p.userId) lookup.set(p.userId, p);
    if (p.id) lookup.set(p.id, p);
  }
  return lookup;
}

function resolveUserName(
  rawName: string | undefined | null,
  userId: string,
): string {
  if (rawName && rawName.trim().length > 0) return rawName;
  return `VĐV #${userId.slice(0, 4)}`;
}

function buildPlayer(
  userId: string | null | undefined,
  fallbackName: string | undefined,
  score: number | null | undefined,
  cardsBought: number | null | undefined,
  isWinner: boolean,
  lookup: ParticipantLookup,
): TournamentMatchCardPlayer | null {
  if (!userId) return null;
  const participant = lookup.get(userId);
  return {
    userId,
    userName: resolveUserName(fallbackName, userId),
    avatarUrl: participant?.avatarUrl ?? null,
    currentElo:
      participant?.currentElo ??
      participant?.initialElo ??
      DEFAULT_INITIAL_ELO,
    score: score ?? null,
    cardsBought: cardsBought ?? null,
    isWinner,
  };
}

/**
 * Normalize one raw match into the render-side card shape. Always returns
 * 0..4 players; never throws — missing fields yield a 0-player card, which
 * the UI renders as an empty slot placeholder.
 */
export function normalizeMatch(
  raw: RawMatch,
  lookup: ParticipantLookup,
): TournamentMatchCardPlayer[] {
  const winnerId = raw.winnerUserId ?? null;

  // Shape 1: flat slot fields (priority — most specific per-slot data).
  const hasFlatShape =
    raw.player1Id !== undefined ||
    raw.player2Id !== undefined ||
    raw.player3Id !== undefined ||
    raw.player4Id !== undefined;

  if (hasFlatShape) {
    const slots: Array<{
      userId: string | null | undefined;
      score: number | null | undefined;
      cardsBought: number | null | undefined;
    }> = [
      {
        userId: raw.player1Id,
        score: raw.player1Score,
        cardsBought: raw.player1CardsBought,
      },
      {
        userId: raw.player2Id,
        score: raw.player2Score,
        cardsBought: raw.player2CardsBought,
      },
      {
        userId: raw.player3Id,
        score: raw.player3Score,
        cardsBought: raw.player3CardsBought,
      },
      {
        userId: raw.player4Id,
        score: raw.player4Score,
        cardsBought: raw.player4CardsBought,
      },
    ];

    return slots
      .map((slot) =>
        buildPlayer(
          slot.userId,
          undefined,
          slot.score,
          slot.cardsBought,
          raw.winnerPlayerId === slot.userId || winnerId === slot.userId,
          lookup,
        ),
      )
      .filter((p): p is TournamentMatchCardPlayer => p !== null);
  }

  // Shape 2: flat playerIds + scores.
  if (Array.isArray(raw.playerIds) && raw.playerIds.length > 0) {
    const scoresByUser = new Map<string, ParticipantScoreItem>();
    for (const s of raw.scores ?? []) scoresByUser.set(s.userId, s);

    return raw.playerIds
      .map((userId: string) => {
        const score = scoresByUser.get(userId);
        return buildPlayer(
          userId,
          undefined,
          score?.score,
          score?.cardsBought,
          winnerId === userId,
          lookup,
        );
      })
      .filter((p): p is TournamentMatchCardPlayer => p !== null);
  }

  // Shape 3: canonical players[] (current contract).
  return (raw.players ?? [])
    .map((p) =>
      buildPlayer(
        p.userId,
        p.userName,
        p.score,
        p.cardsBought,
        p.isWinner === true || winnerId === p.userId,
        lookup,
      ),
    )
    .filter((p): p is TournamentMatchCardPlayer => p !== null);
}

/**
 * Convenience: derive the render-side status from a raw match. Defaults to
 * `Scheduled` so unknown statuses still render something.
 */
export function normalizeMatchStatus(raw: RawMatch): MatchStatus {
  return (raw.status ?? "Scheduled") as MatchStatus;
}

/**
 * Convenience: derive the display name + number for a raw match.
 */
export function normalizeMatchLabel(
  raw: RawMatch,
  fallbackIndex: number,
): { number: number; name: string } {
  const number = raw.matchNumber ?? raw.tableNumber ?? fallbackIndex + 1;
  return {
    number,
    name: raw.tableName ?? `Bàn #${number}`,
  };
}
