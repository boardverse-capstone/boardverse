/* eslint-disable @typescript-eslint/no-explicit-any */
"use client";

import { usePosDashboard } from "../hooks/usePosDashboard";
import { useCafePosHub } from "../hooks/useCafePosHub";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
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
  QrCode,
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
import { useState } from "react";
import { toast } from "sonner";
import {
  formatPlayerRange,
  mergePlayerRange,
} from "../lib/player-range";

export function PosFeatureContainer(props?: { initialBookingCode?: string }) {
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
    bookingCode,
    setBookingCode,
    checklistData,
    setChecklistData,
    checkoutSession,
    setCheckoutSession,
    refreshData,
    handleScanBarcode,
    handlePreviewBooking,
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

  const [activeTab, setActiveTab] = useState<
    "tables" | "sessions" | "boxes" | "settlements"
  >("tables");
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
    <div className="space-y-6 text-neutral-900 font-sans antialiased">
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 bg-white p-5 rounded-2xl border border-neutral-200 shadow-2xs">
        <div>
          <h1 className="text-xl font-bold tracking-tight text-neutral-950">
            Web POS Center
          </h1>
          <p className="text-xs text-neutral-500 font-medium mt-0.5 flex items-center gap-2">
            
            <span
              className={`inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-[10px] font-bold uppercase ${
                hubConnected
                  ? "border-emerald-200 bg-emerald-50 text-emerald-700"
                  : "border-neutral-200 bg-neutral-50 text-neutral-500"
              }`}
            >
              {hubConnected ? (
                <Wifi className="h-3 w-3" />
              ) : (
                <WifiOff className="h-3 w-3" />
              )}
              {hubConnected ? "Realtime" : "Offline hub"}
            </span>
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2 shrink-0">
          {canConfigureTables && (
            <Button
              type="button"
              variant="outline"
              onClick={() => setIsSyncModalOpen(true)}
              className="h-9 px-3 border-neutral-200 text-xs font-bold text-neutral-700 hover:bg-neutral-50 rounded-lg flex items-center gap-1.5"
            >
              <Settings className="w-3.5 h-3.5" />
              <span>Sơ đồ bàn</span>
            </Button>
          )}

          <Button
            type="button"
            variant="outline"
            onClick={refreshData}
            className="h-9 px-3 border-neutral-200 text-xs font-bold text-neutral-700 hover:bg-neutral-50 rounded-lg flex items-center gap-1.5"
          >
            <RefreshCw className="w-3.5 h-3.5" />
            <span>Làm mới</span>
          </Button>

          <div className="flex items-center gap-1.5 bg-neutral-50 p-1 border border-neutral-200 rounded-xl">
            <Input
              type="text"
              placeholder="ReservationCode..."
              value={bookingCode}
              onChange={(e) => setBookingCode(e.target.value)}
              className="h-7 w-40 text-xs bg-white border-neutral-200 rounded-lg"
            />
            <Button
              type="button"
              onClick={() => void handlePreviewBooking(bookingCode)}
              className="h-7 px-2.5 bg-neutral-950 text-white text-[10px] font-bold uppercase rounded-lg"
            >
              <QrCode className="w-3 h-3 mr-1" /> Tra cứu
            </Button>
          </div>
        </div>
      </div>

      <PendingBookingsPanel
        cafeId={cafeId}
        tables={tables}
        scannedBarcode={scannedBarcode}
        onOpenTables={() => setActiveTab("tables")}
        onConfirmCheckIn={(code, tableId, barcode) =>
          handleBookingCheckIn(code, tableId, barcode)
        }
      />

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        <div className="bg-white border border-neutral-200 rounded-2xl p-4 flex flex-col justify-between shadow-2xs space-y-3">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold uppercase tracking-wider text-neutral-900 flex items-center gap-1.5">
              <Barcode className="w-4 h-4 text-neutral-700" /> Tra cứu Barcode
              Hộp Game
            </span>
            {scannedBox && (
              <button
                type="button"
                onClick={() => {
                  setScannedBox(null);
                  setScannedBarcode("");
                }}
                className="text-[11px] font-semibold text-neutral-400 hover:text-neutral-900 transition-colors"
              >
                Xóa kết quả
              </button>
            )}
          </div>

          <div className="flex gap-2">
            <Input
              type="text"
              placeholder="Quét hoặc nhập Barcode (vd: BV-a477...)..."
              value={scannedBarcode}
              onChange={(e) => setScannedBarcode(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter") {
                  e.preventDefault();
                  handleScanBarcode();
                }
              }}
              className="h-9 text-xs border-neutral-200 rounded-lg bg-neutral-50/50 font-mono focus:bg-white"
            />
            <Button
              type="button"
              onClick={handleScanBarcode}
              className="h-9 px-3.5 bg-neutral-950 text-white text-xs font-bold rounded-lg shrink-0 hover:bg-neutral-800"
            >
              Quét
            </Button>
          </div>

          {scannedBox ? (
            <div className="p-3 bg-neutral-50 border border-neutral-200/90 rounded-xl space-y-2.5 animate-in fade-in-50 duration-150">
              <div className="flex items-start justify-between gap-2">
                <div className="space-y-0.5">
                  <h4 className="font-extrabold text-xs text-neutral-950">
                    {scannedBox.gameName}
                  </h4>
                  <p className="text-[10px] font-mono text-neutral-500 flex items-center gap-1">
                    <span>Mã Hộp:</span>
                    <strong className="text-neutral-800">
                      {scannedBox.barcode}
                    </strong>
                  </p>
                </div>

                <span
                  className={`px-2 py-0.5 rounded text-[9px] font-bold uppercase border shrink-0 ${
                    scannedBox.status === "Available"
                      ? "bg-emerald-50 text-emerald-700 border-emerald-200"
                      : "bg-amber-100 text-amber-800 border-amber-200"
                  }`}
                >
                  {scannedBox.status}
                </span>
              </div>

              {scannedBox.missingComponents &&
              scannedBox.missingComponents.length > 0 ? (
                <div className="p-2.5 bg-rose-50/80 border border-rose-200 rounded-lg space-y-1.5">
                  <div className="text-[10px] font-bold text-rose-800 uppercase flex items-center gap-1">
                    <AlertTriangle className="w-3.5 h-3.5 text-rose-600" />
                    Cảnh báo: Hộp từng ghi nhận thiếu{" "}
                    {scannedBox.missingComponents.length} linh kiện
                  </div>

                  <div className="space-y-1 max-h-28 overflow-y-auto pr-1">
                    {scannedBox.missingComponents.map(
                      (comp: any, idx: number) => (
                        <div
                          key={comp.componentId || idx}
                          className="bg-white border border-rose-100 px-2 py-1 rounded text-[11px] flex items-center justify-between"
                        >
                          <span className="font-bold text-neutral-900">
                            • {comp.componentName}
                          </span>
                          <span className="font-mono font-bold text-rose-600 text-[10px]">
                            Thiếu {comp.missingQuantity || 1} (
                            {comp.componentKind || "Mảnh"})
                          </span>
                        </div>
                      ),
                    )}
                  </div>
                </div>
              ) : (
                <div className="p-2 bg-emerald-50/60 border border-emerald-200/60 rounded-lg flex items-center gap-1.5 text-[11px] text-emerald-800 font-medium">
                  <ShieldCheck className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
                  <span>
                    Hộp đầy đủ linh kiện, sẵn sàng bàn giao cho khách.
                  </span>
                </div>
              )}

              <div className="pt-2 border-t border-neutral-200/60 flex items-center justify-between">
                <span className="text-[10px] text-neutral-400 font-mono">
                  ID: {scannedBox.id?.slice(0, 8)}...
                </span>
                <Button
                  type="button"
                  size="sm"
                  onClick={() => {
                    navigator.clipboard.writeText(scannedBox.barcode);
                    toast.success(`Đã chép mã ${scannedBox.barcode}.`);
                  }}
                  className="h-6 px-2 bg-neutral-900 text-white text-[10px] font-bold uppercase rounded-md shadow-2xs"
                >
                  Chép mã mượn
                </Button>
              </div>
            </div>
          ) : (
            <div className="p-2.5 bg-neutral-50/50 border border-dashed border-neutral-200 rounded-xl text-center text-[11px] text-neutral-400 font-medium">
              Sử dụng máy quét Barcode POS hoặc bấm nút Quét để kiểm tra tình
              trạng hộp.
            </div>
          )}
        </div>

        <div className="bg-white border border-neutral-200 rounded-2xl p-4 flex items-center justify-between shadow-2xs">
          <div className="space-y-1">
            <span className="text-xs font-bold text-neutral-400 uppercase tracking-wider">
              Sơ đồ bàn trống
            </span>
            <div className="text-2xl font-mono font-extrabold text-emerald-600">
              {tables.filter((t) => t.status === "Available").length} /{" "}
              {tables.length}
            </div>
            <p className="text-[11px] text-neutral-400">
              Bàn trống sẵn sàng đón khách
            </p>
          </div>
          <CheckCircle2 className="w-8 h-8 text-emerald-500" />
        </div>

        <div className="bg-white border border-neutral-200 rounded-2xl p-4 flex items-center justify-between shadow-2xs">
          <div className="space-y-1">
            <span className="text-xs font-bold text-neutral-400 uppercase tracking-wider">
              Phiên chơi đang hoạt động
            </span>
            <div className="text-2xl font-mono font-extrabold text-amber-600">
              {sessions.length}
            </div>
            <p className="text-[11px] text-neutral-400">
              Đang phục vụ billing & tính giờ
            </p>
          </div>
          <Users className="w-8 h-8 text-amber-500" />
        </div>
      </div>

      <div className="flex gap-2 border-b border-neutral-200 pb-px overflow-x-auto">
        {(
          [
            ["tables", `Sơ đồ bàn (${tables.length})`],
            ["sessions", `Phiên chơi active (${sessions.length})`],
            ["boxes", `Kho Hộp Vật Lý (${boxes.length})`],
            ["settlements", "Giải ngân"],
          ] as const
        ).map(([tab, label]) => (
          <button
            key={tab}
            type="button"
            onClick={() => setActiveTab(tab)}
            className={`px-4 py-2 text-xs font-bold uppercase border-b-2 transition-all shrink-0 ${
              activeTab === tab
                ? "border-neutral-950 text-neutral-950 font-extrabold"
                : "border-transparent text-neutral-400"
            }`}
          >
            {label}
          </button>
        ))}
      </div>

      {loading ? (
        <div className="flex flex-col items-center justify-center gap-3 py-20 border border-dashed rounded-2xl bg-white">
          <Loader2 className="h-8 w-8 animate-spin text-neutral-500" />
          <p className="text-xs font-semibold text-neutral-400">
            Đang tải dữ liệu POS...
          </p>
        </div>
      ) : activeTab === "tables" ? (
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4">
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
              min:
                playerRange.min ??
                (playerRange.max != null ? 1 : null),
              max: playerRange.max,
            };
            const playerRangeLabel = formatPlayerRange(displayRange);
            return (
              <div
                key={table.id}
                className={`border rounded-2xl p-4 flex flex-col justify-between bg-white ${
                  isAvail
                    ? "border-neutral-200"
                    : "border-amber-200 bg-amber-50/20"
                }`}
              >
                <div>
                  <h3 className="font-extrabold text-base text-neutral-950">
                    {table.name}
                  </h3>
                  <span className="text-[10px] text-neutral-400 font-mono">
                    Thứ tự bàn: {table.sortOrder}
                  </span>
                  {playerRangeLabel && (
                    <div className="mt-1.5 text-[11px] font-semibold text-neutral-700 flex items-center gap-1">
                      <Users className="w-3 h-3 text-neutral-400 shrink-0" />
                      <span>{playerRangeLabel}</span>
                    </div>
                  )}
                </div>
                <div className="pt-3 border-t border-neutral-100 mt-auto">
                  {isAvail ? (
                    <Button
                      type="button"
                      size="sm"
                      onClick={() =>
                        setStartTable({
                          id: table.id,
                          name: table.name,
                          minPlayers: displayRange.min,
                          maxPlayers: displayRange.max,
                        })
                      }
                      className="w-full h-7 bg-neutral-950 text-white text-[10px] font-bold uppercase rounded-md"
                    >
                      <Play className="w-2.5 h-2.5 mr-1" /> Gán Phiên
                    </Button>
                  ) : (
                    <span className="text-[10px] font-bold text-amber-700 flex items-center gap-1">
                      <Clock className="w-3 h-3" /> Đang dùng
                    </span>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      ) : activeTab === "sessions" ? (
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
      ) : activeTab === "boxes" ? (
        <PosBoxesTab boxes={boxes} />
      ) : (
        <SettlementsTab cafeId={cafeId} />
      )}

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