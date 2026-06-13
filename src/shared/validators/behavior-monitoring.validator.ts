import { z } from 'zod';
import { zodResolverCompat } from '@/shared/validators/auth.validator';

const positiveInt = z.coerce.number().int('Phải là số nguyên').positive('Phải lớn hơn 0');

const nonNegativeInt = z.coerce.number().int('Phải là số nguyên').min(0, 'Không được âm');

export const MasterSettingsSchema = z.object({
  elo: z.object({
    strategyK: positiveInt,
    partyK: positiveInt,
    competitiveK: positiveInt,
    casualK: positiveInt,
  }),
  karma: z.object({
    noShowPenalty: positiveInt,
    lateCancelPenalty: positiveInt,
    kickedPenalty: positiveInt,
  }),
  matchmaking: z.object({
    searchRadiusKm: positiveInt,
    maxEloDifference: positiveInt,
  }),
  platformFee: z.object({
    commissionPercent: z.coerce.number().min(0, 'Tối thiểu 0%').max(100, 'Tối đa 100%'),
  }),
});

export const AdjustKarmaSchema = z.object({
  delta: z.coerce
    .number()
    .int('Phải là số nguyên')
    .refine((value) => value !== 0, 'Điểm thay đổi không được bằng 0'),
  reason: z.string().min(5, 'Lý do phải có ít nhất 5 ký tự').max(500, 'Tối đa 500 ký tự'),
});

export const ViolationProcessSchema = z
  .object({
    penaltyType: z.enum(['warning', 'timed_block', 'permanent_block']),
    blockDays: nonNegativeInt.optional(),
    reason: z.string().min(5, 'Lý do kỷ luật bắt buộc').max(500, 'Tối đa 500 ký tự'),
  })
  .superRefine((data, ctx) => {
    if (data.penaltyType === 'timed_block' && (!data.blockDays || data.blockDays <= 0)) {
      ctx.addIssue({
        code: 'custom',
        message: 'Số ngày khóa phải là số nguyên dương',
        path: ['blockDays'],
      });
    }
  });

export type MasterSettingsFormValues = z.infer<typeof MasterSettingsSchema>;
export type AdjustKarmaFormValues = z.infer<typeof AdjustKarmaSchema>;
export type ViolationProcessFormValues = z.infer<typeof ViolationProcessSchema>;
export { zodResolverCompat };
