export const INVENTORY_STATUS_FILTERS = [
  { value: 'all', label: 'Tất cả' },
  { value: 'Available', label: 'Sẵn sàng' },
  { value: 'InUse', label: 'Đang dùng' },
  { value: 'Damaged', label: 'Hư hỏng' },
  { value: 'Maintenance', label: 'Bảo trì' },
] as const;

export const INVENTORY_STATUS_LABELS: Record<string, string> = {
  AVAILABLE: 'Sẵn sàng',
  Available: 'Sẵn sàng',
  INUSE: 'Đang dùng',
  InUse: 'Đang dùng',
  RENTED: 'Đang cho thuê',
  Rented: 'Đang cho thuê',
  MAINTENANCE: 'Bảo trì',
  Maintenance: 'Bảo trì',
  DAMAGED: 'Hư hỏng',
  Damaged: 'Hư hỏng',
};

export const INVENTORY_STATUS_COLORS: Record<string, string> = {
  AVAILABLE: 'bg-emerald-100 text-emerald-800 border-emerald-200',
  Available: 'bg-emerald-100 text-emerald-800 border-emerald-200',
  INUSE: 'bg-sky-100 text-sky-800 border-sky-200',
  InUse: 'bg-sky-100 text-sky-800 border-sky-200',
  RENTED: 'bg-sky-100 text-sky-800 border-sky-200',
  Rented: 'bg-sky-100 text-sky-800 border-sky-200',
  MAINTENANCE: 'bg-amber-100 text-amber-800 border-amber-200',
  Maintenance: 'bg-amber-100 text-amber-800 border-amber-200',
  DAMAGED: 'bg-rose-100 text-rose-800 border-rose-200',
  Damaged: 'bg-rose-100 text-rose-800 border-rose-200',
};

export const INVENTORY_CONDITION_LABELS: Record<string, string> = {
  NEW: 'Mới',
  New: 'Mới',
  GOOD: 'Tốt',
  Good: 'Tốt',
  WORN: 'Mòn',
  Worn: 'Mòn',
};
