import type { PaginationParams } from '@/shared/types/pagination.interface';

export type TournamentStatus =
  | 'Draft'
  | 'RegistrationOpen'
  | 'RegistrationClosed'
  | 'OnGoing'
  | 'Completed'
  | 'Cancelled';

export type ParticipantStatus = 'Registered' | 'CheckedIn' | 'Withdrawn' | 'NoShow';

export const TOURNAMENT_STATUSES: TournamentStatus[] = [
  'Draft',
  'RegistrationOpen',
  'RegistrationClosed',
  'OnGoing',
  'Completed',
  'Cancelled',
];

export const PARTICIPANT_STATUSES: ParticipantStatus[] = [
  'Registered',
  'CheckedIn',
  'Withdrawn',
  'NoShow',
];

export interface AdminTournament {
  id: string;
  cafeId: string;
  cafeName: string;
  gameTemplateId: string;
  gameName: string;
  name: string;
  description: string | null;
  status: TournamentStatus | string;
  registrationDeadline: string;
  startTime: string;
  maxParticipants: number;
  currentParticipants: number;
  entryFeeBvc: number;
  prizePoolBvc: number;
  minKarmaScore: number;
  minEloRequirement: number;
  maxEloRequirement: number;
  createdAt: string;
}

export interface AdminTournamentDetail extends AdminTournament {
  updatedAt: string | null;
}

export interface AdminTournamentListParams extends PaginationParams {
  status?: TournamentStatus | 'all';
  cafeId?: string;
}

export interface CreateAdminTournamentRequest {
  cafeId: string;
  gameTemplateId: string;
  name: string;
  description?: string;
  registrationDeadline: string;
  startTime: string;
  maxParticipants: number;
  entryFeeBvc?: number;
  prizePoolBvc?: number;
  minKarmaScore?: number;
  minEloRequirement?: number;
  maxEloRequirement?: number;
}

export interface UpdateAdminTournamentRequest {
  name?: string;
  description?: string;
  registrationDeadline?: string;
  startTime?: string;
  maxParticipants?: number;
  entryFeeBvc?: number;
  prizePoolBvc?: number;
  minKarmaScore?: number;
  minEloRequirement?: number;
  maxEloRequirement?: number;
}

export interface CancelTournamentRequest {
  reason: string;
}

export interface TournamentParticipant {
  participantId: string;
  userId: string;
  username: string;
  displayName: string;
  avatarUrl: string | null;
  karmaScore: number;
  gamerTier: string | null;
  elo: number;
  status: ParticipantStatus | string;
  checkedInAt: string | null;
  finalRank: number | null;
  registeredAt: string;
}

export interface TournamentParticipantsParams {
  tournamentId: string;
  status?: ParticipantStatus | 'all';
}

export interface TournamentParticipantsResponse {
  items: TournamentParticipant[];
  totalCount: number;
}

export interface RawAdminTournament {
  id?: string;
  Id?: string;
  cafeId?: string;
  CafeId?: string;
  cafeName?: string;
  CafeName?: string;
  gameTemplateId?: string;
  GameTemplateId?: string;
  gameName?: string;
  GameName?: string;
  name?: string;
  Name?: string;
  title?: string;
  Title?: string;
  description?: string | null;
  Description?: string | null;
  status?: string;
  Status?: string;
  registrationDeadline?: string;
  RegistrationDeadline?: string;
  startTime?: string;
  StartTime?: string;
  maxParticipants?: number;
  MaxParticipants?: number;
  currentParticipants?: number;
  CurrentParticipants?: number;
  entryFeeBvc?: number;
  EntryFeeBvc?: number;
  prizePoolBvc?: number;
  PrizePoolBvc?: number;
  minKarmaScore?: number;
  MinKarmaScore?: number;
  minEloRequirement?: number;
  MinEloRequirement?: number;
  maxEloRequirement?: number;
  MaxEloRequirement?: number;
  createdAt?: string;
  CreatedAt?: string;
  updatedAt?: string | null;
  UpdatedAt?: string | null;
}

export interface RawAdminTournamentListResponse {
  items?: RawAdminTournament[];
  Items?: RawAdminTournament[];
  data?: RawAdminTournament[];
  page?: number;
  Page?: number;
  pageNumber?: number;
  PageNumber?: number;
  pageSize?: number;
  PageSize?: number;
  totalCount?: number;
  TotalCount?: number;
  totalItems?: number;
  TotalItems?: number;
  totalPages?: number;
  TotalPages?: number;
  hasPreviousPage?: boolean;
  hasNextPage?: boolean;
}

export interface RawTournamentParticipant {
  participantId?: string;
  ParticipantId?: string;
  id?: string;
  Id?: string;
  userId?: string;
  UserId?: string;
  username?: string;
  Username?: string;
  displayName?: string;
  DisplayName?: string;
  avatarUrl?: string | null;
  AvatarUrl?: string | null;
  karmaScore?: number;
  KarmaScore?: number;
  gamerTier?: string | null;
  GamerTier?: string | null;
  elo?: number;
  Elo?: number;
  currentElo?: number;
  CurrentElo?: number;
  status?: string;
  Status?: string;
  checkedInAt?: string | null;
  CheckedInAt?: string | null;
  finalRank?: number | null;
  FinalRank?: number | null;
  registeredAt?: string;
  RegisteredAt?: string;
}

export interface RawTournamentParticipantsResponse {
  items?: RawTournamentParticipant[];
  Items?: RawTournamentParticipant[];
  participants?: RawTournamentParticipant[];
  Participants?: RawTournamentParticipant[];
  totalCount?: number;
  TotalCount?: number;
}
