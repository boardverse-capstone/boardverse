/* eslint-disable @typescript-eslint/no-explicit-any */
"use client";

import { usePosDashboard } from "../hooks/usePosDashboard";
import { useCafePosHub } from "../hooks/useCafePosHub";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Card,
  CardContent,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from "@/components/ui/tabs";
import { SyncTablesModal } from "./sync-tables-modal";
import { CheckoutConfirmModal } from "./checkout-confirm-modal";
import { PayConfirmModal } from "./checkout-pay-modal";
import { ComponentChecklistModal } from "./component-checklist-modal";
import { SessionDetailModal } from "./session-detail-modal";
import { SessionInventoryModal } from "./session-inventory-modal";
import { PosBoxesTab, filterBoxesAssignableForPos } from "./pos-boxes-tab";
import { StartSessionModal } from "./start-session-modal";
import {
  ActiveSessionsTab,
} from "./active-sessions-tab";
import { EndSessionModal } from "./end-session-modal";
import { BoxComponentHistoryModal } from "./box-component-history-modal";
import { PendingBookingsPanel } from "./pending-bookings-panel";
import { SettlementsTab } from "./settlements-tab";
import { toast } from "sonner";
import {
  RefreshCw,
  Play,
  Users,
  Clock,
  Settings,
  Wifi,
  WifiOff,
  Loader2,
  Table2,
  Gamepad2,
  Box,
  Banknote,
  Store,
  UserCheck,
} from "lucide-react";
import { useCallback, useMemo, useState } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import {
  formatPlayerRange,
  mergePlayerRange,
} from "../lib/player-range";
import {
  focusFrameOnPointerDown,
  interactiveFrameAmberClass,
  interactiveFrameClass,
} from "../lib/interactive-frame";
import {
  arcadeCardClass,
  hexChipClass,
  statusOrbClass,
} from "../lib/game-theme";
import { cn } from "@/lib/utils";

type PosTab = "reception" | "tables" | "sessions" | "boxes" | "settlements";

function parsePosTab(raw: string | null): PosTab {
  if (
    raw === "reception" ||
    raw === "sessions" ||
    raw === "boxes" ||
    raw === "settlements"
  ) {
    return raw;
  }
  return "tables";
}

function isOpsTab(tab: PosTab): tab is Exclude<PosTab, "reception"> {
  return tab !== "reception";
}

export function PosFeatureContainer(props?: { initialBookingCode?: string }) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const activeTab = (() => {
    const raw = searchParams.get("tab");
    if (raw == null && props?.initialBookingCode) return "reception" as PosTab;
    return parsePosTab(raw);
  })();
  const patchPosQuery = useCallback(
    (patch: Record<string, string | null>) => {
      const params = new URLSearchParams(searchParams.toString());
      for (const [key, value] of Object.entries(patch)) {
        if (!value) params.delete(key);
        else params.set(key, value);
      }
      const query = params.toString();
      router.replace(query ? `${pathname}?${query}` : pathname, { scroll: false });
    },
    [pathname, router, searchParams],
  );
  const setActiveTab = useCallback(
    (tab: PosTab) => {
      patchPosQuery({
        tab: tab === "tables" ? null : tab,
      });
    },
    [patchPosQuery],
  );
  const opsTab: Exclude<PosTab, "reception"> = isOpsTab(activeTab)
    ? activeTab
    : "tables";
  const topArea = activeTab === "reception" ? "reception" : "ops";
  const [endingSession, setEndingSession] = useState<any | null>(null);
  const selectedDetailSessionId = searchParams.get("session");
  const inventorySessionId = searchParams.get("inventory");
  const setSelectedDetailSessionId = useCallback(
    (sessionId: string | null) => {
      patchPosQuery({ session: sessionId });
    },
    [patchPosQuery],
  );
  const setInventorySessionId = useCallback(
    (sessionId: string | null) => {
      patchPosQuery({ inventory: sessionId });
    },
    [patchPosQuery],
  );
  const [detailRefreshKey, setDetailRefreshKey] = useState(0);
  const {
    cafeId,
    tables,
    sessions,
    boxes,
    loading,
    checklistData,
    setChecklistData,
    unpaidSessions = [],
    handleFetchUnpaidSessions,
    checkoutSession,
    setCheckoutSession,
    refreshData,
    handleBookingCheckIn,
    handleStartSession,
    handleEndSession,
    handleGetSessionDetail,
    handleOpenChecklist,
    handleComponentCheck,
    handleCheckoutSession,
    handlePaySession,
    handlePauseSession,
    handleResumePause,
    handleResumeSession,
    handleResetComponentCheck,
    handleFetchPaidSessions,
    handleSyncTables,
    handleFetchBoxHistory,
    handleAddGuest,
    handleAttachSessionGame,
    handleAddSessionMembers,
    handleReportInventoryLoss,
    handlePartialCheckout,
    handleMergeSessionMember,
    handleRefreshCheckoutPayment,
    forceCompleteSession,
    canConfigureTables,
  } = usePosDashboard({
    initialBookingCode: props?.initialBookingCode,
    onRequestReturnTable: (session) => {
      setSelectedDetailSessionId(null);
      setEndingSession(session);
    },
  });

  /**
   * Chia tiền xong — BE đã xác nhận Paid qua response /payment-status.
   * Gọi thẳng forceCompleteSession (bypass poll /pos/sessions/{id}).
   */
  const handleSplitBillPaid = useCallback(
    async (sessionId: string) => {
      await forceCompleteSession(sessionId);
    },
    [forceCompleteSession],
  );

  /** Hộp Available và chưa nằm trên phiên live (GET sessions.games). */
  const assignableBoxes = useMemo(
    () => filterBoxesAssignableForPos(boxes, sessions),
    [boxes, sessions],
  );

  /**
   * Set các bàn đang có phiên live (Active/Playing/Checking/Unpaid).
   * Dùng cho header badge "Trống X/Y" — bàn InUse không có session vẫn là trống
   * (chưa mở phiên), tránh đếm thiếu như chỉ lọc `status === "Available"`.
   */
  const busyTableIds = useMemo(() => {
    const ids = new Set<string>();
    for (const s of sessions) {
      const st = String(s.status ?? s.Status ?? s.sessionStatus ?? "")
        .toLowerCase()
        .replace(/[_\s-]/g, "");
      if (
        st === "active" ||
        st === "playing" ||
        st === "checking" ||
        st === "unpaid"
      ) {
        const sid = s.cafeTableId || s.tableId || s.CafeTableId;
        if (sid) ids.add(String(sid));
      }
    }
    return ids;
  }, [sessions]);

  /** Bàn trống = Available hoặc InUse nhưng chưa có phiên live. */
  const availableTableCount = useMemo(
    () =>
      tables.filter((t) => {
        const st = String(t.status ?? "").toLowerCase();
        if (st === "available") return true;
        if (st === "inuse") return !busyTableIds.has(String(t.id));
        return false;
      }).length,
    [tables, busyTableIds],
  );

  const { connected: hubConnected } = useCafePosHub({
    enabled: Boolean(cafeId),
    cafeId,
    onRefresh: refreshData,
  });

  const [isSyncModalOpen, setIsSyncModalOpen] = useState(false);
  const [startTable, setStartTable] = useState<{
    id: string;
    name: string;
    minPlayers?: number | null;
    maxPlayers?: number | null;
  } | null>(null);
  const [startSessionPrefill, setStartSessionPrefill] = useState<{
    guestCount: number;
    guestNames: string[];
    guestPhones: string[];
  } | null>(null);

  const [historyModalState, setHistoryModalState] = useState<{
    isOpen: boolean;
    data: any;
    targetSession: any;
  }>({
    isOpen: false,
    data: null,
    targetSession: null,
  });

  const handleInitiatePaymentFlow = async (session: any) => {
    let detailedSession = session;
    if (handleGetSessionDetail) {
      const detailRes = await handleGetSessionDetail(session.id);
      if (detailRes) {
        detailedSession = { ...session, ...detailRes };
      }
    }

    const games: any[] =
      detailedSession.games || detailedSession.Games || [];

    const normCheck = (game: any) =>
      String(game?.checkStatus ?? game?.CheckStatus ?? "")
        .toLowerCase()
        .replace(/[_\s-]/g, "");

    // Ưu tiên hộp đang MissingComponents trong phiên (không lấy games[0] mặc định)
    const missingGames = games.filter(
      (game) => normCheck(game) === "missingcomponents",
    );

    if (missingGames.length === 0 || !handleFetchBoxHistory) {
      setCheckoutSession(detailedSession);
      return;
    }

    const histories = await Promise.all(
      missingGames.map(async (game) => {
        const boxId =
          game.cafeInventoryBoxId ||
          game.CafeInventoryBoxId ||
          game.boxId ||
          game.BoxId;
        if (!boxId) return null;
        const historyRes = await handleFetchBoxHistory(
          boxId,
          detailedSession.id,
        );
        return (
          historyRes || {
            boxId,
            gameName: game.gameName || game.name || "Hộp game",
            barcode: game.boxBarcode || game.barcode || "—",
            totalIncidents: 0,
            incidents: [],
          }
        );
      }),
    );

    const validHistories = histories.filter(Boolean) as any[];
    if (validHistories.length === 0) {
      setCheckoutSession(detailedSession);
      return;
    }

    const mergedIncidents = validHistories.flatMap(
      (h) => h.incidents || [],
    );
    const merged = {
      boxId: validHistories[0].boxId,
      gameName: missingGames
        .map((g) => g.gameName || g.name)
        .filter(Boolean)
        .join(", "),
      barcode: missingGames
        .map((g) => g.boxBarcode || g.barcode)
        .filter(Boolean)
        .join(" · "),
      totalIncidents:
        mergedIncidents.length ||
        validHistories.reduce(
          (sum, h) => sum + Number(h.totalIncidents || 0),
          0,
        ),
      incidents: mergedIncidents,
    };

    setHistoryModalState({
      isOpen: true,
      data: merged,
      targetSession: detailedSession,
    });
  };

  const handleProceedFromHistoryToPay = () => {
    const targetSession = historyModalState.targetSession;
    setHistoryModalState({ isOpen: false, data: null, targetSession: null });
    if (targetSession) {
      setCheckoutSession(targetSession);
    }
  };

  // LUỒNG TỰ ĐỘNG: CHỐT KIỂM KÊ LINH KIỆN -> MỞ MODAL CHECKOUT CONFIRM
  const handleChecklistSubmitOnly = async (payload: any) => {
    const checkResult = await handleComponentCheck(payload);
    if (checkResult) {
      setDetailRefreshKey((key) => key + 1);
    }
    return Boolean(checkResult);
  };

  return (
    <div className="min-w-0 space-y-4 font-sans text-neutral-900 antialiased">
      <Card
        className={cn(
          "gap-0 border-indigo-200/60 bg-gradient-to-br from-white via-indigo-50/40 to-purple-50/30 py-0 shadow-md",
          arcadeCardClass,
          interactiveFrameClass,
        )}
        tabIndex={0}
        onPointerDown={focusFrameOnPointerDown}
      >
        <CardContent className="relative flex flex-wrap items-center justify-between gap-3 p-3 sm:p-4">
          <div className="flex min-w-0 flex-wrap items-center gap-2">
            <h1 className="text-lg font-extrabold tracking-tight text-neutral-950 sm:text-xl">
              <span className="bg-gradient-to-r from-indigo-700 via-purple-700 to-pink-700 bg-clip-text text-transparent drop-shadow-sm">
                Quầy POS
              </span>
              <span className="ml-1 font-mono text-xs font-normal text-neutral-500">
                / ARCADE MODE
              </span>
            </h1>
            <Badge
              variant="outline"
              role="status"
              className={
                hubConnected
                  ? cn(
                      "gap-1.5 border-emerald-300 bg-emerald-50 font-semibold text-emerald-800 shadow-[0_0_8px_rgba(16,185,129,0.3)]",
                    )
                  : "border-neutral-200 bg-neutral-50 font-semibold text-neutral-700"
              }
            >
              <span
                className={cn(
                  statusOrbClass,
                  hubConnected ? "bg-emerald-500" : "bg-neutral-400",
                )}
              />
              {hubConnected ? "TRỰC TIẾP" : "NGOẠI TUYẾN"}
            </Badge>
            <Badge
              variant="outline"
              className="gap-1.5 border-emerald-300 bg-emerald-50 font-semibold text-emerald-800 shadow-[inset_0_-2px_0_rgba(0,0,0,0.06)]"
            >
              <span className={cn(statusOrbClass, "bg-emerald-500")} />
              Trống {availableTableCount}/{tables.length}
            </Badge>
            <Badge
              variant="outline"
              className="gap-1.5 border-amber-300 bg-amber-50 font-semibold text-amber-900 shadow-[inset_0_-2px_0_rgba(0,0,0,0.06)]"
            >
              <span className={cn(statusOrbClass, "bg-amber-500")} />
              Đang chơi {sessions.length}
            </Badge>
          </div>

          <div className="flex flex-wrap gap-2">
            <Button
              type="button"
              variant="outline"
              onClick={refreshData}
              className="h-9 gap-2 border-2 font-bold uppercase tracking-wider shadow-[inset_0_-2px_0_rgba(0,0,0,0.08)] transition-all hover:translate-y-[-1px]"
              aria-label="Làm mới toàn bộ dữ liệu POS"
            >
              <RefreshCw className="size-4" />
              Làm mới
            </Button>
            {canConfigureTables && (
              <Button
                type="button"
                variant="outline"
                onClick={() => setIsSyncModalOpen(true)}
                className="h-9 gap-2 border-2 font-bold uppercase tracking-wider shadow-[inset_0_-2px_0_rgba(0,0,0,0.08)] transition-all hover:translate-y-[-1px]"
              >
                <Settings className="size-4" />
                Cài đặt bàn
              </Button>
            )}
          </div>
        </CardContent>
      </Card>

      <div className="min-w-0 space-y-3">
        <Tabs
          value={topArea}
          onValueChange={(value) => {
            if (value === "reception") setActiveTab("reception");
            else if (!isOpsTab(activeTab)) setActiveTab("tables");
          }}
          className="min-w-0 gap-3"
        >
          <div className="flex max-w-full justify-start overflow-x-auto pb-1">
            <TabsList
              aria-label="Khu vực chính POS"
              className="inline-flex h-auto min-h-11 flex-wrap items-center justify-center gap-1 self-center rounded-md border-2 border-indigo-300/60 bg-gradient-to-r from-indigo-100 via-purple-100 to-pink-100 p-1 shadow-[2px_2px_0_rgba(0,0,0,0.08)]"
            >
              <TabsTrigger
                value="ops"
                className="inline-flex h-9 items-center justify-center gap-1.5 self-center whitespace-nowrap border-2 border-transparent bg-transparent px-3 align-middle font-mono text-[13px] font-bold uppercase leading-[1] tracking-normal text-neutral-700 data-active:border-indigo-500 data-active:bg-gradient-to-r data-active:from-indigo-600 data-active:to-purple-600 data-active:text-white data-active:shadow-[0_2px_0_rgba(0,0,0,0.1)]"
              >
                <Store className="size-3.5 shrink-0 -translate-y-[0.5px]" aria-hidden="true" />
                <span className="-translate-y-[0.5px]">Quầy vận hành</span>
              </TabsTrigger>
              <TabsTrigger
                value="reception"
                className="inline-flex h-9 items-center justify-center gap-1.5 self-center whitespace-nowrap border-2 border-transparent bg-transparent px-3 align-middle font-mono text-[13px] font-bold uppercase leading-[1] tracking-normal text-neutral-700 data-active:border-pink-500 data-active:bg-gradient-to-r data-active:from-pink-600 data-active:to-rose-600 data-active:text-white data-active:shadow-[0_2px_0_rgba(0,0,0,0.1)]"
              >
                <UserCheck className="size-3.5 shrink-0 -translate-y-[0.5px]" aria-hidden="true" />
                <span className="-translate-y-[0.5px]">Đặt chỗ & Vãng lai</span>
              </TabsTrigger>
            </TabsList>
          </div>
        </Tabs>

        {topArea === "reception" ? (
          <section aria-label="Tiếp nhận khách">
            <PendingBookingsPanel
              cafeId={cafeId}
              tables={tables}
              sessions={sessions}
              boxes={assignableBoxes}
              layout="sidebar"
              initialBookingCode={props?.initialBookingCode}
              onOpenTables={() => setActiveTab("tables")}
              onRequestStartSession={({ guestName, guestPhone, seats }) => {
                const freeTable = tables.find((t) => {
                  const st = String(t.status ?? "")
                    .toLowerCase()
                    .replace(/[_\s-]/g, "");
                  if (st !== "available") return false;
                  const busy = sessions.some((s) => {
                    const sid = s.cafeTableId || s.tableId || s.CafeTableId;
                    if (sid !== t.id) return false;
                    const sessionStatus = String(
                      s.status ?? s.Status ?? s.sessionStatus ?? "",
                    )
                      .toLowerCase()
                      .replace(/[_\s-]/g, "");
                    return (
                      sessionStatus === "active" ||
                      sessionStatus === "playing" ||
                      sessionStatus === "checking" ||
                      sessionStatus === "unpaid"
                    );
                  });
                  return !busy;
                });
                if (!freeTable?.id) {
                  toast.message(
                    "Đã giữ chỗ walk-in. Hiện không còn bàn trống — chọn bàn trên sơ đồ khi sẵn sàng.",
                  );
                  setActiveTab("tables");
                  return;
                }
                const range = mergePlayerRange(freeTable);
                const count = Math.max(1, seats);
                setStartSessionPrefill({
                  guestCount: count,
                  guestNames: Array.from({ length: count }, (_, i) =>
                    i === 0 ? guestName : "",
                  ),
                  guestPhones: Array.from({ length: count }, (_, i) =>
                    i === 0 ? guestPhone : "",
                  ),
                });
                setStartTable({
                  id: freeTable.id,
                  name: freeTable.name,
                  minPlayers: range.min ?? 1,
                  maxPlayers: range.max,
                });
                setActiveTab("tables");
              }}
              onConfirmCheckIn={(code, tableId, barcode) =>
                handleBookingCheckIn(code, tableId, barcode)
              }
            />
          </section>
        ) : (
          <section aria-label="Sơ đồ và vận hành" className="min-w-0">
            <Tabs
              value={opsTab}
              onValueChange={(value) => setActiveTab(value as PosTab)}
              className="gap-3"
            >
              <div className="flex max-w-full justify-start overflow-x-auto pb-1">
                <TabsList
                  aria-label="Khu vực vận hành POS"
                  className="inline-flex h-auto min-h-11 flex-wrap items-center justify-center gap-1 self-center rounded-md border-2 border-emerald-300/60 bg-gradient-to-r from-emerald-100 via-teal-100 to-cyan-100 p-1 shadow-[2px_2px_0_rgba(0,0,0,0.08)]"
                >
                  <TabsTrigger
                    value="tables"
                    className="inline-flex h-9 items-center justify-center gap-1.5 self-center whitespace-nowrap border-2 border-transparent bg-transparent px-3 align-middle font-mono text-[13px] font-bold uppercase leading-[1] tracking-normal text-neutral-700 data-active:border-emerald-500 data-active:bg-gradient-to-r data-active:from-emerald-600 data-active:to-teal-600 data-active:text-white data-active:shadow-[0_2px_0_rgba(0,0,0,0.1)]"
                  >
                    <Table2 className="size-3.5 shrink-0 -translate-y-[0.5px]" aria-hidden="true" />
                    <span className="-translate-y-[0.5px]">Sơ đồ bàn ({tables.length})</span>
                  </TabsTrigger>
                  <TabsTrigger
                    value="sessions"
                    className="inline-flex h-9 items-center justify-center gap-1.5 self-center whitespace-nowrap border-2 border-transparent bg-transparent px-3 align-middle font-mono text-[13px] font-bold uppercase leading-[1] tracking-normal text-neutral-700 data-active:border-amber-500 data-active:bg-gradient-to-r data-active:from-amber-500 data-active:to-orange-600 data-active:text-white data-active:shadow-[0_2px_0_rgba(0,0,0,0.1)]"
                  >
                    <Gamepad2 className="size-3.5 shrink-0 -translate-y-[0.5px]" aria-hidden="true" />
                    <span className="-translate-y-[0.5px]">Phiên chơi ({sessions.length})</span>
                  </TabsTrigger>
                  <TabsTrigger
                    value="boxes"
                    className="inline-flex h-9 items-center justify-center gap-1.5 self-center whitespace-nowrap border-2 border-transparent bg-transparent px-3 align-middle font-mono text-[13px] font-bold uppercase leading-[1] tracking-normal text-neutral-700 data-active:border-violet-500 data-active:bg-gradient-to-r data-active:from-violet-600 data-active:to-purple-600 data-active:text-white data-active:shadow-[0_2px_0_rgba(0,0,0,0.1)]"
                  >
                    <Box className="size-3.5 shrink-0 -translate-y-[0.5px]" aria-hidden="true" />
                    <span className="-translate-y-[0.5px]">Kho hộp ({boxes.length})</span>
                  </TabsTrigger>
                  <TabsTrigger
                    value="settlements"
                    className="inline-flex h-9 items-center justify-center gap-1.5 self-center whitespace-nowrap border-2 border-transparent bg-transparent px-3 align-middle font-mono text-[13px] font-bold uppercase leading-[1] tracking-normal text-neutral-700 data-active:border-rose-500 data-active:bg-gradient-to-r data-active:from-rose-600 data-active:to-pink-600 data-active:text-white data-active:shadow-[0_2px_0_rgba(0,0,0,0.1)]"
                  >
                    <Banknote className="size-3.5 shrink-0 -translate-y-[0.5px]" aria-hidden="true" />
                    <span className="-translate-y-[0.5px]">Giải ngân</span>
                  </TabsTrigger>
                </TabsList>
              </div>

              {loading ? (
                <Card className="border-2 border-indigo-300/60 bg-gradient-to-br from-indigo-50/40 via-white to-purple-50/40 shadow-[2px_2px_0_rgba(0,0,0,0.08)]">
                  <CardContent
                    className="flex flex-col items-center justify-center gap-3 py-16"
                    aria-live="polite"
                  >
                    <Loader2 className="size-8 animate-spin text-indigo-500 drop-shadow-[0_0_8px_rgba(99,102,241,0.5)]" />
                    <p className="font-mono text-xs font-bold uppercase tracking-widest text-indigo-700">
                      ▸ Đang tải dữ liệu POS…
                    </p>
                  </CardContent>
                </Card>
              ) : (
                <>
                  <TabsContent value="tables">
                    <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
                {tables.map((table) => {
                  const tableStatus = String(table.status ?? "");
                  const unavailableWithoutSession = [
                    "Reserved",
                    "Cleaning",
                    "Maintenance",
                    "EventInProgress",
                  ].includes(tableStatus);
                  const session = sessions.find((s) => {
                    const sid =
                      s.cafeTableId || s.tableId || s.CafeTableId;
                    const sName =
                      s.tableName || s.TableName || s.tableLabel || "";
                    // Fallback: nếu cafeTableId không khớp, thử match theo tên bàn
                    const nameMatch =
                      sid !== table.id && table.name
                        ? sName.toLowerCase().trim() ===
                          table.name.toLowerCase().trim()
                        : false;
                    if (sid !== table.id && !nameMatch) return false;
                    const st = String(
                      s.status ?? s.Status ?? s.sessionStatus ?? "",
                    )
                      .toLowerCase()
                      .replace(/[_\s-]/g, "");
                    return (
                      st === "active" ||
                      st === "playing" ||
                      st === "checking" ||
                      st === "unpaid"
                    );
                  });
                  const isAvail = !session && !unavailableWithoutSession;
                  const playerRange = mergePlayerRange(
                    session?.games?.[0],
                    session?.game,
                    session,
                    table,
                  );
                  const displayRange = {
                    min: playerRange.min ?? (playerRange.max != null ? 1 : null),
                    max: playerRange.max,
                  };
                  const playerRangeLabel = formatPlayerRange(displayRange);
                  // Bàn có session live → click bất kỳ đâu đều mở chi tiết phiên
                  // Bàn trống → click bất kỳ đâu đều mở modal bắt đầu phiên
                  const openDetailOrStart = () => {
                    if (session) {
                      setActiveTab("sessions");
                      setSelectedDetailSessionId(session.id);
                    } else {
                      setStartSessionPrefill(null);
                      setStartTable({
                        id: table.id,
                        name: table.name,
                        minPlayers: displayRange.min,
                        maxPlayers: displayRange.max,
                      });
                    }
                  };
                  const cardProps: {
                    role: string;
                    tabIndex: number;
                    onPointerDown: typeof focusFrameOnPointerDown;
                    onClick?: () => void;
                    onKeyDown?: (event: React.KeyboardEvent) => void;
                  } = session
                    ? {
                        // Có phiên live → click toàn card mở chi tiết
                        role: "button",
                        tabIndex: 0,
                        onPointerDown: focusFrameOnPointerDown,
                        onClick: openDetailOrStart,
                        onKeyDown: (event) => {
                          if (event.key === "Enter" || event.key === " ") {
                            event.preventDefault();
                            openDetailOrStart();
                          }
                        },
                      }
                    : {
                        // Bàn trống → click toàn card mở modal bắt đầu phiên
                        role: "button",
                        tabIndex: 0,
                        onPointerDown: focusFrameOnPointerDown,
                        onClick: openDetailOrStart,
                        onKeyDown: (event) => {
                          if (event.key === "Enter" || event.key === " ") {
                            event.preventDefault();
                            openDetailOrStart();
                          }
                        },
                      };
                  return (
                    <Card
                      key={table.id}
                      size="sm"
                      {...cardProps}
                      className={cn(
                        "cursor-pointer border-2 transition-all hover:translate-y-[-2px] hover:shadow-[3px_3px_0_rgba(0,0,0,0.1)]",
                        isAvail
                          ? cn(
                              "border-emerald-300 bg-emerald-50/30 shadow-[2px_2px_0_rgba(16,185,129,0.25)]",
                              interactiveFrameClass,
                            )
                          : cn(
                              "border-amber-300 bg-amber-50/50 shadow-[2px_2px_0_rgba(245,158,11,0.25)]",
                              interactiveFrameAmberClass,
                            ),
                      )}
                    >
                      <CardHeader className="relative border-b-2 border-current/10">
                        <div className="flex items-center gap-2">
                          <CardTitle className="font-mono text-lg font-extrabold tracking-tight text-neutral-950">
                            {table.name}
                          </CardTitle>
                          <Badge
                            variant="outline"
                            className={cn(
                              "gap-1 border-2 px-2 py-0.5 font-mono text-[10px] font-extrabold uppercase tracking-widest shadow-[inset_0_-2px_0_rgba(0,0,0,0.08)]",
                              isAvail
                                ? "border-emerald-400 bg-emerald-100 text-emerald-800"
                                : "border-amber-400 bg-amber-100 text-amber-900",
                            )}
                          >
                            <span
                              className={cn(
                                "inline-block size-1.5 rounded-full",
                                isAvail
                                  ? "bg-emerald-500 shadow-[0_0_6px_currentColor]"
                                  : "bg-amber-500 shadow-[0_0_6px_currentColor]",
                              )}
                            />
                            {isAvail ? "SẴN SÀNG" : "ĐANG BẬN"}
                          </Badge>
                        </div>
                        <span className="font-mono text-[10px] font-bold uppercase tracking-widest text-neutral-500">
                          SLOT #{String(table.sortOrder).padStart(2, "0")}
                        </span>
                      </CardHeader>
                      <CardContent className="space-y-2">
                        <p className="flex items-center gap-2 text-sm font-bold text-neutral-800">
                          <Users className="size-4 text-neutral-700" />
                          <span className="font-mono tabular-nums">
                            {playerRangeLabel || "—"}
                          </span>
                        </p>
                        {!isAvail && session && (
                          <p className="flex items-center gap-2 text-sm font-bold text-amber-900">
                            <Clock className="size-4 animate-spin [animation-duration:8s]" />
                            Session live
                          </p>
                        )}
                      </CardContent>
                      <CardFooter className="mt-auto border-t-2 border-current/10">
                        {isAvail ? (
                          <Button
                            type="button"
                            onClick={(event) => {
                              // Ngăn bubble để tránh click card bắn thêm lần nữa
                              event.stopPropagation();
                              setStartSessionPrefill(null);
                              setStartTable({
                                id: table.id,
                                name: table.name,
                                minPlayers: displayRange.min,
                                maxPlayers: displayRange.max,
                              });
                            }}
                            className="min-h-11 w-full gap-2 border-2 border-emerald-700 bg-gradient-to-b from-emerald-500 to-emerald-600 font-bold uppercase tracking-wider text-white shadow-[inset_0_-3px_0_rgba(0,0,0,0.2),0_2px_0_rgba(0,0,0,0.15)] transition-all hover:translate-y-[-1px] hover:from-emerald-500 hover:to-emerald-500"
                          >
                            <Play className="size-4" />
                            ► BẮT ĐẦU PHIÊN
                          </Button>
                        ) : session ? (
                          <Button
                            type="button"
                            variant="outline"
                            onClick={(event) => {
                              event.stopPropagation();
                              setActiveTab("sessions");
                              setSelectedDetailSessionId(session.id);
                            }}
                            className="min-h-11 w-full gap-2 border-2 border-amber-400 bg-white font-bold uppercase tracking-wider text-amber-800 shadow-[inset_0_-2px_0_rgba(0,0,0,0.08)] transition-all hover:translate-y-[-1px]"
                            aria-label={`Mở chi tiết phiên tại ${table.name}`}
                          >
                            ► MỞ CHI TIẾT
                          </Button>
                        ) : (
                          <div className="flex min-h-11 w-full items-center font-mono text-xs font-bold uppercase tracking-wider text-amber-800">
                            ⚠ BÀN BẬN
                          </div>
                        )}
                      </CardFooter>
                    </Card>
                  );
                })}
              </div>
            </TabsContent>
            <TabsContent value="sessions">
              <ActiveSessionsTab
                sessions={sessions}
                onEndSession={(sessionId: string) => {
                  const targetSes = sessions.find((s) => s.id === sessionId);
                  if (targetSes) setEndingSession(targetSes);
                }}
                onViewDetail={(sessionId: string) =>
                  setSelectedDetailSessionId(sessionId)
                }
                onOpenInventory={(session) => {
                  const id = session?.id || session?.sessionId;
                  if (!id) {
                    toast.error("Không tìm thấy phiên để kiểm kê.");
                    return;
                  }
                  setInventorySessionId(id);
                }}
                onInitiatePaymentFlow={handleInitiatePaymentFlow}
                onResumeSession={(sessionId) => {
                  void handleResumeSession(sessionId);
                }}
                onPauseSession={(sessionId) => {
                  void handlePauseSession(sessionId);
                }}
                onResumePause={(sessionId) => {
                  void handleResumePause(sessionId);
                }}
              />
            </TabsContent>
            <TabsContent value="boxes">
              <PosBoxesTab boxes={boxes} cafeId={cafeId} />
            </TabsContent>
            <TabsContent value="settlements">
              <SettlementsTab
                cafeId={cafeId}
                onFetchPaidSessions={handleFetchPaidSessions}
              />
            </TabsContent>
          </>
        )}
            </Tabs>
          </section>
        )}
      </div>

      {canConfigureTables && (
        <SyncTablesModal
          isOpen={isSyncModalOpen}
          onClose={() => setIsSyncModalOpen(false)}
          currentTables={tables}
          onSave={handleSyncTables}
        />
      )}

      <ComponentChecklistModal
        isOpen={!!checklistData}
        onClose={() => setChecklistData(null)}
        sessionGameData={checklistData}
        onSubmitCheck={handleChecklistSubmitOnly}
      />

      <SessionInventoryModal
        isOpen={!!inventorySessionId}
        session={
          sessions.find(
            (s) => (s.id || s.sessionId) === inventorySessionId,
          ) || null
        }
        onClose={() => setInventorySessionId(null)}
        onOpenChecklist={(sessionGameId) => {
          void handleOpenChecklist(sessionGameId, inventorySessionId);
        }}
        onResetComponentCheck={handleResetComponentCheck}
      />

      <BoxComponentHistoryModal
        isOpen={historyModalState.isOpen}
        onClose={() =>
          setHistoryModalState({
            isOpen: false,
            data: null,
            targetSession: null,
          })
        }
        historyData={historyModalState.data}
        onConfirmProceed={
          historyModalState.targetSession
            ? handleProceedFromHistoryToPay
            : undefined
        }
      />

      <PayConfirmModal
        key={checkoutSession?.id || "checkout-modal"}
        isOpen={!!checkoutSession}
        onClose={() => setCheckoutSession(null)}
        session={checkoutSession}
        cafeId={cafeId}
        onCheckout={handleCheckoutSession}
        onPay={handlePaySession}
        onRefreshPayment={handleRefreshCheckoutPayment}
        onSplitBillPaid={handleSplitBillPaid}
      />

      <SessionDetailModal
        isOpen={!!selectedDetailSessionId}
        onClose={() => setSelectedDetailSessionId(null)}
        sessionId={selectedDetailSessionId}
        cafeId={cafeId}
        onFetchDetail={handleGetSessionDetail}
        onReturnTable={(sessionId) => {
          const targetSes = sessions.find((s) => s.id === sessionId);
          if (targetSes) setEndingSession(targetSes);
        }}
        onAddGuest={handleAddGuest}
        boxes={assignableBoxes}
        detailRefreshKey={detailRefreshKey}
        playingUserIds={[
          ...new Set(
            sessions.flatMap((session) => {
              const status = String(session.status ?? session.Status ?? "")
                .toLowerCase()
                .replace(/[_\s-]/g, "");
              if (status === "paid" || status === "completed") return [];
              const ids: string[] = [];
              const hostId = session.hostId || session.HostId;
              if (hostId) ids.push(String(hostId));
              for (const member of session.members || session.Members || []) {
                const uid = member.userId || member.UserId;
                if (uid) ids.push(String(uid));
              }
              return ids;
            }),
          ),
        ]}
        otherSessions={sessions
          .filter((session) => {
            const id = String(session.id || session.sessionId || "");
            const status = String(session.status ?? session.Status ?? "")
              .toLowerCase()
              .replace(/[_\s-]/g, "");
            return (
              Boolean(id) &&
              id !== String(selectedDetailSessionId || "") &&
              status !== "paid" &&
              status !== "completed" &&
              status !== "closed"
            );
          })
          .map((session) => ({
            id: String(session.id || session.sessionId),
            tableName:
              session.tableName ||
              session.TableName ||
              session.tableLabel ||
              session.TableLabel ||
              session.cafeTableName ||
              session.CafeTableName,
            status: session.status || session.Status,
            memberUserIds: (session.members || session.Members || [])
              .map((member: { userId?: string; UserId?: string }) =>
                String(member.userId || member.UserId || ""),
              )
              .filter(Boolean),
          }))}
        onAttachGame={handleAttachSessionGame}
        onAddMembers={handleAddSessionMembers}
        onReportInventoryLoss={handleReportInventoryLoss}
        onPartialCheckout={handlePartialCheckout}
        onMergeMember={handleMergeSessionMember}
      />

      <StartSessionModal
        isOpen={!!startTable}
        onClose={() => {
          setStartTable(null);
          setStartSessionPrefill(null);
        }}
        selectedTable={startTable}
        cafeId={cafeId}
        boxes={assignableBoxes}
        prefill={startSessionPrefill}
        onStart={handleStartSession}
      />

      <EndSessionModal
        isOpen={!!endingSession}
        onClose={() => setEndingSession(null)}
        session={endingSession}
        onConfirmEnd={handleEndSession}
      />
    </div>
  );
}