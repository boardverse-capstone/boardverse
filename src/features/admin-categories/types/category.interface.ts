export interface GameCategory {
  id: string;
  name: string;
  slug: string;
  displayOrder: number;
  isActive: boolean;
}

export interface CreateCategoryRequest {
  name: string;
  slug: string;
  displayOrder: number;
  isActive: boolean;
}

export interface UpdateCategoryRequest extends CreateCategoryRequest {}

export interface CategoryListParams {
  includeInactive?: boolean;
}

export interface RawGameCategory {
  id?: string;
  Id?: string;
  name?: string;
  Name?: string;
  slug?: string;
  Slug?: string;
  displayOrder?: number;
  DisplayOrder?: number;
  isActive?: boolean;
  IsActive?: boolean;
}
