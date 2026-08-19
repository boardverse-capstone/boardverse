"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { CalendarClock, RefreshCw, QrCode, DoorOpen, Search } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import {
  Card,
  CardAction,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { apiClient } from "@/core/api/client";
import { PosCheckInService } from "@/features/pos-check-in/services/pos-check-in.service";
import type {
  CafeReservationListItem,
  PosBookingPreview,
} from "@/features/pos-check-in/types/pos-check-in.interface";
import {
  addDaysIsoDate,
  formatReservationDayLabel,
  todayIsoDate,
} from "../lib/reservation-date";

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
  initialBookingCode?: string;
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

// Tạm bật để QA có thể gửi request check-in với mọi trạng thái reservation.
// Đổi thành false sau khi test xong để UI tiếp tục tuân theo preview.canCheckIn.
const SHOW_CHECK_IN_CONTROLS_FOR_TESTING = true;
const SHOW_WALK_IN_WINDOWS = false;

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

function normalizePlayDate(value?: string | null): string {
  if (!value) return todayIsoDate();
  return value.slice(0, 10);
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
  initialBookingCode = "",
  onOpenTables,
  onConfirmCheckIn,
}: PendingBookingsPanelProps) {
  const [code, setCode] = useState(initialBookingCode.toUpperCase());
  const [preview, setPreview] = useState<PosBookingPreview | null>(null);
  const [tableId, setTableId] = useState("");
  const [barcode, setBarcode] = useState("");
  const [reserved, setReserved] = useState<ReservedTable[]>([]);
  const [reservations, setReservations] = useState<CafeReservationListItem[]>([]);
  const [windows, setWindows] = useState<WalkInWindowDto[]>([]);
  const [loading, setLoading] = useState(false);
  const [lookingUp, setLookingUp] = useState(false);
  const [checkingIn, setCheckingIn] = useState(false);
  const appliedInitialCode = useRef(false);
  const todayIso = todayIsoDate();
  const tomorrowIso = addDaysIsoDate(todayIso, 1);
  const [playDate, setPlayDate] = useState(todayIso);
  const reservationDayLabel = formatReservationDayLabel(playDate, todayIso);

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
            params: { cafeId, date: playDate },
          })
          .catch(() => null),
        PosCheckInService.getCafeReservations({
          cafeId,
          playDate,
          page: 1,
          pageSize: 50,
        }).catch(() => [] as CafeReservationListItem[]),
      ]);
      setReserved(parseTables(tablesRaw));
      setWindows(parseWalkInWindows(walkInRaw));
      setReservations(cafeReservations);
      if (initialBookingCode && !appliedInitialCode.current) {
        appliedInitialCode.current = true;
        const initialReservation = cafeReservations.find(
          (reservation) =>
            reservation.reservationCode.toUpperCase() ===
            initialBookingCode.trim().toUpperCase(),
        );
        if (initialReservation) {
          setCode(initialReservation.reservationCode.toUpperCase());
          setPreview(reservationToPreview(initialReservation));
        }
      }
    } finally {
      setLoading(false);
    }
  }, [cafeId, initialBookingCode, playDate]);

  const handlePlayDateChange = (nextDate: string) => {
    setPlayDate(nextDate);
    setPreview(null);
    setCode("");
  };

  useEffect(() => {
    // Initial fetch and polling intentionally synchronize remote POS state.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    void load();
    const id = window.setInterval(() => void load(), 60_000);
    return () => window.clearInterval(id);
  }, [load]);

  useEffect(() => {
    // Barcode scanner state is owned by the parent POS workspace.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    if (scannedBarcode.trim()) setBarcode(scannedBarcode.trim());
  }, [scannedBarcode]);

  useEffect(() => {
    if (
      barcode &&
      !availableBoxes.some((box) => box.barcode === barcode)
    ) {
      // Keep the selected box valid when the reservation filter changes.
      // eslint-disable-next-line react-hooks/set-state-in-effect
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
    if (!cafeId) return;

    setLookingUp(true);
    try {
      let item =
        reservations.find(
          (reservation) =>
            reservation.reservationCode.toUpperCase() === trimmed.toUpperCase(),
        ) ?? null;

      if (!item) {
        item = await PosCheckInService.findCafeReservationByCode({
          cafeId,
          code: trimmed,
          playDate,
        });
      }

      if (item) {
        const itemPlayDate = normalizePlayDate(item.playDate);
        const switchedDay = itemPlayDate !== playDate;
        if (switchedDay) {
          setPlayDate(itemPlayDate);
        }
        setPreview(reservationToPreview(item));
        setCode(item.reservationCode.toUpperCase());
        if (switchedDay) {
          toast.message(`Đơn thuộc ngày ${formatReservationDayLabel(itemPlayDate, todayIso)}.`);
        }
      } else {
        setPreview(null);
        toast.error("Không tìm thấy ReservationCode trong danh sách của quán.");
      }
    } finally {
      setLookingUp(false);
    }
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
    <div className="space-y-4">
      <Card size="sm">
        <CardHeader className="border-b">
          <div>
            <CardTitle className="flex items-center gap-2 text-base">
              <CalendarClock className="size-4 text-neutral-600" />
              Tiếp nhận khách đặt chỗ
            </CardTitle>
            <p className="mt-1 text-sm text-neutral-500">
              Chọn ngày chơi hoặc nhập mã 8 ký tự trên QR của khách.
            </p>
          </div>
          <CardAction>
            <Button
              type="button"
              variant="outline"
              onClick={() => void load()}
              disabled={loading}
              className="min-h-10 gap-2"
              aria-label="Làm mới danh sách đặt chỗ"
            >
              <RefreshCw className={`size-4 ${loading ? "animate-spin" : ""}`} />
              Làm mới
            </Button>
          </CardAction>
        </CardHeader>

        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label>Ngày chơi</Label>
            <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
              <div className="flex flex-wrap gap-2">
                <Button
                  type="button"
                  size="sm"
                  variant={playDate === todayIso ? "default" : "outline"}
                  onClick={() => handlePlayDateChange(todayIso)}
                >
                  Hôm nay
                </Button>
                <Button
                  type="button"
                  size="sm"
                  variant={playDate === tomorrowIso ? "default" : "outline"}
                  onClick={() => handlePlayDateChange(tomorrowIso)}
                >
                  Ngày mai
                </Button>
              </div>
              <Input
                type="date"
                value={playDate}
                min={todayIso}
                onChange={(event) => handlePlayDateChange(event.target.value)}
                className="min-h-10 w-full sm:max-w-[180px]"
                aria-label="Chọn ngày chơi"
              />
            </div>
            <p className="text-xs text-neutral-500">
              Đang xem reservation ngày{" "}
              <span className="font-medium text-neutral-700">{reservationDayLabel}</span> (
              {playDate}).
            </p>
          </div>

          <div className="space-y-2">
            <Label htmlFor="reservation-code">Reservation code</Label>
            <div className="flex flex-col gap-2 sm:flex-row">
              <Input
                id="reservation-code"
                value={code}
                onChange={(e) => setCode(e.target.value.toUpperCase())}
                onKeyDown={(e) => {
                  if (e.key === "Enter") {
                    e.preventDefault();
                    void handleLookup();
                  }
                }}
                placeholder="VD: K7H3NP9X"
                className="min-h-11 flex-1 font-mono"
                aria-describedby="reservation-code-help"
              />
              <Button
                type="button"
                variant="outline"
                disabled={lookingUp}
                onClick={() => void handleLookup()}
                className="min-h-11 gap-2 sm:min-w-28"
              >
                <Search className="size-4" />
                {lookingUp ? "Đang tìm..." : "Tra cứu"}
              </Button>
            </div>
            <p id="reservation-code-help" className="text-xs text-neutral-500">
              Tra cứu trong ngày đang chọn; nếu không thấy sẽ tìm thêm trong toàn bộ đơn của quán.
            </p>
          </div>

          {preview && (
            <div className="space-y-4 rounded-xl border border-neutral-200 bg-neutral-50 p-4">
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div>
                  <p className="font-bold text-neutral-950">
                    {preview.gameName || "Đặt chỗ"}
                  </p>
                  <p className="mt-1 text-sm text-neutral-600">
                    {formatTime(preview.scheduledStartTime)} ·{" "}
                    <span className="font-mono">{preview.bookingCode}</span> ·{" "}
                    {preview.registeredMemberCount} khách
                  </p>
                </div>
                <Badge
                  variant="outline"
                  className={
                    preview.canCheckIn
                      ? "border-emerald-200 bg-emerald-50 text-emerald-700"
                      : "border-amber-200 bg-amber-50 text-amber-800"
                  }
                >
                  {preview.canCheckIn
                    ? "Sẵn sàng check-in"
                    : getCheckInStatusMessage(preview.depositStatus)}
                </Badge>
              </div>

              {(preview.canCheckIn || SHOW_CHECK_IN_CONTROLS_FOR_TESTING) && (
                <div className="grid gap-3 md:grid-cols-2">
                  <div className="space-y-2">
                    <Label htmlFor="check-in-table">Bàn phục vụ</Label>
                    <select
                      id="check-in-table"
                      value={tableId}
                      onChange={(e) => setTableId(e.target.value)}
                      className="min-h-11 w-full rounded-md border border-neutral-200 bg-white px-3 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-neutral-400"
                    >
                      <option value="">Chọn bàn</option>
                      {assignableTables.map((t) => (
                        <option key={t.id} value={t.id}>
                          {t.name}
                          {t.status ? ` · ${t.status}` : ""}
                        </option>
                      ))}
                    </select>
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="check-in-box">Hộp game bàn giao</Label>
                    <select
                      id="check-in-box"
                      value={barcode}
                      onChange={(e) => setBarcode(e.target.value)}
                      className="min-h-11 w-full rounded-md border border-neutral-200 bg-white px-3 font-mono text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-neutral-400"
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
                  </div>
                  <Button
                    type="button"
                    disabled={checkingIn}
                    onClick={() => void handleCheckIn()}
                    className="min-h-11 gap-2 md:col-span-2"
                  >
                    <QrCode className="size-4" />
                    {checkingIn ? "Đang check-in..." : "Xác nhận check-in"}
                  </Button>
                </div>
              )}
            </div>
          )}

          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <h4 className="text-sm font-semibold text-neutral-900">
                Reservation {reservationDayLabel}
              </h4>
              <Badge variant="secondary">{reservations.length} đơn</Badge>
            </div>
            {loading && reservations.length === 0 ? (
              <p className="py-4 text-sm text-neutral-500" aria-live="polite">
                Đang tải...
              </p>
            ) : reservations.length === 0 ? (
              <p className="rounded-xl border border-dashed py-5 text-center text-sm text-neutral-500">
                Không có reservation ngày {reservationDayLabel}.
              </p>
            ) : (
              <div className="grid max-h-64 gap-2 overflow-y-auto pr-1 md:grid-cols-2">
                {reservations.map((item) => {
                  const selected = selectedReservation?.id === item.id;
                  const ready = item.status.trim().toLowerCase() === "confirmed";
                  return (
                    <button
                      key={item.id}
                      type="button"
                      onClick={() => handleSelectReservation(item)}
                      aria-pressed={selected}
                      className={`min-h-20 rounded-xl border p-3 text-left transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-neutral-500 ${
                        selected
                          ? "border-emerald-500 bg-emerald-50 ring-1 ring-emerald-200"
                          : "border-neutral-200 bg-white hover:border-neutral-400"
                      }`}
                    >
                      <div className="flex items-start justify-between gap-2">
                        <p className="min-w-0 truncate text-sm font-bold text-neutral-950">
                          {item.gameName} · {item.timeSlot}
                        </p>
                        <Badge
                          variant="outline"
                          className={
                            ready
                              ? "border-emerald-200 text-emerald-700"
                              : "border-amber-200 text-amber-800"
                          }
                        >
                          {ready ? "Có thể check-in" : item.status}
                        </Badge>
                      </div>
                      <p className="mt-1 text-xs text-neutral-600">
                        <span className="font-mono">{item.reservationCode || "—"}</span>
                        {" · "}
                        {item.currentPlayers}/{item.maxPlayers} khách
                        {item.tableNumber ? ` · Bàn ${item.tableNumber}` : ""}
                      </p>
                      <p className="mt-1 text-xs text-neutral-500">
                        {formatTime(item.scheduledStartTime)} →{" "}
                        {formatTime(item.scheduledEndTime)}
                      </p>
                    </button>
                  );
                })}
              </div>
            )}
          </div>

          <div className="space-y-2 border-t pt-4">
            <div className="flex items-center justify-between">
              <h4 className="text-sm font-semibold text-neutral-900">
                Bàn đang giữ chỗ
              </h4>
              <Badge variant="secondary">{reserved.length} bàn</Badge>
            </div>
            {reserved.length === 0 ? (
              <p className="rounded-xl border border-dashed py-4 text-center text-sm text-neutral-500">
                Không có bàn đang giữ chỗ.
              </p>
            ) : (
              <div className="grid max-h-40 gap-2 overflow-y-auto pr-1 sm:grid-cols-2">
                {reserved.map((table) => (
                  <div
                    key={table.id}
                    className="flex min-h-11 items-center justify-between rounded-lg border bg-neutral-50 px-3"
                  >
                    <p className="text-sm font-semibold">{table.name}</p>
                    <Badge variant="outline" className="border-amber-200 text-amber-800">
                      Đang giữ
                    </Badge>
                  </div>
                ))}
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      {SHOW_WALK_IN_WINDOWS && (
        <Card size="sm" className="border-emerald-200 bg-emerald-50/40">
        <CardHeader className="border-b border-emerald-200">
          <CardTitle className="flex items-center gap-2 text-base text-emerald-950">
            <DoorOpen className="size-4" />
            Cửa sổ walk-in
          </CardTitle>
          <CardAction>
            <Badge className="bg-emerald-700 text-white">
              {openWindows.length} slot
            </Badge>
          </CardAction>
        </CardHeader>
        <CardContent>
          {openWindows.length === 0 ? (
            <p className="rounded-xl border border-dashed border-emerald-200 py-4 text-center text-sm text-emerald-900/70">
              Chưa có cửa sổ walk-in ngày {reservationDayLabel}.
            </p>
          ) : (
            <div className="grid max-h-44 gap-2 overflow-y-auto pr-1 sm:grid-cols-2">
              {openWindows.map((w) => (
                <div
                  key={w.id}
                  className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-emerald-200 bg-white p-3"
                >
                  <div>
                    <p className="text-sm font-bold">
                      Còn {w.availableSeats ?? "—"}/{w.totalSeats ?? "—"} ghế
                    </p>
                    <p className="mt-1 text-xs text-neutral-500">
                      {formatTime(w.windowStart)} → {formatTime(w.windowEnd)}
                    </p>
                  </div>
                  {onOpenTables && (
                    <Button
                      type="button"
                      variant="outline"
                      onClick={onOpenTables}
                      className="min-h-10 border-emerald-300 text-emerald-800"
                    >
                      Mở sơ đồ bàn
                    </Button>
                  )}
                </div>
              ))}
            </div>
          )}
        </CardContent>
        </Card>
      )}
    </div>
  );
}
