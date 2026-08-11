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



/** Trạng thái duyệt đơn — GET /api/admin/cafe-partner-applications */

export type ApplicationStatus = 'PENDING' | 'APPROVED' | 'REJECTED';



/** Trạng thái vận hành sau khi đơn được duyệt */

export type OperationalStatus = 'DATA_BLANK' | 'ACTIVE' | 'INACTIVE' | 'BANNED' | 'SUSPENDED';



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
  hotline: string;
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



export interface WorkingHours {

  weekdayStart: string;

  weekdayEnd: string;

  weekendStart: string;

  weekendEnd: string;

}



/** Bản ghi thô từ GET /api/admin/cafe-partner-applications */

export interface RawCafePartnerApplication {

  id?: string;

  cafeName?: string;

  address?: string;

  hotline?: string;

  phoneNumber?: string;

  representativeEmail?: string;

  workingHours?: WorkingHours | null;

  businessLicense?: string;

  businessLicenseImageUrl?: string;

  numberOfTables?: number;

  numberOfPrivateRooms?: number;

  spaceImageUrls?: string[];

  numberOfGamesOwned?: number;

  popularGamesList?: string;

  hasGameMaster?: boolean;

  billingModel?: BillingModel | string;

  tableNames?: string[];

  applicationStatus?: ApplicationStatus | string;

  operationalStatus?: OperationalStatus | string | null;

  rejectionReason?: string | null;

  requiresCsSupport?: boolean;

  isTableLayoutConfigured?: boolean;

  canActivate?: boolean;

  activationBlockers?: string[];

  submittedByUserId?: string | null;

  submittedByUsername?: string | null;

  reviewedByAdminId?: string | null;

  reviewedByAdminUsername?: string | null;

  createdManagerUserId?: string | null;

  createdCafeId?: string | null;

  submittedAt?: string;

  updatedAt?: string;

  reviewedAt?: string | null;

  approvedAt?: string | null;

  operationalProfileUpdatedAt?: string | null;

}



/** Đơn đăng ký cafe partner — contract GET /api/admin/cafe-partner-applications */

export interface PartnerApplication {

  id: string;

  cafeName: string;

  address: string;

  hotline: string;

  representativeEmail: string;

  workingHours?: WorkingHours;

  businessLicense: string;

  businessLicenseImageUrl: string;

  numberOfTables: number;

  numberOfPrivateRooms: number;

  spaceImageUrls: string[];

  numberOfGamesOwned: number;

  popularGamesList: string;

  hasGameMaster: boolean;

  billingModel: BillingModel;

  tableNames: string[];

  applicationStatus: ApplicationStatus;

  operationalStatus: OperationalStatus | null;

  rejectionReason: string | null;

  requiresCsSupport: boolean;

  isTableLayoutConfigured: boolean;

  canActivate: boolean;

  activationBlockers: string[];

  submittedByUserId: string | null;

  submittedByUsername: string | null;

  reviewedByAdminId: string | null;

  reviewedByAdminUsername: string | null;

  createdManagerUserId: string | null;

  createdCafeId: string | null;

  submittedAt: string;

  updatedAt: string;

  reviewedAt: string | null;

  approvedAt: string | null;

  operationalProfileUpdatedAt: string | null;

}



export interface PartnerApplicationListParams {

  page: number;

  limit: number;

  search?: string;

  status?: string;

}



export type PartnerActionTarget = Pick<

  PartnerApplication,

  'id' | 'cafeName' | 'applicationStatus' | 'operationalStatus' | 'canActivate'

>;



export type ApplicationPrimaryAction = 'APPROVE' | 'ACTIVATE';



/** Legacy — mock submit & workflow cũ */

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



export interface PartnerRegistrationRequest {

  basicInfo: BasicInformation;

  infrastructure: Infrastructure;

  boardGameCatalog: BoardGameCatalog;

  additionalServices: AdditionalServices;

}



/** Phản hồi thô POST .../approve (sau khi unwrap envelope) */

export interface RawApproveRegistrationResponse {

  application?: RawCafePartnerApplication;

  managerUserId?: string;

  managerEmail?: string;

  cafeId?: string;

  temporaryPassword?: string;

  /** Legacy mock */

  registration?: Registration;

  managerAccount?: ManagerAccount;

}



export interface ApproveRegistrationResult {

  application: PartnerApplication;

  managerAccount: {

    userId: string;

    email: string;

    temporaryPassword?: string;

  };

  cafeId: string;

}



/** @deprecated Dùng ApproveRegistrationResult */

export type ApproveRegistrationResponse = RawApproveRegistrationResponse;



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


