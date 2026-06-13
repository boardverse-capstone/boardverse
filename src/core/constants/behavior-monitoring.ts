export const KARMA_WARNING_THRESHOLD = 50;

export const KARMA_BEHAVIOR_FILTERS = [
  { value: 'all', label: 'Tất cả hành vi' },
  { value: 'NO_SHOW', label: 'No-show' },
  { value: 'LATE_CANCEL', label: 'Hủy cọc muộn' },
  { value: 'KICKED', label: 'Bị kích khỏi phòng' },
  { value: 'MANUAL_ADJUST', label: 'Điều chỉnh thủ công' },
  { value: 'POSITIVE', label: 'Điểm cộng / tích cực' },
  { value: 'SYSTEM', label: 'Hệ thống' },
] as const;

export const KARMA_BEHAVIOR_LABELS: Record<string, string> = {
  NO_SHOW: 'No-show',
  LATE_CANCEL: 'Hủy cọc muộn',
  KICKED: 'Bị kích khỏi phòng',
  MANUAL_ADJUST: 'Điều chỉnh thủ công',
  POSITIVE: 'Hành vi tích cực',
  SYSTEM: 'Ghi nhận hệ thống',
  WARNING: 'Cảnh báo',
};

export const PENALTY_TYPES = [
  { value: 'warning', label: 'Cảnh báo' },
  { value: 'timed_block', label: 'Khóa tài khoản có thời hạn' },
  { value: 'permanent_block', label: 'Khóa vĩnh viễn' },
] as const;

export type PenaltyType = (typeof PENALTY_TYPES)[number]['value'];
