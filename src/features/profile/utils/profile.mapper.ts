import type {
  PlayerLocation,
  RawPlayerLocation,
  RawUserProfile,
  UserProfile,
} from '../types/profile.interface';

function pickString(...values: (string | null | undefined)[]): string {
  for (const value of values) {
    if (value != null && value !== '') return value;
  }
  return '';
}

function pickNumber(...values: (number | null | undefined)[]): number | undefined {
  for (const value of values) {
    if (value != null && !Number.isNaN(value)) return value;
  }
  return undefined;
}

function parseApiDate(value?: string | null): string | null {
  if (!value) return null;
  const normalized = value.includes('T') ? value : value.replace(' ', 'T');
  const date = new Date(normalized);
  return Number.isNaN(date.getTime()) ? value : date.toISOString();
}

export function mapApiUserProfile(raw: RawUserProfile): UserProfile {
  return {
    userId: pickString(raw.userId, raw.UserId),
    username: pickString(raw.username, raw.Username),
    phoneNumber: raw.phoneNumber ?? raw.PhoneNumber ?? null,
    avatarUrl: raw.avatarUrl ?? raw.AvatarUrl ?? null,
    bio: raw.bio ?? raw.Bio ?? null,
    karmaPoints: pickNumber(raw.karmaPoints, raw.KarmaPoints) ?? 0,
    gamerTier: raw.gamerTier ?? raw.GamerTier ?? null,
    globalElo: pickNumber(raw.globalElo, raw.GlobalElo) ?? 0,
    level: pickNumber(raw.level, raw.Level) ?? 0,
    updatedAt: parseApiDate(raw.updatedAt ?? raw.UpdatedAt),
    hasProfile: raw.hasProfile ?? raw.HasProfile ?? false,
  };
}

export function mapApiPlayerLocation(raw: RawPlayerLocation | null | undefined): PlayerLocation {
  if (!raw) {
    return {
      latitude: null,
      longitude: null,
      updatedAt: null,
      source: null,
      hasLocation: false,
    };
  }

  const latitude = pickNumber(raw.latitude, raw.Latitude) ?? null;
  const longitude = pickNumber(raw.longitude, raw.Longitude) ?? null;
  const hasLocation =
    raw.hasLocation ?? raw.HasLocation ?? (latitude != null && longitude != null);

  return {
    latitude,
    longitude,
    updatedAt: parseApiDate(raw.updatedAt ?? raw.UpdatedAt),
    source: raw.source ?? raw.Source ?? null,
    hasLocation: Boolean(hasLocation),
  };
}

export function formatProfileDate(value?: string | null): string {
  if (!value) return '—';
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? value : date.toLocaleString('vi-VN');
}
