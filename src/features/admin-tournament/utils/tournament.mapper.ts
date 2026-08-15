import type { PaginatedResponse } from '@/shared/types/pagination.interface';
import type {
  AdminTournament,
  AdminTournamentDetail,
  AdminTournamentListParams,
  RawAdminTournament,
  RawAdminTournamentListResponse,
  RawTournamentParticipant,
  RawTournamentParticipantsResponse,
  TournamentParticipant,
  TournamentParticipantsResponse,
  TournamentStatus,
} from '../types/tournament.interface';

function pickString(...values: (string | null | undefined)[]): string {
  for (const value of values) {
    if (typeof value === 'string' && value.trim()) return value.trim();
  }
  return '';
}

function pickNullableString(...values: (string | null | undefined)[]): string | null {
  for (const value of values) {
    if (value == null) continue;
    if (typeof value === 'string') {
      const trimmed = value.trim();
      if (trimmed) return trimmed;
    }
  }
  return null;
}

function pickNumber(...values: (number | null | undefined)[]): number {
  for (const value of values) {
    if (typeof value === 'number' && !Number.isNaN(value)) return value;
  }
  return 0;
}

function pickNullableNumber(...values: (number | null | undefined)[]): number | null {
  for (const value of values) {
    if (typeof value === 'number' && !Number.isNaN(value)) return value;
  }
  return null;
}

export const TOURNAMENT_STATUS_LABELS: Record<string, string> = {
  Draft: 'Nháp',
  RegistrationOpen: 'Đang mở ĐK',
  RegistrationClosed: 'Đã đóng ĐK',
  OnGoing: 'Đang diễn ra',
  Completed: 'Hoàn thành',
  Cancelled: 'Đã hủy',
};

export const PARTICIPANT_STATUS_LABELS: Record<string, string> = {
  Registered: 'Đã đăng ký',
  CheckedIn: 'Đã check-in',
  Withdrawn: 'Đã rút',
  NoShow: 'Vắng mặt',
};

export function tournamentStatusLabel(status: string): string {
  return TOURNAMENT_STATUS_LABELS[status] ?? status;
}

export function participantStatusLabel(status: string): string {
  return PARTICIPANT_STATUS_LABELS[status] ?? status;
}

export function mapApiAdminTournament(raw: RawAdminTournament): AdminTournament {
  return {
    id: pickString(raw.id, raw.Id),
    cafeId: pickString(raw.cafeId, raw.CafeId),
    cafeName: pickString(raw.cafeName, raw.CafeName) || '—',
    gameTemplateId: pickString(raw.gameTemplateId, raw.GameTemplateId),
    gameName: pickString(raw.gameName, raw.GameName) || '—',
    name: pickString(raw.name, raw.Name, raw.title, raw.Title),
    description: pickNullableString(raw.description, raw.Description),
    status: (pickString(raw.status, raw.Status) || 'Draft') as TournamentStatus,
    registrationDeadline: pickString(raw.registrationDeadline, raw.RegistrationDeadline),
    startTime: pickString(raw.startTime, raw.StartTime),
    maxParticipants: pickNumber(raw.maxParticipants, raw.MaxParticipants),
    currentParticipants: pickNumber(raw.currentParticipants, raw.CurrentParticipants),
    entryFeeBvc: pickNumber(
      raw.entryFeeBvc,
      raw.EntryFeeBvc,
      (raw as { entryFee?: number }).entryFee,
    ),
    prizePoolBvc: pickNumber(raw.prizePoolBvc, raw.PrizePoolBvc),
    minKarmaScore: pickNumber(
      raw.minKarmaScore,
      raw.MinKarmaScore,
      (raw as { minKarmaRequirement?: number }).minKarmaRequirement,
    ),
    minEloRequirement: pickNumber(raw.minEloRequirement, raw.MinEloRequirement),
    maxEloRequirement: pickNumber(raw.maxEloRequirement, raw.MaxEloRequirement) || 9999,
    createdAt: pickString(raw.createdAt, raw.CreatedAt),
  };
}

export function mapApiAdminTournamentDetail(raw: RawAdminTournament): AdminTournamentDetail {
  return {
    ...mapApiAdminTournament(raw),
    updatedAt: pickNullableString(raw.updatedAt, raw.UpdatedAt),
  };
}

export function normalizeAdminTournamentListResponse(
  raw: RawAdminTournamentListResponse | RawAdminTournament[] | null | undefined,
  params: AdminTournamentListParams,
): PaginatedResponse<AdminTournament> {
  const items = Array.isArray(raw)
    ? raw
    : (raw?.items ?? raw?.Items ?? raw?.data ?? []);

  const data = items.map(mapApiAdminTournament);

  const totalItems = Array.isArray(raw)
    ? data.length
    : pickNumber(raw?.totalCount, raw?.TotalCount, raw?.totalItems, raw?.TotalItems, data.length);

  const page = Array.isArray(raw)
    ? params.page
    : pickNumber(raw?.page, raw?.Page, raw?.pageNumber, raw?.PageNumber, params.page) ||
      params.page;
  const limit = Array.isArray(raw)
    ? params.limit
    : pickNumber(raw?.pageSize, raw?.PageSize, params.limit) || params.limit;
  const totalPages =
    (!Array.isArray(raw) && pickNumber(raw?.totalPages, raw?.TotalPages)) ||
    Math.max(1, Math.ceil(totalItems / Math.max(limit, 1)));

  return {
    data,
    meta: {
      currentPage: page,
      limit,
      totalItems,
      totalPages: totalItems === 0 ? 1 : totalPages,
      hasPrevious: page > 1,
      hasNext: page < (totalItems === 0 ? 1 : totalPages),
    },
  };
}

export function mapApiTournamentParticipant(
  raw: RawTournamentParticipant,
): TournamentParticipant {
  return {
    participantId: pickString(raw.participantId, raw.ParticipantId, raw.id, raw.Id),
    userId: pickString(raw.userId, raw.UserId),
    username: pickString(raw.username, raw.Username),
    displayName: pickString(raw.displayName, raw.DisplayName) || pickString(raw.username, raw.Username),
    avatarUrl: pickNullableString(raw.avatarUrl, raw.AvatarUrl),
    karmaScore: pickNumber(raw.karmaScore, raw.KarmaScore),
    gamerTier: pickNullableString(raw.gamerTier, raw.GamerTier),
    elo: pickNumber(raw.elo, raw.Elo, raw.currentElo, raw.CurrentElo),
    status: pickString(raw.status, raw.Status) || 'Registered',
    checkedInAt: pickNullableString(raw.checkedInAt, raw.CheckedInAt),
    finalRank: pickNullableNumber(raw.finalRank, raw.FinalRank),
    registeredAt: pickString(raw.registeredAt, raw.RegisteredAt),
  };
}

export function normalizeTournamentParticipantsResponse(
  raw: RawTournamentParticipantsResponse | RawTournamentParticipant[] | null | undefined,
): TournamentParticipantsResponse {
  const items = Array.isArray(raw)
    ? raw
    : (raw?.participants ?? raw?.Participants ?? raw?.items ?? raw?.Items ?? []);
  const mapped = items.map(mapApiTournamentParticipant);
  const totalCount = Array.isArray(raw)
    ? mapped.length
    : pickNumber(raw?.totalCount, raw?.TotalCount, mapped.length);

  return { items: mapped, totalCount };
}

export function formatTournamentDate(value?: string | null): string {
  if (!value) return '—';
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? value : date.toLocaleString('vi-VN');
}

/** ISO UTC → giá trị `datetime-local` (local timezone) */
export function toDatetimeLocalValue(iso?: string | null): string {
  if (!iso) return '';
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return '';
  const pad = (n: number) => String(n).padStart(2, '0');
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}T${pad(date.getHours())}:${pad(date.getMinutes())}`;
}

/** `datetime-local` → ISO UTC */
export function fromDatetimeLocalValue(local: string): string {
  return new Date(local).toISOString();
}
