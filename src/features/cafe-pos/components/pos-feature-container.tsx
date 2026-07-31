"use client";

import { usePosDashboard } from "../hooks/usePosDashboard";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { SyncTablesModal } from "./sync-tables-modal";
import {
  RefreshCw,
  QrCode,
  Barcode,
  Play,
  Users,
  Clock,
  CheckCircle2,
  Box,
  ClipboardCheck,
  X,
  Settings,
} from "lucide-react";
import { useState } from "react";
import { PosBoxesTab } from "./pos-boxes-tab";
import { StartSessionModal } from "./start-session-modal";
import { ActiveSession, ActiveSessionsTab } from "./active-sessions-tab";
import { EndSessionModal } from "./end-session-modal";

export function PosFeatureContainer() {
  const {
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
    activeChecklistSession,
    setActiveChecklistSession,
    checklist,
    setChecklist,
    refreshData,
    handleScanBarcode,
    handleBookingCheckIn,
    handleEndSession,
    handleOpenChecklist,
    handleSubmitChecklist,
    handleSyncTables,
    handleStartSession,
  } = usePosDashboard();

  const [activeTab, setActiveTab] = useState<"tables" | "boxes" | "sessions">(
    "tables",
  );

  const [endingSession, setEndingSession] = useState<ActiveSession | null>(
    null,
  );

  // State điều khiển Modal Cấu hình sơ đồ bàn
  const [isSyncModalOpen, setIsSyncModalOpen] = useState(false);

  const [startTable, setStartTable] = useState<{
    id: string;
    name: string;
  } | null>(null);

  return (
    <div className="space-y-6 text-neutral-900 font-sans antialiased">
      {/* HEADER TOOLBAR */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 bg-white p-5 rounded-2xl border border-neutral-200 shadow-2xs">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-xl font-bold tracking-tight text-neutral-950">
              Web POS Center
            </h1>
          </div>
          <p className="text-xs text-neutral-500 font-medium mt-0.5">
            Sơ đồ bàn, quét barcode hộp game, Check-in và Kiểm kê linh kiện.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2 shrink-0">
          {/* NÚT TÁC VỤ CẤU HÌNH SƠ ĐỒ BÀN */}
          <Button
            type="button"
            variant="outline"
            onClick={() => setIsSyncModalOpen(true)}
            className="h-9 px-3 border-neutral-200 text-xs font-bold text-neutral-700 hover:bg-neutral-50 rounded-lg flex items-center gap-1.5 shadow-2xs"
          >
            <Settings className="w-3.5 h-3.5" />
            <span>Cấu hình bàn</span>
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

          {/* Cụm Quick Input Booking Checkin */}
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
              className="h-7 px-2.5 bg-neutral-950 text-white text-[10px] font-bold uppercase rounded-lg flex items-center gap-1"
            >
              <QrCode className="w-3 h-3" /> Check-in MDC
            </Button>
          </div>
        </div>
      </div>

      {/* METRICS & QUICK SCAN BARCODE BAR */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        {/* KHỐI QUÉT & TRA CỨU BARCODE HỘP GAME */}
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

          {/* INPUT QUÉT / BẮT SỰ KIỆN ENTER TỰ ĐỘNG CỦA MÁY QUÉT BARCODE */}
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

          {/* KẾT QUẢ TRA CỨU TỪ API (HỘP GAME CHI TIẾT) */}
          {scannedBox ? (
            <div className="p-3 bg-neutral-50 border border-neutral-200/90 rounded-xl space-y-2 animate-in fade-in-50 duration-150">
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

                {/* BADGE TRẠNG THÁI HỘP */}
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

              {/* NÚT THAO TÁC NHANH KHI QUÉT TRÚNG HỘP */}
              <div className="pt-2 border-t border-neutral-200/60 flex items-center justify-between">
                <span className="text-[10px] text-neutral-400 font-mono">
                  ID: {scannedBox.id?.slice(0, 8)}...
                </span>
                <Button
                  type="button"
                  size="sm"
                  onClick={() => {
                    navigator.clipboard.writeText(scannedBox.barcode);
                    alert(`Đã chép mã ${scannedBox.barcode} để gán bàn!`);
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

        {/* Thống kê bàn sẵn sàng */}
        <div className="bg-white border border-neutral-200 rounded-2xl p-4 flex items-center justify-between shadow-2xs">
          <div className="space-y-1">
            <span className="text-xs font-bold text-neutral-400 uppercase tracking-wider">
              Sơ đồ bàn khả dụng
            </span>
            <div className="text-2xl font-mono font-extrabold text-emerald-600">
              {tables.filter((t) => t.status === "Available").length} /{" "}
              {tables.length}
            </div>
            <p className="text-[11px] text-neutral-400">
              Bàn trống sẵn sàng đón khách
            </p>
          </div>
          <div className="w-10 h-10 rounded-xl bg-emerald-50 border border-emerald-100 flex items-center justify-center text-emerald-600">
            <CheckCircle2 className="w-5 h-5" />
          </div>
        </div>

        {/* Thống kê Phiên hoạt động */}
        <div className="bg-white border border-neutral-200 rounded-2xl p-4 flex items-center justify-between shadow-2xs">
          <div className="space-y-1">
            <span className="text-xs font-bold text-neutral-400 uppercase tracking-wider">
              Phiên Chơi Active
            </span>
            <div className="text-2xl font-mono font-extrabold text-amber-600">
              {sessions.length}
            </div>
            <p className="text-[11px] text-neutral-400">
              Đang phục vụ billing & tính giờ
            </p>
          </div>
          <div className="w-10 h-10 rounded-xl bg-amber-50 border border-amber-100 flex items-center justify-center text-amber-600">
            <Users className="w-5 h-5" />
          </div>
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
          Phiên chơi đang hoạt động ({sessions.length})
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

      {/* SECTION CONTENT */}
      {loading ? (
        <div className="text-center py-20 border border-dashed border-neutral-300 rounded-2xl bg-white font-semibold text-xs text-neutral-400 uppercase tracking-wider">
          Đang quét dữ liệu hệ thống POS...
        </div>
      ) : activeTab === "tables" ? (
        /* TAB 1: SƠ ĐỒ BÀN */
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4">
          {tables.map((table) => {
            const isAvail = table.status === "Available";
            return (
              <div
                key={table.id}
                className={`border rounded-2xl p-4 flex flex-col justify-between min-h-[140px] bg-white transition-all shadow-2xs ${
                  isAvail
                    ? "border-neutral-200 hover:border-neutral-300"
                    : "border-amber-200 bg-amber-50/20"
                }`}
              >
                <div className="flex items-start justify-between">
                  <div>
                    <h3 className="font-extrabold text-base text-neutral-950">
                      {table.name}
                    </h3>
                    <span className="text-[10px] font-mono text-neutral-400">
                      Order: #{table.sortOrder}
                    </span>
                  </div>
                  <span
                    className={`px-2 py-0.5 rounded text-[9px] font-bold uppercase border ${
                      isAvail
                        ? "bg-emerald-50 text-emerald-700 border-emerald-200"
                        : "bg-amber-100 text-amber-800 border-amber-200"
                    }`}
                  >
                    {table.status}
                  </span>
                </div>

                <div className="pt-3 border-t border-neutral-100 flex items-center justify-between mt-auto">
                  {isAvail ? (
                    <Button
                      type="button"
                      size="sm"
                      onClick={() =>
                        setStartTable({ id: table.id, name: table.name })
                      }
                      className="w-full h-7 bg-neutral-950 text-white text-[10px] font-bold uppercase rounded-md hover:bg-neutral-800"
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
        /* TAB 2: ACTIVE SESSIONS CHUYÊN NGHIỆP */
        <ActiveSessionsTab
          sessions={sessions}
          onOpenChecklist={handleOpenChecklist}
          onEndSession={(sessionId) => {
            const targetSes = sessions.find((s) => s.id === sessionId);
            if (targetSes) setEndingSession(targetSes);
          }}
        />
      ) : (
        /* TAB 3: KHO HỘP GAME VẬT LÝ */
        <PosBoxesTab boxes={boxes} />
      )}

      {/* MODAL KIỂM KÊ LINH KIỆN */}
      {activeChecklistSession && (
        <div className="fixed inset-0 bg-neutral-950/40 backdrop-blur-xs z-50 flex items-center justify-center p-4">
          <div className="bg-white border border-neutral-200 rounded-2xl max-w-lg w-full p-6 space-y-4 shadow-xl">
            <div className="flex items-center justify-between border-b border-neutral-100 pb-3">
              <h3 className="font-bold text-base text-neutral-950 flex items-center gap-2">
                <ClipboardCheck className="w-4 h-4 text-amber-600" /> Kiểm kê
                linh kiện
              </h3>
              <button
                onClick={() => setActiveChecklistSession(null)}
                className="text-neutral-400 hover:text-neutral-950"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <p className="text-xs text-neutral-500">
              Nhân viên bắt buộc kiểm đếm linh kiện trước khi mở khóa xuất hóa
              đơn tính phí phạt nếu thiếu.
            </p>

            <div className="max-h-60 overflow-y-auto space-y-2 pr-1">
              {checklist.length === 0 ? (
                <div className="text-center py-6 text-xs text-neutral-400">
                  Không có linh kiện cần kiểm kê.
                </div>
              ) : (
                checklist.map((item, idx) => (
                  <div
                    key={idx}
                    className="flex items-center justify-between p-2.5 bg-neutral-50 rounded-lg border border-neutral-200 text-xs"
                  >
                    <span className="font-semibold text-neutral-900">
                      {item.componentName || `Linh kiện #${idx + 1}`}
                    </span>
                    <Input
                      type="number"
                      placeholder="SL thiếu"
                      value={item.missingQuantity || 0}
                      onChange={(e) => {
                        const val = parseInt(e.target.value) || 0;
                        setChecklist((prev) =>
                          prev.map((c, i) =>
                            i === idx ? { ...c, missingQuantity: val } : c,
                          ),
                        );
                      }}
                      className="w-20 h-7 text-xs bg-white text-center"
                    />
                  </div>
                ))
              )}
            </div>

            <div className="pt-3 border-t border-neutral-100 flex justify-end gap-2">
              <Button
                type="button"
                variant="outline"
                onClick={() => setActiveChecklistSession(null)}
                className="h-9 text-xs"
              >
                Hủy
              </Button>
              <Button
                type="button"
                onClick={handleSubmitChecklist}
                className="h-9 bg-neutral-950 text-white text-xs font-bold"
              >
                Xác Nhận & Mở In Hóa Đơn
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL CẤU HÌNH VÀ ĐỒNG BỘ SƠ ĐỒ BÀN */}
      <SyncTablesModal
        isOpen={isSyncModalOpen}
        onClose={() => setIsSyncModalOpen(false)}
        currentTables={tables}
        onSave={handleSyncTables}
      />

      <StartSessionModal
        isOpen={!!startTable}
        onClose={() => setStartTable(null)}
        selectedTable={startTable}
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
