'use client';

import {
  BadgeCheck,
  Coffee,
  Mail,
  ShieldCheck,
  User as UserIcon,
} from 'lucide-react';
import { PageHeader } from '@/components/common/page-header';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { useAuthStore } from '@/features/auth/store/auth.store';
import { useStaffDashboardStats } from '@/features/staff-cafe/hooks/useStaffDashboardStats';

// Palette: CAM ĐẬM tiêu đề/CTA, VÀNG NHẠT body, TRUNG TÍNH nội dung
const A = {
  border: 'border-2 border-amber-400',
  headerBg:
    'bg-gradient-to-r from-orange-500 via-orange-600 to-amber-600 shadow-[inset_0_-2px_0_rgba(154,52,18,0.5)]',
  cardBg: 'bg-gradient-to-br from-amber-50 via-yellow-50 to-orange-50',
  text: 'text-orange-900',
  textNeutral: 'text-stone-800',
  icon: 'bg-orange-600',
  glow: 'rgba(234,88,12,0.25)',
  textMuted: 'text-orange-600',
  scanlines:
    'bg-[repeating-linear-gradient(0deg,transparent_0,transparent_3px,rgba(234,88,12,0.05)_3px,rgba(234,88,12,0.05)_4px)]',
} as const;

function Scanlines() {
  return (
    <div className="pointer-events-none absolute inset-0 bg-[repeating-linear-gradient(0deg,transparent_0,transparent_3px,rgba(234,88,12,0.05)_3px,rgba(234,88,12,0.05)_4px)]" />
  );
}

function PulseDot() {
  return (
    <span className="pointer-events-none absolute right-2 top-2 size-1.5 animate-pulse rounded-full bg-orange-600 shadow-[0_0_6px_rgba(234,88,12,0.5)]" />
  );
}

function HudPanel({
  title,
  children,
}: {
  title: string;
  children: React.ReactNode;
}) {
  return (
    <div
      className={`relative overflow-hidden rounded-lg ${A.border} ${A.cardBg} shadow-[3px_3px_0_var(--glow)]`}
      style={{ ['--glow' as string]: A.glow }}
    >
      <Scanlines />
      <PulseDot />
      <div className={`m-2 overflow-hidden rounded-md border-2 border-orange-600 ${A.headerBg}`}>
        <h3 className="flex items-center gap-2 px-4 py-2 font-mono text-sm font-extrabold uppercase tracking-widest text-white">
          <span className="inline-block size-2 animate-pulse rounded-full bg-white/70 shadow-[0_0_6px_rgba(255,255,255,0.6)]" />
          ► {title}
        </h3>
      </div>
      <div className="relative px-4 pb-4">{children}</div>
    </div>
  );
}

function HudRow({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div className="flex items-center justify-between border-b-2 border-dashed border-amber-200 py-2 last:border-b-0">
      <span className="font-mono text-[11px] font-bold uppercase tracking-widest text-amber-600">
        ▸ {label}
      </span>
      <span className="font-mono text-sm font-extrabold uppercase tracking-wide text-stone-900 [text-shadow:1px_1px_0_rgba(255,255,255,0.7)]">
        {value}
      </span>
    </div>
  );
}

export default function StaffProfilePage() {
  const user = useAuthStore((state) => state.user);
  const { currentCafe, isLoadingCafe } = useStaffDashboardStats();

  return (
    <div className="flex flex-col gap-4 sm:gap-6">
      <PageHeader
        title="Thông tin cá nhân"
        description={`Chào mừng trở lại, ${user?.username ?? 'Staff'}. Đây là trang hồ sơ nhân viên của bạn.`}
      />

      <div className="flex items-center gap-2">
        <Badge className="w-fit border-2 border-orange-500 bg-gradient-to-r from-orange-500 to-orange-600 font-mono text-[10px] font-extrabold uppercase tracking-widest text-white shadow-[2px_2px_0_rgba(154,52,18,0.4)]">
          <UserIcon className="mr-1 h-3 w-3" />
          ► Hồ sơ Staff
        </Badge>
        {user?.role && (
          <Badge className="w-fit border-2 border-amber-500 bg-amber-100 font-mono text-[10px] font-extrabold uppercase tracking-widest text-amber-900">
            <ShieldCheck className="mr-1 h-3 w-3" />
            ► {user.role}
          </Badge>
        )}
      </div>

      {/* Thông tin tài khoản + Quán đang làm */}
      <div className="grid gap-4 md:grid-cols-2">
        <HudPanel title="Tài khoản">
          <div className="text-sm">
            <HudRow
              label="Tên đăng nhập"
              value={
                <span className="inline-flex items-center gap-1">
                  <UserIcon className="h-3.5 w-3.5 text-orange-600" />
                  {user?.username ?? '—'}
                </span>
              }
            />
            <HudRow
              label="Email"
              value={
                <span className="inline-flex items-center gap-1 normal-case">
                  <Mail className="h-3.5 w-3.5 text-orange-600" />
                  {user?.email ?? '—'}
                </span>
              }
            />
            <HudRow label="Mã nhân viên" value={user?.id ?? '—'} />
            <HudRow label="Provider" value={user?.provider ?? '—'} />
            <HudRow
              label="Trạng thái"
              value={
                <span className="inline-flex items-center gap-1">
                  <BadgeCheck className="h-3.5 w-3.5 text-emerald-600" />
                  ► Đang hoạt động
                </span>
              }
            />
          </div>
        </HudPanel>

        <HudPanel title="Quán đang làm">
          {isLoadingCafe ? (
            <div className="space-y-2">
              <Skeleton className="h-4 w-32" />
              <Skeleton className="h-4 w-48" />
            </div>
          ) : currentCafe ? (
            <div className="text-sm">
              <HudRow
                label="Tên quán"
                value={
                  <span className="inline-flex items-center gap-1">
                    <Coffee className="h-3.5 w-3.5 text-orange-600" />
                    {currentCafe.name}
                  </span>
                }
              />
              <HudRow
                label="Địa chỉ"
                value={
                  <span
                    className="max-w-[220px] truncate text-right normal-case"
                    title={currentCafe.address ?? ''}
                  >
                    {currentCafe.address ?? '—'}
                  </span>
                }
              />
              <HudRow label="Mã quán" value={currentCafe.id} />
            </div>
          ) : (
            <p className="font-mono text-xs font-bold uppercase tracking-widest text-orange-600">
              ▸ Bạn chưa được gán quán nào. Liên hệ manager để được phân công.
            </p>
          )}
        </HudPanel>
      </div>
    </div>
  );
}