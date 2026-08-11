export const WALLET_ACCOUNT_STATUS_FILTERS = [
  { value: 'all', label: 'Tất cả trạng thái' },
  { value: 'Active', label: 'Active' },
  { value: 'Warning', label: 'Warning' },
  { value: 'Restricted', label: 'Restricted' },
  { value: 'Suspended', label: 'Suspended' },
  { value: 'Banned', label: 'Banned' },
] as const;

export const WALLET_RISK_LEVEL_FILTERS = [
  { value: 'all', label: 'Tất cả mức rủi ro' },
  { value: 'Low', label: 'Low' },
  { value: 'Medium', label: 'Medium' },
  { value: 'High', label: 'High' },
  { value: 'Critical', label: 'Critical' },
] as const;

export const WALLET_ACCOUNT_STATUS_LABELS: Record<string, string> = {
  Active: 'Active',
  Warning: 'Warning',
  Restricted: 'Restricted',
  Suspended: 'Suspended',
  Banned: 'Banned',
};

export const WALLET_RISK_LEVEL_LABELS: Record<string, string> = {
  Low: 'Low',
  Medium: 'Medium',
  High: 'High',
  Critical: 'Critical',
};

export const WALLET_TRANSACTION_TYPE_LABELS: Record<string, string> = {
  TopUp: 'Nạp tiền',
  DepositHold: 'Hold deposit',
  DepositRelease: 'Release deposit',
  DepositCapture: 'Capture deposit',
  DepositForfeit: 'Forfeit deposit',
  Adjustment: 'Điều chỉnh',
  AdminCredit: 'Admin credit',
  AdminDebit: 'Admin debit',
};
