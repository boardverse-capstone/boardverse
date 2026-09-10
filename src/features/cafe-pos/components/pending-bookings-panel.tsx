"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import QRCode from "react-qr-code";
import { CalendarClock, RefreshCw, QrCode, DoorOpen, Search, AlertTriangle, ShieldCheck, MoreHorizontal, Table2, XCircle } from "lucide-react";
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
import { Spinner } from "@/components/ui/spinner";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { apiClient } from "@/core/api/client";
import { PosCheckInService } from "@/features/pos-check-in/services/pos-check-in.service";
import { isBoxStatusAvailable } from "@/features/cafe-pos/components/pos-boxes-tab";
import type {
  CafeReservationListItem,
  PosBookingPreview,
  PosCheckInTokenDto,
} from "@/features/pos-check-in/types/pos-check-in.interface";
import {
  addDaysIsoDate,
  formatIsoDateVi,
  formatReservationDayLabel,
  todayIsoDate,
} from "../lib/reservation-date";
import {
  focusFrameOnPointerDown,
  interactiveFrameClass,
} from "../lib/interactive-frame";
import { readPlayerRange } from "../lib/player-range";
import { cn } from "@/lib/utils";

interface PendingBookingsPanelProps {
  cafeId: string | null;
  tables?: Array<{
    id?: string;
    name?: string;
    status?: string;
    seatCount?: number;
  }>;
  boxes?: Array<{
    id: string;
    barcode: string;
    status: string;
    gameTemplateId: string | null;
    gameName: string | null;
  }>;
  initialBookingCode?: string;
  /** stack = 2 card dọc (cũ); sidebar = tab trong cột trái POS. */
  layout?: "stack" | "sidebar";
  onOpenTables?: () => void;
  /** Sau khi giữ chỗ walk-in thành công → mở luồng bắt đầu phiên. */
  onRequestStartSession?: (payload: {
    guestName: string;
    guestPhone: string;
    seats: number;
    walkInBookingId?: string;
  }) => void;
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
  /** Có khi BE trả kèm — không bịa nếu thiếu. */
  tableName?: string;
  tableNumber?: string;
}

interface WalkInDraft {
  guestName: string;
  guestPhone: string;
  seats: number;
}

interface ReservedTable {
  id: string;
  name: string;
  status: string;
  seatCount: number | null;
}

// Tạm bật để QA có thể gửi request check-in với mọi trạng thái reservation.
// Đổi thành false sau khi test xong để UI tiếp tục tuân theo preview.canCheckIn.
const SHOW_CHECK_IN_CONTROLS_FOR_TESTING = true;
const SHOW_WALK_IN_WINDOWS = true;

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

/**
 * Khung giờ đặt chỗ: BE trả `...T12:00:00Z` nhưng số giờ là giờ quán
 * (trùng preferredStartTime), không phải UTC thật — không cộng timezone local.
 */
function parseReservationParts(iso?: string | null) {
  if (!iso) return null;
  const match = String(iso).match(
    /^(\d{4})-(\d{2})-(\d{2})[T ](\d{2}):(\d{2})/,
  );
  if (!match) return null;
  const [, , month, day, hour, minute] = match;
  return { month, day, time: `${hour}:${minute}`, dayMonth: `${day}/${month}` };
}

function formatReservationSlot(iso?: string | null) {
  const parts = parseReservationParts(iso);
  if (!parts) return formatTime(iso);
  return `${parts.time} ${parts.day}-${parts.month}`;
}

/** Cùng ngày: `13:40 - 17:00 (27/08)`. Khác ngày: giữ đủ hai mốc. */
function formatReservationTimeRange(
  start?: string | null,
  end?: string | null,
) {
  const a = parseReservationParts(start);
  const b = parseReservationParts(end);
  if (!a && !b) return "—";
  if (a && b && a.dayMonth === b.dayMonth) {
    return `${a.time} - ${b.time} (${a.dayMonth})`;
  }
  if (a && b) {
    return `${a.time} ${a.dayMonth} → ${b.time} ${b.dayMonth}`;
  }
  return a ? `${a.time} (${a.dayMonth})` : `${b!.time} (${b!.dayMonth})`;
}

/** Cùng ngày: `13:40 - 17:00`. Khác ngày: kèm ngày rút gọn. */
function formatWalkInTimeRange(
  start?: string | null,
  end?: string | null,
) {
  const a = parseReservationParts(start);
  const b = parseReservationParts(end);
  if (a && b && a.dayMonth === b.dayMonth) {
    return `${a.time} - ${b.time}`;
  }
  if (a && b) {
    return `${a.time} (${a.dayMonth}) → ${b.time} (${b.dayMonth})`;
  }
  // Fallback: Date local (một số BE trả UTC thật)
  if (!start && !end) return "—";
  const startDate = start ? new Date(start) : null;
  const endDate = end ? new Date(end) : null;
  const fmtTime = (d: Date) =>
    d.toLocaleTimeString("vi-VN", { hour: "2-digit", minute: "2-digit" });
  const fmtDay = (d: Date) =>
    d.toLocaleDateString("vi-VN", { day: "2-digit", month: "2-digit" });
  if (
    startDate &&
    endDate &&
    !Number.isNaN(startDate.getTime()) &&
    !Number.isNaN(endDate.getTime())
  ) {
    if (fmtDay(startDate) === fmtDay(endDate)) {
      return `${fmtTime(startDate)} - ${fmtTime(endDate)}`;
    }
    return `${fmtTime(startDate)} (${fmtDay(startDate)}) → ${fmtTime(endDate)} (${fmtDay(endDate)})`;
  }
  return formatReservationTimeRange(start, end);
}

function walkInTableLabel(w: WalkInWindowDto) {
  const name = w.tableName?.trim();
  const number = w.tableNumber?.trim();
  if (name && number && !name.includes(number)) return `${name} · ${number}`;
  if (name) return name;
  if (number) return `Bàn ${number}`;
  return null;
}

function isBookingCodeQuery(value: string) {
  return /^[A-Z0-9]{8}$/i.test(value.trim());
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
      return "Sẵn sàng nhận bàn";
    case "expired":
      return "Đã hết hạn — không thể nhận bàn";
    case "holding":
      return "Chưa đủ điều kiện nhận bàn";
    case "checkedin":
      return "Đơn đã được nhận bàn";
    case "completed":
      return "Đơn đã hoàn tất — không thể nhận bàn";
    case "cancelled":
    case "cancelledbycafe":
    case "cancelledbyplayer":
      return "Đơn đã bị hủy — không thể nhận bàn";
    default:
      return "Trạng thái hiện tại chưa cho phép nhận bàn";
  }
}

function formatReservationStatusLabel(status?: string | null) {
  switch (status?.trim().toLowerCase()) {
    case "confirmed":
      return "Có thể nhận bàn";
    case "holding":
      return "Đang giữ chỗ";
    case "expired":
      return "Đã hết hạn";
    case "checkedin":
      return "Đã nhận bàn";
    case "completed":
      return "Đã hoàn tất";
    case "cancelled":
      return "Đã hủy";
    case "cancelledbycafe":
      return "Quán đã hủy";
    case "cancelledbyplayer":
      return "Khách đã hủy";
    default:
      return status?.trim() || "Không rõ";
  }
}

type ReservationStatusFilter =
  | "all"
  | "confirmed"
  | "holding"
  | "checkedin"
  | "completed"
  | "cancelled"
  | "expired";

const RESERVATION_STATUS_FILTERS: Array<{
  value: ReservationStatusFilter;
  label: string;
}> = [
  { value: "all", label: "Tất cả" },
  { value: "confirmed", label: "Có thể nhận bàn" },
  { value: "holding", label: "Đang giữ chỗ" },
  { value: "checkedin", label: "Đã nhận bàn" },
  { value: "completed", label: "Đã hoàn tất" },
  { value: "cancelled", label: "Đã hủy" },
  { value: "expired", label: "Đã hết hạn" },
];

function normalizeReservationStatus(status?: string | null) {
  return status?.trim().toLowerCase() || "";
}

function reservationStatusBadgeClass(status?: string | null) {
  switch (normalizeReservationStatus(status)) {
    case "confirmed":
      return "border-emerald-200 bg-emerald-50 text-emerald-800";
    case "holding":
      return "border-amber-200 bg-amber-50 text-amber-900";
    case "checkedin":
      return "border-sky-200 bg-sky-50 text-sky-800";
    case "completed":
      return "border-emerald-100 bg-emerald-50/70 text-emerald-700";
    case "expired":
      return "border-neutral-200 bg-neutral-50 text-neutral-600";
    case "cancelled":
    case "cancelledbycafe":
    case "cancelledbyplayer":
      return "border-red-200 bg-red-50 text-red-700";
    default:
      return "border-neutral-200 bg-neutral-50 text-neutral-700";
  }
}

function matchesReservationStatusFilter(
  status: string | null | undefined,
  filter: ReservationStatusFilter,
) {
  if (filter === "all") return true;
  const normalized = normalizeReservationStatus(status);
  if (filter === "cancelled") {
    return (
      normalized === "cancelled" ||
      normalized === "cancelledbycafe" ||
      normalized === "cancelledbyplayer"
    );
  }
  return normalized === filter;
}

function formatBoxStatusLabel(status?: string | null) {
  switch (String(status ?? "")
    .toLowerCase()
    .replace(/[_\s-]/g, "")) {
    case "available":
      return "Sẵn sàng";
    case "inuse":
    case "occupied":
      return "Đang dùng";
    case "reserved":
      return "Đã giữ";
    default:
      return status?.trim() || "Không rõ";
  }
}

function formatTableStatusLabel(status?: string | null) {
  switch (String(status ?? "")
    .toLowerCase()
    .replace(/[_\s-]/g, "")) {
    case "available":
      return "Trống";
    case "occupied":
    case "inuse":
      return "Đang dùng";
    case "reserved":
      return "Đã giữ";
    default:
      return status?.trim() || "";
  }
}

function canOpenCheckInDialog(status?: string | null) {
  return status?.trim().toLowerCase() === "confirmed";
}

function normalizePlayDate(value?: string | null): string {
  if (!value) return todayIsoDate();
  return value.slice(0, 10);
}

function parseWalkInWindows(raw: unknown): WalkInWindowDto[] {
  const pickList = (): unknown[] => {
    if (!raw) return [];
    if (Array.isArray(raw)) return raw;
    const r = raw as Record<string, unknown>;
    const items = r.items ?? r.Items ?? r.data;
    if (Array.isArray(items)) return items;
    if (items && typeof items === "object") {
      const nested = (items as Record<string, unknown>).items;
      if (Array.isArray(nested)) return nested;
    }
    return [];
  };

  return pickList()
    .map((item) => {
      const r = (item ?? {}) as Record<string, unknown>;
      const id = String(r.id ?? r.Id ?? "");
      if (!id) return null;
      const tableName = String(
        r.tableName ?? r.TableName ?? r.cafeTableName ?? r.CafeTableName ?? "",
      ).trim();
      const tableNumber = String(
        r.tableNumber ?? r.TableNumber ?? r.tableLabel ?? r.TableLabel ?? "",
      ).trim();
      return {
        id,
        sourceReservationId:
          r.sourceReservationId != null
            ? String(r.sourceReservationId)
            : r.SourceReservationId != null
              ? String(r.SourceReservationId)
              : undefined,
        windowStart:
          (r.windowStart as string | undefined) ??
          (r.WindowStart as string | undefined),
        windowEnd:
          (r.windowEnd as string | undefined) ??
          (r.WindowEnd as string | undefined),
        totalSeats: Number(r.totalSeats ?? r.TotalSeats ?? 0) || undefined,
        availableSeats:
          Number(r.availableSeats ?? r.AvailableSeats ?? 0) || undefined,
        status: String(r.status ?? r.Status ?? "") || undefined,
        expiresAt:
          (r.expiresAt as string | undefined) ??
          (r.ExpiresAt as string | undefined),
        tableName: tableName || undefined,
        tableNumber: tableNumber || undefined,
      } satisfies WalkInWindowDto;
    })
    .filter((w): w is WalkInWindowDto => w != null);
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
        seatCount: readPlayerRange(r).max,
      };
    })
    .filter((t) => t.id);
}

export function PendingBookingsPanel({
  cafeId,
  tables = [],
  boxes = [],
  initialBookingCode = "",
  layout = "stack",
  onOpenTables,
  onRequestStartSession,
  onConfirmCheckIn,
}: PendingBookingsPanelProps) {
  const [code, setCode] = useState(initialBookingCode.toUpperCase());
  const [preview, setPreview] = useState<PosBookingPreview | null>(null);
  const [tableId, setTableId] = useState("");
  const [barcode, setBarcode] = useState("");
  const [checkedBox, setCheckedBox] = useState<{
    id?: string;
    barcode?: string;
    gameName?: string;
    status?: string;
    missingComponents?: Array<{
      componentId?: string;
      componentName?: string;
      missingQuantity?: number;
    }>;
  } | null>(null);
  const [checkingBox, setCheckingBox] = useState(false);
  const [reserved, setReserved] = useState<ReservedTable[]>([]);
  const [reservations, setReservations] = useState<CafeReservationListItem[]>([]);
  const [windows, setWindows] = useState<WalkInWindowDto[]>([]);
  const [walkInDrafts, setWalkInDrafts] = useState<Record<string, WalkInDraft>>(
    {},
  );
  const [walkInBusyId, setWalkInBusyId] = useState<string | null>(null);
  const [receptionTab, setReceptionTab] = useState<"bookings" | "walkin">(
    "bookings",
  );
  const [loading, setLoading] = useState(false);
  const [lookingUp, setLookingUp] = useState(false);
  const [checkingIn, setCheckingIn] = useState(false);
  const [creatingQr, setCreatingQr] = useState(false);
  const [checkInToken, setCheckInToken] = useState<PosCheckInTokenDto | null>(
    null,
  );
  const appliedInitialCode = useRef(false);
  const searchInputRef = useRef<HTMLInputElement>(null);
  const todayIso = todayIsoDate();
  const tomorrowIso = addDaysIsoDate(todayIso, 1);
  const [playDate, setPlayDate] = useState(todayIso);
  const [statusFilter, setStatusFilter] =
    useState<ReservationStatusFilter>("confirmed");
  const [reservationSearch, setReservationSearch] = useState("");
  const reservationDayLabel = formatReservationDayLabel(playDate, todayIso);

  const assignableTables = useMemo((): ReservedTable[] => {
    const fromProp = tables
      .filter((t) => {
        const st = String(t.status || "").toLowerCase();
        return t.id && (st === "available" || st === "reserved" || !st);
      })
      .map((t) => ({
        id: String(t.id),
        name: String(t.name ?? "Bàn"),
        status: String(t.status ?? ""),
        seatCount: readPlayerRange(t).max,
      }));
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

  const filteredReservations = useMemo(() => {
    const query = reservationSearch.trim().toLowerCase();
    return reservations.filter((item) => {
      if (!matchesReservationStatusFilter(item.status, statusFilter)) {
        return false;
      }
      if (!query) return true;
      const haystack = [
        item.gameName,
        item.reservationCode,
        item.tableNumber,
        item.timeSlot,
      ]
        .filter(Boolean)
        .join(" ")
        .toLowerCase();
      return haystack.includes(query);
    });
  }, [reservations, reservationSearch, statusFilter]);

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
          if (canOpenCheckInDialog(initialReservation.status)) {
            setPreview(reservationToPreview(initialReservation));
          } else {
            setPreview(null);
            toast.error(getCheckInStatusMessage(initialReservation.status));
          }
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
    setCheckInToken(null);
  };

  useEffect(() => {
    // Initial fetch and polling intentionally synchronize remote POS state.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    void load();
    const id = window.setInterval(() => void load(), 60_000);
    return () => window.clearInterval(id);
  }, [load]);

  useEffect(() => {
    if (!cafeId) return;
    const frame = window.requestAnimationFrame(() => {
      searchInputRef.current?.focus();
    });
    return () => window.cancelAnimationFrame(frame);
  }, [cafeId, playDate]);

  useEffect(() => {
    if (
      barcode &&
      !availableBoxes.some((box) => box.barcode === barcode)
    ) {
      // Keep the selected box valid when the reservation filter changes.
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setBarcode("");
      setCheckedBox(null);
    }
  }, [availableBoxes, barcode]);

  const createWalkIn = async (window: WalkInWindowDto) => {
    const maxSeats = Math.max(1, Number(window.availableSeats) || 1);
    const draft = walkInDrafts[window.id];
    const guestName = (draft?.guestName ?? "").trim() || "Khách lẻ";
    const guestPhone = (draft?.guestPhone ?? "").replace(/\s/g, "");
    const seats = Math.min(Math.max(1, Number(draft?.seats) || 1), maxSeats);
    if (!guestPhone) {
      toast.error("Nhập SĐT khách để mở phiên chơi ngay sau khi xếp chỗ.");
      return;
    }
    if (!/^0[35789]\d{8,9}$/.test(guestPhone)) {
      toast.error("SĐT phải là số VN 10–11 chữ số, đầu 03/05/07/08/09.");
      return;
    }
    if (guestPhone.length > 20) {
      toast.error("SĐT tối đa 20 ký tự.");
      return;
    }
    setWalkInBusyId(window.id);
    try {
      const created: any = await apiClient.post(
        "/api/v1/reservations/walkin",
        {
          walkInWindowId: window.id,
          guestName,
          guestPhone,
          seats,
          idempotencyKey: `WI-${Date.now()}`,
        },
      );
      const walkInBookingId = String(
        created?.id ?? created?.data?.id ?? "",
      );
      toast.success(`Đã giữ ${seats} ghế cho ${guestName}. Tiếp tục mở phiên.`);
      setWalkInDrafts((prev) => {
        const next = { ...prev };
        delete next[window.id];
        return next;
      });
      await load();
      onRequestStartSession?.({
        guestName,
        guestPhone,
        seats,
        walkInBookingId: walkInBookingId || undefined,
      });
    } catch (err: any) {
      toast.error(err?.message || "Không tạo được walk-in.");
    } finally {
      setWalkInBusyId(null);
    }
  };

  const updateWalkInDraft = (
    windowId: string,
    patch: Partial<WalkInDraft>,
    maxSeats: number,
  ) => {
    setWalkInDrafts((prev) => {
      const current = prev[windowId] ?? {
        guestName: "",
        guestPhone: "",
        seats: 1,
      };
      const seats = Math.min(
        Math.max(1, Number(patch.seats ?? current.seats) || 1),
        Math.max(1, maxSeats),
      );
      return {
        ...prev,
        [windowId]: {
          guestName:
            patch.guestName !== undefined ? patch.guestName : current.guestName,
          guestPhone:
            patch.guestPhone !== undefined
              ? patch.guestPhone
              : current.guestPhone,
          seats,
        },
      };
    });
  };

  const closeWalkInWindow = async (windowId: string) => {
    setWalkInBusyId(windowId);
    try {
      await apiClient.post(
        `/api/v1/reservations/walkin/windows/${windowId}/close`,
        { reason: "Đóng thủ công từ quầy POS" },
      );
      toast.success("Đã đóng cửa sổ khách vãng lai.");
      await load();
    } catch (err: any) {
      toast.error(err?.message || "Không đóng được cửa sổ walk-in.");
    } finally {
      setWalkInBusyId(null);
    }
  };

  if (!cafeId) return null;

  const openWindows = windows.filter((w) => {
    const st = String(w.status || "").toLowerCase();
    return !st || st === "available" || st === "partial";
  });
  const isSidebar = layout === "sidebar";

  const handleCheckBox = async (overrideBarcode?: string) => {
    const codeToCheck = (overrideBarcode ?? barcode).trim();
    if (!cafeId) return;
    if (!codeToCheck) {
      toast.error("Nhập hoặc chọn mã vạch hộp game.");
      return;
    }

    setCheckingBox(true);
    try {
      const res: unknown = await apiClient.get(
        `/api/cafes/${cafeId}/pos/boxes/by-barcode/${encodeURIComponent(codeToCheck)}`,
      );
      const boxData = (
        res && typeof res === "object" && "data" in res
          ? (res as { data: Record<string, unknown> }).data
          : res
      ) as Record<string, unknown>;

      if (boxData?.id) {
        try {
          const historyRes: unknown = await apiClient.get(
            `/api/cafes/${cafeId}/pos/boxes/${String(boxData.id)}/component-history`,
          );
          const historyData = (
            historyRes && typeof historyRes === "object" && "data" in historyRes
              ? (historyRes as { data: Record<string, unknown> }).data
              : historyRes
          ) as {
            incidents?: Array<{ missingComponents?: unknown[] }>;
            totalIncidents?: number;
          };

          const allMissingComponents =
            historyData?.incidents?.flatMap(
              (incident) =>
                (incident.missingComponents || []) as Array<{
                  componentId?: string;
                  componentName?: string;
                  missingQuantity?: number;
                }>,
            ) || [];

          boxData.missingComponents = allMissingComponents;
          boxData.totalIncidents = historyData?.totalIncidents || 0;
        } catch {
          boxData.missingComponents = [];
        }
      }

      const nextBarcode = String(boxData.barcode ?? codeToCheck);
      if (!isBoxStatusAvailable(String(boxData.status ?? ""))) {
        toast.error(
          `Hộp "${nextBarcode}" không sẵn sàng để gán (đang dùng / bảo trì).`,
        );
        setCheckedBox(null);
        return;
      }
      // Parent truyền assignableBoxes — nếu có list mà barcode không nằm trong đó thì đang gắn phiên khác.
      if (
        boxes.length > 0 &&
        !boxes.some(
          (box) =>
            box.barcode.toLowerCase() === nextBarcode.toLowerCase() &&
            isBoxStatusAvailable(box.status),
        )
      ) {
        toast.error(
          `Hộp "${nextBarcode}" đang được gán cho phiên chơi khác.`,
        );
        setCheckedBox(null);
        return;
      }
      setBarcode(nextBarcode);
      setCheckedBox({
        id: boxData.id != null ? String(boxData.id) : undefined,
        barcode: nextBarcode,
        gameName:
          boxData.gameName != null ? String(boxData.gameName) : undefined,
        status: boxData.status != null ? String(boxData.status) : undefined,
        missingComponents: Array.isArray(boxData.missingComponents)
          ? (boxData.missingComponents as Array<{
              componentId?: string;
              componentName?: string;
              missingQuantity?: number;
            }>)
          : [],
      });
    } catch (err: unknown) {
      toast.error(
        err instanceof Error
          ? err.message
          : "Không tìm thấy hộp game với mã vạch này.",
      );
      setCheckedBox(null);
    } finally {
      setCheckingBox(false);
    }
  };

  const handleLookup = async (rawCode?: string) => {
    const trimmed = (rawCode ?? (reservationSearch || code)).trim().toUpperCase();
    if (!trimmed) {
      toast.error("Nhập mã đặt chỗ 8 ký tự.");
      return;
    }
    if (!cafeId) return;

    setLookingUp(true);
    try {
      let item =
        reservations.find(
          (reservation) =>
            reservation.reservationCode.toUpperCase() === trimmed,
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
        setCode(item.reservationCode.toUpperCase());
        setReservationSearch(item.reservationCode.toUpperCase());
        setStatusFilter("all");
        setCheckInToken(null);
        setTableId("");
        if (switchedDay) {
          toast.message(`Đơn thuộc ngày ${formatReservationDayLabel(itemPlayDate, todayIso)}.`);
        }
        if (!canOpenCheckInDialog(item.status)) {
          setPreview(null);
          toast.error(getCheckInStatusMessage(item.status));
        } else {
          setPreview(reservationToPreview(item));
        }
      } else {
        setPreview(null);
        setCheckInToken(null);
        toast.error("Không tìm thấy mã đặt chỗ trong danh sách của quán.");
      }
    } finally {
      setLookingUp(false);
      searchInputRef.current?.focus();
    }
  };

  const handleSelectReservation = (item: CafeReservationListItem) => {
    const nextCode = item.reservationCode.trim();
    if (!nextCode) {
      toast.error("Đơn này chưa có mã đặt chỗ.");
      return;
    }
    setCode(nextCode.toUpperCase());
    setReservationSearch(nextCode.toUpperCase());
    setCheckInToken(null);
    setTableId("");
    if (!canOpenCheckInDialog(item.status)) {
      setPreview(null);
      toast.error(getCheckInStatusMessage(item.status));
      return;
    }
    setPreview(reservationToPreview(item));
  };

  const closeCheckInDialog = () => {
    setPreview(null);
    setCheckInToken(null);
    setCheckedBox(null);
    setBarcode("");
    setTableId("");
    window.requestAnimationFrame(() => searchInputRef.current?.focus());
  };

  const handleShowCheckInQr = async () => {
    if (!cafeId) return;
    const raw =
      preview?.raw && typeof preview.raw === "object"
        ? (preview.raw as Record<string, unknown>)
        : null;
    const reservationId =
      selectedReservation?.id ||
      (raw?.id != null ? String(raw.id) : "") ||
      "";
    if (!reservationId) {
      toast.error("Chọn đơn đặt chỗ trước khi tạo mã QR.");
      return;
    }

    setCreatingQr(true);
    try {
      const token = await PosCheckInService.createCheckInToken(cafeId, {
        reservationId,
        ttlMinutes: 30,
      });
      if (!token.qrPayload) {
        throw new Error("Máy chủ không trả nội dung mã QR.");
      }
      setCheckInToken(token);
      toast.success("Đã tạo mã QR. Khách quét bằng app BoardVerse.");
    } catch (err: unknown) {
      const message =
        err instanceof Error ? err.message : "Không tạo được mã QR nhận bàn.";
      toast.error(message);
      setCheckInToken(null);
    } finally {
      setCreatingQr(false);
    }
  };

  const handleCheckIn = async () => {
    const trimmed = (preview?.bookingCode || code).trim();
    if (!onConfirmCheckIn || !trimmed) return;
    if (!checkInToken?.qrPayload) {
      toast.error("Hãy hiện mã QR để khách quét trước khi xác nhận nhận bàn.");
      return;
    }
    if (!tableId) {
      toast.error("Chọn bàn để nhận khách.");
      return;
    }
    const partySize = Math.max(
      Number(preview?.registeredMemberCount) || 0,
      Number(selectedReservation?.currentPlayers) || 0,
      Number(selectedReservation?.maxPlayers) || 0,
    );
    const selectedTable = assignableTables.find((t) => t.id === tableId);
    const seatCount = selectedTable?.seatCount;
    if (partySize > 0 && seatCount != null && partySize > seatCount) {
      toast.error(
        `Đơn ${partySize} khách — bàn này tối đa ${seatCount} chỗ. Chọn bàn lớn hơn.`,
      );
      return;
    }
    if (!barcode.trim()) {
      toast.error("Quét mã vạch hộp game trước khi nhận bàn.");
      return;
    }
    if (
      boxes.length > 0 &&
      !boxes.some(
        (box) =>
          box.barcode.toLowerCase() === barcode.trim().toLowerCase() &&
          isBoxStatusAvailable(box.status),
      )
    ) {
      toast.error(
        "Hộp không sẵn sàng hoặc đang gắn phiên khác — chọn hộp trống.",
      );
      return;
    }
    setCheckingIn(true);
    const ok = await onConfirmCheckIn(trimmed, tableId, barcode.trim());
    setCheckingIn(false);
    if (ok) {
      setPreview(null);
      setCode("");
      setReservationSearch("");
      setCheckInToken(null);
      setTableId("");
      await load();
      window.requestAnimationFrame(() => searchInputRef.current?.focus());
    }
  };

  return (
    <div
      className={cn(
        isSidebar ? "flex h-full min-h-0 flex-col gap-3" : "space-y-4",
      )}
    >
      {isSidebar ? (
        <div className="flex w-fit max-w-full shrink-0 gap-1 rounded-xl border border-neutral-200 bg-neutral-100/80 p-1">
          <button
            type="button"
            onClick={() => setReceptionTab("bookings")}
            className={cn(
              "flex h-9 items-center justify-center gap-1.5 rounded-lg px-3 text-xs font-bold transition-colors",
              receptionTab === "bookings"
                ? "bg-white text-neutral-950 shadow-sm"
                : "text-neutral-600 hover:text-neutral-900",
            )}
          >
            <CalendarClock className="size-3.5" />
            Đặt chỗ ({filteredReservations.length}
            {filteredReservations.length !== reservations.length
              ? `/${reservations.length}`
              : ""}
            )
          </button>
          {SHOW_WALK_IN_WINDOWS ? (
            <button
              type="button"
              onClick={() => setReceptionTab("walkin")}
              className={cn(
                "flex h-9 items-center justify-center gap-1.5 rounded-lg px-3 text-xs font-bold transition-colors",
                receptionTab === "walkin"
                  ? "bg-white text-emerald-900 shadow-sm"
                  : "text-neutral-600 hover:text-neutral-900",
              )}
            >
              <DoorOpen className="size-3.5" />
              Vãng lai ({openWindows.length})
            </button>
          ) : null}
        </div>
      ) : null}

      <div
        className={cn(
          isSidebar && receptionTab !== "bookings" && "hidden",
          isSidebar && "min-h-0 flex-1",
        )}
      >
      <Card
        size="sm"
        tabIndex={0}
        onPointerDown={focusFrameOnPointerDown}
        className={cn(
          interactiveFrameClass,
          isSidebar && "flex h-full min-h-0 flex-col gap-0 py-0",
        )}
      >
        <CardHeader className={cn("border-b", isSidebar && "py-3")}>
          <div>
            <CardTitle className="flex items-center gap-2 text-lg font-bold text-neutral-950">
              <CalendarClock className="size-4 text-neutral-800" />
              {isSidebar ? "Đặt chỗ trước" : "Tiếp nhận khách đặt chỗ"}
            </CardTitle>
            {!isSidebar ? (
              <p className="mt-1 text-sm font-medium text-neutral-700">
                Quét QR hoặc tìm đơn theo ngày để nhận bàn.
              </p>
            ) : null}
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

        <CardContent
          className={cn(
            "space-y-3",
            isSidebar && "min-h-0 flex-1 overflow-y-auto",
          )}
        >
          <div
            className={cn(
              "flex flex-col gap-2",
              !isSidebar && "lg:flex-row lg:items-center",
            )}
          >
            <div className="flex flex-wrap items-center gap-1.5">
              <Button
                type="button"
                size="sm"
                variant={playDate === todayIso ? "default" : "outline"}
                onClick={() => handlePlayDateChange(todayIso)}
                className="h-9"
              >
                Hôm nay
              </Button>
              <Button
                type="button"
                size="sm"
                variant={playDate === tomorrowIso ? "default" : "outline"}
                onClick={() => handlePlayDateChange(tomorrowIso)}
                className="h-9"
              >
                Ngày mai
              </Button>
              <Input
                type="date"
                value={playDate}
                min={todayIso}
                onChange={(event) => handlePlayDateChange(event.target.value)}
                className="h-9 w-full min-w-[9.5rem] max-w-[11rem]"
                aria-label="Chọn ngày chơi"
              />
            </div>

            <div className="flex w-full max-w-md min-w-0 items-center gap-2">
              <div className="relative min-w-0 flex-1">
                <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-neutral-400" />
                <Input
                  ref={searchInputRef}
                  id="reservation-search"
                  value={reservationSearch}
                  onChange={(e) => {
                    const next = e.target.value;
                    setReservationSearch(
                      isBookingCodeQuery(next) ||
                        /^[A-Za-z0-9]*$/.test(next.trim())
                        ? next.toUpperCase()
                        : next,
                    );
                  }}
                  onKeyDown={(e) => {
                    if (e.key === "Enter") {
                      e.preventDefault();
                      const q = reservationSearch.trim();
                      if (isBookingCodeQuery(q)) {
                        void handleLookup(q);
                      }
                    }
                  }}
                  placeholder="Quét QR, nhập mã, game, bàn..."
                  className="h-10 pl-9 font-medium"
                  aria-label="Tìm đơn đặt chỗ"
                  autoComplete="off"
                  autoFocus
                />
                {lookingUp ? (
                  <Spinner className="absolute right-3 top-1/2 size-4 -translate-y-1/2" />
                ) : null}
              </div>
              <Badge variant="secondary" className="h-8 shrink-0 px-2.5">
                {filteredReservations.length}
                {filteredReservations.length !== reservations.length
                  ? `/${reservations.length}`
                  : ""}{" "}
                đơn
              </Badge>
            </div>
          </div>

          <Select
            value={statusFilter}
            onValueChange={(value) =>
              setStatusFilter(value as ReservationStatusFilter)
            }
          >
            <SelectTrigger
              size="sm"
              className="h-8 w-full max-w-xs"
              aria-label="Lọc theo trạng thái đơn"
            >
              <SelectValue placeholder="Trạng thái" />
            </SelectTrigger>
            <SelectContent>
              {RESERVATION_STATUS_FILTERS.map((filter) => (
                <SelectItem key={filter.value} value={filter.value}>
                  {filter.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          {loading && reservations.length === 0 ? (
            <p className="py-4 text-sm font-medium text-neutral-700" aria-live="polite">
              Đang tải...
            </p>
          ) : reservations.length === 0 ? (
            <p className="rounded-xl border border-dashed py-4 text-center text-sm font-medium text-neutral-700">
              Không có đơn ngày {reservationDayLabel}.
            </p>
          ) : filteredReservations.length === 0 ? (
            <div className="rounded-xl border border-dashed py-4 text-center">
              <p className="text-sm font-medium text-neutral-700">
                Không có đơn khớp bộ lọc.
              </p>
              {statusFilter !== "all" ? (
                <Button
                  type="button"
                  variant="link"
                  className="mt-1 h-auto p-0 text-sm"
                  onClick={() => setStatusFilter("all")}
                >
                  Xem tất cả
                </Button>
              ) : null}
            </div>
          ) : (
            <div
              className={cn(
                "grid gap-2 overflow-y-auto pr-1",
                isSidebar
                  ? "max-h-none grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4"
                  : "max-h-[28rem] md:grid-cols-2",
              )}
            >
              {filteredReservations.map((item) => {
                const selected = selectedReservation?.id === item.id;
                const status = normalizeReservationStatus(item.status);
                const canCheckIn = status === "confirmed";
                const showQuickAction =
                  canCheckIn || status === "holding";
                return (
                  <div
                    key={item.id}
                    role="button"
                    tabIndex={0}
                    aria-pressed={selected}
                    onClick={() => handleSelectReservation(item)}
                    onKeyDown={(e) => {
                      if (e.key === "Enter" || e.key === " ") {
                        e.preventDefault();
                        handleSelectReservation(item);
                      }
                    }}
                    className={`rounded-xl border p-3 text-left transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-neutral-500 ${
                      selected
                        ? "border-emerald-500 bg-emerald-50 ring-1 ring-emerald-200"
                        : "border-neutral-200 bg-white hover:border-neutral-400"
                    }`}
                  >
                    <div className="flex items-start justify-between gap-2">
                      <p className="min-w-0 truncate text-base font-bold text-neutral-950">
                        {item.gameName}
                      </p>
                      <Badge
                        variant="outline"
                        className={`shrink-0 ${reservationStatusBadgeClass(item.status)}`}
                      >
                        {formatReservationStatusLabel(item.status)}
                      </Badge>
                    </div>
                    <p className="mt-1.5 font-mono text-sm font-bold tracking-wide text-neutral-900">
                      {item.reservationCode || "—"}
                    </p>
                    <p className="mt-1 text-xs font-medium text-neutral-700">
                      {item.currentPlayers}/{item.maxPlayers} khách
                      {item.tableNumber ? ` · Bàn ${item.tableNumber}` : ""}
                      {item.timeSlot ? ` · ${item.timeSlot}` : ""}
                    </p>
                    <p className="mt-1 text-xs font-semibold text-neutral-800">
                      {formatReservationTimeRange(
                        item.scheduledStartTime,
                        item.scheduledEndTime,
                      )}
                    </p>
                    {showQuickAction ? (
                      <div className="mt-2.5">
                        <Button
                          type="button"
                          size="sm"
                          title={
                            canCheckIn
                              ? "Nhận bàn ngay"
                              : getCheckInStatusMessage(item.status)
                          }
                          onClick={(e) => {
                            e.stopPropagation();
                            handleSelectReservation(item);
                          }}
                          className={`h-9 w-full font-bold ${
                            canCheckIn
                              ? "bg-emerald-600 text-white hover:bg-emerald-700"
                              : "border-amber-300 bg-amber-50 text-amber-900 hover:bg-amber-100"
                          }`}
                          variant={canCheckIn ? "default" : "outline"}
                        >
                          {canCheckIn ? "Nhận bàn" : "Chưa đủ điều kiện"}
                        </Button>
                      </div>
                    ) : null}
                  </div>
                );
              })}
            </div>
          )}
        </CardContent>
      </Card>
      </div>

      {SHOW_WALK_IN_WINDOWS && (
      <div
        className={cn(
          isSidebar && receptionTab !== "walkin" && "hidden",
          isSidebar && "min-h-0 flex-1",
        )}
      >
        <Card
          size="sm"
          tabIndex={0}
          onPointerDown={focusFrameOnPointerDown}
          className={cn(
            "border-emerald-200 bg-emerald-50/40",
            interactiveFrameClass,
            isSidebar && "flex h-full min-h-0 flex-col gap-0 py-0",
          )}
        >
        <CardHeader className={cn("border-b border-emerald-200", isSidebar && "py-3")}>
          <CardTitle className="flex items-center gap-2 text-base text-emerald-950">
            <DoorOpen className="size-4" />
            {isSidebar ? "Khách vãng lai" : "Cửa sổ khách vãng lai"}
          </CardTitle>
          <CardAction className="flex items-center gap-2">
            <Badge className="bg-emerald-700 text-white">
              {openWindows.length} khung
            </Badge>
            {!isSidebar && onOpenTables ? (
              <Button
                type="button"
                size="sm"
                variant="outline"
                onClick={onOpenTables}
                className="h-8 gap-1.5 border-emerald-300 text-emerald-900"
              >
                <Table2 className="size-3.5" />
                Sơ đồ bàn
              </Button>
            ) : null}
          </CardAction>
        </CardHeader>
        <CardContent
          className={cn(
            "space-y-3",
            isSidebar && "min-h-0 flex-1 overflow-y-auto",
          )}
        >
          {openWindows.length === 0 ? (
            <p className="rounded-xl border border-dashed border-emerald-200 py-4 text-center text-sm text-emerald-900/70">
              Chưa có khung vãng lai ngày {reservationDayLabel}.
            </p>
          ) : (
            <div
              className={cn(
                "grid gap-2 overflow-y-auto pr-1",
                isSidebar
                  ? "max-h-none grid-cols-1 sm:grid-cols-2 lg:grid-cols-3"
                  : "max-h-[28rem] sm:grid-cols-2",
              )}
            >
              {openWindows.map((w) => {
                const maxSeats = Math.max(1, Number(w.availableSeats) || 1);
                const draft = walkInDrafts[w.id] ?? {
                  guestName: "",
                  guestPhone: "",
                  seats: 1,
                };
                const seats = Math.min(Math.max(1, draft.seats), maxSeats);
                const tableLabel = walkInTableLabel(w);
                const busy = walkInBusyId === w.id;
                return (
                  <div
                    key={w.id}
                    tabIndex={0}
                    onPointerDown={focusFrameOnPointerDown}
                    className={cn(
                      "flex flex-col gap-2.5 rounded-xl border border-emerald-200 bg-white p-3",
                      interactiveFrameClass,
                    )}
                  >
                    <div className="flex items-start justify-between gap-2">
                      <div className="min-w-0">
                        <p className="truncate text-sm font-bold text-neutral-950">
                          {tableLabel || "Khung ghế trống"}
                        </p>
                        <p className="mt-0.5 text-xs font-semibold text-emerald-800">
                          Còn {w.availableSeats ?? "—"}/{w.totalSeats ?? "—"} ghế
                          {" · "}
                          {formatWalkInTimeRange(w.windowStart, w.windowEnd)}
                        </p>
                      </div>
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button
                            type="button"
                            size="icon-sm"
                            variant="ghost"
                            disabled={busy}
                            className="size-8 shrink-0 text-neutral-600"
                            aria-label="Thêm thao tác khung"
                          >
                            <MoreHorizontal className="size-4" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <DropdownMenuItem
                            disabled={busy}
                            onClick={() => void closeWalkInWindow(w.id)}
                          >
                            <XCircle className="size-4" />
                            Đóng khung
                          </DropdownMenuItem>
                          {onOpenTables ? (
                            <DropdownMenuItem onClick={onOpenTables}>
                              <Table2 className="size-4" />
                              Sơ đồ bàn
                            </DropdownMenuItem>
                          ) : null}
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </div>

                    <div className="grid gap-2">
                      <div className="space-y-1">
                        <Label
                          htmlFor={`walk-in-guest-${w.id}`}
                          className="text-xs font-semibold text-neutral-700"
                        >
                          Tên khách
                        </Label>
                        <Input
                          id={`walk-in-guest-${w.id}`}
                          value={draft.guestName}
                          onChange={(e) =>
                            updateWalkInDraft(
                              w.id,
                              { guestName: e.target.value },
                              maxSeats,
                            )
                          }
                          placeholder="Khách lẻ"
                          className="h-9"
                          disabled={busy}
                        />
                      </div>
                      <div className="space-y-1">
                        <Label
                          htmlFor={`walk-in-phone-${w.id}`}
                          className="text-xs font-semibold text-neutral-700"
                        >
                          SĐT
                        </Label>
                        <Input
                          id={`walk-in-phone-${w.id}`}
                          type="tel"
                          inputMode="tel"
                          value={draft.guestPhone}
                          onChange={(e) =>
                            updateWalkInDraft(
                              w.id,
                              {
                                guestPhone: e.target.value.replace(
                                  /[^\d+\s()-]/g,
                                  "",
                                ),
                              },
                              maxSeats,
                            )
                          }
                          placeholder="Bắt buộc — để mở phiên"
                          maxLength={20}
                          className="h-9"
                          disabled={busy}
                        />
                      </div>
                    </div>

                    <div className="flex flex-wrap items-end gap-2">
                      <div className="space-y-1">
                        <Label className="text-xs font-semibold text-neutral-700">
                          Số ghế
                        </Label>
                        <div className="flex h-9 items-center rounded-md border border-neutral-200 bg-white">
                          <Button
                            type="button"
                            size="icon-sm"
                            variant="ghost"
                            disabled={busy || seats <= 1}
                            className="size-8 rounded-none text-base font-bold"
                            aria-label="Giảm số ghế"
                            onClick={() =>
                              updateWalkInDraft(
                                w.id,
                                { seats: seats - 1 },
                                maxSeats,
                              )
                            }
                          >
                            −
                          </Button>
                          <span className="min-w-8 text-center text-sm font-bold tabular-nums">
                            {seats}
                          </span>
                          <Button
                            type="button"
                            size="icon-sm"
                            variant="ghost"
                            disabled={busy || seats >= maxSeats}
                            className="size-8 rounded-none text-base font-bold"
                            aria-label="Tăng số ghế"
                            onClick={() =>
                              updateWalkInDraft(
                                w.id,
                                { seats: seats + 1 },
                                maxSeats,
                              )
                            }
                          >
                            +
                          </Button>
                        </div>
                      </div>
                      <Button
                        type="button"
                        size="sm"
                        disabled={busy || maxSeats < 1}
                        onClick={() => void createWalkIn(w)}
                        className="h-9 shrink-0 bg-emerald-700 px-3 font-bold text-white hover:bg-emerald-800"
                      >
                        {busy ? "Đang xếp..." : "Xếp bàn nhanh"}
                      </Button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </CardContent>
        </Card>
      </div>
      )}

      <Dialog
        open={Boolean(preview)}
        onOpenChange={(open) => {
          if (!open) closeCheckInDialog();
        }}
      >
        <DialogContent className="flex max-h-[90vh] flex-col gap-4 overflow-hidden sm:max-w-4xl">
          {preview ? (
            <>
              <DialogHeader className="shrink-0">
                <DialogTitle className="flex flex-wrap items-center gap-2">
                  <span>{preview.gameName || "Đặt chỗ"}</span>
                  <Badge
                    variant="outline"
                    className={
                      preview.canCheckIn
                        ? "border-emerald-200 bg-emerald-50 text-emerald-700"
                        : "border-amber-200 bg-amber-50 text-amber-800"
                    }
                  >
                    {preview.canCheckIn
                      ? "Sẵn sàng nhận bàn"
                      : getCheckInStatusMessage(preview.depositStatus)}
                  </Badge>
                </DialogTitle>
                <DialogDescription>
                  {formatReservationSlot(preview.scheduledStartTime)} ·{" "}
                  <span className="font-mono">{preview.bookingCode}</span> ·{" "}
                  {preview.registeredMemberCount} khách
                </DialogDescription>
              </DialogHeader>

              {(preview.canCheckIn || SHOW_CHECK_IN_CONTROLS_FOR_TESTING) ? (
                <div className="grid min-h-0 flex-1 gap-4 overflow-y-auto md:grid-cols-[minmax(0,1.15fr)_minmax(280px,0.85fr)] md:overflow-hidden">
                  <div className="space-y-3 md:overflow-y-auto md:pr-1">
                    <div className="space-y-2">
                      <Label htmlFor="check-in-table">Bàn phục vụ</Label>
                      <select
                        id="check-in-table"
                        value={tableId}
                        onChange={(e) => setTableId(e.target.value)}
                        className="min-h-11 w-full rounded-md border border-neutral-200 bg-white px-3 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-neutral-400"
                      >
                        <option value="">Chọn bàn</option>
                        {assignableTables.map((t) => {
                          const statusLabel = formatTableStatusLabel(t.status);
                          const partySize = Math.max(
                            Number(preview.registeredMemberCount) || 0,
                            Number(selectedReservation?.currentPlayers) || 0,
                            Number(selectedReservation?.maxPlayers) || 0,
                          );
                          const tooSmall =
                            partySize > 0 &&
                            t.seatCount != null &&
                            partySize > t.seatCount;
                          return (
                            <option key={t.id} value={t.id} disabled={tooSmall}>
                              {t.name}
                              {t.seatCount != null ? ` · ${t.seatCount} chỗ` : ""}
                              {statusLabel ? ` · ${statusLabel}` : ""}
                              {tooSmall ? " · Không đủ chỗ" : ""}
                            </option>
                          );
                        })}
                      </select>
                    </div>

                    <div className="space-y-3 rounded-xl border border-neutral-200 bg-neutral-50/80 p-3">
                      <div>
                        <p className="text-sm font-bold text-neutral-950">
                          Kiểm tra hộp game
                        </p>
                        <p className="text-xs font-medium text-neutral-700">
                          Quét mã hoặc chọn hộp sẵn sàng trước khi bàn giao.
                        </p>
                      </div>

                      <div className="grid gap-2 sm:grid-cols-[minmax(0,1fr)_auto]">
                        <Input
                          id="check-in-box-scan"
                          value={barcode}
                          onChange={(e) => {
                            setBarcode(e.target.value);
                            setCheckedBox(null);
                          }}
                          onKeyDown={(e) => {
                            if (e.key === "Enter") {
                              e.preventDefault();
                              void handleCheckBox();
                            }
                          }}
                          placeholder="Quét hoặc nhập mã vạch"
                          aria-label="Mã vạch hộp game"
                          className="min-h-11 font-mono"
                        />
                        <Button
                          type="button"
                          variant="outline"
                          disabled={checkingBox || !barcode.trim()}
                          onClick={() => void handleCheckBox()}
                          className="min-h-11 gap-2"
                        >
                          {checkingBox ? (
                            <Spinner className="size-4" />
                          ) : (
                            <Search className="size-4" />
                          )}
                          {checkingBox ? "Đang kiểm tra..." : "Kiểm tra"}
                        </Button>
                      </div>

                      <select
                        id="check-in-box"
                        value={
                          availableBoxes.some((box) => box.barcode === barcode)
                            ? barcode
                            : ""
                        }
                        onChange={(e) => {
                          const next = e.target.value;
                          setBarcode(next);
                          setCheckedBox(null);
                          if (next) void handleCheckBox(next);
                        }}
                        aria-label="Chọn hộp sẵn sàng"
                        className="min-h-11 w-full rounded-md border border-neutral-200 bg-white px-3 font-mono text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-neutral-400"
                      >
                        <option value="">Chọn hộp sẵn sàng</option>
                        {availableBoxes.map((box) => (
                          <option key={box.id} value={box.barcode}>
                            {box.gameName ||
                              selectedReservation?.gameName ||
                              "Hộp game"}{" "}
                            · {box.barcode}
                          </option>
                        ))}
                      </select>

                      {checkedBox ? (
                        <div className="space-y-2 rounded-lg border bg-white p-3">
                          <div className="flex items-start justify-between gap-2">
                            <div className="min-w-0">
                              <p className="truncate font-semibold text-neutral-950">
                                {checkedBox.gameName || "Hộp game"}
                              </p>
                              <p className="mt-0.5 font-mono text-xs font-medium text-neutral-700">
                                {checkedBox.barcode}
                              </p>
                            </div>
                            <Badge
                              variant="outline"
                              className={
                                String(checkedBox.status).toLowerCase() ===
                                "available"
                                  ? "border-emerald-200 bg-emerald-50 text-emerald-700"
                                  : "border-amber-200 bg-amber-50 text-amber-800"
                              }
                            >
                              {formatBoxStatusLabel(checkedBox.status)}
                            </Badge>
                          </div>

                          {(checkedBox.missingComponents?.length ?? 0) > 0 ? (
                            <div className="max-h-28 space-y-1.5 overflow-y-auto rounded-lg border border-rose-200 bg-rose-50 p-2.5">
                              <p className="flex items-center gap-2 text-xs font-bold text-rose-800">
                                <AlertTriangle className="size-3.5 shrink-0" />
                                Từng ghi nhận thiếu{" "}
                                {checkedBox.missingComponents?.length} linh kiện
                              </p>
                              {checkedBox.missingComponents?.map((comp, idx) => (
                                <div
                                  key={comp.componentId || idx}
                                  className="flex justify-between gap-2 text-xs"
                                >
                                  <span className="font-medium">
                                    {comp.componentName || "Linh kiện"}
                                  </span>
                                  <span className="text-rose-700">
                                    Thiếu {comp.missingQuantity || 1}
                                  </span>
                                </div>
                              ))}
                            </div>
                          ) : (
                            <p className="flex items-center gap-2 rounded-lg border border-emerald-200 bg-emerald-50 px-2.5 py-2 text-xs font-medium text-emerald-800">
                              <ShieldCheck className="size-3.5 shrink-0" />
                              Đủ linh kiện, sẵn sàng bàn giao.
                            </p>
                          )}
                        </div>
                      ) : (
                        <p className="rounded-lg border border-dashed border-neutral-200 py-2.5 text-center text-xs font-medium text-neutral-700">
                          Chưa kiểm tra hộp.
                        </p>
                      )}
                    </div>
                  </div>

                  <div className="flex min-h-0 flex-col rounded-xl border border-emerald-200 bg-emerald-50/50 p-3 md:overflow-y-auto">
                    <div className="mb-3 flex flex-wrap items-start justify-between gap-2">
                      <div>
                        <p className="text-sm font-bold text-emerald-950">
                          Mã QR mời khách quét
                        </p>
                        <p className="text-xs font-medium text-emerald-900">
                          Bắt buộc hiện QR trước khi xác nhận.
                        </p>
                      </div>
                      <Button
                        type="button"
                        variant="outline"
                        disabled={creatingQr || !(
                          selectedReservation?.id ||
                          (preview?.raw &&
                            typeof preview.raw === "object" &&
                            (preview.raw as Record<string, unknown>).id)
                        )}
                        onClick={() => void handleShowCheckInQr()}
                        className="min-h-10 gap-2 border-emerald-300 text-emerald-900"
                      >
                        {creatingQr ? (
                          <Spinner className="size-4" />
                        ) : checkInToken ? (
                          <RefreshCw className="size-4" />
                        ) : (
                          <QrCode className="size-4" />
                        )}
                        {creatingQr
                          ? "Đang tạo..."
                          : checkInToken
                            ? "Tạo lại"
                            : "Hiện mã QR"}
                      </Button>
                    </div>

                    {checkInToken?.qrPayload ? (
                      <div className="flex flex-1 flex-col items-center justify-center gap-3 text-center">
                        <div className="rounded-xl border-2 border-emerald-200 bg-white p-3">
                          <QRCode value={checkInToken.qrPayload} size={160} />
                        </div>
                        <div className="space-y-1">
                          <p className="font-mono text-xs font-semibold tracking-wider text-emerald-900">
                            {checkInToken.token}
                          </p>
                          <p className="text-xs font-medium text-neutral-800">
                            Hết hạn: {formatTime(checkInToken.expiresAt)}
                          </p>
                          <p className="text-xs font-medium text-neutral-700">
                            Khách mở app BoardVerse và quét mã này.
                          </p>
                        </div>
                      </div>
                    ) : (
                      <div className="flex flex-1 items-center justify-center rounded-lg border border-dashed border-emerald-200 px-3 py-8 text-center text-xs text-emerald-900/70">
                        Chưa có mã QR. Bấm &quot;Hiện mã QR&quot; để tạo.
                      </div>
                    )}
                  </div>
                </div>
              ) : (
                <p className="rounded-lg border border-amber-200 bg-amber-50 px-3 py-3 text-sm text-amber-900">
                  {getCheckInStatusMessage(preview.depositStatus)}
                </p>
              )}

              <DialogFooter className="shrink-0 gap-2 sm:justify-between">
                <Button
                  type="button"
                  variant="outline"
                  onClick={closeCheckInDialog}
                >
                  Đóng
                </Button>
                {(preview.canCheckIn || SHOW_CHECK_IN_CONTROLS_FOR_TESTING) && (
                  <Button
                    type="button"
                    disabled={checkingIn || !checkInToken?.qrPayload}
                    onClick={() => void handleCheckIn()}
                    className="min-h-11 gap-2"
                  >
                    <QrCode className="size-4" />
                    {checkingIn ? "Đang nhận bàn..." : "Xác nhận nhận bàn"}
                  </Button>
                )}
              </DialogFooter>
            </>
          ) : null}
        </DialogContent>
      </Dialog>
    </div>
  );
}
