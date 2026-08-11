/* eslint-disable @typescript-eslint/no-explicit-any */
"use client";

import { usePosDashboard } from "../hooks/usePosDashboard";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { SyncTablesModal } from "./sync-tables-modal";
import { CheckoutConfirmModal } from "./checkout-confirm-modal";
import { PayConfirmModal } from "./checkout-pay-modal";
import { ComponentChecklistModal } from "./component-checklist-modal";
import { SessionDetailModal } from "./session-detail-modal";
import { PosBoxesTab } from "./pos-boxes-tab";
import { StartSessionModal } from "./start-session-modal";
import { ActiveSessionsTab } from "./active-sessions-tab";
import { EndSessionModal } from "./end-session-modal";
import { BoxComponentHistoryModal } from "./box-component-history-modal";
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
  CreditCard,
  Receipt,
} from "lucide-react";
import { useState, useEffect } from "react";
import { ActiveSession } from "../types/pos.types";

export function PosFeatureContainer() {
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
    unpaidSessions = [],
    handleFetchUnpaidSessions,
    refreshData,
    handleScanBarcode,
    handleBookingCheckIn,
    handleStartSession,
    handleEndSession,
    handleGetSessionDetail,
    handleOpenChecklist,
    handleComponentCheck,
    handleReturnGame,
    handleCheckoutSession,
    handlePaySession,
    handleSyncTables,
    handleFetchBoxHistory,
  } = usePosDashboard();

  // Navigation state điều hướng Tabs
  const [activeTab, setActiveTab] = useState<
    "tables" | "sessions" | "unpaid" | "boxes"
  >("tables");

  const [endingSession, setEndingSession] = useState<ActiveSession | null>(
    null,
  );
  const [isSyncModalOpen, setIsSyncModalOpen] = useState(false);
  const [selectedDetailSessionId, setSelectedDetailSessionId] = useState<
    string | null
  >(null);
  const [startTable, setStartTable] = useState<{
    id: string;
    name: string;
  } | null>(null);

  // STATES ĐIỀU KHIỂN TÁCH BIỆT 2 MODAL: CHECKOUT VÀ PAY
  const [checkoutConfirmSession, setCheckoutConfirmSession] = useState<
    any | null
  >(null);
  const [payConfirmSession, setPayConfirmSession] = useState<any | null>(null);

  // State Modal Lịch sử kiểm kê
  const [historyModalState, setHistoryModalState] = useState<{
    isOpen: boolean;
    data: any;
    targetSession: any;
  }>({
    isOpen: false,
    data: null,
    targetSession: null,
  });

  // Tự động gọi API lấy danh sách Unpaid khi chuyển sang Tab 'unpaid'
  useEffect(() => {
    if (activeTab === "unpaid" && handleFetchUnpaidSessions) {
      handleFetchUnpaidSessions(0);
    }
  }, [activeTab, handleFetchUnpaidSessions]);

  // HÀM 1: BẤM KHI Ở PHIÊN ACTIVE -> MỞ MODAL CHECKOUT CONFIRM (LÀM NHIỆM VỤ POST /checkout)
  const handleInitiateCheckoutFlow = async (session: any) => {
    let detailedSession = session;
    if (handleGetSessionDetail) {
      const detailRes = await handleGetSessionDetail(session.id);
      if (detailRes) {
        detailedSession = { ...session, ...detailRes };
      }
    }

    setCheckoutConfirmSession(detailedSession);
  };

  // HÀM 2: BẤM KHI Ở TAB UNPAID -> MỞ MODAL PAY CONFIRM (LÀM NHIỆM VỤ POST /pay)
  const handleInitiatePayFlow = async (session: any) => {
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
      const historyRes = await handleFetchBoxHistory(boxId, detailedSession.id);
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

    setPayConfirmSession(detailedSession);
  };

  // Xem xong lịch sử kiểm kê -> Chuyển sang Modal Pay Confirm
  const handleProceedFromHistoryToPay = () => {
    const targetSession = historyModalState.targetSession;
    setHistoryModalState({ isOpen: false, data: null, targetSession: null });
    if (targetSession) {
      setPayConfirmSession(targetSession);
    }
  };

  // Xem lịch sử tổng quát (không có sessionId)
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
    if (!checkResult) return false;

    let targetSes = sessions.find((s) => s.id === checklistData?.sessionId);
    if (checklistData?.sessionId && handleGetSessionDetail) {
      const detailRes = await handleGetSessionDetail(checklistData.sessionId);
      if (detailRes) {
        targetSes = { ...targetSes, ...detailRes };
      }
    }

    setChecklistData(null);

    if (targetSes) {
      setCheckoutConfirmSession(targetSes); // Mở Modal Checkout Xem trước & Confirm
    }
    return true;
  };

  return (
    <div className="space-y-6 text-neutral-900 font-sans antialiased">
      {/* HEADER TOOLBAR */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 bg-white p-5 rounded-2xl border border-neutral-200 shadow-2xs">
        <div>
          <h1 className="text-xl font-bold tracking-tight text-neutral-950">
            Web POS Center
          </h1>
          <p className="text-xs text-neutral-500 font-medium mt-0.5">
            Sơ đồ bàn, kiểm kê linh kiện, chốt Checkout & Thu tiền.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2 shrink-0">
          <Button
            type="button"
            variant="outline"
            onClick={() => setIsSyncModalOpen(true)}
            className="h-9 px-3 border-neutral-200 text-xs font-bold text-neutral-700 hover:bg-neutral-50 rounded-lg flex items-center gap-1.5"
          >
            <Settings className="w-3.5 h-3.5" />
            <span>Sơ đồ bàn</span>
          </Button>

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
              placeholder="Nhập BookingCode..."
              value={bookingCode}
              onChange={(e) => setBookingCode(e.target.value)}
              className="h-7 w-36 text-xs bg-white border-neutral-200 rounded-lg"
            />
            <Button
              type="button"
              onClick={handleBookingCheckIn}
              className="h-7 px-2.5 bg-neutral-950 text-white text-[10px] font-bold uppercase rounded-lg"
            >
              <QrCode className="w-3 h-3 mr-1" /> Check-in
            </Button>
          </div>
        </div>
      </div>

      {/* METRICS & TRA CỨU BARCODE HỘP GAME */}
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
                    alert(`Đã chép mã ${scannedBox.barcode}!`);
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

      {/* TAB NAVIGATION */}
      <div className="flex gap-2 border-b border-neutral-200 pb-px">
        <button
          onClick={() => setActiveTab("tables")}
          className={`px-4 py-2 text-xs font-bold uppercase border-b-2 transition-all ${
            activeTab === "tables"
              ? "border-neutral-950 text-neutral-950 font-extrabold"
              : "border-transparent text-neutral-400"
          }`}
        >
          Sơ đồ bàn ({tables.length})
        </button>

        <button
          onClick={() => setActiveTab("sessions")}
          className={`px-4 py-2 text-xs font-bold uppercase border-b-2 transition-all ${
            activeTab === "sessions"
              ? "border-neutral-950 text-neutral-950 font-extrabold"
              : "border-transparent text-neutral-400"
          }`}
        >
          Phiên chơi active ({sessions.length})
        </button>

        <button
          onClick={() => setActiveTab("unpaid")}
          className={`px-4 py-2 text-xs font-bold uppercase border-b-2 transition-all flex items-center gap-1.5 ${
            activeTab === "unpaid"
              ? "border-amber-600 text-amber-700 font-extrabold"
              : "border-transparent text-neutral-400"
          }`}
        >
          <Receipt className="w-3.5 h-3.5" />
          <span>Đơn Chờ Thanh Toán</span>
          <span className="px-1.5 py-0.2 bg-amber-100 text-amber-800 rounded-full text-[10px] font-mono font-bold">
            {unpaidSessions.length}
          </span>
        </button>

        <button
          onClick={() => setActiveTab("boxes")}
          className={`px-4 py-2 text-xs font-bold uppercase border-b-2 transition-all ${
            activeTab === "boxes"
              ? "border-neutral-950 text-neutral-950 font-extrabold"
              : "border-transparent text-neutral-400"
          }`}
        >
          Kho Hộp Vật Lý ({boxes.length})
        </button>
      </div>

      {/* TAB CONTENTS */}
      {loading ? (
        <div className="text-center py-20 border border-dashed rounded-2xl bg-white text-xs text-neutral-400">
          Đang tải dữ liệu POS...
        </div>
      ) : activeTab === "tables" ? (
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4">
          {tables.map((table) => {
            const isAvail = table.status === "Available";
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
                    Order: #{table.sortOrder}
                  </span>
                </div>
                <div className="pt-3 border-t border-neutral-100 mt-auto">
                  {isAvail ? (
                    <Button
                      type="button"
                      size="sm"
                      onClick={() =>
                        setStartTable({ id: table.id, name: table.name })
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
        /* TAB ACTIVE SESSIONS: NÚT THANH TOÁN SẼ MỞ CHECKOUT CONFIRM MODAL */
        <ActiveSessionsTab
          sessions={sessions}
          onOpenChecklist={handleOpenChecklist}
          onReturnGame={handleReturnGame}
          onEndSession={(sessionId: string) => {
            const targetSes = sessions.find((s) => s.id === sessionId);
            if (targetSes) setEndingSession(targetSes);
          }}
          onViewDetail={(sessionId: string) =>
            setSelectedDetailSessionId(sessionId)
          }
          onInitiatePaymentFlow={handleInitiateCheckoutFlow} // TRỎ VÀO HÀM CHECKOUT FLOW
          onShowBoxHistory={handleShowBoxHistoryDirectly}
        />
      ) : activeTab === "unpaid" ? (
        /* TAB UNPAID SESSIONS: NÚT THU TIỀN SẼ MỞ PAY CONFIRM MODAL */
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {unpaidSessions.length > 0 ? (
            unpaidSessions.map((ses: any) => (
              <div
                key={ses.id}
                className="bg-white border border-amber-300 rounded-2xl p-4 space-y-3 shadow-2xs"
              >
                <div className="flex justify-between items-center">
                  <h3 className="font-extrabold text-base text-neutral-900">
                    {ses.tableName || "Bàn POS"}
                  </h3>
                  <span className="px-2 py-0.5 rounded text-[9px] font-bold uppercase bg-amber-100 text-amber-800 border border-amber-200">
                    UNPAID ({ses.elapsedMinutes || 0} phút)
                  </span>
                </div>

                <div className="text-xs text-neutral-600 space-y-1 bg-neutral-50 p-2.5 rounded-xl border border-neutral-100">
                  <p>
                    Khách hàng:{" "}
                    <strong className="text-neutral-900">
                      {ses.hostName || "Khách vãng lai"}
                    </strong>
                  </p>
                  <p className="text-[10px] font-mono text-neutral-400">
                    Mã phiên: #{ses.id.slice(0, 8)}
                  </p>
                </div>

                <div className="pt-2 border-t border-neutral-100 flex justify-end">
                  <Button
                    type="button"
                    size="sm"
                    onClick={() => handleInitiatePayFlow(ses)} // TRỎ VÀO HÀM PAY FLOW
                    className="h-8 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold rounded-lg px-3 flex items-center gap-1"
                  >
                    <CreditCard className="w-3.5 h-3.5" />
                    <span>Thu Tiền Đơn Này</span>
                  </Button>
                </div>
              </div>
            ))
          ) : (
            <div className="col-span-3 p-12 text-center text-neutral-400 border border-dashed border-neutral-200 rounded-2xl bg-white text-xs font-semibold">
              Không có đơn nào đang chờ thanh toán.
            </div>
          )}
        </div>
      ) : (
        <PosBoxesTab boxes={boxes} />
      )}

      {/* MODALS PHỤ TRỢ */}
      <SyncTablesModal
        isOpen={isSyncModalOpen}
        onClose={() => setIsSyncModalOpen(false)}
        currentTables={tables}
        onSave={handleSyncTables}
      />

      <ComponentChecklistModal
        isOpen={!!checklistData}
        onClose={() => setChecklistData(null)}
        sessionGameData={checklistData}
        onSubmitCheck={handleChecklistSubmitOnly}
      />

      {/* MODAL 1: CHECKOUT CONFIRM (BẤM CONFIRM LÀ CHẠY API CHECKOUT -> HIỂN THỊ HÓA ĐƠN) */}
      <CheckoutConfirmModal
        key={checkoutConfirmSession?.id || "checkout-modal"}
        isOpen={!!checkoutConfirmSession}
        onClose={() => setCheckoutConfirmSession(null)}
        session={checkoutConfirmSession}
        onConfirmCheckout={handleCheckoutSession}
        onFetchHistory={handleFetchBoxHistory} // TRUYỀN HÀM FETCH HISTORY TẠI ĐÂY
      />

      {/* MODAL 2: PAY CONFIRM (THU TIỀN ĐƠN UNPAID -> POST /pay) */}
      <PayConfirmModal
        key={payConfirmSession?.id || "pay-confirm-modal"}
        isOpen={!!payConfirmSession}
        onClose={() => setPayConfirmSession(null)}
        session={payConfirmSession}
        onPay={handlePaySession}
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

      <SessionDetailModal
        isOpen={!!selectedDetailSessionId}
        onClose={() => setSelectedDetailSessionId(null)}
        sessionId={selectedDetailSessionId}
        onFetchDetail={handleGetSessionDetail}
        onOpenChecklist={handleOpenChecklist}
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
