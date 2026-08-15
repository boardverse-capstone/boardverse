"use client";

import { useCallback, useEffect, useState } from "react";
import { CalendarClock, RefreshCw, QrCode, DoorOpen } from "lucide-react";
import { Button } from "@/components/ui/button";
import { apiClient } from "@/core/api/client";
import { PosCheckInService } from "@/features/pos-check-in/services/pos-check-in.service";
import type { TableBooking } from "@/features/pos-check-in/types/pos-check-in.interface";

interface PendingBookingsPanelProps {
  cafeId: string | null;
  onUseBookingCode: (code: string) => void;
  onOpenTables?: () => void;
}

interface WalkInWindowDto {
  id: string;
  sourceReservationId?: string;
  windowStart?: string;
  windowEnd?: string;
  totalSeats?: number;
  availableSeats?: number;
  status?: string;
  expiresAt?: string;
}

function formatTime(iso?: string | null) {
  if (!iso) return "—";
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return iso;
  return date.toLocaleString("vi-VN", {
    hour: "2-digit",
    minute: "2-digit",
    day: "2-digit",
    month: "2-digit",
  });
}

function todayIsoDate() {
  const d = new Date();
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

function parseWalkInWindows(raw: unknown): WalkInWindowDto[] {
  if (!raw) return [];
  if (Array.isArray(raw)) return raw as WalkInWindowDto[];
  const r = raw as Record<string, unknown>;
  const items = r.items ?? r.Items ?? r.data;
  if (Array.isArray(items)) return items as WalkInWindowDto[];
  if (items && typeof items === "object") {
    const nested = (items as Record<string, unknown>).items;
    if (Array.isArray(nested)) return nested as WalkInWindowDto[];
  }
  return [];
}

/** Quá 30 phút sau giờ hẹn — ngoài early-grace, job BE sẽ NoShow + mất cọc nếu không check-in. */
function isPastArrivalGrace(scheduledAt?: string | null) {
  if (!scheduledAt) return false;
  const start = new Date(scheduledAt).getTime();
  if (Number.isNaN(start)) return false;
  return Date.now() > start + 30 * 60 * 1000;
}

export function PendingBookingsPanel({
  cafeId,
  onUseBookingCode,
  onOpenTables,
}: PendingBookingsPanelProps) {
  const [bookings, setBookings] = useState<TableBooking[]>([]);
  const [windows, setWindows] = useState<WalkInWindowDto[]>([]);
  const [loading, setLoading] = useState(false);

  const load = useCallback(async () => {
    if (!cafeId) return;
    setLoading(true);
    try {
      const pending = await PosCheckInService.getPendingBookings(cafeId).catch(
        () => [] as TableBooking[],
      );
      const walkInRaw = await apiClient
        .get("/api/v1/reservations/walkin/windows", {
          params: { cafeId, date: todayIsoDate() },
        })
        .catch(() => null);
      setBookings(pending);
      setWindows(parseWalkInWindows(walkInRaw));
    } catch {
      setBookings([]);
    } finally {
      setLoading(false);
    }
  }, [cafeId]);

  useEffect(() => {
    void load();
    const id = window.setInterval(() => void load(), 60_000);
    return () => window.clearInterval(id);
  }, [load]);

  if (!cafeId) return null;

  const openWindows = windows.filter((w) => {
    const st = String(w.status || "").toLowerCase();
    return !st || st === "available" || st === "partial";
  });

  return (
    <div className="space-y-3">
      <div className="space-y-3 rounded-2xl border border-neutral-200 bg-white p-4 shadow-2xs">
        <div className="flex items-center justify-between gap-2">
          <h3 className="flex items-center gap-1.5 text-xs font-bold uppercase tracking-wider text-neutral-900">
            <CalendarClock className="h-4 w-4 text-neutral-600" />
            Booking chờ check-in ({bookings.length})
          </h3>
          <Button
            type="button"
            size="sm"
            variant="outline"
            onClick={() => void load()}
            disabled={loading}
            className="h-7 border-neutral-200 px-2 text-[10px] font-bold"
          >
            <RefreshCw className={`mr-1 h-3 w-3 ${loading ? "animate-spin" : ""}`} />
            Làm mới
          </Button>
        </div>

        {loading && bookings.length === 0 ? (
          <p className="py-4 text-center text-[11px] text-neutral-400">Đang tải...</p>
        ) : bookings.length === 0 ? (
          <p className="rounded-xl border border-dashed border-neutral-200 py-6 text-center text-[11px] text-neutral-400">
            Không có booking đang chờ.
          </p>
        ) : (
          <div className="max-h-56 space-y-2 overflow-y-auto pr-1">
            {bookings.map((booking) => {
              const code =
                booking.reservationCode ||
                booking.bookingCode ||
                booking.qrCode ||
                booking.id;
              const late = isPastArrivalGrace(booking.scheduledAt);
              return (
                <div
                  key={booking.id}
                  className={`flex flex-wrap items-center justify-between gap-2 rounded-xl border px-3 py-2.5 ${
                    late
                      ? "border-amber-300 bg-amber-50/70"
                      : "border-neutral-200 bg-neutral-50/60"
                  }`}
                >
                  <div className="min-w-0 space-y-0.5">
                    <p className="truncate text-xs font-bold text-neutral-950">
                      {booking.tableLabel || "Bàn"} ·{" "}
                      {booking.bookedGame?.name || "Booking"}
                    </p>
                    <p className="font-mono text-[10px] text-neutral-500">
                      {formatTime(booking.scheduledAt)} · {code}
                    </p>
                    {late && (
                      <p className="text-[10px] font-semibold text-amber-800">
                        Đã quá 30 phút sau giờ hẹn. Nếu không check-in, BE tự
                        NoShow — hủy bàn và mất cọc.
                      </p>
                    )}
                  </div>
                  <Button
                    type="button"
                    size="sm"
                    onClick={() => onUseBookingCode(String(code))}
                    className="h-7 bg-neutral-950 px-2 text-[10px] font-bold uppercase text-white"
                  >
                    <QrCode className="mr-1 h-3 w-3" />
                    Dùng mã
                  </Button>
                </div>
              );
            })}
          </div>
        )}
      </div>

      <div className="space-y-3 rounded-2xl border border-emerald-200 bg-emerald-50/40 p-4 shadow-2xs">
        <h3 className="flex items-center gap-1.5 text-xs font-bold uppercase tracking-wider text-emerald-900">
          <DoorOpen className="h-4 w-4" />
          Slot walk-in (no-show / trả sớm) ({openWindows.length})
        </h3>
        <p className="text-[10px] leading-relaxed text-emerald-800/80">
          Job BE hủy bàn + mất cọc khi khách không tới. Slot bung hiện ở đây —
          mở bàn walk-in trên sơ đồ (không cọc, thu lúc thanh toán).
        </p>
        {openWindows.length === 0 ? (
          <p className="rounded-xl border border-dashed border-emerald-200 py-4 text-center text-[11px] text-emerald-800/60">
            Chưa có cửa sổ walk-in hôm nay.
          </p>
        ) : (
          <div className="max-h-40 space-y-2 overflow-y-auto pr-1">
            {openWindows.map((w) => (
              <div
                key={w.id}
                className="flex flex-wrap items-center justify-between gap-2 rounded-xl border border-emerald-200 bg-white px-3 py-2.5"
              >
                <div className="min-w-0 text-[11px]">
                  <p className="font-bold text-neutral-950">
                    Còn {w.availableSeats ?? "—"}/{w.totalSeats ?? "—"} ghế ·{" "}
                    {w.status || "Available"}
                  </p>
                  <p className="font-mono text-[10px] text-neutral-500">
                    {formatTime(w.windowStart)} → {formatTime(w.windowEnd)}
                  </p>
                </div>
                {onOpenTables && (
                  <Button
                    type="button"
                    size="sm"
                    variant="outline"
                    onClick={onOpenTables}
                    className="h-7 border-emerald-300 px-2 text-[10px] font-bold text-emerald-800"
                  >
                    Mở sơ đồ bàn
                  </Button>
                )}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
