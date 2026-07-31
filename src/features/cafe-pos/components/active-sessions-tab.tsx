/* eslint-disable react/no-unescaped-entities */
/* eslint-disable @typescript-eslint/no-explicit-any */
"use client";

import { Button } from "@/components/ui/button";
import {
  Clock,
  Users,
  User,
  ClipboardCheck,
  LogOut,
  Flame,
  Timer,
  Boxes,
} from "lucide-react";

export interface SessionMember {
  id: string;
  userId: string;
  userName: string;
  isGuestSlot: boolean;
  joinedAt: string;
  leftAt: string | null;
  totalMinutesPlayed: number;
  subtotal: number;
  penaltyAmount: number;
  isCheckedOut: boolean;
  status: string;
}

export interface ActiveSession {
  id: string;
  hostId: string;
  hostName: string;
  lobbyId: string | null;
  cafeTableId: string;
  tableName: string;
  defaultPlayTimeMinutes: number;
  startedAt: string;
  elapsedMinutes: number;
  estimatedRemainingMinutes: number;
  members: SessionMember[];
  games: any[];
}

interface ActiveSessionsTabProps {
  sessions: ActiveSession[];
  onOpenChecklist: (sessionGameId: string) => void;
  onEndSession: (sessionId: string) => void;
}

export function ActiveSessionsTab({
  sessions,
  onOpenChecklist,
  onEndSession,
}: ActiveSessionsTabProps) {
  if (sessions.length === 0) {
    return (
      <div className="text-center py-20 border border-dashed border-neutral-300 rounded-2xl bg-white space-y-2">
        <div className="w-12 h-12 rounded-full bg-neutral-100 border border-neutral-200 flex items-center justify-center mx-auto text-neutral-400">
          <Clock className="w-6 h-6" />
        </div>
        <h4 className="font-extrabold text-sm text-neutral-900">
          Không có phiên chơi nào đang active
        </h4>
        <p className="text-xs text-neutral-400 max-w-sm mx-auto">
          Chọn một bàn khả dụng ở Tab "Sơ đồ bàn" và gán phiên chơi mới hoặc
          quét mã Check-in từ Booking.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* KHỐI CARD HIỂN THỊ CÁC PHIÊN ĐANG CHƠI */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {sessions.map((ses) => {
          const playingMembers =
            ses.members?.filter((m) => !m.isCheckedOut) || [];
          const activeGame = ses.games?.[0];

          return (
            <div
              key={ses.id}
              className="bg-white border border-neutral-200 rounded-2xl p-5 shadow-2xs hover:border-neutral-300 transition-all space-y-4 flex flex-col justify-between"
            >
              {/* HEAD CARD: BÀN & CỤM BỘ ĐẾM THỜI GIAN */}
              <div className="flex items-start justify-between gap-3">
                <div className="space-y-1">
                  <div className="flex items-center gap-2">
                    <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-lg text-xs font-black uppercase bg-neutral-950 text-white tracking-wide">
                      {ses.tableName || "Phiên Bàn"}
                    </span>
                    <span className="text-[10px] font-mono text-neutral-400 bg-neutral-100 px-2 py-0.5 rounded border border-neutral-200">
                      ID: {ses.id.slice(0, 8)}
                    </span>
                  </div>
                  <p className="text-xs text-neutral-500 font-medium flex items-center gap-1">
                    <User className="w-3.5 h-3.5 text-neutral-400" />
                    Host:{" "}
                    <strong className="text-neutral-800">
                      {ses.hostName || "Chưa xác định"}
                    </strong>
                  </p>
                </div>

                {/* THỜI GIAN ĐÃ CHƠI & DỰ KIẾN CÒN LẠI */}
                <div className="text-right space-y-0.5 shrink-0 bg-amber-50/80 border border-amber-200/80 p-2.5 rounded-xl">
                  <div className="flex items-center justify-end gap-1 text-xs font-extrabold text-amber-900 font-mono">
                    <Timer className="w-3.5 h-3.5 text-amber-600" />
                    <span>Đã chơi: {ses.elapsedMinutes} phút</span>
                  </div>
                  <div className="text-[10px] font-bold text-amber-700 font-mono">
                    Còn lại: ~{ses.estimatedRemainingMinutes} phút
                  </div>
                </div>
              </div>

              {/* BODY: THÔNG TIN HỘP GAME DÙNG & THÀNH VIÊN TRONG BÀN */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-3 border-t border-neutral-100 text-xs">
                {/* Hộp Game đang mượn */}
                <div className="bg-neutral-50 p-3 rounded-xl border border-neutral-200/80 space-y-1">
                  <span className="text-[10px] font-bold text-neutral-400 uppercase tracking-wider flex items-center gap-1">
                    <Boxes className="w-3.5 h-3.5 text-neutral-500" /> Game Đang
                    Chơi
                  </span>
                  {activeGame ? (
                    <div>
                      <div className="font-extrabold text-neutral-950 truncate">
                        {activeGame.gameName}
                      </div>
                      <div className="text-[10px] font-mono text-neutral-500 truncate">
                        {activeGame.boxBarcode}
                      </div>
                    </div>
                  ) : (
                    <div className="text-[11px] font-semibold text-neutral-400 italic">
                      Chưa quét hộp game
                    </div>
                  )}
                </div>

                {/* Danh sách người chơi */}
                <div className="bg-neutral-50 p-3 rounded-xl border border-neutral-200/80 space-y-1">
                  <span className="text-[10px] font-bold text-neutral-400 uppercase tracking-wider flex items-center gap-1">
                    <Users className="w-3.5 h-3.5 text-neutral-500" /> Thành
                    Viên Bàn ({playingMembers.length})
                  </span>
                  <div className="flex flex-wrap gap-1 max-h-12 overflow-y-auto">
                    {playingMembers.map((m) => (
                      <span
                        key={m.id}
                        className="inline-block text-[10px] font-semibold bg-white border border-neutral-200 px-1.5 py-0.5 rounded text-neutral-800 truncate max-w-130px"
                      >
                        {m.userName}
                      </span>
                    ))}
                  </div>
                </div>
              </div>

              {/* FOOTER ACTIONS */}
              <div className="pt-3 border-t border-neutral-100 flex items-center justify-between gap-2">
                <span className="text-[10px] text-neutral-400 font-mono flex items-center gap-1">
                  <Flame className="w-3 h-3 text-emerald-500" /> Live billing
                  active
                </span>

                <div className="flex items-center gap-2">
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => onOpenChecklist(activeGame?.id || ses.id)}
                    className="h-8 px-3 border-amber-200 bg-amber-50 text-amber-900 hover:bg-amber-100 text-xs font-bold rounded-lg flex items-center gap-1.5"
                  >
                    <ClipboardCheck className="w-3.5 h-3.5 text-amber-600" />
                    <span>Kiểm kê</span>
                  </Button>

                  <Button
                    type="button"
                    onClick={() => onEndSession(ses.id)}
                    className="h-8 px-3 bg-neutral-950 text-white hover:bg-neutral-800 text-xs font-bold rounded-lg flex items-center gap-1.5 shadow-2xs"
                  >
                    <LogOut className="w-3.5 h-3.5" />
                    <span>Trả Bàn & Kết Thúc</span>
                  </Button>
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
