/* eslint-disable @typescript-eslint/no-explicit-any */
"use client";

import { useEffect, useState } from "react";
import { apiClient } from "@/core/api/client";
import { TournamentPosContainer } from "@/features/cafe-tournament/components/tournament-pos-container";

export default function ManagerTournamentsPage() {
  const [cafeId, setCafeId] = useState<string | null>(null);
  const [loading, setLoading] = useState<boolean>(true);

  useEffect(() => {
    const fetchManagerCafe = async () => {
      try {
        setLoading(true);
        // Lấy danh sách quán Cafe do Manager hiện tại quản lý
        const res: any = await apiClient.get("/api/manager/my-cafes");
        const list = res?.data || res || [];
        if (list.length > 0) {
          setCafeId(list[0].id);
        }
      } catch (err) {
        console.error("Lỗi lấy thông tin quán cafe của manager:", err);
      } finally {
        setLoading(false);
      }
    };

    fetchManagerCafe();
  }, []);

  if (loading) {
    return (
      <div className="p-8 text-center text-xs text-neutral-400 font-medium">
        Đang tải thông tin quán...
      </div>
    );
  }

  if (!cafeId) {
    return (
      <div className="p-8 text-center text-xs text-rose-500 font-bold border border-dashed rounded-2xl bg-white m-6">
        Không tìm thấy quán Cafe nào thuộc quyền quản lý của bạn.
      </div>
    );
  }

  return (
    <div className="p-6 max-w-7xl mx-auto space-y-6">
      <TournamentPosContainer cafeId={cafeId} />
    </div>
  );
}
