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
  const setActiveTab = useCallback(
    (tab: PosTab) => {
      const params = new URLSearchParams(searchParams.toString());
      if (tab === "tables") params.delete("tab");
      else params.set("tab", tab);
      const query = params.toString();
      router.replace(query ? `${pathname}?${query}` : pathname, { scroll: false });
    },
    [pathname, router, searchParams],
  );
  const opsTab: Exclude<PosTab, "reception"> = isOpsTab(activeTab)
    ? activeTab
    : "tables";
  const topArea = activeTab === "reception" ? "reception" : "ops";
  const [endingSession, setEndingSession] = useState<any | null>(null);
  const [selectedDetailSessionId, setSelectedDetailSessionId] = useState<
    string | null
  >(null);
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
    canConfigureTables,
  } = usePosDashboard({
    initialBookingCode: props?.initialBookingCode,
    onRequestReturnTable: (session) => {
      setSelectedDetailSessionId(null);
      setEndingSession(session);
    },
  });

  /** Hộp có thể gán/thêm phiên — không gồm InUse hoặc barcode đang gắn session live. */
  const assignableBoxes = useMemo(
    () => filterBoxesAssignableForPos(boxes, sessions),
    [boxes, sessions],
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

  const handleShowBoxHistoryDirectly = async (boxId: string) => {
    if (!handleFetchBoxHistory) return;
    const historyRes = await handleFetchBoxHistory(boxId);
    if (historyRes) {
      setHistoryModalState({
        isOpen: true,
        data: historyRes,
        targetSession: null,
      });
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
        className={cn("gap-0 py-0", interactiveFrameClass)}
        tabIndex={0}
        onPointerDown={focusFrameOnPointerDown}
      >
        <CardContent className="flex flex-wrap items-center justify-between gap-3 p-3 sm:p-4">
          <div className="flex min-w-0 flex-wrap items-center gap-2">
            <h1 className="text-lg font-extrabold tracking-tight text-neutral-950 sm:text-xl">
              Quầy POS
            </h1>
            <Badge
              variant="outline"
              role="status"
              className={
                hubConnected
                  ? "border-emerald-200 bg-emerald-50 font-semibold text-emerald-800"
                  : "border-neutral-200 bg-neutral-50 font-semibold text-neutral-700"
              }
            >
              {hubConnected ? <Wifi /> : <WifiOff />}
              {hubConnected ? "Live" : "Offline"}
            </Badge>
            <Badge
              variant="outline"
              className="border-emerald-200 bg-emerald-50 font-semibold text-emerald-800"
            >
              Trống {tables.filter((t) => t.status === "Available").length}/
              {tables.length}
            </Badge>
            <Badge
              variant="outline"
              className="border-amber-200 bg-amber-50 font-semibold text-amber-900"
            >
              Đang chơi {sessions.length}
            </Badge>
          </div>

          <div className="flex flex-wrap gap-2">
            <Button
              type="button"
              variant="outline"
              onClick={refreshData}
              className="h-9 gap-2"
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
                className="h-9 gap-2"
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
          <div className="max-w-full overflow-x-auto pb-1">
            <TabsList
              aria-label="Khu vực chính POS"
              className="h-auto min-h-11 w-full flex-wrap justify-start"
            >
              <TabsTrigger
                value="reception"
                className="min-h-10 flex-none px-3 data-active:border-neutral-900 data-active:font-semibold"
              >
                Đặt chỗ & Vãng lai
              </TabsTrigger>
              <TabsTrigger
                value="ops"
                className="min-h-10 flex-none px-3 data-active:border-neutral-900 data-active:font-semibold"
              >
                Quầy vận hành
              </TabsTrigger>
            </TabsList>
          </div>
        </Tabs>

        {topArea === "reception" ? (
          <section aria-label="Tiếp nhận khách">
            <PendingBookingsPanel
              cafeId={cafeId}
              tables={tables}
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
              <div className="max-w-full overflow-x-auto pb-1">
                <TabsList
                  aria-label="Khu vực vận hành POS"
                  className="h-auto min-h-11 w-full flex-wrap justify-start"
                >
                  <TabsTrigger
                    value="tables"
                    className="min-h-10 flex-none px-3 data-active:border-neutral-900 data-active:font-semibold"
                  >
                    Sơ đồ bàn ({tables.length})
                  </TabsTrigger>
                  <TabsTrigger
                    value="sessions"
                    className="min-h-10 flex-none px-3 data-active:border-neutral-900 data-active:font-semibold"
                  >
                    Phiên chơi ({sessions.length})
                  </TabsTrigger>
                  <TabsTrigger
                    value="boxes"
                    className="min-h-10 flex-none px-3 data-active:border-neutral-900 data-active:font-semibold"
                  >
                    Kho hộp ({boxes.length})
                  </TabsTrigger>
                  <TabsTrigger
                    value="settlements"
                    className="min-h-10 flex-none px-3 data-active:border-neutral-900 data-active:font-semibold"
                  >
                    Giải ngân
                  </TabsTrigger>
                </TabsList>
              </div>

              {loading ? (
                <Card>
                  <CardContent
                    className="flex flex-col items-center justify-center gap-3 py-16"
                    aria-live="polite"
                  >
                    <Loader2 className="size-8 animate-spin text-neutral-500" />
                    <p className="text-sm font-semibold text-neutral-700">
                      Đang tải dữ liệu POS...
                    </p>
                  </CardContent>
                </Card>
              ) : (
                <>
                  <TabsContent value="tables">
                    <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
                {tables.map((table) => {
                  const tableStatus = String(table.status ?? "");
                  const session = sessions.find((s) => {
                    const sid =
                      s.cafeTableId || s.tableId || s.CafeTableId;
                    if (sid !== table.id) return false;
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
                  // BE: Available | InUse | Reserved | EventInProgress — InUse khi session Active/Checking/Unpaid
                  const isAvail =
                    tableStatus === "Available" && !session;
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
                  return (
                    <Card
                      key={table.id}
                      size="sm"
                      tabIndex={0}
                      onPointerDown={focusFrameOnPointerDown}
                      className={
                        isAvail
                          ? cn(
                              "border-emerald-200 bg-emerald-50/20",
                              interactiveFrameClass,
                            )
                          : cn(
                              "border-amber-200 bg-amber-50/40",
                              interactiveFrameAmberClass,
                            )
                      }
                    >
                      <CardHeader className="border-b">
                        <div className="flex items-center gap-2">
                          <CardTitle className="text-lg font-bold">{table.name}</CardTitle>
                          <Badge
                            variant="outline"
                            className={
                              isAvail
                                ? "border-emerald-200 bg-white text-emerald-700"
                                : "border-amber-200 bg-white text-amber-800"
                            }
                          >
                            {isAvail ? "Sẵn sàng" : "Đang sử dụng"}
                          </Badge>
                        </div>
                        <span className="text-xs font-medium text-neutral-700">
                          Vị trí #{table.sortOrder}
                        </span>
                      </CardHeader>
                      <CardContent className="space-y-2">
                        <p className="flex items-center gap-2 text-sm font-semibold text-neutral-800">
                          <Users className="size-4 text-neutral-700" />
                          {playerRangeLabel || "Chưa đặt giới hạn người chơi"}
                        </p>
                        {!isAvail && session && (
                          <p className="flex items-center gap-2 text-sm font-semibold text-amber-900">
                            <Clock className="size-4" />
                            Có phiên đang hoạt động
                          </p>
                        )}
                      </CardContent>
                      <CardFooter className="border-t">
                        {isAvail ? (
                          <Button
                            type="button"
                            onClick={() => {
                              setStartSessionPrefill(null);
                              setStartTable({
                                id: table.id,
                                name: table.name,
                                minPlayers: displayRange.min,
                                maxPlayers: displayRange.max,
                              });
                            }}
                            className="min-h-11 w-full gap-2"
                          >
                            <Play className="size-4" />
                            Bắt đầu phiên
                          </Button>
                        ) : session ? (
                          <Button
                            type="button"
                            variant="outline"
                            onClick={() => {
                              setActiveTab("sessions");
                              setSelectedDetailSessionId(session.id);
                            }}
                            className="min-h-11 w-full"
                            aria-label={`Mở chi tiết phiên tại ${table.name}`}
                          >
                            Mở chi tiết phiên
                          </Button>
                        ) : (
                          <div className="flex min-h-11 w-full items-center text-sm font-medium text-amber-800">
                            Bàn đang bận, chưa tìm thấy phiên
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
                onInitiatePaymentFlow={handleInitiatePaymentFlow}
                onResumeSession={(sessionId) => {
                  void handleResumeSession(sessionId);
                }}
                onResetComponentCheck={(sessionGameId) => {
                  void handleResetComponentCheck(sessionGameId);
                }}
              />
            </TabsContent>
            <TabsContent value="boxes">
              <PosBoxesTab boxes={boxes} />
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
      />

      <SessionDetailModal
        isOpen={!!selectedDetailSessionId}
        onClose={() => setSelectedDetailSessionId(null)}
        sessionId={selectedDetailSessionId}
        cafeId={cafeId}
        onFetchDetail={handleGetSessionDetail}
        onOpenChecklist={(gameId) => {
          void handleOpenChecklist(gameId, selectedDetailSessionId);
        }}
        onShowBoxHistory={handleShowBoxHistoryDirectly}
        onReturnTable={(sessionId) => {
          const targetSes = sessions.find((s) => s.id === sessionId);
          if (targetSes) setEndingSession(targetSes);
        }}
        onAddGuest={handleAddGuest}
        boxes={assignableBoxes}
        detailRefreshKey={detailRefreshKey}
        otherSessions={sessions
          .filter((session) => {
            const id = session.id || session.sessionId;
            const status = String(session.status ?? session.Status ?? "").toLowerCase();
            return (
              id &&
              id !== selectedDetailSessionId &&
              status !== "paid" &&
              status !== "completed"
            );
          })
          .map((session) => ({
            id: session.id || session.sessionId,
            tableName: session.tableName || session.tableLabel,
            status: session.status || session.Status,
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