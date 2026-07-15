'use client';

import { useMutation, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import {
  AdminCategoryService,
  ADMIN_CATEGORY_QUERY_KEYS,
} from '../services/admin-category.service';
import type { UpdateCategoryRequest } from '../types/category.interface';

export function useUpdateCategory() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ id, payload }: { id: string; payload: UpdateCategoryRequest }) =>
      AdminCategoryService.updateCategory(id, payload),
    onSuccess: (data) => {
      toast.success(`Đã cập nhật "${data.name}"`);
      queryClient.invalidateQueries({ queryKey: [ADMIN_CATEGORY_QUERY_KEYS.list] });
    },
    onError: (error: Error) => toast.error(error.message ?? 'Cập nhật thể loại thất bại.'),
  });
}
