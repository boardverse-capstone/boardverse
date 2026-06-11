'use client';

import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from '@/components/ui/sheet';
import { UserDetailContent } from './user-detail-content';
import type { ManagedUser } from '../types/user.interface';

interface UserDetailSheetProps {
  user?: ManagedUser;
  isLoading?: boolean;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function UserDetailSheet({
  user,
  isLoading,
  open,
  onOpenChange,
}: UserDetailSheetProps) {
  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent className="w-full overflow-y-auto sm:max-w-lg">
        <SheetHeader>
          <SheetTitle>Thông tin tài khoản</SheetTitle>
          <SheetDescription>Chi tiết hồ sơ người dùng trên hệ thống BoardVerse.</SheetDescription>
        </SheetHeader>

        <div className="mt-6">
          <UserDetailContent user={user} isLoading={isLoading} />
        </div>
      </SheetContent>
    </Sheet>
  );
}
