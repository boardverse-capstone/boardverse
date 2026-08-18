"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { CalendarClock, RefreshCw, QrCode, DoorOpen, Search } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { apiClient } from "@/core/api/client";
import { PosCheckInService } from "@/features/pos-check-in/services/pos-check-in.service";
import type {
  CafeReservationListItem,
  PosBookingPreview,
} from "@/features/pos-check-in/types/pos-check-in.interface";

interface PendingBookingsPanelProps {
  cafeId: string | null;
  tables?: Array<{ id?: string; name?: string; status?: string }>;
  boxes?: Array<{
    id: string;
    barcode: string;
    status: string;
    gameTemplateId: string | null;
    gameName: string | null;
  }>;
  scannedBarcode?: string;
  onOpenTables?: () => void;
  onConfirmCheckIn?: (
    code: string,
    cafeTableId: string,
    barcode: string,
  ) => Promise<boolean>;
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

interface ReservedTable {
  id: string;
  name: string;
  status: string;
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

function reservationToPreview(
  item: CafeReservationListItem,
): PosBookingPreview {
  const canCheckIn = item.status.trim().toLowerCase() === "confirmed";
  return {
    bookingCode: item.reservationCode,
    depositStatus: item.status,
    depositAmount: item.depositAmount,
    scheduledStartTime: item.scheduledStartTime,
    registeredMemberCount: item.currentPlayers,
    canCheckIn,
    hostName: null,
    gameName: item.gameName,
    lobbyId: item.lobbyId,
    raw: item,
  };
}

function getCheckInStatusMessage(status?: string | null) {
  switch (status?.trim().toLowerCase()) {
    case "confirmed":
      return "Sẵn sàng check-in";
    case "expired":
      return "Đã hết hạn — không thể check-in";
    case "holding":
      return "Chưa đủ điều kiện check-in";
    case "checkedin":
      return "Reservation đã được check-in";
    case "cancelled":
    case "cancelledbycafe":
    case "cancelledbyplayer":
      return "Reservation đã bị hủy";
    default:
      return "Trạng thái hiện tại chưa cho phép check-in";
  }
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

function parseTables(raw: unknown): ReservedTable[] {
  const list = Array.isArray(raw)
    ? raw
    : raw && typeof raw === "object"
      ? ((raw as Record<string, unknown>).data as unknown[]) || []
      : [];
  if (!Array.isArray(list)) return [];
  return list
    .map((item) => {
      const r = item as Record<string, unknown>;
      return {
        id: String(r.id ?? r.Id ?? ""),
        name: String(r.name ?? r.Name ?? "Bàn"),
        status: String(r.status ?? r.Status ?? ""),
      };
    })
    .filter((t) => t.id);
}

export function PendingBookingsPanel({
  cafeId,
  tables = [],
  boxes = [],
  scannedBarcode = "",
  onOpenTables,
  onConfirmCheckIn,
}: PendingBookingsPanelProps) {
  const [code, setCode] = useState("");
  const [preview, setPreview] = useState<PosBookingPreview | null>(null);
  const [tableId, setTableId] = useState("");
  const [barcode, setBarcode] = useState("");
  const [reserved, setReserved] = useState<ReservedTable[]>([]);
  const [reservations, setReservations] = useState<CafeReservationListItem[]>([]);
  const [windows, setWindows] = useState<WalkInWindowDto[]>([]);
  const [loading, setLoading] = useState(false);
  const [lookingUp, setLookingUp] = useState(false);
  const [checkingIn, setCheckingIn] = useState(false);

  const assignableTables = useMemo(() => {
    const fromProp = tables.filter((t) => {
      const st = String(t.status || "").toLowerCase();
      return t.id && (st === "available" || st === "reserved" || !st);
    });
    if (fromProp.length > 0) return fromProp;
    return reserved;
  }, [tables, reserved]);

  const selectedReservation = useMemo(
    () =>
      reservations.find(
        (item) =>
          item.reservationCode.toUpperCase() === code.trim().toUpperCase(),
      ),
    [code, reservations],
  );

  const availableBoxes = useMemo(() => {
    const available = boxes.filter(
      (box) => box.status.toLowerCase() === "available" && box.barcode,
    );
    if (!selectedReservation?.gameId) return available;
    return available.filter(
      (box) => box.gameTemplateId === selectedReservation.gameId,
    );
  }, [boxes, selectedReservation]);

  const load = useCallback(async () => {
    if (!cafeId) return;
    setLoading(true);
    try {
      const [tablesRaw, walkInRaw, cafeReservations] = await Promise.all([
        apiClient
          .get(`/api/cafes/${cafeId}/pos/tables`, {
            params: { includeOnlyAvailable: false, statuses: "Reserved" },
          })
          .catch(() => null),
        apiClient
          .get("/api/v1/reservations/walkin/windows", {
            params: { cafeId, date: todayIsoDate() },
          })
          .catch(() => null),
        PosCheckInService.getCafeReservations({
          cafeId,
          playDate: todayIsoDate(),
          page: 1,
          pageSize: 50,
        }).catch(() => [] as CafeReservationListItem[]),
      ]);
      setReserved(parseTables(tablesRaw));
      setWindows(parseWalkInWindows(walkInRaw));
      setReservations(cafeReservations);
    } finally {
      setLoading(false);
    }
  }, [cafeId]);

  useEffect(() => {
    void load();
    const id = window.setInterval(() => void load(), 60_000);
    return () => window.clearInterval(id);
  }, [load]);

  useEffect(() => {
    if (scannedBarcode.trim()) setBarcode(scannedBarcode.trim());
  }, [scannedBarcode]);

  useEffect(() => {
    if (
      barcode &&
      !availableBoxes.some((box) => box.barcode === barcode)
    ) {
      setBarcode("");
    }
  }, [availableBoxes, barcode]);

  if (!cafeId) return null;

  const openWindows = windows.filter((w) => {
    const st = String(w.status || "").toLowerCase();
    return !st || st === "available" || st === "partial";
  });

  const handleLookup = async () => {
    const trimmed = code.trim();
    if (!trimmed) {
      toast.error("Nhập ReservationCode 8 ký tự.");
      return;
    }
    setLookingUp(true);
    const item = reservations.find(
      (reservation) =>
        reservation.reservationCode.toUpperCase() === trimmed.toUpperCase(),
    );
    if (item) {
      setPreview(reservationToPreview(item));
      setCode(item.reservationCode.toUpperCase());
    } else {
      setPreview(null);
      toast.error("Không tìm thấy ReservationCode trong danh sách của quán.");
    }
    setLookingUp(false);
  };

  const handleSelectReservation = (item: CafeReservationListItem) => {
    const nextCode = item.reservationCode.trim();
    if (!nextCode) {
      toast.error("Đơn này chưa có ReservationCode.");
      return;
    }
    setCode(nextCode.toUpperCase());
    setPreview(reservationToPreview(item));
  };

  const handleCheckIn = async () => {
    const trimmed = (preview?.bookingCode || code).trim();
    if (!onConfirmCheckIn || !trimmed) return;
    if (!tableId) {
      toast.error("Chọn bàn để nhận khách.");
      return;
    }
    if (!barcode.trim()) {
      toast.error("Quét barcode hộp game trước khi check-in.");
      return;
    }
    setCheckingIn(true);
    const ok = await onConfirmCheckIn(trimmed, tableId, barcode.trim());
    setCheckingIn(false);
    if (ok) {
      setPreview(null);
      setCode("");
      await load();
    }
  };

  return (
    <div className="space-y-3">
      <div className="space-y-3 rounded-2xl border border-neutral-200 bg-white p-4 shadow-2xs">
        <div className="flex items-center justify-between gap-2">
          <h3 className="flex items-center gap-1.5 text-xs font-bold uppercase tracking-wider text-neutral-900">
            <CalendarClock className="h-4 w-4 text-neutral-600" />
            Khách đặt chỗ — check-in
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

        <p className="text-[10px] text-neutral-500">
          Chọn đơn hôm nay hoặc nhập ReservationCode 8 ký tự trên QR khách.
        </p>

        <div className="flex flex-wrap gap-2">
          <Input
            value={code}
            onChange={(e) => setCode(e.target.value.toUpperCase())}
            onKeyDown={(e) => {
              if (e.key === "Enter") {
                e.preventDefault();
                void handleLookup();
              }
            }}
            placeholder="VD: K7H3NP9X"
            className="h-8 min-w-[160px] flex-1 font-mono text-xs"
          />
          <Button
            type="button"
            size="sm"
            variant="outline"
            disabled={lookingUp}
            onClick={() => void handleLookup()}
            className="h-8 text-[10px] font-bold"
          >
            <Search className="mr-1 h-3 w-3" />
            {lookingUp ? "Đang tìm..." : "Tra cứu"}
          </Button>
        </div>

        {preview && (
          <div className="space-y-2 rounded-xl border border-neutral-200 bg-neutral-50/80 p-3">
            <p className="text-xs font-bold text-neutral-950">
              {preview.gameName || "Đặt chỗ"} · {preview.hostName || "Host"}
            </p>
            <p className="font-mono text-[10px] text-neutral-500">
              {formatTime(preview.scheduledStartTime)} · {preview.bookingCode} ·{" "}
              {preview.registeredMemberCount} khách
              {preview.depositStatus
                ? ` · trạng thái ${preview.depositStatus}`
                : ""}
            </p>
            <p className="text-[10px] font-semibold">
              {preview.canCheckIn ? (
                <span className="text-emerald-700">Sẵn sàng check-in</span>
              ) : (
                <span className="text-amber-700">
                  {getCheckInStatusMessage(preview.depositStatus)}
                </span>
              )}
            </p>

            {preview.canCheckIn && (
              <div className="flex flex-wrap gap-2 pt-1">
                <select
                  value={tableId}
                  onChange={(e) => setTableId(e.target.value)}
                  className="h-8 min-w-[140px] flex-1 rounded-md border border-neutral-200 bg-white px-2 text-xs"
                >
                  <option value="">Chọn bàn</option>
                  {assignableTables.map((t) => (
                    <option key={t.id} value={t.id}>
                      {t.name}
                      {t.status ? ` · ${t.status}` : ""}
                    </option>
                  ))}
                </select>
                <select
                  value={barcode}
                  onChange={(e) => setBarcode(e.target.value)}
                  className="h-8 min-w-[180px] flex-1 rounded-md border border-neutral-200 bg-white px-2 font-mono text-xs"
                >
                  <option value="">Chọn hộp game</option>
                  {availableBoxes.map((box) => (
                    <option key={box.id} value={box.barcode}>
                      {box.gameName ||
                        selectedReservation?.gameName ||
                        "Hộp game"}{" "}
                      · {box.barcode}
                    </option>
                  ))}
                </select>
                <Button
                  type="button"
                  size="sm"
                  disabled={checkingIn}
                  onClick={() => void handleCheckIn()}
                  className="h-8 bg-neutral-950 px-3 text-[10px] font-bold text-white"
                >
                  <QrCode className="mr-1 h-3 w-3" />
                  {checkingIn ? "Đang check-in..." : "Xác nhận check-in"}
                </Button>
              </div>
            )}
          </div>
        )}

        <div className="space-y-1.5">
          <p className="text-[10px] font-bold uppercase tracking-wide text-neutral-500">
            Reservation hôm nay ({reservations.length})
          </p>
          {loading && reservations.length === 0 ? (
            <p className="text-[11px] text-neutral-400">Đang tải...</p>
          ) : reservations.length === 0 ? (
            <p className="rounded-xl border border-dashed border-neutral-200 py-4 text-center text-[11px] text-neutral-400">
              Không có reservation ngày hôm nay.
            </p>
          ) : (
            <div className="max-h-52 space-y-2 overflow-y-auto pr-1">
              {reservations.map((item) => (
                <button
                  key={item.id}
                  type="button"
                  onClick={() => handleSelectReservation(item)}
                  aria-pressed={selectedReservation?.id === item.id}
                  className={`flex w-full items-start justify-between gap-2 rounded-xl border bg-neutral-50/60 px-3 py-2 text-left transition ${
                    selectedReservation?.id === item.id
                      ? "border-2 border-emerald-500 bg-emerald-50/60 ring-2 ring-emerald-200"
                      : "border-neutral-200 hover:border-neutral-400"
                  }`}
                >
                  <div className="min-w-0">
                    <p className="truncate text-xs font-bold text-neutral-950">
                      {item.gameName} · {item.timeSlot}
                    </p>
                    <p className="font-mono text-[10px] text-neutral-500">
                      {item.reservationCode || "—"} · {item.currentPlayers}/
                      {item.maxPlayers} · {item.status}
                      {item.tableNumber ? ` · Bàn ${item.tableNumber}` : ""}
                    </p>
                    <p className="text-[10px] text-neutral-400">
                      {formatTime(item.scheduledStartTime)} →{" "}
                      {formatTime(item.scheduledEndTime)}
                    </p>
                  </div>
                  <span className="shrink-0 text-[10px] font-bold uppercase text-neutral-600">
                    Check-in
                  </span>
                </button>
              ))}
            </div>
          )}
        </div>

        <div className="space-y-1.5">
          <p className="text-[10px] font-bold uppercase tracking-wide text-neutral-500">
            Bàn đang giữ chỗ ({reserved.length})
          </p>
          {loading && reserved.length === 0 ? (
            <p className="text-[11px] text-neutral-400">Đang tải...</p>
          ) : reserved.length === 0 ? (
            <p className="rounded-xl border border-dashed border-neutral-200 py-4 text-center text-[11px] text-neutral-400">
              Không có bàn Reserved. Nhập mã khách phía trên để check-in.
            </p>
          ) : (
            <div className="max-h-40 space-y-2 overflow-y-auto pr-1">
              {reserved.map((table) => (
                <div
                  key={table.id}
                  className="flex items-center justify-between rounded-xl border border-neutral-200 bg-neutral-50/60 px-3 py-2"
                >
                  <p className="text-xs font-bold text-neutral-950">{table.name}</p>
                  <span className="text-[10px] font-bold uppercase text-amber-700">
                    {table.status}
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      <div className="space-y-3 rounded-2xl border border-emerald-200 bg-emerald-50/40 p-4 shadow-2xs">
        <h3 className="flex items-center gap-1.5 text-xs font-bold uppercase tracking-wider text-emerald-900">
          <DoorOpen className="h-4 w-4" />
          Slot walk-in (no-show / trả sớm) ({openWindows.length})
        </h3>
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
