'use client';

import { useMutation, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import {
  AdminCategoryService,
  ADMIN_CATEGORY_QUERY_KEYS,
} from '../services/admin-category.service';

export function useDeleteCategory() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (id: string) => AdminCategoryService.deleteCategory(id),
    onSuccess: (data) => {
      toast.success(`Đã vô hiệu hóa "${data.name}"`);
      queryClient.invalidateQueries({ queryKey: [ADMIN_CATEGORY_QUERY_KEYS.list] });
    },
    onError: (error: Error) => toast.error(error.message ?? 'Vô hiệu hóa thể loại thất bại.'),
  });
}
