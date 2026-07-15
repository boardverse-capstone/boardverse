export const CAFE_OPERATIONAL_STATUS_OPTIONS = [
  { value: 'DATA_BLANK', label: 'Trống dữ liệu' },
  { value: 'ACTIVE', label: 'Đang hoạt động' },
  { value: 'INACTIVE', label: 'Ngừng hoạt động' },
  { value: 'BANNED', label: 'Bị cấm' },
] as const;

export type CafeOperationalStatusValue =
  (typeof CAFE_OPERATIONAL_STATUS_OPTIONS)[number]['value'];
