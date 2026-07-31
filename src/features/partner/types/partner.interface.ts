export type RegistrationStatus =
  | 'PENDING_REVIEW'
  | 'NEEDS_OPS_VERIFICATION'
  | 'PENDING_INFO'
  | 'PENDING_NEGOTIATION'
  | 'CONTRACT_SIGNED'
  | 'DATA_BLANK'
  | 'ACTIVE'
  | 'REJECTED'
  | 'CANCELLED'
  | 'EXPIRED_CANCELLED';

export type BillingModel = 'BY_HOUR' | 'PER_DRINK';

export type RegistrationAction =
  | 'PASS_OPS_ASSESSMENT'
  | 'REQUEST_ADDITIONAL_INFO'
  | 'FLAG_FOR_VERIFICATION'
  | 'CONFIRM_VERIFICATION'
  | 'RECORD_CONTRACT_SIGNED'
  | 'CANCEL_NEGOTIATION'
  | 'ACTIVATE_PARTNER'
  | 'REJECT';

export type AlertTicketType =
  | 'DUPLICATE_SUSPECT'
  | 'CS_SUPPORT'
  | 'CONTRACT_SLA'
  | 'INCOMPLETE_DOCUMENTS';

export interface BasicInformation {
  cafeName: string;
  address: string;
  phoneNumber: string;
  representativeEmail: string;
  businessLicense: string;
  businessLicenseImage: string;
}

export interface Infrastructure {
  numberOfTables: number;
  numberOfPrivateRooms: number;
  maximumCapacity: number;
  spaceImages: string[];
}

export interface BoardGameCatalog {
  numberOfGamesOwned: number;
  listOfPopularGames: string;
}

export interface AdditionalServices {
  hasGameMaster: boolean;
  billingModel: BillingModel;
}

export interface StatusHistoryEntry {
  status: RegistrationStatus;
  changedAt: string;
  changedBy?: string;
  note?: string;
}

export interface AlertTicket {
  id: string;
  type: AlertTicketType;
  message: string;
  createdAt: string;
}

export interface ManagerAccount {
  username: string;
  email: string;
  temporaryPassword?: string;
}

/** Dòng danh sách phẳng — contract theo `.agents/docs/structure_code.md` */
export interface PartnerApplication {
  id: string;
  cafeName: string;
  address: string;
  phone: string;
  status: RegistrationStatus;
  createdAt: string;
  hasAlerts: boolean;
}

/** Tối thiểu cho dialog hành động từ danh sách */
export type PartnerActionTarget = Pick<PartnerApplication, 'id' | 'cafeName' | 'status'>;

export interface Registration {
  id: string;
  status: RegistrationStatus;
  basicInfo: BasicInformation;
  infrastructure: Infrastructure;
  boardGameCatalog: BoardGameCatalog;
  additionalServices: AdditionalServices;
  createdAt: string;
  updatedAt: string;
  statusHistory: StatusHistoryEntry[];
  alerts: AlertTicket[];
  commissionRate?: number;
  contractSentAt?: string;
  contractSignedAt?: string;
  managerAccount?: ManagerAccount;
  rejectionReason?: string;
  cancelReason?: string;
}

/** Payload gửi từ Landing Page (4 khối thông tin) */
export interface PartnerRegistrationRequest {
  basicInfo: BasicInformation;
  infrastructure: Infrastructure;
  boardGameCatalog: BoardGameCatalog;
  additionalServices: AdditionalServices;
}

export interface ApproveRegistrationResponse {
  registration: Registration;
  managerAccount?: ManagerAccount;
}

export interface RejectRegistrationRequest {
  reason: string;
}

export interface TransitionRegistrationRequest {
  action: RegistrationAction;
  reason?: string;
  commissionRate?: number;
  note?: string;
}

export interface TransitionRegistrationResponse {
  registration: Registration;
  managerAccount?: ManagerAccount;
}

export interface SubmitRegistrationResponse {
  registration: Registration;
  blocked?: boolean;
  message?: string;
}
