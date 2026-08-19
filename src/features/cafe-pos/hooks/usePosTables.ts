/* eslint-disable @typescript-eslint/no-explicit-any */
"use client";

import { useState, useEffect, useCallback } from "react";
import { apiClient } from "@/core/api/client";

export interface PosTable {
  id: string;
  name: string;
  sortOrder: number;
  status: "Available" | "Occupied" | "Reserved" | "Maintenance";
}

export function usePosTables(cafeId: string | null) {
  const [tables, setTables] = useState<PosTable[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  // 1. Hàm fetch dùng cho thủ công (nút bấm refresh)
  const fetchTables = useCallback(async () => {
    if (!cafeId) return;
    setLoading(true);
    setError(null);
    try {
      const response: any = await apiClient.get(`/api/cafes/${cafeId}/pos/tables`);
      const data: PosTable[] = response?.data || response || [];
      setTables(data.sort((a, b) => a.sortOrder - b.sortOrder));
    } catch (err: any) {
      console.error("Lỗi lấy danh sách bàn POS:", err);
      setError(err?.message || "Không thể tải sơ đồ bàn");
      setTables([]);
    } finally {
      setLoading(false);
    }
  }, [cafeId]);

  // 2. useEffect tuân thủ quy tắc React Compiler (dùng cleanup flag để tránh setState trong Effect)
  useEffect(() => {
    let isCancelled = false;

    const loadTablesData = async () => {
      if (!cafeId) return;
      setLoading(true);
      setError(null);
      
      try {
        const response: any = await apiClient.get(`/api/cafes/${cafeId}/pos/tables`);
        const data: PosTable[] = response?.data || response || [];
        
        if (!isCancelled) {
          setTables(data.sort((a, b) => a.sortOrder - b.sortOrder));
        }
      } catch (err: any) {
        console.error("Lỗi lấy danh sách bàn POS:", err);
        if (!isCancelled) {
          setError(err?.message || "Không thể tải sơ đồ bàn");
          setTables([]);
        }
      } finally {
        if (!isCancelled) {
          setLoading(false);
        }
      }
    };

    loadTablesData();

    // Hủy bỏ state update nếu component unmount trong lúc request đang xử lý
    return () => {
      isCancelled = true;
    };
  }, [cafeId]);

  return {
    tables,
    loading,
    error,
    refreshTables: fetchTables,
  };
}