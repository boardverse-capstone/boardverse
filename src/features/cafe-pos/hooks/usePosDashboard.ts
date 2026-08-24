/* eslint-disable @typescript-eslint/no-explicit-any */
"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import { toast } from "sonner";
import { apiClient } from "@/core/api/client";
import { UserRole, normalizePortalRole } from "@/core/constants/roles";
import { useAuthStore } from "@/features/auth/store/auth.store";
import { PosCheckInService } from "@/features/pos-check-in/services/pos-check-in.service";

function myCafesPath(role: UserRole | null): string {
  if (role === UserRole.Staff) return "/api/staff/my-cafes";
  return "/api/manager/my-cafes";
}

function findSessionByGameId(sessions: any[], sessionGameId: string) {
  return sessions.find((s) =>
    (s.games || []).some(
      (g: any) => g.id === sessionGameId || g.sessionGameId === sessionGameId,
    ),
  );
}

function isAlreadyCheckedMessage(message: string) {
  return /đã được kiểm tra|already.*check|ComponentCheckAlreadyDone/i.test(
    message,
  );
}

function isSessionNotFoundError(err: unknown) {
  const msg = err instanceof Error ? err.message : String(err ?? "");
  return /Không tìm thấy phiên|session.*not found/i.test(msg);
}

function isPaidSessionStatus(status: unknown) {
  const normalized = String(status ?? "").toLowerCase();
  return normalized === "paid" || normalized === "completed";
}

/** Phiên terminal — không còn trên tab phiên / không giữ bàn InUse. */
function isTerminalSessionStatus(status: unknown) {
  const normalized = String(status ?? "")
    .toLowerCase()
    .replace(/[_\s-]/g, "");
  return (
    normalized === "paid" ||
    normalized === "completed" ||
    normalized === "closed"
  );
}

function parseUtcCheckInTime(time: string, date: string) {
  const [hour, minute] = time.split(":").map(Number);
  const [day, month, year] = date.split("/").map(Number);
  return new Date(Date.UTC(year, month - 1, day, hour, minute));
}

function formatUtcCheckInTime(time: string, date: string) {
  const value = parseUtcCheckInTime(time, date);
  if (Number.isNaN(value.getTime())) return `${time} ${date}`;
  return new Intl.DateTimeFormat("vi-VN", {
    timeZone: "Asia/Ho_Chi_Minh",
    hour: "2-digit",
    minute: "2-digit",
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  }).format(value);
}

function formatPosCheckInError(error: unknown) {
  const message =
    error instanceof Error ? error.message : "Không thể nhận bàn đơn đặt chỗ.";
  const windowMatch = message.match(
    /Cho phép check-in từ\s+(\d{1,2}:\d{2})\s+(\d{2}\/\d{2}\/\d{4})\s+đến\s+(\d{1,2}:\d{2})\s+(\d{2}\/\d{2}\/\d{4})/i,
  );
  if (/ngoài khung giờ/i.test(message) && windowMatch) {
    const fromValue = parseUtcCheckInTime(windowMatch[1], windowMatch[2]);
    const toValue = parseUtcCheckInTime(windowMatch[3], windowMatch[4]);
    const from = formatUtcCheckInTime(windowMatch[1], windowMatch[2]);
    const to = formatUtcCheckInTime(windowMatch[3], windowMatch[4]);
    const now = new Date();
    if (now < fromValue) {
      return `Chưa đến giờ nhận bàn. Có thể nhận bàn từ ${from}.`;
    }
    if (now > toValue) {
      return `Đã quá giờ nhận bàn. Thời gian nhận bàn kết thúc lúc ${to}.`;
    }
    return `Không thể nhận bàn trong thời điểm hiện tại. Thời gian cho phép: ${from} – ${to}.`;
  }
  if (/status.*holding|trạng thái.*holding/i.test(message)) {
    return "Đơn đang ở trạng thái giữ chỗ, chưa thể nhận bàn.";
  }
  return message.replace(
    /^Check-in reservation\s+['"][^'"]+['"]\s+thất bại:\s*/i,
    "",
  );
}

function rememberVerifiedFromSession(
  session: any,
  verifiedGameIds: Set<string>,
  verifiedSessionIds: Set<string>,
) {
  if (!session) return;
  const sessionId = session.id || session.sessionId;
  const games = session.games || session.Games || [];
  if (!Array.isArray(games) || games.length === 0) return;

  let allDone = true;
  for (const g of games) {
    const fromApi = String(g?.checkStatus || g?.CheckStatus || "")
      .toLowerCase()
      .replace(/[_\s-]/g, "");
    const done =
      fromApi === "verified" || fromApi === "missingcomponents";
    const gid = g.id || g.sessionGameId;
    if (done && gid) verifiedGameIds.add(gid);
    if (!done) allDone = false;
  }
  // Chỉ đánh dấu cả phiên khi mọi hộp đã kiểm kê
  if (allDone && sessionId) verifiedSessionIds.add(sessionId);
  else if (sessionId) verifiedSessionIds.delete(sessionId);
}

function applyVerifiedFlags(
  list: any[],
  verifiedGameIds: Set<string>,
  verifiedSessionIds: Set<string>,
) {
  return list.map((s) => {
    const sessionId = s.id || s.sessionId;
    const games = s.games || s.Games || [];
    if (!Array.isArray(games) || games.length === 0) {
      const sessionHit = Boolean(
        sessionId && verifiedSessionIds.has(sessionId),
      );
      return sessionHit ? { ...s, checkStatus: "Verified" } : s;
    }

    const nextGames = games.map((g: any) => {
      const gid = g.id || g.sessionGameId;
      const fromApi = String(g.checkStatus || g.CheckStatus || "")
        .toLowerCase()
        .replace(/[_\s-]/g, "");
      const done =
        fromApi === "verified" ||
        fromApi === "missingcomponents" ||
        Boolean(gid && verifiedGameIds.has(gid));
      if (done && gid) verifiedGameIds.add(gid);
      if (!done) return g;
      // Giữ MissingComponents từ BE; chỉ ép Verified khi FE đã chốt hộp này
      if (fromApi === "missingcomponents") return g;
      return { ...g, checkStatus: "Verified" };
    });

    const allDone = nextGames.every((g: any) => {
      const st = String(g.checkStatus || g.CheckStatus || "")
        .toLowerCase()
        .replace(/[_\s-]/g, "");
      return st === "verified" || st === "missingcomponents";
    });
    if (sessionId) {
      if (allDone) verifiedSessionIds.add(sessionId);
      else verifiedSessionIds.delete(sessionId);
    }

    return { ...s, games: nextGames };
  });
}

function toastCheckingRequired(
  message: string,
  session: any | undefined,
  onRequestReturnTable?: (session: any) => void,
) {
  const needsReturn = /CHECKING|trả game/i.test(message);
  toast.error(message, {
    duration: 8000,
    ...(needsReturn && session && onRequestReturnTable
      ? {
          action: {
            label: "Trả bàn",
            onClick: () => onRequestReturnTable(session),
          },
        }
      : {}),
  });
}

export function usePosDashboard(opts?: {
  initialBookingCode?: string;
  onRequestReturnTable?: (session: any) => void;
}) {
  const onRequestReturnTableRef = useRef(opts?.onRequestReturnTable);
  onRequestReturnTableRef.current = opts?.onRequestReturnTable;
  const lastCheckSessionIdRef = useRef<string | null>(null);
  const verifiedGameIdsRef = useRef<Set<string>>(new Set());
  const verifiedSessionIdsRef = useRef<Set<string>>(new Set());
  const rawRole = useAuthStore((s) => s.user?.role);
  const hasHydrated = useAuthStore((s) => s._hasHydrated);
  const role = normalizePortalRole(rawRole ?? "") ?? null;
  const canConfigureTables = role === UserRole.Manager;

  const [cafeId, setCafeId] = useState<string | null>(null);
  const [tables, setTables] = useState<any[]>([]);
  const [sessions, setSessions] = useState<any[]>([]);
  const [boxes, setBoxes] = useState<any[]>([]);
  const [loading, setLoading] = useState<boolean>(true);

  // Cờ chặn duplicate call API trong môi trường Dev (StrictMode)
  const isInitialFetched = useRef(false);

  // States hỗ trợ Workflow POS
  const [scannedBarcode, setScannedBarcode] = useState("");
  const [scannedBox, setScannedBox] = useState<any | null>(null);
  const [bookingCode, setBookingCode] = useState(opts?.initialBookingCode ?? "");
  const [bookingPreview, setBookingPreview] = useState<any | null>(null);

  // States Checklist & Checkout Modal
  const [checklistData, setChecklistData] = useState<any | null>(null);
  const [checkoutSession, setCheckoutSession] = useState<any | null>(null);

  const [unpaidSessions, setUnpaidSessions] = useState<any[]>([]);

  // 1. Tải tất cả dữ liệu nền (Tables, Active Sessions, Boxes)
  const fetchAllData = useCallback(async (cId?: string) => {
    const currentCafeId = cId || cafeId;
    if (!currentCafeId) return;

    try {
      setLoading(true);

      // GET /api/cafes/{cafeId}/pos/sessions/active (Chuẩn Endpoint Active Sessions)
      const [sessionsRes, tablesRes, boxesRes]: any = await Promise.all([
        apiClient.get(`/api/cafes/${currentCafeId}/pos/sessions/active`),
        apiClient.get(`/api/cafes/${currentCafeId}/pos/tables`, {
          params: { includeOnlyAvailable: false },
        }),
        apiClient.get(`/api/cafes/${currentCafeId}/pos/boxes`),
      ]);

      const rawSessions = sessionsRes?.data || sessionsRes || [];

      // Lọc bỏ phiên terminal (Paid / Completed / Closed)
      const activeSessionsOnly = rawSessions
        .filter(
          (s: any) =>
            !isTerminalSessionStatus(s.status ?? s.Status ?? s.sessionStatus),
        )
        .filter(
          (session: any, index: number, sessions: any[]) =>
            sessions.findIndex(
              (candidate: any) =>
                (candidate.id || candidate.sessionId) ===
                (session.id || session.sessionId),
            ) === index,
        );

      const details = await Promise.all(
        activeSessionsOnly.map(async (s: any) => {
          const sessionId = s.id || s.sessionId;
          if (!sessionId) return s;
          try {
            const detailRes: any = await apiClient.get(
              `/api/cafes/${currentCafeId}/pos/sessions/${sessionId}`,
            );
            const detail = detailRes?.data || detailRes;
            if (!detail) return s;
            return {
              ...s,
              ...detail,
              id: sessionId,
              games: detail.games ?? detail.Games ?? s.games,
              status: detail.status ?? detail.Status ?? s.status,
            };
          } catch {
            return s;
          }
        }),
      );

      const liveSessions = details.filter(
        (s: any) =>
          !isTerminalSessionStatus(s.status ?? s.Status ?? s.sessionStatus),
      );

      liveSessions.forEach((s: any) =>
        rememberVerifiedFromSession(
          s,
          verifiedGameIdsRef.current,
          verifiedSessionIdsRef.current,
        ),
      );

      setSessions(
        applyVerifiedFlags(
          liveSessions,
          verifiedGameIdsRef.current,
          verifiedSessionIdsRef.current,
        ),
      );

      // Sắp xếp danh sách bàn theo sortOrder
      const rawTables = tablesRes?.data || tablesRes || [];
      setTables(rawTables.sort((a: any, b: any) => a.sortOrder - b.sortOrder));

      // Cập nhật danh sách kho hộp game vật lý
      setBoxes(boxesRes?.data || boxesRes || []);
    } catch (err: any) {
      console.error("Lỗi cập nhật POS Dashboard:", err);
    } finally {
      setLoading(false);
    }
  }, [cafeId]);

  // Poll elapsedMinutes từ BE mỗi 1s — GET /pos/sessions/{id} (không tự tính FE)
  const playingSessionKey = sessions
    .filter((s) => {
      const st = String(s.status ?? s.Status ?? s.sessionStatus ?? "")
        .toLowerCase()
        .replace(/[_\s-]/g, "");
      return st === "active" || st === "playing";
    })
    .map((s) => s.id || s.sessionId)
    .filter(Boolean)
    .sort()
    .join(",");

  useEffect(() => {
    if (!cafeId || !playingSessionKey) return;

    const playingIds = playingSessionKey.split(",").filter(Boolean);
    let cancelled = false;
    let inFlight = false;

    const pollElapsedFromBe = async () => {
      if (cancelled || inFlight) return;
      inFlight = true;
      try {
        const details = await Promise.all(
          playingIds.map(async (sessionId) => {
            try {
              const res: any = await apiClient.get(
                `/api/cafes/${cafeId}/pos/sessions/${sessionId}`,
              );
              const detail = res?.data || res;
              if (!detail) return null;
              return {
                sessionId,
                elapsedMinutes:
                  detail.elapsedMinutes ?? detail.ElapsedMinutes,
                estimatedRemainingMinutes:
                  detail.estimatedRemainingMinutes ??
                  detail.EstimatedRemainingMinutes,
                status: detail.status ?? detail.Status,
                startedAt: detail.startedAt ?? detail.StartedAt,
              };
            } catch {
              return null;
            }
          }),
        );
        if (cancelled) return;

        const byId = new Map(
          details
            .filter(Boolean)
            .map((d) => [d!.sessionId, d!] as const),
        );
        if (byId.size === 0) return;

        setSessions((prev) =>
          prev.map((s) => {
            const id = String(s.id || s.sessionId || "");
            const fresh = byId.get(id);
            if (!fresh) return s;
            return {
              ...s,
              elapsedMinutes:
                fresh.elapsedMinutes ?? s.elapsedMinutes,
              estimatedRemainingMinutes:
                fresh.estimatedRemainingMinutes ??
                s.estimatedRemainingMinutes,
              status: fresh.status ?? s.status,
              startedAt: fresh.startedAt ?? s.startedAt,
            };
          }),
        );

        setCheckoutSession((prev: any) => {
          if (!prev?.id) return prev;
          const fresh = byId.get(String(prev.id));
          if (!fresh) return prev;
          return {
            ...prev,
            elapsedMinutes:
              fresh.elapsedMinutes ?? prev.elapsedMinutes,
            estimatedRemainingMinutes:
              fresh.estimatedRemainingMinutes ??
              prev.estimatedRemainingMinutes,
          };
        });
      } catch {
        // im lặng — lần poll sau sẽ thử lại
      } finally {
        inFlight = false;
      }
    };

    void pollElapsedFromBe();
    const timer = window.setInterval(() => {
      void pollElapsedFromBe();
    }, 1000);

    return () => {
      cancelled = true;
      window.clearInterval(timer);
    };
  }, [cafeId, playingSessionKey]);

  // Khởi tạo: lấy cafe theo role (Manager / Staff) sau khi auth hydrate
  useEffect(() => {
    if (!hasHydrated) return;
    if (isInitialFetched.current) return;
    if (!role) {
      setLoading(false);
      return;
    }

    const init = async () => {
      try {
        const res: any = await apiClient.get(myCafesPath(role));
        const list = res?.data || res || [];
        if (list.length > 0) {
          const cid = list[0].id ?? list[0].Id ?? list[0].cafeId;
          setCafeId(cid);
          isInitialFetched.current = true;
          await fetchAllData(cid);
        } else {
          setLoading(false);
        }
      } catch (err) {
        console.error("Lỗi lấy danh sách quán cafe:", err);
        setLoading(false);
      }
    };

    init();
  }, [fetchAllData, role, hasHydrated]);

  // Tra ReservationCode trong danh sách reservation của quán.
  const handlePreviewBooking = async (code: string) => {
    if (!cafeId || !code.trim()) return;
    try {
      const reservations = await PosCheckInService.getCafeReservations({
        cafeId,
        page: 1,
        pageSize: 50,
      });
      const reservation = reservations.find(
        (item) =>
          item.reservationCode.toUpperCase() === code.trim().toUpperCase(),
      );
      if (!reservation) {
        throw new Error("Không tìm thấy mã đặt chỗ trong danh sách của quán.");
      }
      setBookingPreview(reservation);
    } catch (err: any) {
      toast.error(err?.message || "Không tìm thấy đơn đặt chỗ.");
      setBookingPreview(null);
    }
  };

  // Nhận bàn đơn đặt chỗ bằng mã đặt chỗ + bàn + mã vạch.
  const handleBookingCheckIn = async (
    overrideCode?: string,
    cafeTableId?: string,
    barcode?: string,
  ) => {
    if (!cafeId) {
      toast.error("Thiếu mã quán.");
      return false;
    }
    const code = (overrideCode ?? bookingCode).trim();
    const tableId = (cafeTableId ?? "").trim();
    const boxBarcode = (barcode ?? scannedBarcode).trim();
    if (!code) {
      toast.error("Nhập mã đặt chỗ 8 ký tự.");
      return false;
    }
    if (!tableId) {
      toast.error("Chọn bàn trước khi nhận bàn.");
      return false;
    }
    if (!boxBarcode) {
      toast.error("Quét mã vạch hộp game trước khi nhận bàn.");
      return false;
    }
    try {
      await apiClient.post(`/api/cafes/${cafeId}/pos/check-in`, {
        code,
        cafeTableId: tableId,
        barcode: boxBarcode,
        idempotencyKey: `pos-checkin:${code.toLowerCase()}`,
      });

      toast.success("Nhận bàn thành công!");
      setBookingCode("");
      setBookingPreview(null);
      await fetchAllData(cafeId);
      return true;
    } catch (err: unknown) {
      toast.error(formatPosCheckInError(err));
      return false;
    }
  };

  const handleAddGuest = async (sessionId: string, displayName: string) => {
    if (!cafeId) return false;
    try {
      await PosCheckInService.addGuestSlots(cafeId, sessionId, { displayName });
      await fetchAllData(cafeId);
      return true;
    } catch (err: any) {
      toast.error(err?.message || "Không thêm được khách vãng lai.");
      return false;
    }
  };

  const handleAttachSessionGame = async (
    sessionId: string,
    barcode: string,
  ) => {
    if (!cafeId) return false;
    try {
      await PosCheckInService.assignSessionGames(cafeId, sessionId, {
        barcode,
      });
      toast.success("Đã gán thêm hộp game vào phiên.");
      await fetchAllData(cafeId);
      return true;
    } catch (err: any) {
      toast.error(err?.message || "Không thể gán hộp game vào phiên.");
      return false;
    }
  };

  const handleAddSessionMembers = async (
    sessionId: string,
    userIds: string[],
  ) => {
    if (!cafeId) return false;
    try {
      await PosCheckInService.addSessionMembers(cafeId, sessionId, {
        userIds,
      });
      toast.success("Đã thêm member đến muộn vào phiên.");
      await fetchAllData(cafeId);
      return true;
    } catch (err: any) {
      toast.error(err?.message || "Không thể thêm member vào phiên.");
      return false;
    }
  };

  const handleReportInventoryLoss = async (
    sessionId: string,
    payload: {
      sessionGameId: string;
      missingComponents: Array<{
        componentTemplateId: string;
        missingQuantity: number;
      }>;
      notes?: string;
    },
  ) => {
    if (!cafeId) return false;
    try {
      await PosCheckInService.reportInventoryLoss(cafeId, sessionId, payload);
      toast.success("Đã ghi nhận hao hụt linh kiện.");
      await fetchAllData(cafeId);
      return true;
    } catch (err: any) {
      toast.error(err?.message || "Không thể ghi nhận hao hụt linh kiện.");
      return false;
    }
  };

  const handlePartialCheckout = async (
    sessionId: string,
    memberUserIds: string[],
    applyDeposit?: boolean,
  ) => {
    if (!cafeId) return false;
    try {
      await PosCheckInService.partialCheckout(cafeId, sessionId, {
        memberUserIds,
        applyDeposit,
      });
      toast.success("Đã thanh toán một phần cho member đã chọn.");
      await fetchAllData(cafeId);
      return true;
    } catch (err: any) {
      toast.error(err?.message || "Không thể thanh toán một phần.");
      return false;
    }
  };

  const handleMergeSessionMember = async (
    sourceSessionId: string,
    memberUserId: string,
    targetSessionId: string,
  ) => {
    if (!cafeId) return false;
    try {
      await PosCheckInService.mergeSessions(cafeId, sourceSessionId, {
        memberUserId,
        targetSessionId,
      });
      toast.success("Đã chuyển member sang phiên khác.");
      await fetchAllData(cafeId);
      return true;
    } catch (err: any) {
      toast.error(err?.message || "Không thể chuyển member sang phiên khác.");
      return false;
    }
  };

  const handleManualConfirmCash = async (
    sessionId: string,
    amount: number,
    notes?: string,
  ) => {
    if (!cafeId) return false;
    try {
      await PosCheckInService.manualConfirmPayment({
        sessionId,
        amount,
        notes,
        cafeId,
      });
      toast.success("Đã xác nhận thanh toán tiền mặt.");
      setCheckoutSession(null);
      setSessions((prev) => prev.filter((s) => s.id !== sessionId));
      await fetchAllData(cafeId);
      return true;
    } catch (err: any) {
      toast.error(err?.message || "Xác nhận tiền mặt thất bại.");
      return false;
    }
  };

  // BƯỚC 3b: Bắt đầu phiên chơi mới (POST /api/cafes/{cafeId}/pos/sessions)
  const handleStartSession = async (
    cafeTableId: string,
    barcode: string,
    walkInGuests: Array<{ displayName: string; phoneNumber?: string }> = [],
  ) => {
    if (!cafeId) return false;
    try {
      const res: any = await apiClient.post(
        `/api/cafes/${cafeId}/pos/sessions`,
        {
          cafeTableId,
          barcode,
        }
      );
      const newSession = res?.data || res;
      const sessionId = newSession?.id || newSession?.sessionId;

      const guests = walkInGuests.filter((g) => g.displayName.trim());
      if (sessionId && guests.length > 0) {
        for (const guest of guests) {
          try {
            await PosCheckInService.addGuestSlots(cafeId, sessionId, {
              displayName: guest.displayName.trim(),
              phoneNumber: guest.phoneNumber?.trim() || undefined,
            });
          } catch (guestErr: any) {
            toast.error(
              guestErr?.message ||
                `Phiên đã mở nhưng chưa thêm đủ khách vãng lai (${guest.displayName}).`,
            );
            await fetchAllData(cafeId);
            return true;
          }
        }
      }

      toast.success(
        `Đã mở bàn ${newSession?.tableName || "POS"}${
          guests.length ? ` · ${guests.length} khách vãng lai` : ""
        }.`,
      );
      await fetchAllData(cafeId);
      return true;
    } catch (err: any) {
      toast.error(err?.message || "Không thể khởi tạo phiên chơi.");
      return false;
    }
  };

  // BƯỚC 6: Kết thúc phiên / Trả bàn (POST /sessions/{id}/end)
  const handleEndSession = async (sessionId: string) => {
    if (!cafeId) return false;
    try {
      const res: any = await apiClient.post(
        `/api/cafes/${cafeId}/pos/sessions/${sessionId}/end`
      );
      toast.success("Khách đã trả game. Phiên đang chờ kiểm kê.");
      await fetchAllData(cafeId);
      return res?.data || res;
    } catch (err: any) {
      toast.error(err?.message || "Không thể kết thúc phiên chơi.");
      return false;
    }
  };

  // BƯỚC 7: GET /component-checklist (Lấy danh sách linh kiện kiểm kê)
  const handleFetchChecklist = async (
    sessionGameId: string,
    sessionId?: string | null,
  ) => {
    if (!cafeId) return null;
    const linkedSession =
      findSessionByGameId(sessions, sessionGameId) ||
      sessions.find((s) => s.id === sessionId);
    lastCheckSessionIdRef.current = linkedSession?.id ?? sessionId ?? null;
    try {
      const res: any = await apiClient.get(
        `/api/cafes/${cafeId}/pos/sessions/${sessionGameId}/component-checklist`
      );
      const data = res?.data || res;
      setChecklistData(data);
      return data;
    } catch (err: any) {
      const message = err?.message || "Lỗi lấy bảng kiểm kê linh kiện.";
      toastCheckingRequired(
        message,
        linkedSession,
        (session) => {
          setChecklistData(null);
          onRequestReturnTableRef.current?.(session);
        },
      );
      return null;
    }
  };

  // BƯỚC 8: Trả game (Chuyển status phiên chơi sang Checking - BR-12)
  const handleReturnGame = async (sessionId: string) => {
    if (!cafeId) return false;
    try {
      await apiClient.post(
        `/api/cafes/${cafeId}/pos/sessions/${sessionId}/return-game`,
        {}
      );
      await fetchAllData(cafeId);
      return true;
    } catch (err: any) {
      console.log("Return game status:", err?.message);
      return true;
    }
  };

  const markComponentCheckDone = (sessionGameId: string) => {
    if (sessionGameId) verifiedGameIdsRef.current.add(sessionGameId);
    // Không đánh dấu cả phiên — chỉ khi mọi hộp đã kiểm (applyVerifiedFlags)
  };

  // BƯỚC 9: POST /component-check (Chốt kết quả kiểm kê linh kiện)
  const handleComponentCheck = async (payload: {
    sessionGameId: string;
    markAllValid: boolean;
    results: any[];
  }) => {
    if (!cafeId) return null;

    const finishChecked = async (data: unknown = { checkStatus: "Verified" }) => {
      markComponentCheckDone(payload.sessionGameId);
      setChecklistData(null);
      await fetchAllData(cafeId);
      toast.success("Đã kiểm kê linh kiện.");
      return data;
    };

    try {
      const res: any = await apiClient.post(
        `/api/cafes/${cafeId}/pos/sessions/component-check`,
        payload
      );
      return await finishChecked(res?.data || res);
    } catch (err: any) {
      const message = err?.message || "Xác nhận kiểm kê thất bại.";
      if (isAlreadyCheckedMessage(message)) {
        return await finishChecked();
      }
      toastCheckingRequired(
        message,
        findSessionByGameId(sessions, payload.sessionGameId) ||
          sessions.find((s) => s.id === lastCheckSessionIdRef.current),
        (session) => {
          setChecklistData(null);
          onRequestReturnTableRef.current?.(session);
        },
      );
      return null;
    }
  };

  /** POST .../sessions/{id}/resume — CHECKING → ACTIVE khi trả bàn nhầm */
  const handleResumeSession = async (sessionId: string) => {
    if (!cafeId) return false;
    try {
      await apiClient.post(
        `/api/cafes/${cafeId}/pos/sessions/${sessionId}/resume`,
      );
      toast.success("Đã khôi phục phiên — tiếp tục chơi.");
      await fetchAllData(cafeId);
      return true;
    } catch (err: any) {
      toast.error(err?.message || "Không thể khôi phục phiên chơi.");
      return false;
    }
  };

  /** POST .../component-check/reset?sessionGameId= */
  const handleResetComponentCheck = async (sessionGameId: string) => {
    if (!cafeId || !sessionGameId) return null;
    try {
      const res: any = await apiClient.post(
        `/api/cafes/${cafeId}/pos/sessions/component-check/reset`,
        null,
        { params: { sessionGameId } },
      );
      verifiedGameIdsRef.current.delete(sessionGameId);
      toast.success("Đã reset bảng kiểm kê — kiểm kê lại.");
      await fetchAllData(cafeId);
      return res?.data || res;
    } catch (err: any) {
      toast.error(err?.message || "Không thể reset kiểm kê.");
      return null;
    }
  };

  /** GET .../sessions/paid — báo cáo phiên đã thanh toán trong ngày (UTC) */
  const handleFetchPaidSessions = useCallback(
    async (fromDate?: string, toDate?: string) => {
      if (!cafeId) return [];
      const todayUtc = new Date().toISOString().slice(0, 10);
      try {
        const res: any = await apiClient.get(
          `/api/cafes/${cafeId}/pos/sessions/paid`,
          {
            params: {
              fromDate: fromDate || todayUtc,
              toDate: toDate || todayUtc,
            },
          },
        );
        // BE: { data: { items: [...], totalCount, ... } }
        const payload = res?.data ?? res;
        if (Array.isArray(payload)) return payload;
        if (Array.isArray(payload?.items)) return payload.items;
        return [];
      } catch (err: any) {
        console.error("Lỗi lấy danh sách phiên Paid:", err);
        toast.error(err?.message || "Không tải được phiên đã thanh toán.");
        return [];
      }
    },
    [cafeId],
  );

  const handleFetchUnpaidSessions = useCallback(
    async (olderThanMinutes = 0) => {
      if (!cafeId) return [];
      try {
        const res: any = await apiClient.get(
          `/api/cafes/${cafeId}/pos/sessions/unpaid?olderThanMinutes=${olderThanMinutes}`,
        );
        const data = res?.data || res || [];
        setUnpaidSessions(data);
        return data;
      } catch (err: any) {
        console.error("Lỗi lấy danh sách phiên Unpaid:", err);
        return [];
      }
    },
    [cafeId],
  );

  // BƯỚC 10: POST /checkout (Chuyển trạng thái phiên chơi sang UNPAID)
  const handleCheckoutSession = async (sessionId: string) => {
    if (!cafeId) return false;
    try {
      const res: any = await apiClient.post(
        `/api/cafes/${cafeId}/pos/sessions/${sessionId}/checkout`,
        { useExternalPayment: false },
      );

    let checkoutData = res?.data || res;

      const hasTotal =
        Number(checkoutData?.totalAmount ?? checkoutData?.TotalAmount ?? 0) >
          0 ||
        Number(checkoutData?.subtotal ?? checkoutData?.Subtotal ?? 0) > 0;

      if (checkoutData && !hasTotal) {
        const detailRes = await handleGetSessionDetail(sessionId);
        if (detailRes) {
          checkoutData = { ...detailRes, ...checkoutData };
        }
      }

      setCheckoutSession((prev: any) => ({
        ...(prev || {}),
        ...checkoutData,
        id: sessionId,
        tableName: checkoutData?.tableName || prev?.tableName,
      }));
      await fetchAllData(cafeId);
      return checkoutData || true;
    } catch (err: any) {
      toast.error(err?.message || "Lỗi khi gọi API Checkout phiên chơi.");
      return false;
    }
  };

  // BƯỚC 11: POST /pay — thanh toán thủ công (Swagger: body chỉ { notes })
  const handlePaySession = async (
    sessionId: string,
    payloadData?: {
      penaltyItems?: Array<{
        componentId: string;
        componentName: string;
        penaltyAmount: number;
        responsibleMemberId?: string | null;
      }>;
      notes?: string;
    }
  ) => {
    if (!cafeId) return false;
    try {
      const res: any = await apiClient.post(
        `/api/cafes/${cafeId}/pos/sessions/${sessionId}/pay`,
        { notes: payloadData?.notes || "Thanh toán thủ công tại quầy POS" },
      );

      const tableLabel =
        checkoutSession?.tableName ||
        checkoutSession?.tableLabel ||
        sessions.find((s) => s.id === sessionId)?.tableName ||
        "Bàn";
      toast.success(
        `Thanh toán thủ công thành công. ${tableLabel} đã trống, có thể đặt bàn ngay! Xem hóa đơn tại tab Giải ngân.`,
      );

    // Đóng Modal Thu Tiền
    setCheckoutSession(null);

    // Xóa ngay phiên khỏi local state Unpaid & Active
    setSessions((prev) => prev.filter((s) => s.id !== sessionId));
    setUnpaidSessions((prev) => prev.filter((s) => s.id !== sessionId));

    // Tải lại toàn bộ dữ liệu POS (Tables, Sessions, Unpaid)
    await fetchAllData(cafeId);
    await handleFetchUnpaidSessions(0);

      return res?.data || res;
    } catch (err: any) {
      toast.error(err?.message || "Không thể thanh toán phiên chơi này.");
      return false;
    }
  };

  // Cập nhật thông tin từng bàn (PATCH)
  const handleUpdateTable = async (
    tableId: string,
    payload: { name?: string; seatCount?: number; sortOrder?: number }
  ) => {
    if (!cafeId) return false;
    try {
      const res: any = await apiClient.patch(
        `/api/cafes/${cafeId}/pos/tables/${tableId}`,
        payload
      );
      setTables((prev) =>
        prev
          ? prev
              .map((t) => (t.id === tableId ? { ...t, ...res?.data } : t))
              .sort((a, b) => a.sortOrder - b.sortOrder)
          : []
      );
      return true;
    } catch (err: any) {
      toast.error(err?.message || "Cập nhật thông tin bàn thất bại.");
      return false;
    }
  };

  // Cấu hình sơ đồ bàn (PUT /tables)
  const handleSyncTables = async (
    tablesData: Array<{ name: string; seatCount: number; sortOrder: number }>
  ) => {
    if (!cafeId) return false;
    try {
      const res: any = await apiClient.put(`/api/cafes/${cafeId}/pos/tables`, {
        tables: tablesData,
      });
      toast.success("Đồng bộ sơ đồ bàn thành công.");
      setTables(
        (res?.data || res || []).sort((a: any, b: any) => a.sortOrder - b.sortOrder)
      );
      return true;
    } catch (err: any) {
      toast.error(err?.message || "Lỗi đồng bộ sơ đồ bàn.");
      return false;
    }
  };

// Quét Barcode Hộp Game & Tự động nạp lịch sử linh kiện bị mất nếu có
const handleScanBarcode = async () => {
  if (!cafeId || !scannedBarcode.trim()) return;
  try {
    const res: any = await apiClient.get(
      `/api/cafes/${cafeId}/pos/boxes/by-barcode/${scannedBarcode.trim()}`
    );
    const boxData = res?.data || res;

    if (boxData?.id) {
      // Tự động kiểm tra xem hộp game có linh kiện bị mất/hỏng ở các phiên trước không
      try {
        const historyRes: any = await apiClient.get(
          `/api/cafes/${cafeId}/pos/boxes/${boxData.id}/component-history`
        );
        const historyData = historyRes?.data || historyRes;

        // Bóc tách toàn bộ linh kiện bị mất từ các sự cố trước đó
        const allMissingComponents =
          historyData?.incidents?.flatMap(
            (incident: any) => incident.missingComponents || []
          ) || [];

        boxData.missingComponents = allMissingComponents;
        boxData.totalIncidents = historyData?.totalIncidents || 0;
      } catch (err) {
        console.warn("Không thể tải lịch sử kiểm kê linh kiện:", err);
        boxData.missingComponents = [];
      }
    }

    setScannedBox(boxData);
  } catch (err: any) {
    toast.error(err?.message || "Không tìm thấy hộp game với mã vạch này.");
    setScannedBox(null);
  }
};

  // Lấy chi tiết 1 phiên chơi (GET /sessions/{id})
  const handleGetSessionDetail = useCallback(
    async (sessionId: string) => {
      if (!cafeId) return null;
      try {
        const res: any = await apiClient.get(
          `/api/cafes/${cafeId}/pos/sessions/${sessionId}`
        );
        const data = res?.data || res;
        rememberVerifiedFromSession(
          data,
          verifiedGameIdsRef.current,
          verifiedSessionIdsRef.current,
        );
        if (data) {
          setSessions((prev) =>
            applyVerifiedFlags(
              prev.map((s) =>
                s.id === sessionId || s.id === data.id
                  ? { ...s, games: data.games ?? s.games }
                  : s,
              ),
              verifiedGameIdsRef.current,
              verifiedSessionIdsRef.current,
            ),
          );
        }
        return data;
      } catch (err: any) {
        if (!isSessionNotFoundError(err)) {
          console.error("Lỗi lấy chi tiết phiên chơi:", err);
        }
        return null;
      }
    },
    [cafeId]
  );

  const completePaidCheckout = useCallback(
    async (sessionId: string) => {
      setCheckoutSession(null);
      setSessions((prev) => prev.filter((s) => s.id !== sessionId));
      if (cafeId) await fetchAllData(cafeId);
    },
    [cafeId, fetchAllData],
  );

  /** Poll GET session — webhook SePay có thể xóa phiên khỏi active ngay sau khi PAID. */
  const handleRefreshCheckoutPayment = useCallback(
    async (sessionId: string) => {
      if (!cafeId) return null;
      try {
        const res: any = await apiClient.get(
          `/api/cafes/${cafeId}/pos/sessions/${sessionId}`,
        );
        const detail = res?.data || res;
        const status = detail?.status ?? detail?.Status;

        if (isPaidSessionStatus(status)) {
          await completePaidCheckout(sessionId);
          return { ...detail, status: "Paid", id: sessionId };
        }

        setCheckoutSession((prev: any) =>
          prev?.id === sessionId
            ? {
                ...(prev || {}),
                ...detail,
                id: sessionId,
                tableName: detail.tableName || prev?.tableName,
              }
            : prev,
        );
        return detail;
      } catch (err) {
        if (isSessionNotFoundError(err)) {
          await completePaidCheckout(sessionId);
          return { status: "Paid", id: sessionId };
        }
        // Poll thanh toán là tác vụ nền; lỗi mạng/timeout sẽ được thử lại.
        return null;
      }
    },
    [cafeId, fetchAllData, completePaidCheckout],
  );

  // Lấy lịch sử hộp game 
const handleFetchBoxHistory = useCallback(
  async (boxId: string, sessionId?: string) => {
    if (!cafeId || !boxId) return null;
    try {
      const url = sessionId
        ? `/api/cafes/${cafeId}/pos/boxes/${boxId}/component-history?sessionId=${sessionId}`
        : `/api/cafes/${cafeId}/pos/boxes/${boxId}/component-history`;

      const res: any = await apiClient.get(url);
      return res?.data || res;
    } catch (err: any) {
      console.error("Lỗi lấy lịch sử kiểm kê hộp game:", err);
      toast.error(err?.message || "Không thể lấy lịch sử kiểm kê của hộp game này.");
      return null;
    }
  },
  [cafeId]
);



  return {
    cafeId,
    tables,
    sessions,
    boxes,
    loading,
    scannedBarcode,
    setScannedBarcode,
    scannedBox,
    setScannedBox,
    bookingCode,
    setBookingCode,
    bookingPreview,
    checklistData,
    setChecklistData,
    checkoutSession,
    setCheckoutSession,
    refreshData: () => cafeId && fetchAllData(cafeId),
    handleScanBarcode,
    handlePreviewBooking,
    handleBookingCheckIn,
    handleStartSession,
    handleEndSession,
    handleGetSessionDetail,
    handleFetchChecklist,
    handleOpenChecklist: handleFetchChecklist,
    handleReturnGame,
    handleComponentCheck,
    unpaidSessions,
    handleFetchUnpaidSessions,
    handleFetchPaidSessions,
    handleResumeSession,
    handleResetComponentCheck,
    handleCheckoutSession,
    handlePaySession,
    handleSyncTables,
    handleUpdateTable,
    handleFetchBoxHistory,
    handleAddGuest,
    handleAttachSessionGame,
    handleAddSessionMembers,
    handleReportInventoryLoss,
    handlePartialCheckout,
    handleMergeSessionMember,
    handleManualConfirmCash,
    handleRefreshCheckoutPayment,
    canConfigureTables,
    role,
  };
}