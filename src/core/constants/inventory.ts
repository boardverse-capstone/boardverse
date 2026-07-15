export const INVENTORY_STATUS_FILTERS = [
  { value: 'all', label: 'Tất cả' },
  { value: 'AVAILABLE', label: 'Sẵn sàng' },
  { value: 'RENTED', label: 'Đang cho thuê' },
  { value: 'MAINTENANCE', label: 'Bảo trì' },
  { value: 'DAMAGED', label: 'Hư hỏng' },
] as const;

export const INVENTORY_STATUS_LABELS: Record<string, string> = {
  AVAILABLE: 'Sẵn sàng',
  Available: 'Sẵn sàng',
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
