// các trạng thái filter danh sách tournament từ API
export type TournamentStatusFilter =
  | "ALL"
  | "Draft"
  | "RegistrationOpen"
  | "RegistrationClosed"
  | "OnGoing"
  | "Completed"
  | "Cancelled";

// Trạng thái bàn đấu
export type MatchStatus = "Scheduled" | "OnGoing" | "Completed" | "Cancelled";

// VĐV tham gia giải đấu
export interface TournamentParticipant {
  id: string;
  tournamentId: string;
  userId: string | null;
  username?: string | null;
  avatarUrl?: string | null;
  walkInDisplayName?: string | null;
  walkInPhoneNumber?: string | null;
  isWalkIn?: boolean;
  joinedRoundNumber?: number;
  registeredAt?: string;
  karmaAtRegistration?: number;
  checkedInAt?: string | null;
  checkedInByStaffId?: string | null;
  registeredByStaffId?: string | null;
  status: "Registered" | "CheckedIn" | "NoShow" | "Active" | "Finished" | "Withdrawn"; // <--- BỔ SUNG Withdrawn
  totalPrestigePoints?: number;
  totalCardsBought?: number;
  finalRank?: number | null;
  initialElo?: number;
  currentElo?: number;
  eloDelta?: number;
  finalElo?: number;
  swissWins?: number;
  swissDraws?: number;
  swissLosses?: number;
  swissScore?: number;
  isWaitlisted?: boolean;
  waitlistPosition?: number | null;
}
// Kết quả người chơi trong 1 bàn đấu (Splendor)
export interface MatchPlayerResult {
  userId: string;
  userName?: string;
  score: number;
  cardsBought?: number;
}

// Chi tiết 1 bàn đấu
export interface TournamentMatch {
  id: string;
  tournamentId: string;
  roundNumber: number;
  tableNumber: number;
  status: MatchStatus;
  actualStartTime?: string;
  winnerUserId?: string;
  notes?: string;
  results?: MatchPlayerResult[];
}

// Object Giải đấu (Tournament) khớp 100% với JSON Response API GET
export interface Tournament {
  id: string;
  cafeId: string;
  cafeName?: string;
  createdByManagerId?: string;
  title: string;
  description?: string | null;
  gameTemplateId?: string;
  gameName?: string;
  startTime: string;
  registrationDeadline?: string | null;
  roundDurationMinutes: number;
  minParticipants: number;
  maxParticipants: number;
  entryFee: number;
  totalRounds: number;
  preliminaryRounds: number;
  finalistCount: number;
  hasThirdPlaceMatch: boolean;
  currentRound: number;
  startedAt?: string | null;
  minKarmaRequirement: number;
  minEloRequirement: number;
  maxEloRequirement: number;
  noShowKarmaPenalty: number;
  winnerKarmaBonus: number;
  finalistKarmaBonus: number;
  cancellationReason?: string | null;
  cancelledAt?: string | null;
  status: TournamentStatusFilter;
  registeredCount: number;
  checkedInCount: number;
  createdAt: string;
  updatedAt: string;
  currentUserRegistered?: boolean;
  currentUserParticipantStatus?: string | null;
  pairingMode?: "Auto" | "Manual";
  manualPairings?: {
    round1Set: boolean;
    round2Set: boolean;
    round3Set: boolean;
    finalSet: boolean;
  };
  participants?: TournamentParticipant[];
  matches?: TournamentMatch[];
}

// DTO Payload gửi lên khi gọi API POST tạo giải đấu
export interface CreateTournamentPayload {
  title: string;
  description?: string;
  gameTemplateId?: string;
  startTime: string;
  registrationDeadline?: string;
  roundDurationMinutes?: number;
  maxParticipants: number;
  minParticipants?: number;
  minKarmaRequirement?: number;
  minEloRequirement?: number;
  maxEloRequirement?: number;
  noShowKarmaPenalty?: number;
  pairingMode?: "Auto" | "Manual";
  hasThirdPlaceMatch?: boolean;
}

export interface UpdateTournamentPayload {
  title?: string;
  description?: string;
  startTime?: string;
  registrationDeadline?: string;
  roundDurationMinutes?: number;
  maxParticipants?: number;
  minKarmaRequirement?: number;
  minEloRequirement?: number;
  maxEloRequirement?: number;
  noShowKarmaPenalty?: number;
  autoExtendOnShortage?: boolean;
  maxExtensionCount?: number;
  extensionMinutesPerAttempt?: number;
  preliminaryRounds?: number;
}

export interface MatchPlayerResultPayload {
  userId: string;
  score: number;
  cardsBought?: number;
}

export interface RecordMatchResultPayload {
  matchId: string;
  winnerUserId: string;
  recordedByStaffId?: string;
  notes?: string;
  results: MatchPlayerResultPayload[];
}

export interface UpdateMatchResultPayload {
  winnerUserId: string;
  recordedByStaffId?: string;
  notes?: string;
  results: MatchPlayerResultPayload[];
}
export interface PairingMatchPreview {
  matchNumber: number;
  playerIds: string[];
}

export interface TournamentPairingPreview {
  tournamentId: string;
  roundNumber: number;
  source: string; // "Auto (suggested)" | "Manual"
  pairings: PairingMatchPreview[];
  warnings?: string[];
}
