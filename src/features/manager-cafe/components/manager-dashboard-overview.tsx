"use client";

import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Line,
  LineChart,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import {
  ArrowDownRight,
  ArrowUpRight,
  BarChart3,
  Calendar,
  CheckCircle2,
  Clock,
  Coffee,
  Gamepad2,
  Sparkles,
  Timer,
  TrendingUp,
  Users,
} from "lucide-react";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

// Local VND formatter — đồng nhất với Intl.NumberFormat("vi-VN")
// nhưng thêm hậu tố "đ" và xử lý số âm (dù hiếm trong dashboard).
function formatVnd(value: number): string {
  return new Intl.NumberFormat("vi-VN").format(value) + "đ";
}

/**
 * ManagerDashboardOverview — surface mở rộng của `/manager/dashboard`.
 *
 * Operate-mode extension của surface hiện có: KPI strip + 2 chart panel
 * (revenue theo giờ + tỉ lệ loại board game được thuê) + danh sách
 * phiên gần đây. Tất cả số liệu là synthetic demo, đánh dấu rõ "Dữ
 * liệu mẫu" để manager không đọc nhầm thành số thật. Mục tiêu: cho
 * manager thấy dashboard sẽ trông như thế nào khi BE có data, không
 * thay thế nguồn doanh thu thật.
 */

// ─── Synthetic data (clearly labeled as demo) ─────────────────────
// Range: tuần này (T2–CN) cho chart revenue + sessions; tháng này cho
// top board games. Mọi số đều là mock — không phản ánh doanh thu thật.
const REVENUE_WEEK = [
  { day: "T2", revenue: 1_850_000, sessions: 12 },
  { day: "T3", revenue: 2_120_000, sessions: 14 },
  { day: "T4", revenue: 1_640_000, sessions: 11 },
  { day: "T5", revenue: 2_780_000, sessions: 18 },
  { day: "T6", revenue: 4_320_000, sessions: 27 },
  { day: "T7", revenue: 5_140_000, sessions: 32 },
  { day: "CN", revenue: 4_680_000, sessions: 29 },
];

const TOP_BOARD_GAMES = [
  { name: "Splendor", value: 28, color: "oklch(0.505 0.213 27.518)" },
  { name: "Catan", value: 22, color: "oklch(0.685 0.169 237.323)" },
  { name: "Wingspan", value: 18, color: "oklch(0.828 0.111 230.318)" },
  { name: "Azul", value: 14, color: "oklch(0.588 0.158 241.966)" },
  { name: "Khác", value: 18, color: "oklch(0.7 0.04 250)" },
];

const RECENT_SESSIONS = [
  {
    id: "S-2410",
    board: "Splendor",
    players: 4,
    startedAt: "20:32",
    durationMin: 47,
    status: "ongoing" as const,
    amount: 158_000,
  },
  {
    id: "S-2409",
    board: "Catan",
    players: 3,
    startedAt: "19:48",
    durationMin: 82,
    status: "settled" as const,
    amount: 240_000,
  },
  {
    id: "S-2408",
    board: "Wingspan",
    players: 2,
    startedAt: "18:55",
    durationMin: 64,
    status: "settled" as const,
    amount: 128_000,
  },
  {
    id: "S-2407",
    board: "Azul",
    players: 4,
    startedAt: "18:12",
    durationMin: 38,
    status: "settled" as const,
    amount: 96_000,
  },
  {
    id: "S-2406",
    board: "Splendor",
    players: 4,
    startedAt: "17:30",
    durationMin: 55,
    status: "settled" as const,
    amount: 165_000,
  },
];

const HOURLY_PEAK = [
  { hour: "10", occupancy: 12 },
  { hour: "11", occupancy: 18 },
  { hour: "12", occupancy: 24 },
  { hour: "13", occupancy: 31 },
  { hour: "14", occupancy: 38 },
  { hour: "15", occupancy: 44 },
  { hour: "16", occupancy: 52 },
  { hour: "17", occupancy: 64 },
  { hour: "18", occupancy: 78 },
  { hour: "19", occupancy: 92 },
  { hour: "20", occupancy: 100 },
  { hour: "21", occupancy: 88 },
  { hour: "22", occupancy: 56 },
];

// ─── KPI strip ────────────────────────────────────────────────────
type Kpi = {
  label: string;
  value: string;
  unit?: string;
  delta?: { value: number; suffix: string };
  icon: React.ComponentType<{ className?: string }>;
  // Tinted halo color cho icon (semantic, không phải decoration)
  iconClass: string;
};

const KPIS: Kpi[] = [
  {
    label: "Doanh thu hôm nay",
    value: "4.680.000",
    unit: "đ",    delta: { value: 12, suffix: "% so với hôm qua" },
    icon: TrendingUp,
    iconClass: "text-primary bg-primary/10",
  },
  {
    label: "Phiên đang mở",
    value: "8",
    delta: { value: 3, suffix: " so với giờ này hôm qua" },
    icon: Gamepad2,
    iconClass: "text-blue-600 bg-blue-500/10",
  },
  {
    label: "Khách đã phục vụ",
    value: "29",
    delta: { value: 18, suffix: "% so với cùng kỳ tuần trước" },
    icon: Users,
    iconClass: "text-emerald-600 bg-emerald-500/10",
  },
  {
    label: "Công suất bàn",
    value: "73",
    unit: "%",
    delta: { value: -4, suffix: "% so với giờ cao điểm hôm qua" },
    icon: Coffee,
    iconClass: "text-amber-600 bg-amber-500/10",
  },
];

function KpiCard({ kpi }: { kpi: Kpi }) {
  const positive = (kpi.delta?.value ?? 0) >= 0;
  const Icon = kpi.icon;
  return (
    <Card size="sm">
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
        <CardDescription className="text-xs font-medium uppercase tracking-wide">
          {kpi.label}
        </CardDescription>
        <div
          className={cn(
            "flex h-8 w-8 items-center justify-center rounded-lg",
            kpi.iconClass,
          )}
          aria-hidden
        >
          <Icon className="h-4 w-4" />
        </div>
      </CardHeader>
      <CardContent>
        <div className="flex items-baseline gap-1">
          <span className="text-2xl font-bold tabular-nums">{kpi.value}</span>
          {kpi.unit && (
            <span className="text-base font-medium text-muted-foreground">
              {kpi.unit}
            </span>
          )}
        </div>
        {kpi.delta && (
          <p
            className={cn(
              "mt-1 flex items-center gap-1 text-xs",
              positive ? "text-emerald-600" : "text-destructive",
            )}
          >
            {positive ? (
              <ArrowUpRight className="h-3 w-3" aria-hidden />
            ) : (
              <ArrowDownRight className="h-3 w-3" aria-hidden />
            )}
            <span className="font-medium tabular-nums">
              {positive ? "+" : ""}
              {kpi.delta.value}
              {kpi.delta.suffix}
            </span>
          </p>
        )}
      </CardContent>
    </Card>
  );
}

// ─── Revenue chart (Bar) ─────────────────────────────────────────
function RevenueChartCard() {
  return (
    <Card>
      <CardHeader>
        <div className="space-y-1">
          <CardTitle className="flex items-center gap-2">
            <BarChart3 className="h-4 w-4 text-muted-foreground" aria-hidden />
            Doanh thu 7 ngày gần nhất
          </CardTitle>
          <CardDescription>
            Doanh thu theo ngày trong tuần này (Thứ 2 – Chủ nhật).
          </CardDescription>
        </div>
        <div className="flex flex-col items-end gap-1">
          <span className="text-2xl font-bold tabular-nums">22.530.000đ</span>
          <span className="text-xs text-muted-foreground">Tổng tuần</span>
        </div>
      </CardHeader>
      <CardContent>
        <div className="h-64 w-full">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart
              data={REVENUE_WEEK}
              margin={{ top: 8, right: 8, left: -8, bottom: 0 }}
            >
              <CartesianGrid
                stroke="oklch(0.93 0.007 106.5)"
                strokeDasharray="3 3"
                vertical={false}
              />
              <XAxis
                dataKey="day"
                axisLine={false}
                tickLine={false}
                tick={{ fill: "oklch(0.58 0.031 107.3)", fontSize: 12 }}
              />
              <YAxis
                axisLine={false}
                tickLine={false}
                tickFormatter={(v) => `${(v / 1_000_000).toFixed(1)}tr`}
                tick={{ fill: "oklch(0.58 0.031 107.3)", fontSize: 12 }}
                width={48}
              />
              <Tooltip
                cursor={{ fill: "oklch(0.505 0.213 27.518 / 0.08)" }}
                content={({ active, payload, label }) => {
                  if (!active || !payload?.length) return null;
                  const v = payload[0]?.value as number;
                  return (
                    <div className="rounded-lg border border-border/50 bg-background px-3 py-2 text-xs shadow-md">
                      <div className="font-medium">{label}</div>
                      <div className="mt-0.5 font-mono tabular-nums text-foreground">
                        {formatVnd(v)}
                      </div>
                    </div>
                  );
                }}
              />
              <Bar
                dataKey="revenue"
                fill="oklch(0.505 0.213 27.518)"
                radius={[6, 6, 0, 0]}
                maxBarSize={48}
              />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </CardContent>
    </Card>
  );
}

// ─── Hourly occupancy chart (Line/Area) ──────────────────────────
function OccupancyChartCard() {
  return (
    <Card>
      <CardHeader>
        <div className="space-y-1">
          <CardTitle className="flex items-center gap-2">
            <Clock className="h-4 w-4 text-muted-foreground" aria-hidden />
            Công suất bàn theo giờ
          </CardTitle>
          <CardDescription>
            Tỉ lệ bàn có khách trong ngày hôm nay (10:00 – 22:00).
          </CardDescription>
        </div>
        <div className="flex flex-col items-end gap-1">
          <span className="text-2xl font-bold tabular-nums">100%</span>
          <span className="text-xs text-muted-foreground">Cao điểm 20:00</span>
        </div>
      </CardHeader>
      <CardContent>
        <div className="h-64 w-full">
          <ResponsiveContainer width="100%" height="100%">
            <LineChart
              data={HOURLY_PEAK}
              margin={{ top: 8, right: 8, left: -8, bottom: 0 }}
            >
              <CartesianGrid
                stroke="oklch(0.93 0.007 106.5)"
                strokeDasharray="3 3"
                vertical={false}
              />
              <XAxis
                dataKey="hour"
                axisLine={false}
                tickLine={false}
                tickFormatter={(v) => `${v}h`}
                tick={{ fill: "oklch(0.58 0.031 107.3)", fontSize: 12 }}
              />
              <YAxis
                axisLine={false}
                tickLine={false}
                tickFormatter={(v) => `${v}%`}
                tick={{ fill: "oklch(0.58 0.031 107.3)", fontSize: 12 }}
                width={42}
                domain={[0, 100]}
              />
              <Tooltip
                cursor={{
                  stroke: "oklch(0.505 0.213 27.518)",
                  strokeDasharray: "3 3",
                }}
                content={({ active, payload, label }) => {
                  if (!active || !payload?.length) return null;
                  const v = payload[0]?.value as number;
                  return (
                    <div className="rounded-lg border border-border/50 bg-background px-3 py-2 text-xs shadow-md">
                      <div className="font-medium">{label}h</div>
                      <div className="mt-0.5 font-mono tabular-nums text-foreground">
                        {v}% bàn có khách
                      </div>
                    </div>
                  );
                }}
              />
              <Line
                type="monotone"
                dataKey="occupancy"
                stroke="oklch(0.505 0.213 27.518)"
                strokeWidth={2.25}
                dot={{ r: 3, fill: "oklch(0.505 0.213 27.518)" }}
                activeDot={{ r: 5 }}
              />
            </LineChart>
          </ResponsiveContainer>
        </div>
      </CardContent>
    </Card>
  );
}

// ─── Top board games (Donut) ─────────────────────────────────────
function TopGamesCard() {
  return (
    <Card>
      <CardHeader>
        <div className="space-y-1">
          <CardTitle className="flex items-center gap-2">
            <Gamepad2 className="h-4 w-4 text-muted-foreground" aria-hidden />
            Top board game được thuê
          </CardTitle>
          <CardDescription>Tháng này — tính theo số phiên.</CardDescription>
        </div>
      </CardHeader>
      <CardContent>
        <div className="flex flex-col items-center gap-4 lg:flex-row lg:items-start lg:gap-6">
          <div className="relative h-44 w-44 shrink-0">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={TOP_BOARD_GAMES}
                  dataKey="value"
                  nameKey="name"
                  innerRadius={48}
                  outerRadius={80}
                  paddingAngle={2}
                  strokeWidth={0}
                >
                  {TOP_BOARD_GAMES.map((g) => (
                    <Cell key={g.name} fill={g.color} />
                  ))}
                </Pie>
                <Tooltip
                  content={({ active, payload }) => {
                    if (!active || !payload?.length) return null;
                    const p = payload[0]?.payload as { name: string; value: number };
                    return (
                      <div className="rounded-lg border border-border/50 bg-background px-3 py-2 text-xs shadow-md">
                        <div className="font-medium">{p.name}</div>
                        <div className="mt-0.5 font-mono tabular-nums text-foreground">
                          {p.value} phiên
                        </div>
                      </div>
                    );
                  }}
                />
              </PieChart>
            </ResponsiveContainer>
            <div className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center">
              <span className="text-2xl font-bold tabular-nums">142</span>
              <span className="text-[10px] uppercase tracking-wide text-muted-foreground">
                Phiên
              </span>
            </div>
          </div>
          <ul className="flex w-full flex-col gap-2 text-sm lg:flex-1">
            {TOP_BOARD_GAMES.map((g) => (
              <li
                key={g.name}
                className="flex items-center justify-between gap-3"
              >
                <span className="flex items-center gap-2 min-w-0">
                  <span
                    aria-hidden
                    className="h-2.5 w-2.5 shrink-0 rounded-sm"
                    style={{ backgroundColor: g.color }}
                  />
                  <span className="truncate">{g.name}</span>
                </span>
                <span className="font-mono tabular-nums text-muted-foreground">
                  {g.value}%
                </span>
              </li>
            ))}
          </ul>
        </div>
      </CardContent>
    </Card>
  );
}

// ─── Recent sessions (live list) ─────────────────────────────────
function RecentSessionsCard() {
  return (
    <Card>
      <CardHeader>
        <div className="space-y-1">
          <CardTitle className="flex items-center gap-2">
            <Timer className="h-4 w-4 text-muted-foreground" aria-hidden />
            Phiên chơi gần đây
          </CardTitle>
          <CardDescription>5 phiên mới nhất trong ca tối nay.</CardDescription>
        </div>
        <Button
          variant="ghost"
          size="sm"
          className="h-8 px-2 text-xs font-medium text-muted-foreground"
          asChild
        >
          <a href="/manager/pos">Mở POS</a>
        </Button>
      </CardHeader>
      <CardContent>
        <ul className="divide-y divide-border/60">
          {RECENT_SESSIONS.map((s) => {
            const ongoing = s.status === "ongoing";
            return (
              <li
                key={s.id}
                className="flex items-center gap-3 py-2.5 first:pt-0 last:pb-0"
              >
                <div
                  className={cn(
                    "flex h-9 w-9 shrink-0 items-center justify-center rounded-lg",
                    ongoing
                      ? "bg-emerald-500/10 text-emerald-600"
                      : "bg-muted text-muted-foreground",
                  )}
                  aria-hidden
                >
                  {ongoing ? (
                    <Sparkles className="h-4 w-4" />
                  ) : (
                    <CheckCircle2 className="h-4 w-4" />
                  )}
                </div>
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2">
                    <span className="font-medium truncate">{s.board}</span>
                    <span className="text-xs text-muted-foreground tabular-nums">
                      · {s.players} người
                    </span>
                    {ongoing && (
                      <Badge
                        variant="secondary"
                        className="h-5 px-1.5 text-[10px] font-medium bg-emerald-500/10 text-emerald-700"
                      >
                        Đang chơi
                      </Badge>
                    )}
                  </div>
                  <div className="mt-0.5 flex items-center gap-2 text-xs text-muted-foreground">
                    <span className="font-mono tabular-nums">{s.id}</span>
                    <span>·</span>
                    <span className="tabular-nums">bắt đầu {s.startedAt}</span>
                    <span>·</span>
                    <span className="tabular-nums">{s.durationMin} phút</span>
                  </div>
                </div>
                <div className="shrink-0 text-right">
                  <div className="font-mono text-sm font-medium tabular-nums">
                    {formatVnd(s.amount)}
                  </div>
                </div>
              </li>
            );
          })}
        </ul>
      </CardContent>
    </Card>
  );
}

// ─── Demo banner ─────────────────────────────────────────────────
// Tách khỏi grid để không bị trộn với data thật (nếu sau này BE có
// data). Banner này sẽ bị xoá khi hook dữ liệu thật được wire vào.
function DemoDataBanner() {
  return (
    <div
      role="status"
      aria-live="polite"
      className="flex flex-wrap items-center gap-2 rounded-lg border border-amber-300/60 bg-amber-50/70 px-3 py-2 text-xs text-amber-900"
    >
      <Sparkles className="h-3.5 w-3.5 shrink-0" aria-hidden />
      <span className="font-medium">Dữ liệu mẫu.</span>
      <span className="text-amber-800/80">
        Biểu đồ và số liệu trên dashboard là mock để xem trước giao diện.
        Sẽ thay bằng dữ liệu thật khi BE cung cấp API doanh thu.
      </span>
    </div>
  );
}

// ─── Public surface ──────────────────────────────────────────────
export function ManagerDashboardOverview() {
  return (
    <div className="flex flex-col gap-4 sm:gap-6">
      <DemoDataBanner />

      {/* KPI strip */}
      <div
        className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4"
        aria-label="Số liệu tổng quan"
      >
        {KPIS.map((k) => (
          <KpiCard key={k.label} kpi={k} />
        ))}
      </div>

      {/* Chart row — revenue (2/3) + occupancy (1/3) */}
      <div className="grid gap-4 lg:grid-cols-3">
        <div className="lg:col-span-2">
          <RevenueChartCard />
        </div>
        <div>
          <OccupancyChartCard />
        </div>
      </div>

      {/* Bottom row — top games (1/3) + recent sessions (2/3) */}
      <div className="grid gap-4 lg:grid-cols-3">
        <div>
          <TopGamesCard />
        </div>
        <div className="lg:col-span-2">
          <RecentSessionsCard />
        </div>
      </div>

      {/* Footer hint: nav to other surfaces */}
      <div className="grid gap-3 sm:grid-cols-3">
        <a
          href="/manager/pos"
          className="group flex items-center justify-between gap-3 rounded-lg border border-border/60 bg-card px-4 py-3 text-sm transition-colors hover:bg-muted/40"
        >
          <span className="flex items-center gap-2.5">
            <Coffee
              className="h-4 w-4 text-muted-foreground group-hover:text-foreground"
              aria-hidden
            />
            <span className="font-medium">Mở POS ca tối</span>
          </span>
          <ArrowUpRight
            className="h-3.5 w-3.5 text-muted-foreground group-hover:text-foreground"
            aria-hidden
          />
        </a>
        <a
          href="/manager/operational-profile"
          className="group flex items-center justify-between gap-3 rounded-lg border border-border/60 bg-card px-4 py-3 text-sm transition-colors hover:bg-muted/40"
        >
          <span className="flex items-center gap-2.5">
            <Gamepad2
              className="h-4 w-4 text-muted-foreground group-hover:text-foreground"
              aria-hidden
            />
            <span className="font-medium">Hồ sơ vận hành</span>
          </span>
          <ArrowUpRight
            className="h-3.5 w-3.5 text-muted-foreground group-hover:text-foreground"
            aria-hidden
          />
        </a>
        <a
          href="/manager/tournaments"
          className="group flex items-center justify-between gap-3 rounded-lg border border-border/60 bg-card px-4 py-3 text-sm transition-colors hover:bg-muted/40"
        >
          <span className="flex items-center gap-2.5">
            <Calendar
              className="h-4 w-4 text-muted-foreground group-hover:text-foreground"
              aria-hidden
            />
            <span className="font-medium">Giải đấu sắp tới</span>
          </span>
          <ArrowUpRight
            className="h-3.5 w-3.5 text-muted-foreground group-hover:text-foreground"
            aria-hidden
          />
        </a>
      </div>
    </div>
  );
}
