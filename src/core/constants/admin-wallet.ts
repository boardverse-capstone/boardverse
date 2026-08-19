export const WALLET_ACCOUNT_STATUS_FILTERS = [
  { value: 'all', label: 'Tất cả trạng thái' },
  { value: 'Active', label: 'Đang hoạt động' },
  { value: 'Warning', label: 'Cảnh báo' },
  { value: 'Restricted', label: 'Hạn chế' },
  { value: 'Suspended', label: 'Tạm khóa' },
  { value: 'Banned', label: 'Cấm' },
] as const;

export const WALLET_RISK_LEVEL_FILTERS = [
  { value: 'all', label: 'Tất cả mức rủi ro' },
  { value: 'Low', label: 'Thấp' },
  { value: 'Medium', label: 'Trung bình' },
  { value: 'High', label: 'Cao' },
  { value: 'Critical', label: 'Nghiêm trọng' },
] as const;

export const WALLET_ACCOUNT_STATUS_LABELS: Record<string, string> = {
  Active: 'Đang hoạt động',
  Warning: 'Cảnh báo',
  Restricted: 'Hạn chế',
  Suspended: 'Tạm khóa',
  Banned: 'Cấm',
};

export const WALLET_RISK_LEVEL_LABELS: Record<string, string> = {
  Low: 'Thấp',
  Medium: 'Trung bình',
  High: 'Cao',
  Critical: 'Nghiêm trọng',
};

export const WALLET_TRANSACTION_TYPE_LABELS: Record<string, string> = {
  TopUp: 'Nạp tiền',
  DepositHold: 'Giữ tiền cọc',
  DepositRelease: 'Hoàn tiền cọc',
  DepositCapture: 'Thu tiền cọc',
  DepositForfeit: 'Tịch thu tiền cọc',
  Adjustment: 'Điều chỉnh',
  AdminCredit: 'Cộng bởi admin',
  AdminDebit: 'Trừ bởi admin',
};
