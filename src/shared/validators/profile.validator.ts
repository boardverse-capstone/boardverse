import { z } from 'zod';
import type {
  ProfileAvatarUpdateRequest,
  ProfileCreateRequest,
  ProfileProgressUpdateRequest,
  ProfileUpdateRequest,
} from '@/features/profile/types/profile.interface';
import { zodResolverCompat } from './auth.validator';

export const ProfileCreateSchema = z.object({
  gamerTag: z
    .string()
    .min(1, 'Gamer tag không được để trống')
    .max(100, 'Gamer tag không được quá 100 ký tự'),
  bio: z.string().max(1000, 'Bio không được quá 1000 ký tự').optional().or(z.literal('')),
  firstName: z.string().max(100, 'Tên không được quá 100 ký tự').optional().or(z.literal('')),
  lastName: z.string().max(100, 'Họ không được quá 100 ký tự').optional().or(z.literal('')),
  dateOfBirth: z.string().optional().or(z.literal('')),
  homeAddress: z.string().max(250, 'Địa chỉ không được quá 250 ký tự').optional().or(z.literal('')),
});

export type ProfileCreateFormValues = z.infer<typeof ProfileCreateSchema>;

export { zodResolverCompat };

export function toProfileCreatePayload(values: ProfileCreateFormValues): ProfileCreateRequest {
  const payload: ProfileCreateRequest = {
    gamerTag: values.gamerTag.trim(),
  };

  const bio = values.bio?.trim();
  if (bio) payload.bio = bio;

  const firstName = values.firstName?.trim();
  if (firstName) payload.firstName = firstName;

  const lastName = values.lastName?.trim();
  if (lastName) payload.lastName = lastName;

  if (values.dateOfBirth) {
    payload.dateOfBirth = new Date(values.dateOfBirth).toISOString();
  }

  const homeAddress = values.homeAddress?.trim();
  if (homeAddress) payload.homeAddress = homeAddress;

  return payload;
}

export const ProfileUpdateSchema = z.object({
  gamerTag: z.string().max(100, 'Gamer tag không được quá 100 ký tự').optional().or(z.literal('')),
  bio: z.string().max(1000, 'Bio không được quá 1000 ký tự').optional().or(z.literal('')),
  firstName: z.string().max(100, 'Tên không được quá 100 ký tự').optional().or(z.literal('')),
  lastName: z.string().max(100, 'Họ không được quá 100 ký tự').optional().or(z.literal('')),
  dateOfBirth: z.string().optional().or(z.literal('')),
  homeAddress: z.string().max(250, 'Địa chỉ không được quá 250 ký tự').optional().or(z.literal('')),
});

export type ProfileUpdateFormValues = z.infer<typeof ProfileUpdateSchema>;

export function toProfileUpdatePayload(values: ProfileUpdateFormValues): ProfileUpdateRequest {
  const payload: ProfileUpdateRequest = {};

  const gamerTag = values.gamerTag?.trim();
  if (gamerTag) payload.gamerTag = gamerTag;

  const bio = values.bio?.trim();
  if (bio !== undefined) payload.bio = bio || null;

  const firstName = values.firstName?.trim();
  if (firstName) payload.firstName = firstName;

  const lastName = values.lastName?.trim();
  if (lastName) payload.lastName = lastName;

  if (values.dateOfBirth) {
    payload.dateOfBirth = new Date(values.dateOfBirth).toISOString();
  }

  const homeAddress = values.homeAddress?.trim();
  if (homeAddress) payload.homeAddress = homeAddress;

  return payload;
}

export const ProfileProgressUpdateSchema = z.object({
  globalElo: z.coerce
    .number()
    .int('ELO phải là số nguyên')
    .min(0, 'ELO không được âm')
    .max(2147483647, 'ELO vượt quá giới hạn'),
  level: z.coerce
    .number()
    .int('Level phải là số nguyên')
    .min(1, 'Level tối thiểu là 1')
    .max(2147483647, 'Level vượt quá giới hạn'),
});

export type ProfileProgressUpdateFormValues = z.infer<typeof ProfileProgressUpdateSchema>;

export function toProfileProgressPayload(
  values: ProfileProgressUpdateFormValues,
): ProfileProgressUpdateRequest {
  return {
    globalElo: values.globalElo,
    level: values.level,
  };
}

export function profileToProgressFormValues(profile: {
  globalElo: number;
  level: number;
}): ProfileProgressUpdateFormValues {
  return {
    globalElo: profile.globalElo,
    level: profile.level,
  };
}

export function profileToUpdateFormValues(profile: {
  username: string;
  bio: string | null;
}): ProfileUpdateFormValues {
  return {
    gamerTag: profile.username,
    bio: profile.bio ?? '',
    firstName: '',
    lastName: '',
    dateOfBirth: '',
    homeAddress: '',
  };
}

export const ProfileAvatarUpdateSchema = z.object({
  avatarUrl: z
    .string()
    .min(1, 'URL avatar không được để trống')
    .url('URL avatar không hợp lệ'),
});

export type ProfileAvatarUpdateFormValues = z.infer<typeof ProfileAvatarUpdateSchema>;

export function toProfileAvatarPayload(
  values: ProfileAvatarUpdateFormValues,
): ProfileAvatarUpdateRequest {
  return {
    avatarUrl: values.avatarUrl.trim(),
  };
}

export function profileToAvatarFormValues(profile: {
  avatarUrl: string | null;
}): ProfileAvatarUpdateFormValues {
  return {
    avatarUrl: profile.avatarUrl ?? '',
  };
}
