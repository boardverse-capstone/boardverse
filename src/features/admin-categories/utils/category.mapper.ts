import type { GameCategory, RawGameCategory } from '../types/category.interface';

function pickString(...values: (string | null | undefined)[]): string {
  for (const value of values) {
    if (value != null && value !== '') return value;
  }
  return '';
}

function pickNumber(...values: (number | null | undefined)[]): number {
  for (const value of values) {
    if (value != null && !Number.isNaN(value)) return value;
  }
  return 0;
}

export function mapApiCategory(raw: RawGameCategory): GameCategory {
  return {
    id: pickString(raw.id, raw.Id),
    name: pickString(raw.name, raw.Name),
    slug: pickString(raw.slug, raw.Slug),
    displayOrder: pickNumber(raw.displayOrder, raw.DisplayOrder),
    isActive: raw.isActive ?? raw.IsActive ?? true,
  };
}

export function normalizeCategoryList(
  raw: RawGameCategory[] | { data?: RawGameCategory[]; items?: RawGameCategory[] } | null | undefined,
): GameCategory[] {
  if (!raw) return [];
  const items = Array.isArray(raw) ? raw : raw.data ?? raw.items ?? [];
  return items.map(mapApiCategory).sort((a, b) => a.displayOrder - b.displayOrder);
}

export function slugifyName(name: string): string {
  return name
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
}
