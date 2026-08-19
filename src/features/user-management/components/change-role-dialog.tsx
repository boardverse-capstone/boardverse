'use client';

import { useEffect, useState } from 'react';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';

const ROLE_OPTIONS = [
  { value: 'Player', label: 'Player' },
  { value: 'Manager', label: 'Manager' },
  { value: 'CafeStaff', label: 'CafeStaff' },
  { value: 'Admin', label: 'Admin' },
] as const;

interface ChangeRoleDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  currentRole?: string;
  username?: string;
  isPending?: boolean;
  onConfirm: (role: string) => void;
}

export function ChangeRoleDialog({
  open,
  onOpenChange,
  currentRole,
  username,
  isPending,
  onConfirm,
}: ChangeRoleDialogProps) {
  const [role, setRole] = useState(currentRole || 'Player');

  useEffect(() => {
    if (open) setRole(currentRole || 'Player');
  }, [open, currentRole]);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Đổi role</DialogTitle>
          <DialogDescription>
            Đổi role cho {username ?? 'user'} qua PUT /users/{'{id}'}/role.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-2">
          <Label>Role mới</Label>
          <Select value={role} onValueChange={setRole}>
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {ROLE_OPTIONS.map((item) => (
                <SelectItem key={item.value} value={item.value}>
                  {item.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <DialogFooter>
          <Button variant="outline" disabled={isPending} onClick={() => onOpenChange(false)}>
            Hủy
          </Button>
          <Button
            disabled={isPending || !role || role === currentRole}
            onClick={() => onConfirm(role)}
          >
            Xác nhận
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
