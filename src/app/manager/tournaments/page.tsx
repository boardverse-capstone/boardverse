/* eslint-disable @typescript-eslint/no-explicit-any */
"use client";

import { useEffect, useState } from "react";
import { apiClient } from "@/core/api/client";
import { TournamentPosContainer } from "@/features/cafe-tournament/components/tournament-pos-container";
import { Store, ChevronDown } from "lucide-react";

interface CafeItem {
  id: string;
  name: string;
  address?: string;
}

export default function ManagerTournamentsPage() {
  const [cafes, setCafes] = useState<CafeItem[]>([]);
  const [selectedCafeId, setSelectedCafeId] = useState<string | null>(null);
  const [loading, setLoading] = useState<boolean>(true);

  useEffect(() => {
    const fetchManagerCafes = async () => {
      try {
        setLoading(true);
        // Lấy danh sách các quán Cafe do Manager hiện tại quản lý
        const res: any = await apiClient.get("/api/manager/my-cafes");
        const list: CafeItem[] = res?.data || res || [];
        setCafes(list);

        if (list.length > 0) {
          setSelectedCafeId(list[0].id);
        }
      } catch (err) {
        console.error("Lỗi lấy thông tin quán cafe của manager:", err);
      } finally {
        setLoading(false);
      }
    };

    fetchManagerCafes();
  }, []);

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] space-y-2">
        <div className="w-6 h-6 border-2 border-neutral-900 border-t-transparent rounded-full animate-spin" />
        <span className="text-xs text-neutral-400 font-medium">
          Đang tải dữ liệu giải đấu...
        </span>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Selector chọn chi nhánh (nếu quản lý nhiều hơn 1 quán) */}
      {cafes.length > 1 && (
        <div className="flex items-center justify-end px-2">
          <div className="flex items-center gap-2 bg-white px-3 py-1.5 rounded-xl border border-neutral-200 shadow-2xs">
            <Store className="w-3.5 h-3.5 text-neutral-500" />
            <span className="text-xs font-bold text-neutral-600">
              Chi nhánh:
            </span>
            <div className="relative">
              <select
                value={selectedCafeId ?? ""}
                onChange={(e) => setSelectedCafeId(e.target.value)}
                className="text-xs font-black bg-transparent text-neutral-900 pr-5 outline-none cursor-pointer appearance-none"
              >
                {cafes.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.name}
                  </option>
                ))}
              </select>
              <ChevronDown className="w-3 h-3 text-neutral-400 absolute right-0 top-1 pointer-events-none" />
            </div>
          </div>
        </div>
      )}

      {/* Main Tournament POS Container — chịu trách nhiệm render
          guard "không có quán" + "quán chưa kích hoạt" nội bộ. */}
      <TournamentPosContainer cafeId={selectedCafeId} />
    </div>
  );
}
