/* eslint-disable @typescript-eslint/no-explicit-any */
"use client";

import { useEffect, useState } from "react";
import { apiClient } from "@/core/api/client";
import { TournamentPosContainer } from "@/features/cafe-tournament/components/tournament-pos-container";
import {
  CafeNotActivatedPanel,
  shouldBlockTournamentForStatus,
} from "@/features/manager-cafe/components/cafe-not-activated-panel";
import { useCafeMe } from "@/features/manager-cafe/hooks/useCafeMe";
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

  /**
   * Lấy trạng thái kích hoạt quán + blockers từ `GET /api/manager/cafes/me`.
   * Hook TanStack Query tự cache + invalidate; gọi lại sau khi manager
   * kích hoạt xong sẽ tự re-render block này.
   */
  const { data: cafeMe, isLoading: cafeMeLoading } = useCafeMe();

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

  if (!selectedCafeId || cafes.length === 0) {
    return (
      <div className="max-w-xl mx-auto mt-20 p-8 text-center border border-dashed border-rose-200 rounded-3xl bg-rose-50/50 space-y-2">
        <div className="p-3 bg-white text-rose-600 rounded-2xl w-fit mx-auto shadow-2xs border border-rose-100">
          <Store className="w-6 h-6" />
        </div>
        <h3 className="text-sm font-black text-rose-950">
          Không Tìm Thấy Quán Cafe
        </h3>
        <p className="text-xs text-rose-700/80">
          Tài khoản của bạn chưa được gán quyền quản lý chi nhánh nào. Vui lòng
          liên hệ Admin hệ thống.
        </p>
      </div>
    );
  }

  // Quán chưa kích hoạt (hoặc bị hạn chế bởi Boardverse) → block trang,
  // không cho chạy POS. Đợi useCafeMe xong trước khi render block để tránh
  // flash "chưa kích hoạt" trong khi query đang loading.
  if (
    !cafeMeLoading &&
    shouldBlockTournamentForStatus(cafeMe?.operationalStatus)
  ) {
    return (
      <div className="max-w-2xl mx-auto mt-10">
        <CafeNotActivatedPanel
          operationalStatus={cafeMe?.operationalStatus ?? null}
          canActivate={cafeMe?.canActivate ?? false}
          activationBlockers={cafeMe?.activationBlockers ?? []}
        />
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
                value={selectedCafeId}
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

      {/* Main Tournament POS Container */}
      <TournamentPosContainer cafeId={selectedCafeId} />
    </div>
  );
}
