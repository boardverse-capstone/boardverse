/* eslint-disable @typescript-eslint/no-explicit-any */
"use client";

import { useState, useEffect, useRef } from "react";
import { Button } from "@/components/ui/button";
import {
  X,
  Receipt,
  ArrowRight,
  Clock,
  Boxes,
  AlertCircle,
  CheckCircle2,
  Printer,
  User,
  ShieldCheck,
  Loader2,
} from "lucide-react";

export interface CheckoutConfirmModalProps {
  isOpen: boolean;
  onClose: () => void;
  session: any | null;
  onConfirmCheckout: (sessionId: string) => Promise<any>;
  onFetchHistory?: (boxId: string, sessionId: string) => Promise<any>;
}

export function CheckoutConfirmModal({
  isOpen,
  onClose,
  session,
  onConfirmCheckout,
  onFetchHistory,
}: CheckoutConfirmModalProps) {
  const [loading, setLoading] = useState(false);
  const [loadingHistory, setLoadingHistory] = useState(false);

  // State lưu thông tin lịch sử kiểm kê từ API component-history
  const [historyData, setHistoryData] = useState<any | null>(null);

  // State lưu Response Output nhận được từ API Checkout (POST /checkout)
  const [apiResponse, setApiResponse] = useState<any | null>(null);

  // CỜ CHẶN TỰ ĐỘNG CHẠY DUPLICATE API
  const fetchedSessionIdRef = useRef<string | null>(null);

  // GỌI API COMPONENT-HISTORY DUY NHẤT 1 LẦN KHI MODAL MỞ
  useEffect(() => {
    if (isOpen && session?.id && fetchedSessionIdRef.current !== session.id) {
      const fetchHistory = async () => {
        fetchedSessionIdRef.current = session.id;

        // Reset state trước khi fetch async (tránh gọi setState đồng bộ gây cascading renders)
        setHistoryData(null);
        setApiResponse(null);
        setLoadingHistory(true);

        const primaryGame = session.games?.[0];
        const boxId =
          primaryGame?.cafeInventoryBoxId || session.cafeInventoryBoxId;

        if (boxId && onFetchHistory) {
          const res = await onFetchHistory(boxId, session.id);
          setHistoryData(res);
        }
        setLoadingHistory(false);
      };

      fetchHistory();
    }
  }, [isOpen, session, onFetchHistory]);

  if (!isOpen || !session) return null;

  // 1. TRÍCH XUẤT CÁC MẢNH LINH KIỆN MẤT TỪ HISTORY API HOẶC SESSION DATA
  const damagedOrMissingComponents: Array<{
    componentName: string;
    quantity: number;
    penaltyFee: number;
    reason: string;
  }> = (() => {
    const items: any[] = [];

    // Lấy từ kết quả API component-history vừa fetch
    if (historyData?.incidents && historyData.incidents.length > 0) {
      historyData.incidents.forEach((incident: any) => {
        const compList = incident.missingComponents || [incident];
        compList.forEach((c: any) => {
          items.push({
            componentName: c.componentName || c.name || "Linh kiện",
            quantity: c.missingQuantity || c.quantity || 1,
            penaltyFee: Number(c.penaltyFee || c.penaltyAmount || 0),
            reason: c.isMissing ? "Mất" : c.isDamaged ? "Hỏng" : "Thiếu/Hỏng",
          });
        });
      });
    }

    // Lấy dự phòng từ session truyền vào nếu API history chưa có
    if (items.length === 0) {
      session.games?.forEach((game: any) => {
        const list =
          game.missingComponents ||
          game.components ||
          game.checklistResults ||
          [];
        list.forEach((c: any) => {
          if (
            c.isMissing ||
            c.isDamaged ||
            (c.missingQuantity && c.missingQuantity > 0) ||
            (c.penaltyFee && c.penaltyFee > 0) ||
            (c.penaltyAmount && c.penaltyAmount > 0)
          ) {
            items.push({
              componentName: c.componentName || c.name || "Linh kiện",
              quantity: c.missingQuantity || c.quantity || 1,
              penaltyFee: Number(c.penaltyFee || c.penaltyAmount || 0),
              reason: c.isMissing ? "Mất" : c.isDamaged ? "Hỏng" : "Thiếu/Hỏng",
            });
          }
        });
      });
    }

    return items;
  })();

  // 2. TÍNH TOÁN DỰ KIẾN TRƯỚC KHI BẤM CONFIRM
  const rawSubtotal = Number(session.subtotal ?? 0);
  const elapsedMinutes = Number(session.elapsedMinutes || 0);
  const subtotal = rawSubtotal > 0 ? rawSubtotal : elapsedMinutes * 500;

  const totalPenalty =
    Number(session.penaltyAmount || session.totalPenaltyAmount || 0) ||
    damagedOrMissingComponents.reduce((sum, item) => sum + item.penaltyFee, 0);

  const expectedTotal = subtotal + totalPenalty;

  // HÀM XỬ LÝ KHI BẤM CONFIRM CHẠY API CHECKOUT (POST /checkout)
  const handleExecuteCheckout = async () => {
    setLoading(true);
    const res = await onConfirmCheckout(session.id);
    setLoading(false);

    if (res) {
      setApiResponse(res);
    }
  };

  // HÀM ĐÓNG MODAL - RESET STATE TẠI ĐÂY (CHUẨN REACT BẤM USER EVENT)
  const handleCloseModal = () => {
    fetchedSessionIdRef.current = null;
    setApiResponse(null);
    setHistoryData(null);
    onClose();
  };

  const invoiceData = apiResponse?.data || apiResponse;

  return (
    <div className="fixed inset-0 bg-neutral-950/40 backdrop-blur-xs z-50 flex items-center justify-center p-4">
      <div className="bg-white border border-neutral-200 rounded-2xl max-w-md w-full p-6 space-y-4 shadow-xl animate-in fade-in-50 duration-150 max-h-[90vh] overflow-y-auto">
        {/* HEADER MODAL */}
        <div className="flex items-center justify-between border-b border-neutral-100 pb-3">
          <div className="flex items-center gap-2">
            <div
              className={`p-2 rounded-lg border ${
                apiResponse
                  ? "bg-emerald-50 text-emerald-700 border-emerald-200"
                  : "bg-amber-50 text-amber-700 border-amber-200"
              }`}
            >
              {apiResponse ? (
                <CheckCircle2 className="w-4 h-4" />
              ) : (
                <Receipt className="w-4 h-4" />
              )}
            </div>
            <div>
              <h3 className="font-bold text-base text-neutral-950">
                {apiResponse
                  ? "Hóa Đơn Chốt Phiên (UNPAID)"
                  : "Xem Trước & Confirm Checkout"}
              </h3>
              <p className="text-[11px] text-neutral-500 font-medium">
                Bàn:{" "}
                <strong className="text-neutral-900">
                  {session.tableName || "Bàn POS"}
                </strong>
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={handleCloseModal}
            className="text-neutral-400 hover:text-neutral-950 p-1 rounded-lg"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* BƯỚC 1: HIỂN THỊ DỰ KIẾN TRƯỚC KHI BẤM CONFIRM */}
        {!apiResponse ? (
          <div className="space-y-3">
            <div className="p-4 bg-neutral-50 border border-neutral-200 rounded-xl space-y-2.5 text-xs">
              {/* TIỀN GIỜ CHƠI */}
              <div className="flex justify-between items-center text-neutral-600">
                <span className="flex items-center gap-1 font-medium">
                  <Clock className="w-3.5 h-3.5 text-neutral-400" />
                  Tiền giờ chơi ({elapsedMinutes} phút):
                </span>
                <span className="font-mono font-bold text-neutral-900">
                  {subtotal.toLocaleString("vi-VN")}đ
                </span>
              </div>

              {/* PHẠT HỎNG/THIẾU LINH KIỆN */}
              <div className="space-y-1.5 pt-1.5 border-t border-neutral-200/60">
                <div className="flex justify-between items-center text-neutral-600">
                  <span className="flex items-center gap-1 font-semibold">
                    <Boxes className="w-3.5 h-3.5 text-neutral-500" />
                    Phạt hỏng/thiếu đồ:
                  </span>
                  <span
                    className={`font-mono font-bold ${
                      totalPenalty > 0 ? "text-rose-600" : "text-neutral-900"
                    }`}
                  >
                    +{totalPenalty.toLocaleString("vi-VN")}đ
                  </span>
                </div>

                {/* KHỐI HIỂN THỊ DANH SÁCH LINH KIỆN THIẾU/HỎNG */}
                {loadingHistory ? (
                  <div className="flex items-center gap-1.5 text-[11px] text-neutral-400 p-2 bg-white rounded border">
                    <Loader2 className="w-3.5 h-3.5 animate-spin text-amber-500" />
                    <span>Đang đối soát lịch sử linh kiện từ server...</span>
                  </div>
                ) : damagedOrMissingComponents.length > 0 ? (
                  <div className="bg-white border border-rose-100 rounded-lg p-2 space-y-1">
                    <div className="text-[10px] font-bold text-rose-700 uppercase flex items-center gap-1">
                      <AlertCircle className="w-3 h-3 text-rose-500" />
                      Linh kiện mất / hỏng ghi nhận:
                    </div>
                    {damagedOrMissingComponents.map((item, idx) => (
                      <div
                        key={idx}
                        className="flex items-center justify-between text-[11px] bg-rose-50/50 p-1 rounded border border-rose-100/50"
                      >
                        <span className="font-bold text-neutral-800 truncate">
                          • {item.componentName} (x{item.quantity} {item.reason}
                          )
                        </span>
                        <span className="font-mono font-bold text-rose-600">
                          +{item.penaltyFee.toLocaleString("vi-VN")}đ
                        </span>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="text-[11px] text-emerald-700 bg-emerald-50 p-1.5 rounded border border-emerald-100 font-medium">
                    ✓ Không có linh kiện bị mất/hỏng.
                  </div>
                )}
              </div>

              {/* TỔNG CỘNG DỰ KIẾN */}
              <div className="pt-2 border-t border-neutral-200 flex justify-between items-center text-sm font-extrabold text-neutral-950">
                <span>TỔNG CỘNG DỰ KIẾN:</span>
                <span className="font-mono text-amber-600 text-base">
                  {expectedTotal.toLocaleString("vi-VN")}đ
                </span>
              </div>
            </div>

            <div className="pt-2 flex justify-end gap-2">
              <Button
                type="button"
                variant="outline"
                onClick={handleCloseModal}
                className="h-9 text-xs rounded-lg border-neutral-200"
              >
                Hủy
              </Button>

              <Button
                type="button"
                disabled={loading || loadingHistory}
                onClick={handleExecuteCheckout}
                className="h-9 bg-amber-500 hover:bg-amber-600 text-white text-xs font-bold rounded-lg px-4 flex items-center gap-1.5 shadow-2xs"
              >
                <span>
                  {loading ? "Đang xử lý..." : "Confirm & Chạy API Checkout"}
                </span>
                <ArrowRight className="w-4 h-4" />
              </Button>
            </div>
          </div>
        ) : (
          /* BƯỚC 2: BIẾN KẾT QUẢ RESPONSE API THÀNH HÓA ĐƠN TRỰC QUAN */
          <div className="space-y-4 animate-in fade-in-50 duration-200">
            <div className="p-5 bg-white border border-dashed border-neutral-300 rounded-2xl shadow-2xs space-y-4">
              <div className="text-center space-y-1 border-b border-neutral-100 pb-3">
                <div className="text-xs font-black uppercase tracking-wider text-neutral-900">
                  BOARDVERSE CAFE POS
                </div>
                <h2 className="text-lg font-black text-neutral-950 uppercase tracking-tight">
                  Phiếu Checkout Bàn
                </h2>
                <div className="flex items-center justify-center gap-1 text-[10px] font-mono text-neutral-400">
                  <span>Mã đơn:</span>
                  <strong className="text-neutral-800">
                    #{invoiceData?.id?.slice(0, 8)}
                  </strong>
                  <span className="px-1.5 py-0.2 bg-amber-100 text-amber-800 rounded font-bold uppercase ml-1">
                    {invoiceData?.status || "UNPAID"}
                  </span>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-2 text-xs text-neutral-600 bg-neutral-50 p-3 rounded-xl border border-neutral-100">
                <div className="space-y-1">
                  <div className="flex items-center gap-1 text-[11px] font-bold text-neutral-800">
                    <Receipt className="w-3.5 h-3.5 text-neutral-400" />
                    {invoiceData?.tableName || session.tableName || "Bàn POS"}
                  </div>
                  <div className="flex items-center gap-1 text-[10px] text-neutral-500">
                    <User className="w-3 h-3 text-neutral-400" />
                    {invoiceData?.members?.[0]?.userName?.split("@")[0] ||
                      "Khách hàng"}
                  </div>
                </div>

                <div className="space-y-1 text-right">
                  <div className="flex items-center justify-end gap-1 text-[11px] font-bold text-neutral-800">
                    <Clock className="w-3.5 h-3.5 text-neutral-400" />
                    {invoiceData?.elapsedMinutes || 0} phút chơi
                  </div>
                  <div className="text-[10px] font-mono text-neutral-400">
                    {invoiceData?.endedAt
                      ? new Date(invoiceData.endedAt).toLocaleTimeString(
                          "vi-VN",
                          {
                            hour: "2-digit",
                            minute: "2-digit",
                          },
                        )
                      : "Mới xong"}
                  </div>
                </div>
              </div>

              {invoiceData?.gameName && (
                <div className="p-2.5 bg-neutral-50 border border-neutral-200/60 rounded-xl text-xs flex justify-between items-center">
                  <span className="font-bold text-neutral-800">
                    🎮 Game: {invoiceData.gameName}
                  </span>
                  <span className="font-mono text-[10px] text-neutral-400">
                    {invoiceData.boxBarcode}
                  </span>
                </div>
              )}

              {/* BẢNG TÍNH TIỀN HÓA ĐƠN HỢP LỆ */}
              <div className="space-y-2 text-xs border-t border-neutral-100 pt-3">
                <div className="flex justify-between items-center">
                  <span className="text-neutral-600">
                    Tiền giờ chơi (Subtotal):
                  </span>
                  <span className="font-mono font-bold text-neutral-900">
                    {Number(invoiceData?.subtotal || 0).toLocaleString("vi-VN")}
                    đ
                  </span>
                </div>

                <div className="flex justify-between items-center">
                  <span className="text-neutral-600">Tiền phạt linh kiện:</span>
                  <span className="font-mono font-bold text-neutral-900">
                    +
                    {Number(
                      invoiceData?.penaltyAmount ??
                        invoiceData?.totalPenaltyAmount ??
                        invoiceData?.games?.[0]?.totalPenaltyAmount ??
                        0,
                    ).toLocaleString("vi-VN")}
                    đ
                  </span>
                </div>

                {Number(invoiceData?.depositAppliedAmount || 0) > 0 && (
                  <div className="flex justify-between items-center text-emerald-600">
                    <span className="flex items-center gap-1">
                      <ShieldCheck className="w-3.5 h-3.5" />
                      Tiền cọc cấn trừ (BR-09):
                    </span>
                    <span className="font-mono font-bold">
                      -
                      {Number(invoiceData.depositAppliedAmount).toLocaleString(
                        "vi-VN",
                      )}
                      đ
                    </span>
                  </div>
                )}

                {/* SỬA DÒNG NÀY: TỔNG ĐƠN CHỜ THU = SUBTOTAL + PENALTY - DEPOSIT */}
                <div className="pt-2 border-t border-neutral-200 flex justify-between items-center text-sm font-extrabold text-neutral-950">
                  <span>TỔNG ĐƠN CHỜ THU:</span>
                  <span className="font-mono text-emerald-600 text-lg">
                    {(Number(invoiceData?.totalAmount || 0) > 0
                      ? Number(invoiceData.totalAmount)
                      : Math.max(
                          0,
                          Number(invoiceData?.subtotal || 0) +
                            Number(
                              invoiceData?.penaltyAmount ??
                                invoiceData?.totalPenaltyAmount ??
                                invoiceData?.games?.[0]?.totalPenaltyAmount ??
                                0,
                            ) -
                            Number(invoiceData?.depositAppliedAmount || 0),
                        )
                    ).toLocaleString("vi-VN")}
                    đ
                  </span>
                </div>
              </div>
            </div>

            <div className="p-3 bg-amber-50 border border-amber-200 rounded-xl flex items-center justify-between text-xs text-amber-800">
              <span className="font-bold">
                ✓ Đơn đã chuyển sang Đơn Chờ Thanh Toán (UNPAID)
              </span>
              <span className="font-mono text-[10px] font-bold bg-amber-200 px-1.5 py-0.5 rounded">
                READY FOR PAY
              </span>
            </div>

            <div className="pt-2 flex justify-end gap-2">
              <Button
                type="button"
                variant="outline"
                onClick={() => window.print()}
                className="h-9 text-xs rounded-lg border-neutral-200 flex items-center gap-1"
              >
                <Printer className="w-3.5 h-3.5 text-neutral-500" />
                <span>In Phiếu</span>
              </Button>

              <Button
                type="button"
                onClick={handleCloseModal}
                className="h-9 bg-neutral-950 hover:bg-neutral-800 text-white text-xs font-bold rounded-lg px-4"
              >
                Hoàn Tất Checkout
              </Button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
