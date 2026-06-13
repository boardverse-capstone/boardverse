export interface BookedGame {
  id: string;
  inventoryId?: string;
  name: string;
  imageUrl: string;
  minPlayers: number;
  maxPlayers: number;
}

export interface TableBookingParticipant {
  id: string;
  userId: string;
  displayName: string;
  depositAmount: number;
  isPresent: boolean;
  attendanceStatus: 'Present' | 'Absent';
}

export interface TableBooking {
  id: string;
  cafeId: string;
  tableId: string;
  tableLabel: string;
  qrCode: string;
  scheduledAt: string;
  bookedGame: BookedGame;
  participants: TableBookingParticipant[];
  sessionStatus: 'Pending' | 'Active' | 'Completed';
}

export type TableStatus = 'Available' | 'Reserved' | 'Occupied';

export interface CafeTable {
  id: string;
  label: string;
  zone: string;
  seats: number;
  position: { row: number; col: number };
  status: TableStatus;
  bookingId?: string;
  sessionId?: string;
  startedAt?: string;
  gameName?: string;
  presentCount?: number;
}

export interface FloorPlan {
  cafeId: string;
  tables: CafeTable[];
}

export interface QrResolveResult {
  booking: TableBooking;
  table: CafeTable;
}

export interface AlternativeGame {
  inventoryId: string;
  gameTemplateId: string;
  name: string;
  imageUrl: string;
  minPlayers: number;
  maxPlayers: number;
  boxQuantity: number;
  status: string;
}

export interface MarkAbsentPayload {
  bookingId: string;
  participantIds: string[];
}

export interface MarkAbsentResult {
  processed: number;
  karmaPenalty: number;
  depositForfeitedTotal: number;
}

export interface ActivateSessionPayload {
  bookingId: string;
  game: BookedGame;
  presentParticipantIds: string[];
}

export interface ActivatedSession {
  sessionId: string;
  bookingId: string;
  tableId: string;
  tableLabel: string;
  game: BookedGame;
  startedAt: string;
  presentCount: number;
  depositCreditTotal: number;
}

export interface StaffCafe {
  id: string;
  name: string;
  address?: string;
}
