/* eslint-disable @typescript-eslint/no-explicit-any */

function pickPositive(...values: unknown[]): number | null {
  for (const value of values) {
    const n = Number(value);
    if (Number.isFinite(n) && n > 0) return n;
  }
  return null;
}

/** Đọc min/max người từ DTO bàn, phiên, hộp game hoặc game template của BE. */
export function readPlayerRange(source: any): {
  min: number | null;
  max: number | null;
} {
  if (!source || typeof source !== "object") {
    return { min: null, max: null };
  }

  const nested =
    source.game ??
    source.Game ??
    source.gameTemplate ??
    source.GameTemplate ??
    source.template ??
    source.Template ??
    source.games?.[0] ??
    source.Games?.[0];
  const capacity =
    source.capacity ??
    source.Capacity ??
    source.playerRange ??
    source.PlayerRange ??
    nested?.capacity ??
    nested?.Capacity;

  const min = pickPositive(
    source.minPlayers,
    source.MinPlayers,
    source.minPlayerCount,
    source.MinPlayerCount,
    source.minSeatCount,
    source.MinSeatCount,
    source.minSeats,
    source.MinSeats,
    source.minimumPlayers,
    source.MinimumPlayers,
    source.minPlayer,
    source.MinPlayer,
    source.min,
    source.Min,
    capacity?.min,
    capacity?.Min,
    capacity?.minPlayers,
    nested?.minPlayers,
    nested?.MinPlayers,
    nested?.minPlayerCount,
    nested?.MinPlayerCount,
  );

  const max = pickPositive(
    source.maxPlayers,
    source.MaxPlayers,
    source.maxPlayerCount,
    source.MaxPlayerCount,
    source.maxSeatCount,
    source.MaxSeatCount,
    source.maxSeats,
    source.MaxSeats,
    source.maximumPlayers,
    source.MaximumPlayers,
    source.maxPlayer,
    source.MaxPlayer,
    source.max,
    source.Max,
    capacity?.max,
    capacity?.Max,
    capacity?.maxPlayers,
    source.seatCount,
    source.SeatCount,
    nested?.maxPlayers,
    nested?.MaxPlayers,
    nested?.maxPlayerCount,
    nested?.MaxPlayerCount,
  );

  return { min, max };
}

export function mergePlayerRange(
  ...sources: any[]
): { min: number | null; max: number | null } {
  let min: number | null = null;
  let max: number | null = null;
  for (const source of sources) {
    const range = readPlayerRange(source);
    if (min == null) min = range.min;
    if (max == null) max = range.max;
    if (min != null && max != null) break;
  }
  return { min, max };
}

export function formatPlayerRange(range: {
  min: number | null;
  max: number | null;
}): string | null {
  if (range.min != null && range.max != null) {
    return `Tối thiểu ${range.min} · Tối đa ${range.max}`;
  }
  if (range.min != null) return `Tối thiểu ${range.min}`;
  if (range.max != null) return `Tối đa ${range.max}`;
  return null;
}

export function readPresentCount(source: any): number | null {
  if (!source) return null;

  const members = Array.isArray(source.members)
    ? source.members
    : Array.isArray(source.Members)
      ? source.Members
      : null;

  // BE: host nằm ngoài `members` (hostId/hostName) — đếm cả host nếu chưa có trong list.
  if (members) {
    const hostId = String(source.hostId ?? source.HostId ?? "");
    const hostName = String(source.hostName ?? source.HostName ?? "")
      .trim()
      .toLowerCase();
    const hostAlreadyInMembers = members.some((m: any) => {
      const uid = String(m?.userId ?? m?.UserId ?? "");
      const name = String(
        m?.userName ?? m?.UserName ?? m?.username ?? "",
      )
        .trim()
        .toLowerCase();
      return (
        (hostId.length > 0 && uid === hostId) ||
        (hostName.length > 0 && name === hostName)
      );
    });
    const hasSeparateHost = hostId.length > 0 || hostName.length > 0;
    const total =
      members.length + (hasSeparateHost && !hostAlreadyInMembers ? 1 : 0);
    return pickPositive(total);
  }

  return pickPositive(
    source.presentCount,
    source.PresentCount,
    source.playerCount,
    source.PlayerCount,
  );
}
