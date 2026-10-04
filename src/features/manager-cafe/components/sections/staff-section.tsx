"use client";

import { useState } from "react";
import {
  KeyRound,
  Loader2,
  Mail,
  Plus,
  Trash2,
  User,
  UserCog,
  Users as UsersIcon,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Field,
  FieldDescription,
  FieldLabel,
} from "@/components/ui/field";
import { cn } from "@/lib/utils";
import {
  useStaff,
  useAddStaff,
  useRemoveStaff,
} from "../../hooks/useCafeMe";
import type { CafeStaff } from "../../types/manager-cafe.interface";

export interface StaffSectionProps {
  cafeId: string;
}

export function StaffSection({ cafeId }: StaffSectionProps) {
  const staffQuery = useStaff(cafeId);
  const removeMutation = useRemoveStaff(cafeId);
  const [addOpen, setAddOpen] = useState(false);
  const staff = staffQuery.data ?? [];

  function handleRemove(staff: CafeStaff) {
    if (typeof window === "undefined") return;
    const ok = window.confirm(
      `Gỡ nhân viên "${staff.username ?? staff.email ?? staff.userId}" khỏi quán?`,
    );
    if (!ok) return;
    removeMutation.mutate(staff.userId);
  }

  return (
    <section
      aria-labelledby="staff-list"
      className="rounded-2xl border border-neutral-200 bg-white p-5 space-y-3"
    >
      <div className="pb-1 border-b border-neutral-100 flex items-baseline gap-2">
        <UsersIcon
          className="h-4 w-4 text-neutral-600 shrink-0"
          aria-hidden
        />
        <h2 id="staff-list" className="text-section-header">
          Nhân viên
        </h2>
        <span className="ml-auto inline-flex items-center gap-2">
          <span className="text-[11px] font-semibold text-neutral-600 tabular-nums">
            {staff.length} người
          </span>
          <Button
            type="button"
            variant="ghost"
            size="sm"
            onClick={() => setAddOpen(true)}
            className="h-8 px-2 text-xs font-medium text-neutral-600 hover:text-neutral-900"
          >
            <Plus className="h-3.5 w-3.5 mr-1" aria-hidden />
            Thêm
          </Button>
        </span>
      </div>

      {staffQuery.isLoading ? (
        <div
          role="status"
          aria-live="polite"
          className="flex items-center gap-2 text-helper px-3 py-2 rounded-lg border border-neutral-200 bg-neutral-50"
        >
          <Loader2 className="h-3.5 w-3.5 animate-spin" aria-hidden />
          Đang tải danh sách nhân viên…
        </div>
      ) : staff.length === 0 ? (
        <p className="text-helper">
          Chưa có nhân viên nào. Nhấn <strong>Thêm</strong> để mời nhân viên
          vào quán.
        </p>
      ) : (
        <ul className="divide-y divide-neutral-100">
          {staff.map((s) => (
            <StaffRow
              key={s.userId}
              staff={s}
              onRemove={() => handleRemove(s)}
            />
          ))}
        </ul>
      )}

      <AddStaffDialog
        open={addOpen}
        onOpenChange={setAddOpen}
        cafeId={cafeId}
      />
    </section>
  );
}

function StaffRow({
  staff,
  onRemove,
}: {
  staff: CafeStaff;
  onRemove: () => void;
}) {
  return (
    <li className="flex items-center gap-3 py-3">
      <div className="h-9 w-9 rounded-full bg-neutral-100 flex items-center justify-center shrink-0">
        <UserCog className="h-4 w-4 text-neutral-600" aria-hidden />
      </div>
      <div className="min-w-0 flex-1">
        <p className="text-sm font-semibold text-neutral-900 truncate">
          {staff.username ?? staff.email ?? staff.userId}
        </p>
        <p className="text-xs text-neutral-600 truncate">
          {staff.email ?? "—"}
        </p>
      </div>
      <Button
        type="button"
        variant="ghost"
        size="sm"
        onClick={onRemove}
        className="h-8 px-2 text-xs font-medium text-neutral-600 hover:text-destructive"
        aria-label={`Gỡ ${staff.username ?? staff.email ?? staff.userId}`}
      >
        <Trash2 className="h-3.5 w-3.5" aria-hidden />
      </Button>
    </li>
  );
}

/** Confirm + gọi mutation. Inline để tránh re-render list. */
function AddStaffDialog({
  open,
  onOpenChange,
  cafeId,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  cafeId: string;
}) {
  const addMutation = useAddStaff(cafeId);

  const [email, setEmail] = useState("");
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");

  const isSubmitting = addMutation.isPending;
  const canSubmit =
    email.trim().length > 0 &&
    /^\S+@\S+\.\S+$/.test(email.trim()) &&
    username.trim().length >= 3 &&
    password.length >= 6 &&
    !isSubmitting;

  function handleSubmit() {
    addMutation.mutate(
      {
        email: email.trim().toLowerCase(),
        username: username.trim(),
        password,
      },
      {
        onSuccess: () => onOpenChange(false),
      },
    );
  }

  // Key dựa trên open state — khi dialog mở lần mới, state reset tự nhiên.
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent
        key={open ? "open" : "closed"}
        className="bg-white border border-neutral-200 rounded-xl p-5 max-w-md mx-auto text-neutral-900"
      >
        <DialogHeader className="space-y-1.5">
          <DialogTitle className="text-base font-bold tracking-tight">
            Thêm nhân viên
          </DialogTitle>
          <DialogDescription className="text-helper">
            Tạo tài khoản mới và gán vào quán. Nhân viên dùng email/username để đăng nhập.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-3">
          <Field>
            <FieldLabel htmlFor="staff-username" className="text-sub-label">
              Tên đăng nhập
            </FieldLabel>
            <div className="relative">
              <User
                className="h-4 w-4 text-neutral-400 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none"
                aria-hidden
              />
              <Input
                id="staff-username"
                type="text"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                placeholder="staff01"
                autoComplete="off"
                className="w-full h-11 text-base border-neutral-200 rounded-lg focus-visible:ring-2 focus-visible:ring-ring bg-white pl-9"
              />
            </div>
            <FieldDescription className="text-helper">
              Tối thiểu 3 ký tự, dùng để đăng nhập cùng với mật khẩu.
            </FieldDescription>
          </Field>

          <Field>
            <FieldLabel htmlFor="staff-email" className="text-sub-label">
              Email nhân viên
            </FieldLabel>
            <div className="relative">
              <Mail
                className="h-4 w-4 text-neutral-400 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none"
                aria-hidden
              />
              <Input
                id="staff-email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="staff@example.com"
                className="w-full h-11 text-base border-neutral-200 rounded-lg focus-visible:ring-2 focus-visible:ring-ring bg-white pl-9"
              />
            </div>
            <FieldDescription className="text-helper">
              Email dùng để nhận thông báo và khôi phục tài khoản.
            </FieldDescription>
          </Field>

          <Field>
            <FieldLabel htmlFor="staff-password" className="text-sub-label">
              Mật khẩu
            </FieldLabel>
            <div className="relative">
              <KeyRound
                className="h-4 w-4 text-neutral-400 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none"
                aria-hidden
              />
              <Input
                id="staff-password"
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Tối thiểu 6 ký tự"
                autoComplete="new-password"
                className="w-full h-11 text-base border-neutral-200 rounded-lg focus-visible:ring-2 focus-visible:ring-ring bg-white pl-9"
              />
            </div>
            <FieldDescription className="text-helper">
              Nhân viên nên đổi mật khẩu sau lần đăng nhập đầu tiên.
            </FieldDescription>
          </Field>
        </div>

        <DialogFooter className="pt-3 sm:flex-row sm:justify-end gap-2">
          <Button
            type="button"
            variant="ghost"
            onClick={() => onOpenChange(false)}
            className="h-11 text-xs font-medium px-4 w-full sm:w-auto"
          >
            Huỷ
          </Button>
          <Button
            type="button"
            onClick={handleSubmit}
            disabled={!canSubmit}
            className={cn(
              "h-11 px-5 text-sm font-medium flex items-center justify-center gap-2 w-full sm:w-auto",
            )}
          >
            {isSubmitting ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin" aria-hidden />
                Đang thêm…
              </>
            ) : (
              "Thêm nhân viên"
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}