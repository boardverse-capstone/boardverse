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
import { Spinner } from '@/components/ui/spinner';
import type { MasterGameComponent } from '../types/master-game.interface';
import { useBggComponentCatalog } from '../hooks/useImportBggGame';

export interface MasterGameComponentFormValues {
  name: string;
  componentKind: number | string;
  defaultQuantity: number;
}

interface MasterGameComponentFormDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  component?: MasterGameComponent | null;
  onSubmit: (values: MasterGameComponentFormValues) => void;
  isPending: boolean;
}

export function MasterGameComponentFormDialog({
  open,
  onOpenChange,
  component,
  onSubmit,
  isPending,
}: MasterGameComponentFormDialogProps) {
  const [name, setName] = useState('');
  const [componentKind, setComponentKind] = useState('');
  const [defaultQuantity, setDefaultQuantity] = useState(1);
  const [error, setError] = useState('');
  const catalog = useBggComponentCatalog(open);

  useEffect(() => {
    if (!open) return;
    setName(component?.name ?? '');
    setComponentKind(component?.type ? String(component.type) : '');
    setDefaultQuantity(component?.defaultQuantity ?? 1);
    setError('');
  }, [open, component]);

  const handleSubmit = () => {
    const trimmedName = name.trim();
    if (!trimmedName) {
      setError('Vui lòng nhập tên linh kiện.');
      return;
    }
    if (!componentKind) {
      setError('Vui lòng chọn loại linh kiện.');
      return;
    }
    if (defaultQuantity < 1) {
      setError('Số lượng mặc định phải >= 1.');
      return;
    }
    const asNumber = Number(componentKind);
    setError('');
    onSubmit({
      name: trimmedName,
      componentKind:
        Number.isFinite(asNumber) && String(asNumber) === componentKind
          ? asNumber
          : componentKind,
      defaultQuantity,
    });
  };

  const kinds = catalog.data ?? [];
  const catalogReady = !catalog.isFetching && !catalog.isError && kinds.length > 0;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{component ? 'Cập nhật linh kiện' : 'Thêm linh kiện'}</DialogTitle>
          <DialogDescription>
            Quản lý linh kiện gốc của tựa game. Loại linh kiện phải chọn từ danh mục hệ thống.
          </DialogDescription>
        </DialogHeader>

        <div className="grid gap-4">
          <div className="grid gap-2">
            <Label htmlFor="component-name">Tên linh kiện</Label>
            <Input
              id="component-name"
              value={name ?? ''}
              onChange={(event) => setName(event.target.value)}
              placeholder="Ví dụ: Xúc xắc"
            />
          </div>
          <div className="grid gap-2">
            <Label htmlFor="component-kind">Loại linh kiện</Label>
            <select
              id="component-kind"
              className="border-input bg-background h-9 w-full rounded-md border px-3 text-sm"
              value={componentKind ?? ''}
              onChange={(event) => setComponentKind(event.target.value)}
              disabled={catalog.isFetching || catalog.isError}
            >
              <option value="">
                {catalog.isFetching
                  ? 'Đang tải từ máy chủ...'
                  : catalog.isError
                    ? 'Không tải được danh mục'
                    : kinds.length === 0
                      ? 'Máy chủ chưa có loại linh kiện'
                      : 'Chọn loại'}
              </option>
              {kinds.map((kind) => (
                <option key={String(kind.kind)} value={String(kind.kind)}>
                  {kind.nameVi || kind.nameEn || String(kind.kind)}
                </option>
              ))}
            </select>
            {catalog.isError ? (
              <p className="text-sm text-destructive">
                {catalog.error instanceof Error
                  ? catalog.error.message
                  : 'Không tải được GET /api/v1/bgg/component-catalog.'}{' '}
                <button
                  type="button"
                  className="underline"
                  onClick={() => void catalog.refetch()}
                >
                  Thử lại
                </button>
              </p>
            ) : null}
          </div>
          <div className="grid gap-2">
            <Label htmlFor="component-qty">Số lượng mặc định</Label>
            <Input
              id="component-qty"
              type="number"
              min={1}
              value={defaultQuantity ?? ''}
              onChange={(event) => setDefaultQuantity(Number(event.target.value) || 1)}
            />
          </div>
          {error && <p className="text-sm text-destructive">{error}</p>}
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={isPending}>
            Hủy
          </Button>
          <Button onClick={handleSubmit} disabled={isPending || !catalogReady}>
            {isPending ? (
              <>
                <Spinner className="mr-2" />
                Đang lưu...
              </>
            ) : component ? (
              'Cập nhật'
            ) : (
              'Thêm'
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
