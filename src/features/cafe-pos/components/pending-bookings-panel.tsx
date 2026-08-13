"use client";

import { useCallback, useEffect, useState } from "react";
import { CalendarClock, RefreshCw, QrCode } from "lucide-react";
import { Button } from "@/components/ui/button";
import { PosCheckInService } from "@/features/pos-check-in/services/pos-check-in.service";
import type { TableBooking } from "@/features/pos-check-in/types/pos-check-in.interface";

interface PendingBookingsPanelProps {
  cafeId: string | null;
  onUseBookingCode: (code: string) => void;
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

/** Danh sách booking chờ check-in — UI cafe-pos, API từ Staff service. */
export function PendingBookingsPanel({
  cafeId,
  onUseBookingCode,
}: PendingBookingsPanelProps) {
  const [bookings, setBookings] = useState<TableBooking[]>([]);
  const [loading, setLoading] = useState(false);

  const load = useCallback(async () => {
    if (!cafeId) return;
    setLoading(true);
    try {
      const data = await PosCheckInService.getPendingBookings(cafeId);
      setBookings(data);
    } catch {
      setBookings([]);
    } finally {
      setLoading(false);
    }
  }, [cafeId]);

  useEffect(() => {
    void load();
  }, [load]);

  if (!cafeId) return null;

  return (
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

      {loading ? (
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
            return (
              <div
                key={booking.id}
                className="flex flex-wrap items-center justify-between gap-2 rounded-xl border border-neutral-200 bg-neutral-50/60 px-3 py-2.5"
              >
                <div className="min-w-0 space-y-0.5">
                  <p className="truncate text-xs font-bold text-neutral-950">
                    {booking.tableLabel || "Bàn"} ·{" "}
                    {booking.bookedGame?.name || "Booking"}
                  </p>
                  <p className="font-mono text-[10px] text-neutral-500">
                    {formatTime(booking.scheduledAt)} · {code}
                  </p>
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
  );
}
