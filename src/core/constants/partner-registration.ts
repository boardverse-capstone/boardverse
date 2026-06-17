import type {

  ApplicationStatus,

  OperationalStatus,

  RegistrationAction,

  RegistrationStatus,

} from '@/features/partner/types/partner.interface';



/** Lọc theo applicationStatus — query param Status */

export const PARTNER_APPLICATION_STATUS_FILTERS = [

  { value: 'all', label: 'Tất cả' },

  { value: 'PENDING', label: 'Chờ duyệt' },

  { value: 'APPROVED', label: 'Đã duyệt' },

  { value: 'REJECTED', label: 'Từ chối' },

] as const;



export const APPLICATION_STATUS_LABELS: Record<ApplicationStatus, string> = {

  PENDING: 'Chờ duyệt',

  APPROVED: 'Đã duyệt',

  REJECTED: 'Từ chối',

};



export const APPLICATION_STATUS_COLORS: Record<ApplicationStatus, string> = {

  PENDING: 'bg-amber-100 text-amber-800 border-amber-200',

  APPROVED: 'bg-emerald-100 text-emerald-800 border-emerald-200',

  REJECTED: 'bg-rose-100 text-rose-800 border-rose-200',

};



export const OPERATIONAL_STATUS_LABELS: Record<OperationalStatus, string> = {

  DATA_BLANK: 'Trống dữ liệu',

  ACTIVE: 'Đang hoạt động',

  SUSPENDED: 'Tạm ngưng',

};



export const OPERATIONAL_STATUS_COLORS: Record<OperationalStatus, string> = {

  DATA_BLANK: 'bg-slate-100 text-slate-700 border-slate-200',

  ACTIVE: 'bg-sky-100 text-sky-800 border-sky-200',

  SUSPENDED: 'bg-orange-100 text-orange-800 border-orange-200',

};



export const APPLICATION_ACTION_LABELS = {

  APPROVE: 'Duyệt đơn',

  ACTIVATE: 'Kích hoạt quán',

  REJECT: 'Từ chối đơn',

} as const;



export const REGISTRATION_STATUS_LABELS: Record<RegistrationStatus, string> = {

  PENDING_REVIEW: 'Chờ duyệt',

  NEEDS_OPS_VERIFICATION: 'Cần xác minh',

  PENDING_INFO: 'Chờ bổ sung thông tin',

  PENDING_NEGOTIATION: 'Chờ đàm phán',

  CONTRACT_SIGNED: 'Đã ký hợp đồng',

  DATA_BLANK: 'Trống dữ liệu',

  ACTIVE: 'Đang hoạt động',

  REJECTED: 'Bị từ chối',

  CANCELLED: 'Bị hủy',

  EXPIRED_CANCELLED: 'Hết hạn hủy',

};



export const REGISTRATION_STATUS_COLORS: Record<RegistrationStatus, string> = {

  PENDING_REVIEW: 'bg-amber-100 text-amber-800 border-amber-200',

  NEEDS_OPS_VERIFICATION: 'bg-orange-100 text-orange-800 border-orange-200',

  PENDING_INFO: 'bg-sky-100 text-sky-800 border-sky-200',

  PENDING_NEGOTIATION: 'bg-violet-100 text-violet-800 border-violet-200',

  CONTRACT_SIGNED: 'bg-indigo-100 text-indigo-800 border-indigo-200',

  DATA_BLANK: 'bg-slate-100 text-slate-700 border-slate-200',

  ACTIVE: 'bg-emerald-100 text-emerald-800 border-emerald-200',

  REJECTED: 'bg-rose-100 text-rose-800 border-rose-200',

  CANCELLED: 'bg-rose-100 text-rose-800 border-rose-200',

  EXPIRED_CANCELLED: 'bg-gray-100 text-gray-600 border-gray-200',

};



export const REGISTRATION_STATUS_VARIANT: Record<

  RegistrationStatus,

  'default' | 'secondary' | 'destructive' | 'outline'

> = {

  PENDING_REVIEW: 'outline',

  NEEDS_OPS_VERIFICATION: 'outline',

  PENDING_INFO: 'outline',

  PENDING_NEGOTIATION: 'outline',

  CONTRACT_SIGNED: 'default',

  DATA_BLANK: 'secondary',

  ACTIVE: 'default',

  REJECTED: 'destructive',

  CANCELLED: 'destructive',

  EXPIRED_CANCELLED: 'destructive',

};



export const TERMINAL_REGISTRATION_STATUSES: RegistrationStatus[] = [

  'REJECTED',

  'CANCELLED',

  'EXPIRED_CANCELLED',

  'ACTIVE',

];



export const ADMIN_ACTIONABLE_STATUSES: RegistrationStatus[] = [

  'PENDING_REVIEW',

  'NEEDS_OPS_VERIFICATION',

  'PENDING_NEGOTIATION',

  'DATA_BLANK',

];



export const MOBILE_VISIBLE_STATUS: RegistrationStatus = 'ACTIVE';



export const CONTRACT_SLA_DAYS = 7;

export const DATA_BLANK_CS_THRESHOLD_DAYS = 3;



export const REGISTRATION_ACTION_LABELS: Record<RegistrationAction, string> = {

  PASS_OPS_ASSESSMENT: 'Đạt thẩm định thực tế',

  REQUEST_ADDITIONAL_INFO: 'Yêu cầu bổ sung hồ sơ',

  FLAG_FOR_VERIFICATION: 'Chuyển xác minh thủ công',

  CONFIRM_VERIFICATION: 'Xác minh thành công',

  RECORD_CONTRACT_SIGNED: 'Ghi nhận ký hợp đồng',

  CANCEL_NEGOTIATION: 'Hủy đàm phán',

  ACTIVATE_PARTNER: 'Kích hoạt đối tác',

  REJECT: 'Từ chối đơn',

};



export const REGISTRATION_WORKFLOW_ORDER: RegistrationStatus[] = [

  'PENDING_REVIEW',

  'NEEDS_OPS_VERIFICATION',

  'PENDING_INFO',

  'PENDING_NEGOTIATION',

  'CONTRACT_SIGNED',

  'DATA_BLANK',

  'ACTIVE',

];


