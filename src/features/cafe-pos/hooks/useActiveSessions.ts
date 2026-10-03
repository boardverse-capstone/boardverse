/* eslint-disable @typescript-eslint/no-explicit-any */
"use client";

import { useState, useEffect, useCallback } from "react";
import { apiClient } from "@/core/api/client";

export function useActiveSessions(cafeId: string | null) {
  const [sessions, setSessions] = useState<any[]>([]);
  const [loading, setLoading] = useState<boolean>(true);

  // 1. Hàm refresh thủ công dùng cho nút bấm hoặc trigger ngoài Effect
  const fetchActiveSessions = useCallback(async () => {
    if (!cafeId) return;
    setLoading(true);
    try {
      const response: any = await apiClient.get(`/api/cafes/${cafeId}/pos/sessions/active`);
      const data = response?.data || response || [];
      setSessions(data);
    } catch (err) {
      console.error("Lỗi lấy danh sách phiên hoạt động:", err);
      setSessions([]);
    } finally {
      setLoading(false);
    }
  }, [cafeId]);

  // 2. Xử lý useEffect tuân thủ quy tắc chống Cascading Render
  useEffect(() => {
    let isCancelled = false;

    const loadSessions = async () => {
      if (!cafeId) return;
      setLoading(true);
      try {
        const response: any = await apiClient.get(`/api/cafes/${cafeId}/pos/sessions/active`);
        const data = response?.data || response || [];
        if (!isCancelled) {
          setSessions(data);
        }
      } catch (err) {
        console.error("Lỗi lấy danh sách phiên hoạt động:", err);
        if (!isCancelled) {
          setSessions([]);
        }
      } finally {
        if (!isCancelled) {
          setLoading(false);
        }
      }
    };

    loadSessions();

    return () => {
      isCancelled = true;
    };
  }, [cafeId]);

  return { 
    sessions, 
    loading, 
    refreshSessions: fetchActiveSessions 
  };
}