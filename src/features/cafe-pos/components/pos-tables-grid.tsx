"use client";

import { useState } from "react";
import { usePosTables } from "../hooks/usePosTables";
import { useActiveSessions } from "../hooks/useActiveSessions";
import { Button } from "@/components/ui/button";
import { RefreshCw, QrCode, PlayCircle, LogOut } from "lucide-react";

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
      <div className="flex flex-wrap items-center justify-between gap-4 rounded-2xl border border-indigo-200/60 bg-gradient-to-br from-white via-indigo-50/40 to-purple-50/30 p-5 shadow-md">
        <div>
          <h1 className="text-xl font-extrabold tracking-tight text-neutral-900">
            Sơ đồ bàn trực tiếp (POS)
          </h1>
          <p className="mt-0.5 text-xs font-medium text-neutral-500">
            Quản lý trực quan bàn chơi, quét giao hộp game và nhận bàn theo mã
            đặt chỗ.
          </p>
        </div>

        <div className="flex items-center gap-2">
          {/* Nút nhận bàn bằng QR */}
          <Button
            type="button"
            className="h-9 gap-2 rounded-lg bg-gradient-to-r from-emerald-600 to-teal-600 px-3.5 text-xs font-semibold text-white shadow-sm hover:from-emerald-700 hover:to-teal-700"
          >
            <QrCode className="size-4" />
            <span>Quét mã đặt chỗ (nhận bàn)</span>
          </Button>

          {/* Nút Làm Mới */}
          <Button
            type="button"
            variant="outline"
            onClick={handleRefreshAll}
            className="h-9 rounded-lg border-indigo-200 px-3 text-xs font-semibold text-indigo-700 hover:bg-indigo-50"
          >
            <RefreshCw
              className={`size-3.5 ${loading ? "animate-spin" : ""}`}
            />
            <span>Đồng bộ</span>
          </Button>
        </div>
      </div>

      {/* THANH BỘ LỌC TRẠNG THÁI BÀN */}
      <div className="flex items-center justify-between border-b border-indigo-100 pb-3">
        <div className="flex gap-2">
          {(["ALL", "Available", "Occupied"] as const).map((st) => {
            const tone =
              st === "ALL"
                ? "from-indigo-600 to-purple-600 border-indigo-600"
                : st === "Available"
                  ? "from-emerald-600 to-teal-600 border-emerald-600"
                  : "from-amber-500 to-orange-500 border-amber-500";
            const label =
              st === "ALL"
                ? "Tất cả bàn"
                : st === "Available"
                  ? "Bàn trống"
                  : "Đang chơi";
            const active = statusFilter === st;
            return (
              <button
                key={st}
                onClick={() => setStatusFilter(st)}
                className={`h-8 rounded-lg border px-3.5 text-xs font-bold transition-all ${
                  active
                    ? `bg-gradient-to-r text-white shadow-sm ${tone}`
                    : "border-neutral-200 bg-white text-neutral-600 hover:bg-neutral-50"
                }`}
              >
                {label}
              </button>
            );
          })}
        </div>

        <span className="text-xs font-semibold text-neutral-500">
          Hiển thị {filteredTables.length} / {tables.length} bàn
        </span>
      </div>

      {/* GRID LƯỚI HIỂN THỊ SƠ ĐỒ BÀN */}
      {loading && tables.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-indigo-300 bg-gradient-to-br from-indigo-50/40 to-purple-50/30 py-20 text-center text-xs font-bold uppercase tracking-wider text-indigo-500">
          Đang kết nối dữ liệu sơ đồ bàn POS...
        </div>
      ) : filteredTables.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-indigo-200 bg-gradient-to-br from-indigo-50/40 to-purple-50/30 py-20 text-center text-xs font-bold uppercase tracking-wider text-indigo-500">
          Không có bàn nào khớp bộ lọc.
        </div>
      ) : (
        <div className="grid grid-cols-2 gap-4 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5">
          {filteredTables.map((table) => {
            const isOccupied = table.status === "Occupied";

            return (
              <div
                key={table.id}
                className={`group relative rounded-2xl border p-4 flex flex-col justify-between gap-4 transition-all duration-200 ${
                  isOccupied
                    ? "border-amber-200/80 bg-gradient-to-br from-amber-50/60 via-white to-orange-50/40 shadow-xs hover:border-amber-300"
                    : "border-emerald-200/70 bg-gradient-to-br from-emerald-50/40 via-white to-teal-50/30 shadow-2xs hover:border-emerald-300 hover:shadow-xs"
                }`}
              >
                {/* TÊN BÀN & BADGE TRẠNG THÁI */}
                <div className="flex items-center justify-between">
                  <span className="text-base font-bold tracking-tight text-neutral-900">
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
                <div className="min-h-60px flex flex-col justify-center">
                  {isOccupied && table.activeSession ? (
                    <div className="space-y-1">
                      <div className="truncate text-xs font-bold text-amber-900">
                        🎮 {table.activeSession.gameName}
                      </div>
                      <div className="font-mono text-[10px] text-amber-700/70">
                        Mã barcode: {table.activeSession.barcode}
                      </div>
                    </div>
                  ) : (
                    <div className="text-xs font-medium italic text-emerald-700/70">
                      Bàn sẵn sàng nhận khách
                    </div>
                  )}
                </div>

                {/* NÚT THAO TÁC THEO TỪNG TRẠNG THÁI */}
                <div
                  className={`flex items-center justify-between border-t pt-2 ${
                    isOccupied ? "border-amber-100" : "border-emerald-100"
                  }`}
                >
                  {isOccupied ? (
                    <Button
                      type="button"
                      size="sm"
                      className="flex h-8 w-full items-center justify-center gap-1.5 rounded-lg border border-rose-200 bg-gradient-to-r from-rose-50 to-pink-50 text-[11px] font-bold text-rose-700 shadow-none hover:from-rose-100 hover:to-pink-100"
                    >
                      <LogOut className="size-3.5" />
                      <span>Kết thúc & Trả game</span>
                    </Button>
                  ) : (
                    <Button
                      type="button"
                      size="sm"
                      className="flex h-8 w-full items-center justify-center gap-1.5 rounded-lg bg-gradient-to-r from-emerald-600 to-teal-600 text-[11px] font-bold text-white shadow-sm hover:from-emerald-700 hover:to-teal-700"
                    >
                      <PlayCircle className="size-3.5" />
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
