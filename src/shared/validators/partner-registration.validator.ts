import { z } from 'zod';
export { zodResolverCompat } from '@/shared/validators/auth.validator';

const VIETNAM_PHONE_REGEX = /^(0)(3|5|7|8|9)[0-9]{8}$/;

const MAX_FILE_SIZE = 5 * 1024 * 1024;
const IMAGE_TYPES = ['image/jpeg', 'image/png'];
const LICENSE_TYPES = [...IMAGE_TYPES, 'application/pdf'];

function fileListSchema(options: {
  min?: number;
  max?: number;
  types: string[];
  label: string;
}) {
  return z
    .custom<FileList | undefined>()
    .refine((files) => files && files.length >= (options.min ?? 1), {
      message: `Vui lòng tải lên ${options.label}`,
    })
    .refine(
      (files) => !options.max || !files || files.length <= options.max,
      { message: `${options.label} tối đa ${options.max} file` },
    )
    .refine(
      (files) => {
        if (!files) return false;
        return Array.from(files).every((file) => options.types.includes(file.type));
      },
      { message: `${options.label} không đúng định dạng cho phép` },
    )
    .refine(
      (files) => {
        if (!files) return false;
        return Array.from(files).every((file) => file.size <= MAX_FILE_SIZE);
      },
      { message: `${options.label} vượt quá 5MB` },
    );
}

export const PartnerRegistrationSchema = z.object({
  basicInfo: z.object({
    cafeName: z
      .string()
      .trim()
      .min(5, 'Tên quán phải từ 5–100 ký tự')
      .max(100, 'Tên quán phải từ 5–100 ký tự'),
    address: z
      .string()
      .trim()
      .min(10, 'Địa chỉ phải mô tả đầy đủ Số nhà, Đường, Phường/Xã, Quận/Huyện, Tỉnh/TP'),
    phoneNumber: z
      .string()
      .trim()
      .regex(VIETNAM_PHONE_REGEX, 'Hotline phải là số Việt Nam hợp lệ (10–11 số)'),
    representativeEmail: z
      .string()
      .trim()
      .email('Email đại diện không hợp lệ')
      .max(256),
    businessLicense: z
      .string()
      .trim()
      .min(5, 'Mã số thuế/Giấy phép KD không hợp lệ')
      .max(32)
      .regex(/^[a-zA-Z0-9]+$/, 'Mã số thuế chỉ chứa chữ và số'),
    businessLicenseImage: fileListSchema({
      min: 1,
      max: 1,
      types: LICENSE_TYPES,
      label: 'Ảnh giấy phép kinh doanh',
    }),
  }),
  infrastructure: z.object({
    numberOfTables: z.coerce
      .number()
      .int('Số bàn phải là số nguyên')
      .positive('Số bàn phải lớn hơn 0'),
    numberOfPrivateRooms: z.coerce
      .number()
      .int('Số phòng riêng phải là số nguyên')
      .min(0, 'Số phòng riêng không được âm'),
    maximumCapacity: z.coerce
      .number()
      .int('Sức chứa phải là số nguyên')
      .positive('Sức chứa phải lớn hơn 0'),
    spaceImages: fileListSchema({
      min: 3,
      types: IMAGE_TYPES,
      label: 'Ảnh không gian quán (tối thiểu 3 ảnh JPEG/PNG)',
    }),
  }),
  boardGameCatalog: z.object({
    numberOfGamesOwned: z.coerce
      .number()
      .int('Số lượng game phải là số nguyên')
      .positive('Phải sở hữu ít nhất 1 bộ game'),
    listOfPopularGames: z
      .string()
      .trim()
      .min(3, 'Vui lòng liệt kê ít nhất một trò chơi phổ biến'),
  }),
  additionalServices: z.object({
    hasGameMaster: z.boolean(),
    billingModel: z.enum(['BY_HOUR', 'PER_DRINK']),
  }),
});

export type PartnerRegistrationFormValues = z.infer<typeof PartnerRegistrationSchema>;
