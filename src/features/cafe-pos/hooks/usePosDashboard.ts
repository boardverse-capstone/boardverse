/* eslint-disable @typescript-eslint/no-explicit-any */
"use client";

import { useState, useEffect, useCallback } from "react";
import { apiClient } from "@/core/api/client";

export function usePosDashboard() {
  const [cafeId, setCafeId] = useState<string | null>(null);
  const [tables, setTables] = useState<any[]>([]);
  const [sessions, setSessions] = useState<any[]>([]);
  const [boxes, setBoxes] = useState<any[]>([]);
  const [loading, setLoading] = useState<boolean>(true);

  // States hỗ trợ Modals
  const [scannedBarcode, setScannedBarcode] = useState("");
  const [scannedBox, setScannedBox] = useState<any | null>(null);
  const [bookingCode, setBookingCode] = useState("");
  const [activeChecklistSession, setActiveChecklistSession] = useState<any | null>(null);
  const [checklist, setChecklist] = useState<any[]>([]);

  // Tải danh sách tổng quát
  const fetchAllData = useCallback(async (currentCafeId: string) => {
    setLoading(true);
    try {
      const [tblRes, sesRes, boxRes]: any = await Promise.all([
        apiClient.get(`/api/cafes/${currentCafeId}/pos/tables`),
        apiClient.get(`/api/cafes/${currentCafeId}/pos/sessions/active`),
        apiClient.get(`/api/cafes/${currentCafeId}/pos/boxes`),
      ]);
      setTables((tblRes?.data || tblRes || []).sort((a: any, b: any) => a.sortOrder - b.sortOrder));
      setSessions(sesRes?.data || sesRes || []);
      setBoxes(boxRes?.data || boxRes || []);
    } catch (err) {
      console.error("Lỗi tải POS Dashboard:", err);
    } finally {
      setLoading(false);
    }
  }, []);

  // Effect lấy CafeID & Fetch data chuẩn React 19 (dùng Cleanup flag)
  useEffect(() => {
    let isCancelled = false;
    const init = async () => {
      try {
        const res: any = await apiClient.get("/api/manager/my-cafes");
        const list = res?.data || res || [];
        if (list.length > 0) {
          const cid = list[0].id;
          if (!isCancelled) setCafeId(cid);

          const [tblRes, sesRes, boxRes]: any = await Promise.all([
            apiClient.get(`/api/cafes/${cid}/pos/tables`),
            apiClient.get(`/api/cafes/${cid}/pos/sessions/active`),
            apiClient.get(`/api/cafes/${cid}/pos/boxes`),
          ]);

          if (!isCancelled) {
            setTables((tblRes?.data || tblRes || []).sort((a: any, b: any) => a.sortOrder - b.sortOrder));
            setSessions(sesRes?.data || sesRes || []);
            setBoxes(boxRes?.data || boxRes || []);
            setLoading(false);
          }
        }
      } catch (err) {
        console.error(err);
        if (!isCancelled) setLoading(false);
      }
    };
    init();
    return () => { isCancelled = true; };
  }, []);

  // Tra cứu hộp theo Barcode
  const handleScanBarcode = async () => {
    if (!cafeId || !scannedBarcode.trim()) return;
    try {
      const res: any = await apiClient.get(`/api/cafes/${cafeId}/pos/boxes/by-barcode/${scannedBarcode.trim()}`);
      setScannedBox(res?.data || res);
    } catch (err: any) {
      alert(err?.message || "Không tìm thấy hộp game theo mã Barcode này.");
      setScannedBox(null);
    }
  };

  // Check-in Booking MDC
  const handleBookingCheckIn = async () => {
    if (!cafeId || !bookingCode.trim()) return;
    try {
      await apiClient.post(`/api/cafes/${cafeId}/pos/sessions/from-booking`, { bookingCode: bookingCode.trim() });
      alert("Check-in nhóm theo Booking thành công!");
      setBookingCode("");
      if (cafeId) fetchAllData(cafeId);
    } catch (err: any) {
      alert(err?.message || "Check-in Booking thất bại.");
    }
  };

 // Trả về boolean để Modal đóng gạt tự động khi thành công
const handleEndSession = async (sessionId: string) => {
  if (!cafeId) return false;
  try {
    await apiClient.post(`/api/cafes/${cafeId}/pos/sessions/${sessionId}/end`);
    alert("Đã kết thúc phiên chơi và giải phóng bàn!");
    await fetchAllData(cafeId); // Tải lại sơ đồ bàn & active sessions
    return true;
  } catch (err: any) {
    alert(err?.message || "Trả bàn thất bại.");
    return false;
  }
};

  // Mở checklist kiểm kê linh kiện
  const handleOpenChecklist = async (sessionGameId: string) => {
    if (!cafeId) return;
    try {
      const res: any = await apiClient.get(`/api/cafes/${cafeId}/pos/sessions/${sessionGameId}/component-checklist`);
      setChecklist(res?.data || res || []);
      setActiveChecklistSession(sessionGameId);
    } catch (err: any) {
      alert(err?.message || "Lỗi tải bảng kiểm kê linh kiện.");
    }
  };

  // Xác nhận kiểm kê linh kiện
  const handleSubmitChecklist = async () => {
    if (!cafeId || !activeChecklistSession) return;
    try {
      await apiClient.post(`/api/cafes/${cafeId}/pos/sessions/component-check`, {
        sessionGameId: activeChecklistSession,
        items: checklist,
      });
      alert("Kiểm kê hoàn tất! Mở khóa in hóa đơn.");
      setActiveChecklistSession(null);
      fetchAllData(cafeId);
    } catch (err: any) {
      alert(err?.message || "Lỗi xác nhận kiểm kê.");
    }
  };

  // Đồng bộ sơ đồ bàn
const handleSyncTables = async (tableNames: string[]) => {
  if (!cafeId) return;
  try {
    const res: any = await apiClient.put(`/api/cafes/${cafeId}/pos/tables`, {
      tableNames,
    });
    alert("Đồng bộ sơ đồ bàn thành công!");
    const updatedTables = res?.data || res || [];
    setTables(updatedTables.sort((a: any, b: any) => a.sortOrder - b.sortOrder));
    return true;
  } catch (err: any) {
    alert(err?.message || "Đồng bộ sơ đồ bàn thất bại.");
    return false;
  }
};

// Hàm bắt đầu phiên chơi mới 
const handleStartSession = async (cafeTableId: string, barcode: string) => {
  if (!cafeId) return false;
  try {
    await apiClient.post(`/api/cafes/${cafeId}/pos/sessions`, {
      cafeTableId,
      barcode,
    });
    alert("Bắt đầu phiên chơi thành công!");
    await fetchAllData(cafeId); // Tải lại sơ đồ bàn và danh sách session
    return true;
  } catch (err: any) {
    alert(err?.message || "Không thể khởi tạo phiên chơi.");
    return false;
  }
};

  return {
    cafeId,
    tables,
    sessions,
    boxes,
    loading,
    scannedBarcode,
    setScannedBarcode,
    scannedBox,
    setScannedBox,
    bookingCode,
    setBookingCode,
    activeChecklistSession,
    setActiveChecklistSession,
    checklist,
    setChecklist,
    refreshData: () => cafeId && fetchAllData(cafeId),
    handleScanBarcode,
    handleBookingCheckIn,
    handleEndSession,
    handleOpenChecklist,
    handleSubmitChecklist,
    handleSyncTables,
    handleStartSession,
  };
}