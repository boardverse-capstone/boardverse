'use client';

import { useMemo, useState } from 'react';
import { ColumnDef } from '@tanstack/react-table';
import { Plus, RotateCcw, Trash2 } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { PageHeader } from '@/components/common/page-header';
import { PartnerDataTable } from '@/features/partner/components/partner-data-table';
import { useCategories } from '../hooks/useCategories';
import { useCreateCategory } from '../hooks/useCreateCategory';
import { useUpdateCategory } from '../hooks/useUpdateCategory';
import { useDeleteCategory } from '../hooks/useDeleteCategory';
import type { GameCategory } from '../types/category.interface';
import { CategoryFormDialog, type CategoryFormValues } from './category-form-dialog';

export function CategoryListTable() {
  const [includeInactive, setIncludeInactive] = useState(false);
  const { data = [], isLoading, isError } = useCategories(includeInactive);
  const createMutation = useCreateCategory();
  const updateMutation = useUpdateCategory();
  const deleteMutation = useDeleteCategory();

  const [formOpen, setFormOpen] = useState(false);
  const [editingCategory, setEditingCategory] = useState<GameCategory | null>(null);

  const columns = useMemo<ColumnDef<GameCategory>[]>(
    () => [
      {
        accessorKey: 'displayOrder',
        header: 'Thứ tự',
        cell: ({ row }) => <span className="font-mono">{row.original.displayOrder}</span>,
      },
      {
        accessorKey: 'name',
        header: 'Tên thể loại',
        cell: ({ row }) => (
          <div>
            <div className="font-semibold">{row.original.name}</div>
            <div className="text-xs text-muted-foreground">{row.original.slug}</div>
          </div>
        ),
      },
      {
        accessorKey: 'isActive',
        header: 'Trạng thái',
        cell: ({ row }) =>
          row.original.isActive ? (
            <Badge className="bg-emerald-100 text-emerald-800 hover:bg-emerald-100">Hoạt động</Badge>
          ) : (
            <Badge variant="secondary">Ngừng hoạt động</Badge>
          ),
      },
      {
        id: 'actions',
        header: '',
        cell: ({ row }) => (
          <div className="flex justify-end">
            {row.original.isActive ? (
              <Button
                variant="destructive"
                size="sm"
                onClick={(event) => {
                  event.stopPropagation();
                  deleteMutation.mutate(row.original.id);
                }}
                disabled={deleteMutation.isPending}
              >
                <Trash2 className="mr-1 h-4 w-4" />
                Vô hiệu
              </Button>
            ) : (
              <Button
                variant="outline"
                size="sm"
                onClick={(event) => {
                  event.stopPropagation();
                  updateMutation.mutate({
                    id: row.original.id,
                    payload: { isActive: true },
                  });
                }}
                disabled={updateMutation.isPending}
              >
                <RotateCcw className="mr-1 h-4 w-4" />
                Kích hoạt
              </Button>
            )}
          </div>
        ),
      },
    ],
    [deleteMutation, updateMutation],
  );

  const handleFormSubmit = (values: CategoryFormValues) => {
    if (editingCategory) {
      updateMutation.mutate(
        { id: editingCategory.id, payload: values },
        {
          onSuccess: () => {
            setFormOpen(false);
            setEditingCategory(null);
          },
        },
      );
      return;
    }

    createMutation.mutate(values, {
      onSuccess: () => setFormOpen(false),
    });
  };

  const isPending =
    createMutation.isPending || updateMutation.isPending || deleteMutation.isPending;

  return (
    <div className="space-y-6">
      <PageHeader
        title="Thể loại game"
        description="Quản lý danh mục thể loại board game."
      />

      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-2">
          <Switch
            id="include-inactive"
            checked={includeInactive}
            onCheckedChange={setIncludeInactive}
          />
          <Label htmlFor="include-inactive">Hiển thị danh mục đã vô hiệu</Label>
        </div>
        <Button
          onClick={() => {
            setEditingCategory(null);
            setFormOpen(true);
          }}
        >
          <Plus className="mr-2 h-4 w-4" />
          Thêm thể loại
        </Button>
      </div>

      {isLoading ? (
        <div className="p-4 text-sm text-muted-foreground">Đang tải danh sách thể loại...</div>
      ) : isError ? (
        <div className="text-sm text-rose-600">Không thể tải danh sách thể loại.</div>
      ) : (
        <PartnerDataTable
          columns={columns}
          data={data}
          emptyMessage="Chưa có thể loại nào."
          onRowClick={(category) => {
            setEditingCategory(category);
            setFormOpen(true);
          }}
        />
      )}

      <CategoryFormDialog
        open={formOpen}
        onOpenChange={(open) => {
          setFormOpen(open);
          if (!open) setEditingCategory(null);
        }}
        category={editingCategory}
        onSubmit={handleFormSubmit}
        isPending={isPending}
      />
    </div>
  );
}
