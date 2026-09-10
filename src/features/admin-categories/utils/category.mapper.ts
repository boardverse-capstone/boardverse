import type {
  CreateCategoryRequest,
  GameCategory,
  RawGameCategory,
  UpdateCategoryRequest,
} from '../types/category.interface';

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
    displayOrder: pickNumber(
      raw.sortOrder,
      raw.SortOrder,
      raw.displayOrder,
      raw.DisplayOrder,
    ),
    isActive: raw.isActive ?? raw.IsActive ?? true,
  };
}

export function mapCategoryToApiPayload(
  payload: CreateCategoryRequest | UpdateCategoryRequest,
) {
  const body: Record<string, unknown> = {};
  if (payload.name !== undefined) body.name = payload.name;
  if (payload.slug !== undefined) body.slug = payload.slug;
  if (payload.displayOrder !== undefined) body.sortOrder = payload.displayOrder;
  if (payload.isActive !== undefined) body.isActive = payload.isActive;
  return body;
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
