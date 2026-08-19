export type TournamentStatus =
  | "Draft"
  | "RegistrationOpen"
  | "RegistrationClosed"
  | "OnGoing"
  | "Completed"
  | "Cancelled";

export type ParticipantStatus =
  | "Registered"
  | "CheckedIn"
  | "Active"
  | "NoShow"
  | "Eliminated"
  | "Finished"
  | "Withdrawn"
  | "Kicked"
  | string;

export type MatchStatus = "Scheduled" | "OnGoing" | "Completed" | "Cancelled";

export interface ParticipantScoreItem {
  userId: string;
  userName?: string;
  score: number;
  cardsBought?: number;
}

export interface TournamentParticipant {
  id: string;
  tournamentId: string;
  userId: string | null;
  username: string | null;
  avatarUrl: string | null;
  walkInDisplayName: string | null;
  walkInPhoneNumber: string | null;
  isWalkIn: boolean;
  joinedRoundNumber: number;
  registeredAt: string;
  karmaAtRegistration: number;
  checkedInAt: string | null;
  checkedInByStaffId: string | null;
  registeredByStaffId: string | null;
  status: ParticipantStatus;
  totalPrestigePoints: number;
  totalCardsBought: number;
  finalRank: number | null;
  initialElo: number;
  currentElo: number;
  eloDelta: number;
  finalElo: number;
  swissWins: number;
  swissDraws: number;
  swissLosses: number;
  swissScore: number;
  isWaitlisted: boolean;
  waitlistPosition: number | null;
}

export interface AddWalkInDto {
  displayName: string;
  phoneNumber?: string;
}

export interface StartWithOptionsDto {
  allowPartialStart: boolean;
  reducedRounds?: number;
  autoShortenMode?: string;
  reason?: string;
}

export interface TournamentMatchPlayer {
  userId: string;
  userName: string;
  avatarUrl?: string;
  score?: number;
  cardsBought?: number;
  isWinner?: boolean;
}

export interface TournamentMatch {
  id: string;
  roundNumber: number;
  tableNumber?: number;
  tableName?: string;
  status: MatchStatus;
  actualStartTime?: string | null;
  endTime?: string | null;
  winnerUserId?: string | null;
  winnerName?: string | null;
  players: TournamentMatchPlayer[];
  notes?: string | null;
}

export interface TournamentDetail {
  id: string;
  cafeId: string;
  title: string;
  description?: string;
  gameTemplateId?: string;
  gameName: string;
  startTime: string;
  registrationDeadline: string;
  roundDurationMinutes: number;
  minParticipants: number;
  maxParticipants: number;
  minKarmaRequirement?: number;
  winnerKarmaBonus: number;
  finalistKarmaBonus: number;
  noShowKarmaPenalty: number;
  currentRound: number;
  totalRounds: number;
  preliminaryRounds: number;
  status: TournamentStatus;
  registeredCount: number;
  checkedInCount: number;
  cancellationReason?: string | null;
  participants?: TournamentParticipant[];
  matches?: TournamentMatch[];
}

export interface CreateTournamentDto {
  title: string;
  description?: string;
  gameTemplateId?: string;
  startTime: string;
  registrationDeadline: string;
  roundDurationMinutes: number;
  minParticipants: number;
  maxParticipants: number;
  minKarmaRequirement?: number;
  minEloRequirement?: number;
  maxEloRequirement?: number;
  noShowKarmaPenalty?: number;
  pairingMode?: "Auto" | "Manual";
  hasThirdPlaceMatch?: boolean;
  winnerKarmaBonus?: number;
  finalistKarmaBonus?: number;
}

export interface MatchPlayerResultItem {
  userId: string;
  score: number;
  cardsBought?: number;
}

export interface RecordMatchResultDto {
  matchId: string;
  winnerUserId: string;
  recordedByStaffId?: string;
  notes?: string;
  results: MatchPlayerResultItem[];
}

export interface UpdateMatchResultDto {
  matchId: string;
  winnerUserId: string;
  correctionReason: string;
  results: MatchPlayerResultItem[];
}
export interface PairingTablePreview {
  tableNumber: number;
  tableName?: string;
  playerUserIds: string[];
  players: {
    userId: string;
    userName: string;
    avatarUrl?: string | null;
    currentElo?: number;
    swissScore?: number;
  }[];
}

export interface RoundPairingPreviewResponse {
  tournamentId: string;
  roundNumber: number;
  pairingMode: "Auto" | "Manual";
  isManualOverride: boolean;
  tables: PairingTablePreview[];
}

export interface SaveManualPairingDto {
  roundNumber: number;
  pairings: {
    tableNumber: number;
    playerUserIds: string[];
  }[];
}