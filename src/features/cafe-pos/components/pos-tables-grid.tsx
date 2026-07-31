"use client";

import { useState } from "react";
import { usePosTables } from "../hooks/usePosTables";
import { useActiveSessions } from "../hooks/useActiveSessions";
import { Button } from "@/components/ui/button";
import { RefreshCw, QrCode, PlayCircle, LogOut, Search } from "lucide-react";

interface PosTablesGridProps {
  cafeId: string;
}

export function PosTablesGrid({ cafeId }: PosTablesGridProps) {
  const { tables, loading, refreshTables } = usePosTables(cafeId);
  const { sessions, refreshSessions } = useActiveSessions(cafeId);
  const [statusFilter, setStatusFilter] = useState<string>("ALL");

  // Hàm tổng hợp làm mới lại toàn bộ sơ đồ và phiên
  const handleRefreshAll = () => {
    refreshTables();
    refreshSessions();
  };

  // Map thông tin phiên active vào từng bàn
  const tablesWithSessions = tables.map((table) => {
    const activeSession = sessions.find((s) => s.tableId === table.id);
    return {
      ...table,
      activeSession,
      status: activeSession ? "Occupied" : table.status,
    };
  });

  const filteredTables = tablesWithSessions.filter((t) => {
    if (statusFilter === "ALL") return true;
    return t.status === statusFilter;
  });

  return (
    <div className="flex flex-col h-full space-y-6">
      {/* HEADER POS BAR */}
      <div className="flex flex-wrap items-center justify-between gap-4 bg-white p-5 border border-neutral-200 rounded-2xl shadow-xs">
        <div>
          <h1 className="text-xl font-bold tracking-tight text-neutral-900">
            Sơ Đồ Bàn Realtime (POS)
          </h1>
          <p className="text-xs text-neutral-500 font-medium mt-0.5">
            Quản lý trực quan bàn chơi, quét giao hộp game và Check-in theo mã
            Booking.
          </p>
        </div>

        <div className="flex items-center gap-2">
          {/* Nút Host-led Check-in bằng QR */}
          <Button
            type="button"
            className="h-9 px-3.5 bg-neutral-900 text-white hover:bg-neutral-800 text-xs font-semibold rounded-lg shadow-2xs flex items-center gap-2 transition-all"
          >
            <QrCode className="w-4 h-4 text-emerald-400" />
            <span>Quét Mã Booking (Check-in)</span>
          </Button>

          {/* Nút Làm Mới */}
          <Button
            type="button"
            variant="outline"
            onClick={handleRefreshAll}
            className="h-9 px-3 border-neutral-200 text-neutral-700 hover:bg-neutral-50 text-xs font-semibold rounded-lg"
          >
            <RefreshCw
              className={`w-3.5 h-3.5 ${loading ? "animate-spin" : ""}`}
            />
            <span>Đồng bộ</span>
          </Button>
        </div>
      </div>

      {/* THANH BỘ LỌC TRẠNG THÁI BÀN */}
      <div className="flex items-center justify-between border-b border-neutral-200 pb-3">
        <div className="flex gap-2">
          {["ALL", "Available", "Occupied"].map((st) => (
            <button
              key={st}
              onClick={() => setStatusFilter(st)}
              className={`h-8 px-3.5 text-xs font-bold rounded-lg border transition-all ${
                statusFilter === st
                  ? "bg-neutral-900 text-white border-neutral-900 shadow-2xs"
                  : "bg-white text-neutral-600 border-neutral-200 hover:bg-neutral-50"
              }`}
            >
              {st === "ALL"
                ? "Tất cả bàn"
                : st === "Available"
                  ? "Bàn trống"
                  : "Đang chơi"}
            </button>
          ))}
        </div>

        <span className="text-xs font-semibold text-neutral-500">
          Hiển thị {filteredTables.length} / {tables.length} bàn
        </span>
      </div>

      {/* GRID LƯỚI HIỂN THỊ SƠ ĐỒ BÀN */}
      {loading && tables.length === 0 ? (
        <div className="text-center py-20 border border-dashed border-neutral-200 rounded-2xl bg-neutral-50/50 text-xs font-bold text-neutral-400 uppercase tracking-wider">
          Đang kết nối dữ liệu sơ đồ bàn POS...
        </div>
      ) : (
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4">
          {filteredTables.map((table) => {
            const isOccupied = table.status === "Occupied";

            return (
              <div
                key={table.id}
                className={`group relative border rounded-2xl p-4 flex flex-col justify-between gap-4 transition-all duration-200 ${
                  isOccupied
                    ? "bg-amber-50/40 border-amber-200/80 shadow-xs hover:border-amber-300"
                    : "bg-white border-neutral-200/80 shadow-2xs hover:border-neutral-300 hover:shadow-xs"
                }`}
              >
                {/* TÊN BÀN & BADGE TRẠNG THÁI */}
                <div className="flex items-center justify-between">
                  <span className="font-bold text-base text-neutral-900 tracking-tight">
                    {table.name}
                  </span>

                  <span
                    className={`h-2.5 w-2.5 rounded-full ${
                      isOccupied
                        ? "bg-amber-500 animate-pulse"
                        : "bg-emerald-500"
                    }`}
                  />
                </div>

                {/* NỘI DUNG PHIÊN HOẶC TRẠNG THÁI TRỐNG */}
                <div className="min-h-[60px] flex flex-col justify-center">
                  {isOccupied && table.activeSession ? (
                    <div className="space-y-1">
                      <div className="text-xs font-bold text-neutral-800 truncate">
                        🎮 {table.activeSession.gameName}
                      </div>
                      <div className="text-[10px] font-mono text-neutral-400">
                        Mã barcode: {table.activeSession.barcode}
                      </div>
                    </div>
                  ) : (
                    <div className="text-xs font-medium text-neutral-400 italic">
                      Bàn sẵn sàng nhận khách
                    </div>
                  )}
                </div>

                {/* NÚT THAO TÁC THEO TỪNG TRẠNG THÁI */}
                <div className="pt-2 border-t border-neutral-100 flex items-center justify-between">
                  {isOccupied ? (
                    <Button
                      type="button"
                      size="sm"
                      className="w-full h-8 bg-red-50 text-red-700 hover:bg-red-100 border border-red-200 font-bold text-[11px] rounded-lg shadow-none flex items-center justify-center gap-1.5"
                    >
                      <LogOut className="w-3.5 h-3.5" />
                      <span>Kết thúc & Trả game</span>
                    </Button>
                  ) : (
                    <Button
                      type="button"
                      size="sm"
                      className="w-full h-8 bg-neutral-900 text-white hover:bg-neutral-800 font-bold text-[11px] rounded-lg shadow-2xs flex items-center justify-center gap-1.5"
                    >
                      <PlayCircle className="w-3.5 h-3.5 text-emerald-400" />
                      <span>Giao game (Bắt đầu)</span>
                    </Button>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
