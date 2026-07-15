'use client';

import { useMutation, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import {
  AdminCategoryService,
  ADMIN_CATEGORY_QUERY_KEYS,
} from '../services/admin-category.service';
import type { CreateCategoryRequest } from '../types/category.interface';

export function useCreateCategory() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (payload: CreateCategoryRequest) => AdminCategoryService.createCategory(payload),
    onSuccess: (data) => {
      toast.success(`Đã tạo thể loại "${data.name}"`);
      queryClient.invalidateQueries({ queryKey: [ADMIN_CATEGORY_QUERY_KEYS.list] });
    },
    onError: (error: Error) => toast.error(error.message ?? 'Tạo thể loại thất bại.'),
  });
}
