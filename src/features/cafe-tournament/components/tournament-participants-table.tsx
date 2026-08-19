/* eslint-disable @typescript-eslint/no-explicit-any */
"use client";

import { useState } from "react";
import { TournamentParticipant } from "../types/tournament.types";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Users,
  Search,
  CheckCircle2,
  UserX,
  ShieldAlert,
  RefreshCw,
} from "lucide-react";

interface Props {
  participants: TournamentParticipant[];
  loading: boolean;
  onCheckIn: (participantId: string) => Promise<void>;
  onNoShow: (participantId: string) => Promise<void>;
  onKick: (participantId: string, reason: string) => Promise<void>;
  actionLoadingId: string | null;
  onRefresh?: () => void;
}

export function TournamentParticipantsTable({
  participants,
  loading,
  onCheckIn,
  onNoShow,
  onKick,
  actionLoadingId,
  onRefresh,
}: Props) {
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("ALL");

  const filteredList = participants.filter((p) => {
    const name = (p.username || "").toLowerCase();
    const matchSearch = name.includes(search.toLowerCase());

    if (statusFilter === "ALL") return matchSearch;
    if (statusFilter === "CheckedIn") {
      return matchSearch && (p.status === "CheckedIn" || p.status === "Active");
    }
    if (statusFilter === "Withdrawn") {
      return (
        matchSearch &&
        (p.status === "Eliminated" ||
          p.status === "NoShow" ||
          (p.status as string) === "Withdrawn" ||
          (p.status as string) === "Kicked")
      );
    }
    return matchSearch && p.status === statusFilter;
  });

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "Active":
      case "CheckedIn":
        return (
          <span className="px-2.5 py-0.5 rounded-md text-[10px] font-black uppercase bg-emerald-100 text-emerald-800 border border-emerald-300">
            Sẵn sàng
          </span>
        );
      case "Registered":
        return (
          <span className="px-2.5 py-0.5 rounded-md text-[10px] font-black uppercase bg-neutral-100 text-neutral-600 border border-neutral-200">
            Chưa điểm danh
          </span>
        );
      case "NoShow":
        return (
          <span className="px-2.5 py-0.5 rounded-md text-[10px] font-black uppercase bg-amber-100 text-amber-800 border border-amber-300">
            Vắng mặt
          </span>
        );
      case "Eliminated":
      case "Withdrawn":
      case "Kicked":
        return (
          <span className="px-2.5 py-0.5 rounded-md text-[10px] font-black uppercase bg-rose-100 text-rose-800 border border-rose-300">
            Đã loại / Rời giải
          </span>
        );
      default:
        return (
          <span className="px-2.5 py-0.5 rounded-md text-[10px] font-black uppercase bg-neutral-100 text-neutral-700">
            {status}
          </span>
        );
    }
  };

  return (
    <div className="bg-white rounded-3xl border border-neutral-200/90 shadow-2xs overflow-hidden flex flex-col">
      {/* Header */}
      <div className="p-4 border-b border-neutral-200 space-y-3">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <Users className="w-5 h-5 text-neutral-800" />
            <h3 className="font-black text-sm text-neutral-950">
              Quản Lý Tuyển Thủ Tham Gia ({participants.length} VĐV)
            </h3>
          </div>

          {onRefresh && (
            <Button
              size="sm"
              variant="outline"
              onClick={onRefresh}
              disabled={loading}
              className="h-8 px-3 text-xs font-bold rounded-xl border-neutral-300 flex items-center gap-1.5 hover:bg-neutral-50 shadow-2xs"
            >
              <RefreshCw
                className={`w-3.5 h-3.5 ${loading ? "animate-spin text-neutral-900" : "text-neutral-500"}`}
              />
              <span>Làm mới danh sách</span>
            </Button>
          )}
        </div>

        {/* Search & Tabs */}
        <div className="flex flex-wrap items-center justify-between gap-2.5 pt-1">
          <div className="flex items-center gap-1.5 flex-wrap">
            {[
              { id: "ALL", label: `Tất cả (${participants.length})` },
              {
                id: "CheckedIn",
                label: `Đã đến (${
                  participants.filter(
                    (p) => p.status === "CheckedIn" || p.status === "Active",
                  ).length
                })`,
              },
              {
                id: "Registered",
                label: `Chưa đến (${
                  participants.filter((p) => p.status === "Registered").length
                })`,
              },
              {
                id: "NoShow",
                label: `Vắng (${
                  participants.filter((p) => p.status === "NoShow").length
                })`,
              },
              {
                id: "Withdrawn",
                label: `Đã rời (${
                  participants.filter(
                    (p) =>
                      p.status === "Eliminated" ||
                      (p.status as string) === "Withdrawn" ||
                      (p.status as string) === "Kicked",
                  ).length
                })`,
              },
            ].map((tab) => (
              <button
                key={tab.id}
                onClick={() => setStatusFilter(tab.id)}
                className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all ${
                  statusFilter === tab.id
                    ? "bg-neutral-950 text-white shadow-2xs"
                    : "bg-neutral-100 text-neutral-600 hover:bg-neutral-200"
                }`}
              >
                {tab.label}
              </button>
            ))}
          </div>

          <div className="relative w-full sm:w-64">
            <Search className="w-3.5 h-3.5 absolute left-3 top-3 text-neutral-400" />
            <Input
              type="text"
              placeholder="Tìm theo tên tuyển thủ..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="h-9 pl-8 text-xs bg-neutral-50 rounded-xl"
            />
          </div>
        </div>
      </div>

      {/* Danh sách dữ liệu */}
      <div className="overflow-x-auto">
        <table className="w-full text-left text-xs">
          <thead className="bg-neutral-50/80 text-neutral-500 font-bold border-b border-neutral-200">
            <tr>
              <th className="py-3 px-4">Tuyển Thủ</th>
              <th className="py-3 px-4">Chỉ Số Elo</th>
              <th className="py-3 px-4">Điểm Swiss</th>
              <th className="py-3 px-4">Trạng Thái</th>
              <th className="py-3 px-4 text-right">Thao Tác Quản Trị</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-neutral-100 text-neutral-800">
            {loading ? (
              <tr>
                <td
                  colSpan={5}
                  className="py-12 text-center text-neutral-400 font-medium"
                >
                  Đang nạp danh sách tuyển thủ...
                </td>
              </tr>
            ) : filteredList.length === 0 ? (
              <tr>
                <td
                  colSpan={5}
                  className="py-12 text-center text-neutral-400 font-medium"
                >
                  Không tìm thấy tuyển thủ nào phù hợp.
                </td>
              </tr>
            ) : (
              filteredList.map((p) => {
                const displayName = p.username || "VĐV";
                const isReady =
                  p.status === "CheckedIn" || p.status === "Active";
                const isOut =
                  p.status === "Eliminated" ||
                  (p.status as string) === "Withdrawn" ||
                  (p.status as string) === "Kicked";
                const isActionLoading = actionLoadingId === p.id;

                return (
                  <tr
                    key={p.id}
                    className={`hover:bg-neutral-50/60 transition-colors ${
                      isOut ? "bg-neutral-100/50 opacity-60" : ""
                    }`}
                  >
                    {/* Tuyển thủ info */}
                    <td className="py-3.5 px-4">
                      <div className="flex items-center gap-2.5">
                        <div className="w-7 h-7 rounded-full bg-neutral-900 text-white flex items-center justify-center font-black text-xs shrink-0">
                          {displayName.charAt(0).toUpperCase()}
                        </div>
                        <div>
                          <div className="font-extrabold text-neutral-950 text-xs">
                            {displayName}
                          </div>
                          <div className="text-[10px] font-mono text-neutral-400">
                            #
                            {p.userId ? p.userId.slice(0, 6) : p.id.slice(0, 6)}
                          </div>
                        </div>
                      </div>
                    </td>

                    {/* Elo */}
                    <td className="py-3.5 px-4 font-mono font-bold text-neutral-700">
                      {p.currentElo || p.initialElo || 1200}
                    </td>

                    {/* Điểm Swiss */}
                    <td className="py-3.5 px-4 font-mono font-black text-emerald-700">
                      {p.swissScore ?? 0}đ
                    </td>

                    {/* Trạng thái */}
                    <td className="py-3.5 px-4">{getStatusBadge(p.status)}</td>

                    {/* Thao tác quản trị */}
                    <td className="py-3.5 px-4 text-right">
                      <div className="flex items-center justify-end gap-1.5">
                        {p.status === "Registered" && (
                          <>
                            <Button
                              size="sm"
                              disabled={isActionLoading}
                              onClick={() => onCheckIn(p.id)}
                              className="h-7 px-3 bg-neutral-950 hover:bg-neutral-800 text-white text-[11px] font-bold rounded-lg"
                            >
                              Check-in
                            </Button>

                            <Button
                              size="sm"
                              variant="outline"
                              disabled={isActionLoading}
                              onClick={() => onNoShow(p.id)}
                              className="h-7 px-2.5 border-amber-200 text-amber-800 hover:bg-amber-50 text-[11px] font-bold rounded-lg flex items-center gap-1"
                              title="Đánh dấu vắng mặt"
                            >
                              <UserX className="w-3 h-3" /> Vắng Mặt
                            </Button>

                            <Button
                              size="sm"
                              variant="outline"
                              disabled={isActionLoading}
                              onClick={() => {
                                const reason = prompt(
                                  `Nhập lý do xóa VĐV ${displayName}:`,
                                );
                                if (reason?.trim()) {
                                  void onKick(p.id, reason.trim());
                                }
                              }}
                              className="h-7 px-2.5 border-rose-200 text-rose-700 hover:bg-rose-50 text-[11px] font-bold rounded-lg flex items-center gap-1"
                              title="Xóa khỏi danh sách đăng ký"
                            >
                              <ShieldAlert className="w-3 h-3" /> Xóa
                            </Button>
                          </>
                        )}

                        {isReady && (
                          <span className="text-emerald-700 font-extrabold text-xs flex items-center gap-1 bg-emerald-50 px-2.5 py-1 rounded-lg border border-emerald-200">
                            <CheckCircle2 className="w-3.5 h-3.5" /> Đã Check-in
                            (Sẵn sàng)
                          </span>
                        )}

                        {isOut && (
                          <span className="text-[10px] font-bold text-neutral-400 italic">
                            Đã loại trừ khỏi giải
                          </span>
                        )}
                      </div>
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
