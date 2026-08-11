export const NO_SHOW_KARMA_PENALTY = 5;

export const ATTENDANCE_STATUS = {
  PRESENT: 'Present',
  ABSENT: 'Absent',
} as const;

export const SESSION_STATUS = {
  PENDING: 'Pending',
  ACTIVE: 'Active',
  COMPLETED: 'Completed',
} as const;

export const TABLE_STATUS = {
  AVAILABLE: 'Available',
  RESERVED: 'Reserved',
  OCCUPIED: 'Occupied',
} as const;

export const TABLE_STATUS_COLORS = {
  Available: {
    bg: 'bg-emerald-50 border-emerald-200 hover:border-emerald-400',
    badge: 'bg-emerald-100 text-emerald-800',
    label: 'Trống',
  },
  Reserved: {
    bg: 'bg-amber-50 border-amber-300 hover:border-amber-500',
    badge: 'bg-amber-100 text-amber-800',
    label: 'Đã đặt',
  },
  Occupied: {
    bg: 'bg-red-600 border-red-700 text-white hover:border-red-800',
    badge: 'bg-red-800 text-white',
    label: 'Đang sử dụng',
  },
} as const;

export const QR_BOOKING_PREFIX = 'BV:';
export const QR_PAYMENT_PREFIX = 'BV:PAY:';

/** Phí chơi theo giờ (mock / mặc định quán) */
export const DEFAULT_HOURLY_RATE_VND = 50_000;

/** Làm tròn tính giờ theo block 30 phút */
export const BILLING_BLOCK_MINUTES = 30;
