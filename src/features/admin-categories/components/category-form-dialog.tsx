'use client';

import { useEffect, useState } from 'react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Spinner } from '@/components/ui/spinner';
import type { GameCategory } from '../types/category.interface';
import { slugifyName } from '../utils/category.mapper';

export interface CategoryFormValues {
  name: string;
  slug: string;
  displayOrder: number;
  isActive: boolean;
}

interface CategoryFormDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  category?: GameCategory | null;
  onSubmit: (values: CategoryFormValues) => void;
  isPending: boolean;
}

export function CategoryFormDialog({
  open,
  onOpenChange,
  category,
  onSubmit,
  isPending,
}: CategoryFormDialogProps) {
  const [name, setName] = useState('');
  const [slug, setSlug] = useState('');
  const [displayOrder, setDisplayOrder] = useState(1);
  const [isActive, setIsActive] = useState(true);
  const [slugTouched, setSlugTouched] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    if (!open) return;
    setName(category?.name ?? '');
    setSlug(category?.slug ?? '');
    setDisplayOrder(category?.displayOrder ?? 1);
    setIsActive(category?.isActive ?? true);
    setSlugTouched(Boolean(category?.slug));
    setError('');
  }, [open, category]);

  const handleNameChange = (value: string) => {
    setName(value);
    if (!slugTouched) setSlug(slugifyName(value));
  };

  const handleSubmit = () => {
    const trimmedName = name.trim();
    const trimmedSlug = slug.trim();
    if (!trimmedName) {
      setError('Vui lòng nhập tên thể loại.');
      return;
    }
    if (!trimmedSlug) {
      setError('Vui lòng nhập slug.');
      return;
    }
    setError('');
    onSubmit({
      name: trimmedName,
      slug: trimmedSlug,
      displayOrder,
      isActive,
    });
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{category ? 'Cập nhật thể loại' : 'Thêm thể loại game'}</DialogTitle>
          <DialogDescription>
            Quản lý danh mục thể loại board game (POST/PUT /api/v1/admin/categories).
          </DialogDescription>
        </DialogHeader>

        <div className="grid gap-4">
          <div className="grid gap-2">
            <Label htmlFor="category-name">Tên thể loại</Label>
            <Input
              id="category-name"
              value={name}
              onChange={(event) => handleNameChange(event.target.value)}
              placeholder="Ví dụ: Chiến thuật"
            />
          </div>

          <div className="grid gap-2">
            <Label htmlFor="category-slug">Slug</Label>
            <Input
              id="category-slug"
              value={slug}
              onChange={(event) => {
                setSlugTouched(true);
                setSlug(event.target.value);
              }}
              placeholder="chien-thuat"
            />
          </div>

          <div className="grid gap-2">
            <Label htmlFor="category-order">Thứ tự hiển thị</Label>
            <Input
              id="category-order"
              type="number"
              min={0}
              value={displayOrder}
              onChange={(event) => setDisplayOrder(Number(event.target.value) || 0)}
            />
          </div>

          <div className="flex items-center justify-between rounded-lg border p-3">
            <div>
              <Label>Đang hoạt động</Label>
              <p className="text-xs text-muted-foreground">Tắt để ẩn khỏi danh mục công khai.</p>
            </div>
            <Switch checked={isActive} onCheckedChange={setIsActive} />
          </div>

          {error && <p className="text-sm text-destructive">{error}</p>}
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={isPending}>
            Hủy
          </Button>
          <Button onClick={handleSubmit} disabled={isPending}>
            {isPending ? (
              <>
                <Spinner className="mr-2" />
                Đang lưu...
              </>
            ) : category ? (
              'Cập nhật'
            ) : (
              'Tạo mới'
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
