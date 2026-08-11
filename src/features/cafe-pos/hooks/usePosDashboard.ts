/* eslint-disable @typescript-eslint/no-explicit-any */
"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import { apiClient } from "@/core/api/client";

export function usePosDashboard() {
  const [cafeId, setCafeId] = useState<string | null>(null);
  const [tables, setTables] = useState<any[]>([]);
  const [sessions, setSessions] = useState<any[]>([]);
  const [boxes, setBoxes] = useState<any[]>([]);
  const [loading, setLoading] = useState<boolean>(true);

  // Cờ chặn duplicate call API trong môi trường Dev (StrictMode)
  const isInitialFetched = useRef(false);

  // States hỗ trợ Workflow POS
  const [scannedBarcode, setScannedBarcode] = useState("");
  const [scannedBox, setScannedBox] = useState<any | null>(null);
  const [bookingCode, setBookingCode] = useState("");
  const [bookingPreview, setBookingPreview] = useState<any | null>(null);

  // States Checklist & Checkout Modal
  const [checklistData, setChecklistData] = useState<any | null>(null);
  const [checkoutSession, setCheckoutSession] = useState<any | null>(null);

  // 1. Tải tất cả dữ liệu nền (Tables, Active Sessions, Boxes)
  const fetchAllData = useCallback(async (cId?: string) => {
    const currentCafeId = cId || cafeId;
    if (!currentCafeId) return;

    try {
      setLoading(true);

      // GET /api/cafes/{cafeId}/pos/sessions/active (Chuẩn Endpoint Active Sessions)
      const [sessionsRes, tablesRes, boxesRes]: any = await Promise.all([
        apiClient.get(`/api/cafes/${currentCafeId}/pos/sessions/active`),
        apiClient.get(`/api/cafes/${currentCafeId}/pos/tables`),
        apiClient.get(`/api/cafes/${currentCafeId}/pos/boxes`),
      ]);

      const rawSessions = sessionsRes?.data || sessionsRes || [];

      // Lọc bỏ các phiên đã hoàn tất thanh toán (Paid / Completed)
      const activeSessionsOnly = rawSessions.filter(
        (s: any) => s.status !== "Paid" && s.status !== "Completed"
      );

      setSessions(activeSessionsOnly);

      // Sắp xếp danh sách bàn theo sortOrder
      const rawTables = tablesRes?.data || tablesRes || [];
      setTables(rawTables.sort((a: any, b: any) => a.sortOrder - b.sortOrder));

      // Cập nhật danh sách kho hộp game vật lý
      setBoxes(boxesRes?.data || boxesRes || []);
    } catch (err: any) {
      console.error("Lỗi cập nhật POS Dashboard:", err);
    } finally {
      setLoading(false);
    }
  }, [cafeId]);

  // Khởi tạo ban đầu: Lấy cafeId quản lý và tải dữ liệu 1 lần duy nhất
  useEffect(() => {
    if (isInitialFetched.current) return;

    const init = async () => {
      try {
        const res: any = await apiClient.get("/api/manager/my-cafes");
        const list = res?.data || res || [];
        if (list.length > 0) {
          const cid = list[0].id;
          setCafeId(cid);
          isInitialFetched.current = true;
          await fetchAllData(cid);
        } else {
          setLoading(false);
        }
      } catch (err) {
        console.error("Lỗi lấy danh sách quán cafe:", err);
        setLoading(false);
      }
    };

    init();
  }, [fetchAllData]);

  // BƯỚC 2: Preview Đơn Đặt Chỗ (MDC)
  const handlePreviewBooking = async (code: string) => {
    if (!cafeId || !code.trim()) return;
    try {
      const res: any = await apiClient.get(
        `/api/cafes/${cafeId}/pos/bookings/${code.trim()}`
      );
      setBookingPreview(res?.data || res);
    } catch (err: any) {
      alert(err?.message || "Không tìm thấy thông tin Đơn đặt chỗ.");
      setBookingPreview(null);
    }
  };

  // BƯỚC 3a: Check-in Đơn Đặt Chỗ (MDC) -> ACTIVE
  const handleBookingCheckIn = async () => {
    if (!cafeId || !bookingCode.trim()) {
      alert("Vui lòng nhập Booking Code!");
      return false;
    }
    try {
      await apiClient.post(`/api/cafes/${cafeId}/pos/check-in`, {
        bookingCode: bookingCode.trim(),
      });
      alert("Check-in MDC thành công!");
      setBookingCode("");
      setBookingPreview(null);
      await fetchAllData(cafeId);
      return true;
    } catch (err: any) {
      alert(err?.message || "Check-in MDC thất bại.");
      return false;
    }
  };

  // BƯỚC 3b: Bắt đầu phiên chơi mới (POST /api/cafes/{cafeId}/pos/sessions)
  const handleStartSession = async (cafeTableId: string, barcode: string) => {
    if (!cafeId) return false;
    try {
      const res: any = await apiClient.post(
        `/api/cafes/${cafeId}/pos/sessions`,
        {
          cafeTableId,
          barcode,
        }
      );
      const newSession = res?.data || res;
      alert(`Bắt đầu phiên chơi thành công cho ${newSession?.tableName || "Bàn"}!`);
      await fetchAllData(cafeId);
      return true;
    } catch (err: any) {
      alert(err?.message || "Không thể khởi tạo phiên chơi.");
      return false;
    }
  };

  // BƯỚC 6: Kết thúc phiên / Trả bàn (POST /sessions/{id}/end)
  const handleEndSession = async (sessionId: string) => {
    if (!cafeId) return false;
    try {
      const res: any = await apiClient.post(
        `/api/cafes/${cafeId}/pos/sessions/${sessionId}/end`
      );
      alert("Khách đã trả game! Phiên chuyển sang trạng thái CHECKING (Chờ kiểm kê).");
      await fetchAllData(cafeId);
      return res?.data || res;
    } catch (err: any) {
      alert(err?.message || "Không thể kết thúc phiên chơi.");
      return false;
    }
  };

  // BƯỚC 7: GET /component-checklist (Lấy danh sách linh kiện kiểm kê)
  const handleFetchChecklist = async (sessionGameId: string) => {
    if (!cafeId) return null;
    try {
      const res: any = await apiClient.get(
        `/api/cafes/${cafeId}/pos/sessions/${sessionGameId}/component-checklist`
      );
      const data = res?.data || res;
      setChecklistData(data);
      return data;
    } catch (err: any) {
      alert(err?.message || "Lỗi lấy bảng kiểm kê linh kiện.");
      return null;
    }
  };

  // BƯỚC 8: Trả game (Chuyển status phiên chơi sang Checking - BR-12)
  const handleReturnGame = async (sessionId: string) => {
    if (!cafeId) return false;
    try {
      await apiClient.post(
        `/api/cafes/${cafeId}/pos/sessions/${sessionId}/return-game`,
        {}
      );
      await fetchAllData(cafeId);
      return true;
    } catch (err: any) {
      console.log("Return game status:", err?.message);
      return true;
    }
  };

  // BƯỚC 9: POST /component-check (Chốt kết quả kiểm kê linh kiện)
  const handleComponentCheck = async (payload: {
    sessionGameId: string;
    markAllValid: boolean;
    results: any[];
  }) => {
    if (!cafeId) return null;
    try {
      const res: any = await apiClient.post(
        `/api/cafes/${cafeId}/pos/sessions/component-check`,
        payload
      );
      const data = res?.data || res;
      setChecklistData(null);
      await fetchAllData(cafeId);
      return data;
    } catch (err: any) {
      alert(err?.message || "Xác nhận kiểm kê thất bại.");
      return null;
    }
  };

  // BƯỚC 10: POST /checkout (Chuyển trạng thái phiên chơi sang UNPAID)
  const handleCheckoutSession = async (sessionId: string) => {
    if (!cafeId) return false;
    try {
      const payload = {
        components: [],
        componentsVerified: true,
      };

      const res: any = await apiClient.post(
        `/api/cafes/${cafeId}/pos/sessions/${sessionId}/checkout`,
        payload
      );

      let checkoutData = res?.data || res;

      // Đồng bộ thêm chi tiết billing nếu dữ liệu trả về chưa đủ subtotal/totalAmount
      if (
        checkoutData &&
        (checkoutData.subtotal === undefined || checkoutData.totalAmount === undefined)
      ) {
        const detailRes = await handleGetSessionDetail(sessionId);
        if (detailRes) {
          checkoutData = { ...detailRes, ...checkoutData };
        }
      }

      setCheckoutSession(checkoutData);
      await fetchAllData(cafeId);
      return true;
    } catch (err: any) {
      alert(err?.message || "Lỗi khi gọi API Checkout phiên chơi.");
      return false;
    }
  };

  // BƯỚC 11: POST /pay (Thanh toán tổng hóa đơn - PAID & Giải phóng bàn)
  const handlePaySession = async (
    sessionId: string,
    payloadData?: {
      penaltyItems?: Array<{
        componentId: string;
        componentName: string;
        penaltyAmount: number;
        responsibleMemberId?: string | null;
      }>;
      notes?: string;
    }
  ) => {
    if (!cafeId) return false;
    try {
      const payload = {
        penaltyItems: payloadData?.penaltyItems || [],
        notes: payloadData?.notes || "Thanh toán thành công tại quầy POS",
      };

      const res: any = await apiClient.post(
        `/api/cafes/${cafeId}/pos/sessions/${sessionId}/pay`,
        payload
      );

      alert("Thanh toán thành công! Bàn chơi đã được giải phóng.");

      // 1. Đóng Modal ngay lập tức
      setCheckoutSession(null);

      // 2. Xóa thủ công phiên này khỏi local state trước để UI cập nhật tức thì
      setSessions((prevSessions) =>
        prevSessions.filter((s) => s.id !== sessionId)
      );

      // 3. Tải lại toàn bộ dữ liệu bàn & kho từ Server
      await fetchAllData(cafeId);

      return res?.data || res;
    } catch (err: any) {
      alert(err?.message || "Không thể thanh toán phiên chơi này.");
      return false;
    }
  };

  // Cập nhật thông tin từng bàn (PATCH)
  const handleUpdateTable = async (
    tableId: string,
    payload: { name?: string; seatCount?: number; sortOrder?: number }
  ) => {
    if (!cafeId) return false;
    try {
      const res: any = await apiClient.patch(
        `/api/cafes/${cafeId}/pos/tables/${tableId}`,
        payload
      );
      setTables((prev) =>
        prev
          ? prev
              .map((t) => (t.id === tableId ? { ...t, ...res?.data } : t))
              .sort((a, b) => a.sortOrder - b.sortOrder)
          : []
      );
      return true;
    } catch (err: any) {
      alert(err?.message || "Cập nhật thông tin bàn thất bại.");
      return false;
    }
  };

  // Cấu hình sơ đồ bàn (PUT /tables)
  const handleSyncTables = async (
    tablesData: Array<{ name: string; seatCount: number; sortOrder: number }>
  ) => {
    if (!cafeId) return false;
    try {
      const res: any = await apiClient.put(`/api/cafes/${cafeId}/pos/tables`, {
        tables: tablesData,
      });
      alert("Đồng bộ sơ đồ bàn thành công!");
      setTables(
        (res?.data || res || []).sort((a: any, b: any) => a.sortOrder - b.sortOrder)
      );
      return true;
    } catch (err: any) {
      alert(err?.message || "Lỗi đồng bộ sơ đồ bàn.");
      return false;
    }
  };

// Quét Barcode Hộp Game & Tự động nạp lịch sử linh kiện bị mất nếu có
const handleScanBarcode = async () => {
  if (!cafeId || !scannedBarcode.trim()) return;
  try {
    const res: any = await apiClient.get(
      `/api/cafes/${cafeId}/pos/boxes/by-barcode/${scannedBarcode.trim()}`
    );
    const boxData = res?.data || res;

    if (boxData?.id) {
      // Tự động kiểm tra xem hộp game có linh kiện bị mất/hỏng ở các phiên trước không
      try {
        const historyRes: any = await apiClient.get(
          `/api/cafes/${cafeId}/pos/boxes/${boxData.id}/component-history`
        );
        const historyData = historyRes?.data || historyRes;

        // Bóc tách toàn bộ linh kiện bị mất từ các sự cố trước đó
        const allMissingComponents =
          historyData?.incidents?.flatMap(
            (incident: any) => incident.missingComponents || []
          ) || [];

        boxData.missingComponents = allMissingComponents;
        boxData.totalIncidents = historyData?.totalIncidents || 0;
      } catch (err) {
        console.warn("Không thể tải lịch sử kiểm kê linh kiện:", err);
        boxData.missingComponents = [];
      }
    }

    setScannedBox(boxData);
  } catch (err: any) {
    alert(err?.message || "Không tìm thấy hộp game với Barcode này.");
    setScannedBox(null);
  }
};

  // Lấy chi tiết 1 phiên chơi (GET /sessions/{id})
  const handleGetSessionDetail = useCallback(
    async (sessionId: string) => {
      if (!cafeId) return null;
      try {
        const res: any = await apiClient.get(
          `/api/cafes/${cafeId}/pos/sessions/${sessionId}`
        );
        return res?.data || res;
      } catch (err: any) {
        console.error("Lỗi lấy chi tiết phiên chơi:", err);
        return null;
      }
    },
    [cafeId]
  );

  // Lấy lịch sử hộp game 
const handleFetchBoxHistory = useCallback(
  async (boxId: string) => {
    if (!cafeId || !boxId) return null;
    try {
      const res: any = await apiClient.get(
        `/api/cafes/${cafeId}/pos/boxes/${boxId}/component-history`
      );
      return res?.data || res;
    } catch (err: any) {
      console.error("Lỗi lấy lịch sử kiểm kê hộp game:", err);
      alert(err?.message || "Không thể lấy lịch sử kiểm kê của hộp game này.");
      return null;
    }
  },
  [cafeId]
);



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
    bookingPreview,
    checklistData,
    setChecklistData,
    checkoutSession,
    setCheckoutSession,
    refreshData: () => cafeId && fetchAllData(cafeId),
    handleScanBarcode,
    handlePreviewBooking,
    handleBookingCheckIn,
    handleStartSession,
    handleEndSession,
    handleGetSessionDetail,
    handleFetchChecklist,
    handleOpenChecklist: handleFetchChecklist,
    handleReturnGame,
    handleComponentCheck,
    handleCheckoutSession,
    handlePaySession,
    handleSyncTables,
    handleUpdateTable,
    handleFetchBoxHistory,
  };
}