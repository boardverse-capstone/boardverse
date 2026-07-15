import type {
  CreateCategoryRequest,
  GameCategory,
  UpdateCategoryRequest,
} from '../types/category.interface';

const delay = () => new Promise((resolve) => setTimeout(resolve, 350));

const MOCK_CATEGORIES: GameCategory[] = [
  {
    id: 'cat-001',
    name: 'Chiến thuật',
    slug: 'chien-thuat',
    displayOrder: 1,
    isActive: true,
  },
  {
    id: 'cat-002',
    name: 'Party',
    slug: 'party',
    displayOrder: 2,
    isActive: true,
  },
  {
    id: 'cat-003',
    name: 'Cooperative',
    slug: 'cooperative',
    displayOrder: 3,
    isActive: false,
  },
];

export const AdminCategoryMockService = {
  getCategories: async (includeInactive = false): Promise<GameCategory[]> => {
    await delay();
    return includeInactive
      ? [...MOCK_CATEGORIES]
      : MOCK_CATEGORIES.filter((item) => item.isActive);
  },

  createCategory: async (payload: CreateCategoryRequest): Promise<GameCategory> => {
    await delay();
    const created: GameCategory = {
      id: `cat-${Date.now()}`,
      ...payload,
    };
    MOCK_CATEGORIES.push(created);
    return created;
  },

  updateCategory: async (id: string, payload: UpdateCategoryRequest): Promise<GameCategory> => {
    await delay();
    const index = MOCK_CATEGORIES.findIndex((item) => item.id === id);
    if (index === -1) throw new Error('Không tìm thấy thể loại.');
    MOCK_CATEGORIES[index] = { id, ...payload };
    return MOCK_CATEGORIES[index];
  },

  deleteCategory: async (id: string): Promise<GameCategory> => {
    await delay();
    const index = MOCK_CATEGORIES.findIndex((item) => item.id === id);
    if (index === -1) throw new Error('Không tìm thấy thể loại.');
    MOCK_CATEGORIES[index] = { ...MOCK_CATEGORIES[index], isActive: false };
    return MOCK_CATEGORIES[index];
  },
};
