'use client';

import { Calendar, Coffee, TrendingUp, Users } from 'lucide-react';
import { PageHeader } from '@/components/common/page-header';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { useAuthStore } from '@/features/auth/store/auth.store';
import { useStaffDashboardStats } from '@/features/staff-cafe/hooks/useStaffDashboardStats';
import { formatCurrencyVnd } from '@/features/staff-cafe/utils/inventory.mapper';

// Palette: CAM ĐẬM tiêu đề/CTA, VÀNG NHẠT body, TRUNG TÍNH nội dung
const A = {
  border: 'border-2 border-amber-400',
  headerBg: 'bg-gradient-to-r from-orange-500 via-orange-600 to-amber-600 shadow-[inset_0_-2px_0_rgba(154,52,18,0.5)]',
  cardBg: 'bg-gradient-to-br from-amber-50 via-yellow-50 to-orange-50',
  text: 'text-orange-900',
  textNeutral: 'text-stone-800',
  icon: 'bg-orange-600',
  glow: 'rgba(234,88,12,0.25)',
  textMuted: 'text-orange-600',
  scanlines: 'bg-[repeating-linear-gradient(0deg,transparent_0,transparent_3px,rgba(234,88,12,0.05)_3px,rgba(234,88,12,0.05)_4px)]',
} as const;

function Scanlines() {
  return (
    <div className="pointer-events-none absolute inset-0 bg-[repeating-linear-gradient(0deg,transparent_0,transparent_3px,rgba(234,88,12,0.05)_3px,rgba(234,88,12,0.05)_4px)]" />
  );
}

function PulseDot() {
  return <span className="pointer-events-none absolute right-2 top-2 size-1.5 animate-pulse rounded-full bg-orange-600 shadow-[0_0_6px_rgba(234,88,12,0.5)]" />;
}

function StatCard({
  label,
  value,
  icon: Icon,
  accent,
  loading,
}: {
  label: string;
  value: string | number;
  icon: React.ElementType;
  accent: 'blue' | 'green' | 'orange' | 'purple';
  loading?: boolean;
}) {
  const palettes = {
    blue:   { border: 'border-blue-400',   headerBg: 'from-blue-500',    icon: 'bg-blue-600',    text: 'text-blue-900',    glow: 'rgba(59,130,246,0.3)' },
    green:  { border: 'border-emerald-400', headerBg: 'from-emerald-500', icon: 'bg-emerald-600', text: 'text-emerald-900', glow: 'rgba(16,185,129,0.3)' },
    orange: { border: 'border-orange-400',   headerBg: 'from-orange-500',  icon: 'bg-orange-600',  text: 'text-orange-900',  glow: 'rgba(234,88,12,0.3)' },
    purple: { border: 'border-purple-400',  headerBg: 'from-purple-500',  icon: 'bg-purple-600',  text: 'text-purple-900', glow: 'rgba(168,85,247,0.3)' },
  };
  const p = palettes[accent];
  return (
    <div
      className={`relative overflow-hidden rounded-lg ${A.border} ${A.cardBg} shadow-[3px_3px_0_var(--glow)]`}
      style={{ ['--glow' as string]: p.glow }}
    >
      <Scanlines />
      <PulseDot />
      <div className={`m-2 flex items-center justify-between overflow-hidden rounded-md border-2 border-orange-600 bg-gradient-to-r ${p.headerBg} to-amber-600 px-3 py-1.5 shadow-[inset_0_-2px_0_rgba(154,52,18,0.5)]`}>
        <h4 className="font-mono text-[11px] font-extrabold uppercase tracking-widest text-white">
          ► {label}
        </h4>
        <div className="flex size-7 items-center justify-center rounded-md border-2 border-white/40 bg-white/30 shadow-[inset_0_-1px_0_rgba(0,0,0,0.1)]">
          <Icon className="h-3.5 w-3.5 text-white" />
        </div>
      </div>
      <div className="relative px-4 pb-4">
        {loading ? (
          <Skeleton className="h-8 w-24" />
        ) : (
          <div className="font-mono text-2xl font-extrabold tracking-wide text-white [text-shadow:1px_1px_0_rgba(0,0,0,0.2)]">
            {value}
          </div>
        )}
      </div>
    </div>
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
    <div className={`relative overflow-hidden rounded-lg ${A.border} bg-gradient-to-br from-amber-50 via-yellow-50 to-orange-50 shadow-[3px_3px_0_var(--glow)]`} style={{ ['--glow' as string]: A.glow }}>
      <Scanlines />
      <PulseDot />
      <div className="m-2 overflow-hidden rounded-md border-2 border-orange-600 bg-gradient-to-r from-orange-500 via-orange-600 to-amber-600 shadow-[inset_0_-2px_0_rgba(154,52,18,0.5)]">
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
      <span className="font-mono text-[11px] font-bold uppercase tracking-widest text-amber-600">▸ {label}</span>
      <span className="font-mono text-sm font-extrabold uppercase tracking-wide text-stone-900 [text-shadow:1px_1px_0_rgba(255,255,255,0.7)]">{value}</span>
    </div>
  );
}

export default function StaffDashboardPage() {
  const user = useAuthStore((state) => state.user);
  const {
    totalShifts,
    shiftsToday,
    totalRevenue,
    totalSessions,
    currentCafe,
    isLoadingCafe,
    isLoadingShifts,
  } = useStaffDashboardStats();

  const isLoading = isLoadingCafe || isLoadingShifts;

  return (
    <div className="flex flex-col gap-4 sm:gap-6">
      <PageHeader
        title="Dashboard"
        description={`Chào mừng trở lại, ${user?.username ?? 'Staff'}. Đây là trang quản lý vận hành.`}
      />

      <div className="flex items-center gap-2">
        <Badge className="w-fit border-2 border-orange-500 bg-gradient-to-r from-orange-500 to-orange-600 font-mono text-[10px] font-extrabold uppercase tracking-widest text-white shadow-[2px_2px_0_rgba(154,52,18,0.4)]">
          <Users className="mr-1 h-3 w-3" />
          ► Staff
        </Badge>
      </div>

      {/* Stats Grid */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <StatCard label="Tổng ca làm" value={isLoading ? '—' : totalShifts} icon={Calendar} accent="blue" loading={isLoading} />
        <StatCard label="Ca hôm nay" value={isLoading ? '—' : shiftsToday} icon={Calendar} accent="green" loading={isLoading} />
        <StatCard
          label="Quán đang làm"
          value={isLoading ? '—' : (currentCafe?.name ?? 'Chưa gán')}
          icon={Coffee}
          accent="orange"
          loading={isLoading}
        />
        <StatCard
          label="Tổng doanh thu"
          value={isLoading ? '—' : formatCurrencyVnd(totalRevenue)}
          icon={TrendingUp}
          accent="purple"
          loading={isLoading}
        />
      </div>

      {/* Quick Stats */}
      <div className="grid gap-4 md:grid-cols-2">
        <HudPanel title="Tổng quan">
          <div className="text-sm">
            <HudRow
              label="Tổng phiên chơi"
              value={isLoadingShifts ? '—' : totalSessions.toLocaleString('vi-VN')}
            />
            <HudRow
              label="Doanh thu trung bình/ca"
              value={
                isLoadingShifts || totalShifts === 0
                  ? '—'
                  : formatCurrencyVnd(Math.round(totalRevenue / totalShifts))
              }
            />
          </div>
        </HudPanel>

        <HudPanel title="Quán hiện tại">
          {isLoadingCafe ? (
            <div className="space-y-2">
              <Skeleton className="h-4 w-32" />
              <Skeleton className="h-4 w-48" />
            </div>
          ) : currentCafe ? (
            <div className="text-sm">
              <HudRow label="Tên quán" value={currentCafe.name} />
              <HudRow
                label="Địa chỉ"
                value={
                  <span className="max-w-[220px] truncate text-right" title={currentCafe.address ?? ''}>
                    {currentCafe.address ?? '—'}
                  </span>
                }
              />
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
