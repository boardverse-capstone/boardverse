/* eslint-disable @typescript-eslint/no-explicit-any */
"use client";

import { usePosDashboard } from "../hooks/usePosDashboard";
import { useCafePosHub } from "../hooks/useCafePosHub";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import {
  Card,
  CardAction,
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
import { Label } from "@/components/ui/label";
import { SyncTablesModal } from "./sync-tables-modal";
import { CheckoutPayModal } from "./checkout-pay-modal";
import { ComponentChecklistModal } from "./component-checklist-modal";
import { SessionDetailModal } from "./session-detail-modal";
import { PosBoxesTab } from "./pos-boxes-tab";
import { StartSessionModal } from "./start-session-modal";
import {
  ActiveSessionsTab,
} from "./active-sessions-tab";
import { EndSessionModal } from "./end-session-modal";
import { BoxComponentHistoryModal } from "./box-component-history-modal";
import { PendingBookingsPanel } from "./pending-bookings-panel";
import { SettlementsTab } from "./settlements-tab";
import {
  RefreshCw,
  Barcode,
  Play,
  Users,
  Clock,
  CheckCircle2,
  Settings,
  AlertTriangle,
  ShieldCheck,
  Wifi,
  WifiOff,
  Loader2,
} from "lucide-react";
import { useCallback, useState } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { toast } from "sonner";
import {
  formatPlayerRange,
  mergePlayerRange,
} from "../lib/player-range";

type PosTab = "tables" | "sessions" | "boxes" | "settlements";

function parsePosTab(raw: string | null): PosTab {
  if (raw === "sessions" || raw === "boxes" || raw === "settlements") return raw;
  return "tables";
}

export function PosFeatureContainer(props?: { initialBookingCode?: string }) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const activeTab = parsePosTab(searchParams.get("tab"));
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
  const [endingSession, setEndingSession] = useState<any | null>(null);
  const [selectedDetailSessionId, setSelectedDetailSessionId] = useState<
    string | null
  >(null);
  const {
    cafeId,
    tables,
    sessions,
    boxes,
    loading,
    scannedBarcode,
    setScannedBarcode,
    scannedBox,
    setScannedBox,
    checklistData,
    setChecklistData,
    checkoutSession,
    setCheckoutSession,
    refreshData,
    handleScanBarcode,
    handleBookingCheckIn,
    handleStartSession,
    handleEndSession,
    handleGetSessionDetail,
    handleOpenChecklist,
    handleComponentCheck,
    handleCheckoutSession,
    handlePaySession,
    handleSyncTables,
    handleFetchBoxHistory,
    handleAddGuest,
    handleRefreshCheckoutPayment,
    canConfigureTables,
  } = usePosDashboard({
    initialBookingCode: props?.initialBookingCode,
    onRequestReturnTable: (session) => {
      setSelectedDetailSessionId(null);
      setEndingSession(session);
    },
  });

  const { connected: hubConnected } = useCafePosHub({
    enabled: Boolean(cafeId),
    onRefresh: refreshData,
  });

  const [isSyncModalOpen, setIsSyncModalOpen] = useState(false);
  const [startTable, setStartTable] = useState<{
    id: string;
    name: string;
    minPlayers?: number | null;
    maxPlayers?: number | null;
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

    const primaryGame = detailedSession.games?.[0];
    const boxId =
      primaryGame?.cafeInventoryBoxId || detailedSession.cafeInventoryBoxId;

    if (boxId && handleFetchBoxHistory) {
      const historyRes = await handleFetchBoxHistory(boxId);
      setHistoryModalState({
        isOpen: true,
        data: historyRes || {
          boxId,
          gameName:
            primaryGame?.gameName || detailedSession.tableName || "Hộp game",
          barcode: primaryGame?.boxBarcode || "N/A",
          totalIncidents: 0,
          incidents: [],
        },
        targetSession: detailedSession,
      });
      return;
    }

    setCheckoutSession(detailedSession);
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

  const handleChecklistSubmitOnly = async (payload: any) => {
    const checkResult = await handleComponentCheck(payload);
    return Boolean(checkResult);
  };

  return (
    <div className="space-y-5 font-sans text-neutral-900 antialiased">
      <Card className="gap-0 py-0">
        <CardContent className="flex flex-col gap-4 p-4 sm:p-5 lg:flex-row lg:items-center lg:justify-between">
          <div className="space-y-1.5">
            <div className="flex flex-wrap items-center gap-2">
              <h1 className="text-xl font-bold tracking-tight text-neutral-950 sm:text-2xl">
                Web POS
              </h1>
              <Badge
                variant="outline"
                role="status"
                className={
                  hubConnected
                    ? "border-emerald-200 bg-emerald-50 text-emerald-700"
                    : "border-neutral-200 bg-neutral-50 text-neutral-600"
                }
              >
                {hubConnected ? <Wifi /> : <WifiOff />}
                {hubConnected && <Loader2 className="size-3 animate-spin" />}
                {hubConnected ? "Realtime đang kết nối" : "Realtime tạm ngắt"}
              </Badge>
            </div>
            <p className="text-sm text-neutral-500">
              Tiếp nhận khách, vận hành bàn và hoàn tất phiên chơi tại một nơi.
            </p>
          </div>
          <div className="flex flex-wrap gap-2">
            <Button
              type="button"
              variant="outline"
              onClick={refreshData}
              className="min-h-11 gap-2"
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
                className="min-h-11 gap-2"
              >
                <Settings className="size-4" />
                Cài đặt bàn
              </Button>
            )}
          </div>
        </CardContent>
      </Card>

      <div className="grid items-start gap-4 xl:grid-cols-[minmax(0,1.45fr)_minmax(320px,0.75fr)]">
        <section aria-label="Tiếp nhận và check-in">
          <PendingBookingsPanel
            cafeId={cafeId}
            tables={tables}
            boxes={boxes}
            scannedBarcode={scannedBarcode}
            initialBookingCode={props?.initialBookingCode}
            onOpenTables={() => setActiveTab("tables")}
            onConfirmCheckIn={(code, tableId, barcode) =>
              handleBookingCheckIn(code, tableId, barcode)
            }
          />
        </section>

        <aside className="space-y-4" aria-label="Công cụ và tổng quan POS">
          <Card size="sm">
            <CardHeader className="border-b">
              <CardTitle className="flex items-center gap-2 text-base">
                <Barcode className="size-4" />
                Kiểm tra hộp game
              </CardTitle>
              {scannedBox && (
                <CardAction>
                  <Button
                    type="button"
                    variant="ghost"
                    onClick={() => {
                      setScannedBox(null);
                      setScannedBarcode("");
                    }}
                    className="min-h-10"
                  >
                    Xóa kết quả
                  </Button>
                </CardAction>
              )}
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="space-y-2">
                <Label htmlFor="pos-box-barcode">Barcode hộp game</Label>
                <div className="flex gap-2">
                  <Input
                    id="pos-box-barcode"
                    type="text"
                    placeholder="Quét hoặc nhập barcode"
                    value={scannedBarcode}
                    onChange={(e) => setScannedBarcode(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === "Enter") {
                        e.preventDefault();
                        handleScanBarcode();
                      }
                    }}
                    className="min-h-11 font-mono"
                  />
                  <Button
                    type="button"
                    onClick={handleScanBarcode}
                    className="min-h-11 shrink-0 px-4"
                  >
                    Kiểm tra
                  </Button>
                </div>
              </div>

              {scannedBox ? (
                <div className="space-y-3 rounded-xl border bg-neutral-50 p-3">
                  <div className="flex items-start justify-between gap-2">
                    <div className="min-w-0">
                      <h4 className="truncate font-bold text-neutral-950">
                        {scannedBox.gameName}
                      </h4>
                      <p className="mt-1 text-xs font-medium text-neutral-500">
                        Mã hộp:{" "}
                        <span className="font-mono text-neutral-800">
                          {scannedBox.barcode}
                        </span>
                      </p>
                    </div>
                    <Badge
                      variant="outline"
                      className={
                        scannedBox.status === "Available"
                          ? "border-emerald-200 bg-emerald-50 text-emerald-700"
                          : "border-amber-200 bg-amber-50 text-amber-800"
                      }
                    >
                      {scannedBox.status}
                    </Badge>
                  </div>

                  {scannedBox.missingComponents?.length > 0 ? (
                    <div className="space-y-2 rounded-lg border border-rose-200 bg-rose-50 p-3">
                      <p className="flex items-center gap-2 text-xs font-bold text-rose-800">
                        <AlertTriangle className="size-4" />
                        Từng ghi nhận thiếu {scannedBox.missingComponents.length} linh kiện
                      </p>
                      {scannedBox.missingComponents.map(
                        (comp: any, idx: number) => (
                          <div
                            key={comp.componentId || idx}
                            className="flex justify-between gap-2 rounded-md bg-white px-2.5 py-2 text-xs"
                          >
                            <span className="font-semibold">{comp.componentName}</span>
                            <span className="text-rose-700">
                              Thiếu {comp.missingQuantity || 1}
                            </span>
                          </div>
                        ),
                      )}
                    </div>
                  ) : (
                    <p className="flex items-center gap-2 rounded-lg border border-emerald-200 bg-emerald-50 p-3 text-xs font-medium text-emerald-800">
                      <ShieldCheck className="size-4 shrink-0" />
                      Đủ linh kiện, sẵn sàng bàn giao.
                    </p>
                  )}

                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => {
                      navigator.clipboard.writeText(scannedBox.barcode);
                      toast.success(`Đã chép mã ${scannedBox.barcode}.`);
                    }}
                    className="min-h-10 w-full"
                  >
                    Chép mã mượn
                  </Button>
                </div>
              ) : (
                <p className="rounded-xl border border-dashed p-4 text-center text-sm text-neutral-500">
                  Quét barcode để xem tình trạng và lịch sử thiếu linh kiện.
                </p>
              )}
            </CardContent>
          </Card>

          <div className="grid grid-cols-2 gap-3">
            <Card size="sm" className="gap-2">
              <CardContent className="flex items-start justify-between">
                <div>
                  <p className="text-xs font-semibold uppercase tracking-wide text-neutral-500">
                    Bàn trống
                  </p>
                  <p className="mt-1 text-2xl font-bold text-emerald-700">
                    {tables.filter((t) => t.status === "Available").length}
                    <span className="text-sm font-medium text-neutral-400">/{tables.length}</span>
                  </p>
                </div>
                <CheckCircle2 className="size-6 text-emerald-600" />
              </CardContent>
            </Card>
            <Card size="sm" className="gap-2">
              <CardContent className="flex items-start justify-between">
                <div>
                  <p className="text-xs font-semibold uppercase tracking-wide text-neutral-500">
                    Đang chơi
                  </p>
                  <p className="mt-1 text-2xl font-bold text-amber-700">{sessions.length}</p>
                </div>
                <Users className="size-6 text-amber-600" />
              </CardContent>
            </Card>
          </div>
        </aside>
      </div>

      <Tabs
        value={activeTab}
        onValueChange={(value) => setActiveTab(value as PosTab)}
        className="gap-4"
      >
        <div className="overflow-x-auto pb-1">
          <TabsList variant="line" aria-label="Khu vực vận hành POS" className="h-11 min-w-max">
            <TabsTrigger value="tables" className="min-h-10 px-4">
              Sơ đồ bàn ({tables.length})
            </TabsTrigger>
            <TabsTrigger value="sessions" className="min-h-10 px-4">
              Phiên chơi ({sessions.length})
            </TabsTrigger>
            <TabsTrigger value="boxes" className="min-h-10 px-4">
              Kho hộp ({boxes.length})
            </TabsTrigger>
            <TabsTrigger value="settlements" className="min-h-10 px-4">
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
              <p className="text-sm font-medium text-neutral-500">
                Đang tải dữ liệu POS...
              </p>
            </CardContent>
          </Card>
        ) : (
          <>
            <TabsContent value="tables">
              <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3 2xl:grid-cols-4">
                {tables.map((table) => {
                  const isAvail = table.status === "Available";
                  const session = sessions.find(
                    (s) =>
                      (s.cafeTableId || s.tableId || s.CafeTableId) === table.id,
                  );
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
                      className={
                        isAvail
                          ? "border-emerald-200 bg-emerald-50/20"
                          : "border-amber-200 bg-amber-50/40"
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
                        <span className="text-xs text-neutral-500">
                          Vị trí #{table.sortOrder}
                        </span>
                      </CardHeader>
                      <CardContent className="space-y-2">
                        <p className="flex items-center gap-2 text-sm font-medium text-neutral-700">
                          <Users className="size-4 text-neutral-500" />
                          {playerRangeLabel || "Chưa đặt giới hạn người chơi"}
                        </p>
                        {!isAvail && session && (
                          <p className="flex items-center gap-2 text-sm text-amber-800">
                            <Clock className="size-4" />
                            Có phiên đang hoạt động
                          </p>
                        )}
                      </CardContent>
                      <CardFooter className="border-t">
                        {isAvail ? (
                          <Button
                            type="button"
                            onClick={() =>
                              setStartTable({
                                id: table.id,
                                name: table.name,
                                minPlayers: displayRange.min,
                                maxPlayers: displayRange.max,
                              })
                            }
                            className="min-h-11 w-full gap-2"
                          >
                            <Play className="size-4" />
                            Bắt đầu phiên
                          </Button>
                        ) : session ? (
                          <Button
                            type="button"
                            variant="outline"
                            onClick={() => setSelectedDetailSessionId(session.id)}
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
                onShowBoxHistory={handleShowBoxHistoryDirectly}
              />
            </TabsContent>
            <TabsContent value="boxes">
              <PosBoxesTab boxes={boxes} />
            </TabsContent>
            <TabsContent value="settlements">
              <SettlementsTab cafeId={cafeId} />
            </TabsContent>
          </>
        )}
      </Tabs>

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

      <CheckoutPayModal
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
        onReturnTable={(sessionId) => {
          const targetSes = sessions.find((s) => s.id === sessionId);
          if (targetSes) setEndingSession(targetSes);
        }}
        onAddGuest={handleAddGuest}
      />

      <StartSessionModal
        isOpen={!!startTable}
        onClose={() => setStartTable(null)}
        selectedTable={startTable}
        cafeId={cafeId}
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