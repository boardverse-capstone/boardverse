'use client';

import { useQuery } from '@tanstack/react-query';
import {
  AdminCategoryService,
  ADMIN_CATEGORY_QUERY_KEYS,
} from '../services/admin-category.service';

export function useCategories(includeInactive = false) {
  return useQuery({
    queryKey: [ADMIN_CATEGORY_QUERY_KEYS.list, includeInactive],
    queryFn: () => AdminCategoryService.getCategories({ includeInactive }),
    staleTime: 10000,
  });
}
