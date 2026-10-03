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

export default function StaffTournamentsPage() {
  const [cafes, setCafes] = useState<CafeItem[]>([]);
  const [selectedCafeId, setSelectedCafeId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchStaffCafes = async () => {
      try {
        setLoading(true);
        const res: any = await apiClient.get("/api/staff/my-cafes");
        const list: CafeItem[] = (res?.data || res || []).map((c: any) => ({
          id: String(c.id ?? c.Id ?? c.cafeId ?? ""),
          name: String(c.name ?? c.Name ?? "Quán"),
          address: c.address ?? c.Address,
        })).filter((c: CafeItem) => c.id);
        setCafes(list);
        if (list.length > 0) setSelectedCafeId(list[0].id);
      } catch (err) {
        console.error("Lỗi lấy quán của staff:", err);
      } finally {
        setLoading(false);
      }
    };

    void fetchStaffCafes();
  }, []);

  if (loading) {
    return (
      <div className="flex min-h-[60vh] flex-col items-center justify-center space-y-2">
        <div className="h-6 w-6 animate-spin rounded-full border-2 border-neutral-900 border-t-transparent" />
        <span className="text-xs font-medium text-neutral-400">
          Đang tải dữ liệu giải đấu...
        </span>
      </div>
    );
  }

  if (!selectedCafeId || cafes.length === 0) {
    return (
      <div className="mx-auto mt-20 max-w-xl space-y-2 rounded-3xl border border-dashed border-rose-200 bg-rose-50/50 p-8 text-center">
        <div className="mx-auto w-fit rounded-2xl border border-rose-100 bg-white p-3 text-rose-600 shadow-2xs">
          <Store className="h-6 w-6" />
        </div>
        <h3 className="text-sm font-black text-rose-950">
          Không tìm thấy quán cafe
        </h3>
        <p className="text-xs text-rose-700/80">
          Tài khoản staff chưa được gán quán. Liên hệ manager/admin.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {cafes.length > 1 ? (
        <div className="flex items-center justify-end px-2">
          <div className="flex items-center gap-2 rounded-xl border border-neutral-200 bg-white px-3 py-1.5 shadow-2xs">
            <Store className="h-3.5 w-3.5 text-neutral-500" />
            <span className="text-xs font-bold text-neutral-600">Chi nhánh:</span>
            <div className="relative">
              <select
                value={selectedCafeId}
                onChange={(e) => setSelectedCafeId(e.target.value)}
                className="cursor-pointer appearance-none bg-transparent pr-5 text-xs font-black text-neutral-900 outline-none"
              >
                {cafes.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.name}
                  </option>
                ))}
              </select>
              <ChevronDown className="pointer-events-none absolute top-1 right-0 h-3 w-3 text-neutral-400" />
            </div>
          </div>
        </div>
      ) : null}

      <TournamentPosContainer cafeId={selectedCafeId} />
    </div>
  );
}
