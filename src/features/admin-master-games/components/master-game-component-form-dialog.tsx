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

export interface MasterGameComponentFormValues {
  name: string;
  type: string;
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
  const [type, setType] = useState('');
  const [defaultQuantity, setDefaultQuantity] = useState(1);
  const [error, setError] = useState('');

  useEffect(() => {
    if (!open) return;
    setName(component?.name ?? '');
    setType(component?.type ?? '');
    setDefaultQuantity(component?.defaultQuantity ?? 1);
    setError('');
  }, [open, component]);

  const handleSubmit = () => {
    const trimmedName = name.trim();
    const trimmedType = type.trim();
    if (!trimmedName) {
      setError('Vui lòng nhập tên linh kiện.');
      return;
    }
    if (!trimmedType) {
      setError('Vui lòng nhập loại linh kiện.');
      return;
    }
    if (defaultQuantity < 1) {
      setError('Số lượng mặc định phải >= 1.');
      return;
    }
    setError('');
    onSubmit({ name: trimmedName, type: trimmedType, defaultQuantity });
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{component ? 'Cập nhật linh kiện' : 'Thêm linh kiện'}</DialogTitle>
          <DialogDescription>
            Quản lý linh kiện gốc của tựa game.
          </DialogDescription>
        </DialogHeader>

        <div className="grid gap-4">
          <div className="grid gap-2">
            <Label htmlFor="component-name">Tên linh kiện</Label>
            <Input
              id="component-name"
              value={name}
              onChange={(event) => setName(event.target.value)}
              placeholder="Ví dụ: Xúc xắc"
            />
          </div>
          <div className="grid gap-2">
            <Label htmlFor="component-type">Loại linh kiện</Label>
            <Input
              id="component-type"
              value={type}
              onChange={(event) => setType(event.target.value)}
              placeholder="DICE, CARD, TOKEN..."
            />
          </div>
          <div className="grid gap-2">
            <Label htmlFor="component-qty">Số lượng mặc định</Label>
            <Input
              id="component-qty"
              type="number"
              min={1}
              value={defaultQuantity}
              onChange={(event) => setDefaultQuantity(Number(event.target.value) || 1)}
            />
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
