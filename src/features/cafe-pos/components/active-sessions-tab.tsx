/* eslint-disable @typescript-eslint/no-explicit-any */
"use client";

import { Button } from "@/components/ui/button";
import {
  Clock,
  Users,
  Boxes,
  ClipboardCheck,
  CreditCard,
  Info,
  LogOut,
  History,
  ArrowRight,
} from "lucide-react";

export interface ActiveSessionsTabProps {
  sessions: any[];
  onOpenChecklist: (sessionGameId: string) => void;
  onEndSession: (sessionId: string) => void;
  onViewDetail: (sessionId: string) => void;
  onReturnGame?: (sessionId: string) => Promise<boolean | void>;
  onInitiatePaymentFlow: (session: any) => void;
  onShowBoxHistory?: (boxId: string) => void;
}

export function ActiveSessionsTab({
  sessions,
  onOpenChecklist,
  onEndSession,
  onViewDetail,
  onReturnGame,
  onInitiatePaymentFlow,
  onShowBoxHistory,
}: ActiveSessionsTabProps) {
  const activeSessions = (sessions || []).filter(
    (s) => s.status !== "Paid" && s.status !== "Completed",
  );

  if (!activeSessions || activeSessions.length === 0) {
    return (
      <div className="bg-white border border-neutral-200 rounded-2xl p-12 text-center space-y-3 shadow-2xs">
        <Users className="w-10 h-10 text-neutral-400 mx-auto" />
        <h3 className="font-bold text-sm text-neutral-900">
          Không có bàn nào đang hoạt động
        </h3>
        <p className="text-xs text-neutral-500">
          Vào tab Sơ đồ bàn để bắt đầu gán bàn cho lượt khách mới.
        </p>
      </div>
    );
  }

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
      {activeSessions.map((ses: any) => {
        const isUnpaid = ses.status === "Unpaid";
        const isChecking = ses.status === "Checking";
        const primaryGame = ses.games?.[0];
        const isVerified = primaryGame?.checkStatus === "Verified";

        return (
          <div
            key={ses.id}
            className={`bg-white border rounded-2xl p-4 shadow-2xs flex flex-col justify-between space-y-4 transition-all ${
              isUnpaid
                ? "border-amber-300 bg-amber-50/20"
                : "border-neutral-200 hover:border-neutral-300"
            }`}
          >
            {/* HEADER PHIÊN & TRẠNG THÁI */}
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <h3 className="font-extrabold text-base text-neutral-950">
                    {ses.tableName}
                  </h3>
                  <span className="text-[11px] font-mono text-neutral-400">
                    #{ses.id.slice(0, 6)}
                  </span>
                </div>

                <span
                  className={`px-2 py-0.5 rounded-full text-[9px] font-extrabold uppercase border ${
                    isUnpaid
                      ? "bg-amber-100 text-amber-800 border-amber-300 animate-pulse"
                      : isChecking
                        ? "bg-blue-50 text-blue-700 border-blue-200"
                        : "bg-emerald-50 text-emerald-700 border-emerald-200"
                  }`}
                >
                  {isUnpaid
                    ? "UNPAID"
                    : isChecking
                      ? "CHECKING"
                      : ses.status || "Playing"}
                </span>
              </div>

              {/* BƯỚC THỜI GIAN VÀ KHÁCH */}
              <div className="grid grid-cols-2 gap-2 p-2.5 bg-neutral-50 rounded-xl border border-neutral-100 text-xs">
                <div>
                  <span className="text-[10px] font-bold text-neutral-400 uppercase flex items-center gap-1">
                    <Clock className="w-3 h-3" /> ĐÃ CHƠI
                  </span>
                  <div className="font-mono font-bold text-neutral-900 mt-0.5">
                    {ses.elapsedMinutes} phút
                  </div>
                </div>

                <div>
                  <span className="text-[10px] font-bold text-neutral-400 uppercase flex items-center gap-1">
                    <Users className="w-3 h-3" /> SỐ KHÁCH
                  </span>
                  <div className="font-semibold text-neutral-800 mt-0.5">
                    {ses.members?.length || 1} người
                  </div>
                </div>
              </div>

              {/* THÔNG TIN HỘP GAME (NẾU CÓ) */}
              {primaryGame && (
                <div className="p-2.5 bg-neutral-50 rounded-xl border border-neutral-200/80 flex items-center justify-between text-xs">
                  <div className="space-y-0.5 min-w-0 pr-2">
                    <div className="font-bold text-neutral-900 truncate flex items-center gap-1">
                      <Boxes className="w-3.5 h-3.5 text-neutral-500 shrink-0" />
                      {primaryGame.gameName}
                    </div>
                    <div className="text-[10px] font-mono text-neutral-400">
                      Mã: {primaryGame.boxBarcode}
                    </div>
                  </div>

                  {onShowBoxHistory && primaryGame.cafeInventoryBoxId && (
                    <Button
                      type="button"
                      size="sm"
                      variant="ghost"
                      onClick={() =>
                        onShowBoxHistory(primaryGame.cafeInventoryBoxId)
                      }
                      title="Xem lịch sử kiểm kê"
                      className="h-7 w-7 p-0 text-amber-600 hover:bg-amber-100/60 rounded-lg shrink-0"
                    >
                      <History className="w-4 h-4" />
                    </Button>
                  )}
                </div>
              )}
            </div>

            {/* CỤM FOOTER ACTION BUTTONS: DÙNG GRID CỐ ĐỊNH HOẶC FLEX CHUẨN ĐỂ KHÔNG BAO GIỜ ĐÈ NHAU */}
            <div className="pt-3 border-t border-neutral-100 relative static flex items-center justify-between gap-2 w-full">
              {/* Nút 1: Chi tiết */}
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => onViewDetail(ses.id)}
                className="relative static h-8 px-2.5 text-[11px] font-bold text-neutral-700 border-neutral-200 rounded-lg shrink-0 flex items-center gap-1 shadow-none"
              >
                <Info className="w-3.5 h-3.5 text-neutral-400 shrink-0" />
                <span>Chi tiết</span>
              </Button>

              {/* Cụm Nút 2 & 3: Thanh toán + LogOut */}
              <div className="relative static flex items-center gap-1.5 shrink-0">
                {!isUnpaid && !isVerified && primaryGame && (
                  <Button
                    type="button"
                    size="sm"
                    onClick={async () => {
                      if (onReturnGame) await onReturnGame(ses.id);
                      onOpenChecklist(primaryGame.id);
                    }}
                    className="relative static h-8 px-2.5 bg-amber-500 hover:bg-amber-600 text-white text-[11px] font-bold rounded-lg flex items-center gap-1 shadow-none"
                  >
                    <ClipboardCheck className="w-3.5 h-3.5 shrink-0" />
                    <span>Kiểm kê</span>
                  </Button>
                )}

                {(isVerified || isUnpaid || !primaryGame) && (
                  <Button
                    type="button"
                    size="sm"
                    onClick={() => onInitiatePaymentFlow(ses)}
                    className="relative static h-8 px-3 bg-emerald-600 hover:bg-emerald-700 text-white text-[11px] font-bold rounded-lg flex items-center gap-1 shadow-none"
                  >
                    <CreditCard className="w-3.5 h-3.5 shrink-0" />
                    <span>{isUnpaid ? "Thu Tiền" : "Thanh toán"}</span>
                    <ArrowRight className="w-3 h-3 shrink-0" />
                  </Button>
                )}

                <Button
                  type="button"
                  size="sm"
                  variant="ghost"
                  onClick={() => onEndSession(ses.id)}
                  title="Hủy / Giải phóng bàn"
                  className="relative static h-8 w-8 p-0 text-neutral-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg shrink-0 flex items-center justify-center shadow-none"
                >
                  <LogOut className="w-3.5 h-3.5 shrink-0" />
                </Button>
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
}
