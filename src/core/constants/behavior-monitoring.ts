export const KARMA_WARNING_THRESHOLD = 50;

export const KARMA_BEHAVIOR_FILTERS = [
  { value: 'all', label: 'Tất cả hành vi' },
  { value: 'CrossRating', label: 'Cross-rating' },
  { value: 'NoShow', label: 'No-show' },
  { value: 'LateDepositCancel', label: 'Hủy cọc muộn' },
  { value: 'KickedFromLobby', label: 'Bị kick khỏi lobby' },
  { value: 'AdminManual', label: 'Admin điều chỉnh' },
  { value: 'AdminWarning', label: 'Cảnh báo admin' },
] as const;

export const KARMA_BEHAVIOR_LABELS: Record<string, string> = {
  CrossRating: 'Cross-rating',
  NoShow: 'No-show',
  LateDepositCancel: 'Hủy cọc muộn',
  KickedFromLobby: 'Bị kick khỏi lobby',
  AdminManual: 'Admin điều chỉnh',
  AdminWarning: 'Cảnh báo admin',
  // legacy labels (mock / dữ liệu cũ)
  NO_SHOW: 'No-show',
  LATE_CANCEL: 'Hủy cọc muộn',
  KICKED: 'Bị kick khỏi lobby',
  MANUAL_ADJUST: 'Điều chỉnh thủ công',
  POSITIVE: 'Hành vi tích cực',
  SYSTEM: 'Ghi nhận hệ thống',
  WARNING: 'Cảnh báo',
};

export const PENALTY_TYPES = [
  { value: 'warning', label: 'Cảnh báo (Warning)' },
  { value: 'timed_block', label: 'Tạm khóa (Suspend)' },
  { value: 'permanent_block', label: 'Cấm vĩnh viễn (Ban)' },
] as const;

export type PenaltyType = (typeof PENALTY_TYPES)[number]['value'];
