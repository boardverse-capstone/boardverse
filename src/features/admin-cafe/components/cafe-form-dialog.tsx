'use client';

import { useEffect, useMemo, useState } from 'react';
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
import { Textarea } from '@/components/ui/textarea';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Spinner } from '@/components/ui/spinner';
import { useUsers } from '@/features/user-management/hooks/useUsers';
import type { AdminCafe, AdminCafeDetail } from '../types/admin-cafe.interface';

export interface CafeFormValues {
  name: string;
  address: string;
  latitude: number;
  longitude: number;
  phoneNumber: string;
  managerId?: string;
  description?: string;
}

interface CafeFormDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  cafe?: AdminCafe | AdminCafeDetail | null;
  onSubmit: (values: CafeFormValues) => void;
  isPending: boolean;
}

function isPhoneValid(phone: string) {
  return /^\d{10,11}$/.test(phone);
}

export function CafeFormDialog({
  open,
  onOpenChange,
  cafe,
  onSubmit,
  isPending,
}: CafeFormDialogProps) {
  const isEdit = Boolean(cafe);
  const [name, setName] = useState('');
  const [address, setAddress] = useState('');
  const [latitude, setLatitude] = useState('10.776889');
  const [longitude, setLongitude] = useState('106.700806');
  const [phoneNumber, setPhoneNumber] = useState('');
  const [managerId, setManagerId] = useState('');
  const [description, setDescription] = useState('');
  const [error, setError] = useState('');

  const { data: managersData, isLoading: managersLoading } = useUsers({
    page: 1,
    limit: 100,
    role: 'Manager',
    isActive: true,
    isBlocked: false,
  });

  const managers = useMemo(() => managersData?.data ?? [], [managersData]);

  useEffect(() => {
    if (!open) return;
    setName(cafe?.name ?? '');
    setAddress(cafe?.address ?? '');
    setLatitude(cafe ? String(cafe.latitude) : '10.776889');
    setLongitude(cafe ? String(cafe.longitude) : '106.700806');
    setPhoneNumber(cafe?.phoneNumber ?? '');
    setManagerId(cafe?.managerId ?? '');
    setDescription(
      cafe && 'description' in cafe ? (cafe.description ?? '') : '',
    );
    setError('');
  }, [open, cafe]);

  const handleSubmit = () => {
    const trimmedName = name.trim();
    const trimmedAddress = address.trim();
    const trimmedPhone = phoneNumber.trim();
    const trimmedManagerId = managerId.trim();
    const lat = Number(latitude);
    const lng = Number(longitude);

    if (trimmedName.length < 5 || trimmedName.length > 200) {
      setError('Tên quán phải từ 5–200 ký tự.');
      return;
    }
    if (trimmedAddress.length < 5 || trimmedAddress.length > 500) {
      setError('Địa chỉ phải từ 5–500 ký tự.');
      return;
    }
    if (!Number.isFinite(lat) || lat < -90 || lat > 90) {
      setError('Vĩ độ không hợp lệ (−90 đến 90).');
      return;
    }
    if (!Number.isFinite(lng) || lng < -180 || lng > 180) {
      setError('Kinh độ không hợp lệ (−180 đến 180).');
      return;
    }
    if (!isPhoneValid(trimmedPhone)) {
      setError('Số điện thoại phải gồm 10–11 chữ số.');
      return;
    }
    if (!isEdit && !trimmedManagerId) {
      setError('Vui lòng chọn manager phụ trách quán.');
      return;
    }

    setError('');
    onSubmit({
      name: trimmedName,
      address: trimmedAddress,
      latitude: lat,
      longitude: lng,
      phoneNumber: trimmedPhone,
      managerId: isEdit ? undefined : trimmedManagerId,
      description: description.trim() || undefined,
    });
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>{isEdit ? 'Cập nhật quán' : 'Tạo quán mới'}</DialogTitle>
          <DialogDescription>
            {isEdit
              ? 'PUT /api/v1/admin/cafes/{cafeId} — cập nhật thông tin quán.'
              : 'Admin tạo quán'}
          </DialogDescription>
        </DialogHeader>

        <div className="grid gap-4">
          <div className="grid gap-2">
            <Label htmlFor="cafe-name">Tên quán</Label>
            <Input
              id="cafe-name"
              value={name}
              onChange={(event) => setName(event.target.value)}
              placeholder="BoardGame Cafe B"
            />
          </div>

          <div className="grid gap-2">
            <Label htmlFor="cafe-address">Địa chỉ</Label>
            <Input
              id="cafe-address"
              value={address}
              onChange={(event) => setAddress(event.target.value)}
              placeholder="456 New Street, HCMC"
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="grid gap-2">
              <Label htmlFor="cafe-lat">Vĩ độ</Label>
              <Input
                id="cafe-lat"
                type="number"
                step="any"
                value={latitude}
                onChange={(event) => setLatitude(event.target.value)}
              />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="cafe-lng">Kinh độ</Label>
              <Input
                id="cafe-lng"
                type="number"
                step="any"
                value={longitude}
                onChange={(event) => setLongitude(event.target.value)}
              />
            </div>
          </div>

          <div className="grid gap-2">
            <Label htmlFor="cafe-phone">Số điện thoại</Label>
            <Input
              id="cafe-phone"
              value={phoneNumber}
              onChange={(event) => setPhoneNumber(event.target.value)}
              placeholder="0919999999"
            />
          </div>

          {!isEdit && (
            <div className="grid gap-2">
              <Label>Manager phụ trách</Label>
              <Select value={managerId || undefined} onValueChange={setManagerId}>
                <SelectTrigger>
                  <SelectValue
                    placeholder={
                      managersLoading ? 'Đang tải manager...' : 'Chọn tài khoản Manager'
                    }
                  />
                </SelectTrigger>
                <SelectContent>
                  {managers.map((manager) => (
                    <SelectItem key={manager.id} value={manager.id}>
                      {manager.username} · {manager.email}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {managers.length === 0 && !managersLoading && (
                <p className="text-xs text-muted-foreground">
                  Không có Manager khả dụng. Tạo tài khoản Manager ở mục Users trước.
                </p>
              )}
            </div>
          )}

          <div className="grid gap-2">
            <Label htmlFor="cafe-description">Mô tả (tuỳ chọn)</Label>
            <Textarea
              id="cafe-description"
              value={description}
              onChange={(event) => setDescription(event.target.value)}
              rows={3}
              placeholder="Mô tả ngắn về quán..."
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
            ) : isEdit ? (
              'Cập nhật'
            ) : (
              'Tạo quán'
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
