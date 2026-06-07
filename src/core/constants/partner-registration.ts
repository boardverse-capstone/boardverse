import type { RegistrationAction, RegistrationStatus } from '@/features/partner/types/partner.interface';

export const REGISTRATION_STATUS_LABELS: Record<RegistrationStatus, string> = {
  PENDING_REVIEW: 'Chờ duyệt',
  NEEDS_OPS_VERIFICATION: 'Cần Ops xác minh',
  PENDING_INFO: 'Chờ bổ sung thông tin',
  PENDING_NEGOTIATION: 'Chờ đàm phán',
  CONTRACT_SIGNED: 'Đã ký hợp đồng',
  DATA_BLANK: 'Trống dữ liệu',
  ACTIVE: 'Đang hoạt động',
  REJECTED: 'Bị từ chối',
  CANCELLED: 'Bị hủy',
  EXPIRED_CANCELLED: 'Hết hạn hủy',
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

/** Trạng thái kết thúc — không chuyển tiếp được nữa */
export const TERMINAL_REGISTRATION_STATUSES: RegistrationStatus[] = [
  'REJECTED',
  'CANCELLED',
  'EXPIRED_CANCELLED',
  'ACTIVE',
];

/** Trạng thái cần Admin/Ops xử lý trên Portal */
export const ADMIN_ACTIONABLE_STATUSES: RegistrationStatus[] = [
  'PENDING_REVIEW',
  'NEEDS_OPS_VERIFICATION',
  'PENDING_NEGOTIATION',
  'DATA_BLANK',
];

/** Chỉ ACTIVE mới hiển thị trên Mobile App */
export const MOBILE_VISIBLE_STATUS: RegistrationStatus = 'ACTIVE';

export const CONTRACT_SLA_DAYS = 7;
export const DATA_BLANK_CS_THRESHOLD_DAYS = 3;

export const REGISTRATION_ACTION_LABELS: Record<RegistrationAction, string> = {
  PASS_OPS_ASSESSMENT: 'Đạt thẩm định thực tế',
  REQUEST_ADDITIONAL_INFO: 'Yêu cầu bổ sung hồ sơ',
  FLAG_FOR_VERIFICATION: 'Chuyển xác minh Ops',
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
