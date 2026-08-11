/* eslint-disable @typescript-eslint/no-explicit-any */
"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  X,
  Play,
  Barcode,
  Search,
  AlertTriangle,
  ShieldCheck,
  Loader2,
} from "lucide-react";
import { apiClient } from "@/core/api/client";

export interface StartSessionModalProps {
  isOpen: boolean;
  onClose: () => void;
  selectedTable: { id: string; name: string } | null;
  cafeId: string | null;
  onStart: (cafeTableId: string, barcode: string) => Promise<boolean>;
}

export function StartSessionModal({
  isOpen,
  onClose,
  selectedTable,
  cafeId,
  onStart,
}: StartSessionModalProps) {
  const [barcode, setBarcode] = useState("");
  const [loading, setLoading] = useState(false);
  const [checkingBox, setCheckingBox] = useState(false);

  // State lưu kết quả kiểm tra hộp game trước khi gán bàn
  const [boxInspection, setBoxInspection] = useState<{
    gameName?: string;
    barcode?: string;
    status?: string;
    missingComponents?: any[];
    hasChecked: boolean;
  } | null>(null);

  if (!isOpen || !selectedTable) return null;

  // HÀM KIỂM TRA LINH KIỆN HỘP GAME TRƯỚC KHI GÁN BÀN
  const handleInspectBox = async () => {
    if (!cafeId || !barcode.trim()) {
      alert("Vui lòng nhập Barcode hộp game!");
      return;
    }

    try {
      setCheckingBox(true);

      // 1. Tra cứu thông tin hộp game
      const boxRes: any = await apiClient.get(
        `/api/cafes/${cafeId}/pos/boxes/by-barcode/${barcode.trim()}`,
      );
      const boxData = boxRes?.data || boxRes;

      if (!boxData?.id) {
        alert("Không tìm thấy hộp game với mã Barcode này.");
        setBoxInspection(null);
        return;
      }

      // 2. Tra cứu lịch sử thiếu/hỏng linh kiện
      let missingList: any[] = [];
      try {
        const historyRes: any = await apiClient.get(
          `/api/cafes/${cafeId}/pos/boxes/${boxData.id}/component-history`,
        );
        const historyData = historyRes?.data || historyRes;
        missingList =
          historyData?.incidents?.flatMap(
            (incident: any) => incident.missingComponents || [],
          ) || [];
      } catch (err) {
        console.warn("Không thể tải lịch sử kiểm kê:", err);
      }

      setBoxInspection({
        gameName: boxData.gameName,
        barcode: boxData.barcode,
        status: boxData.status,
        missingComponents: missingList,
        hasChecked: true,
      });
    } catch (err: any) {
      alert(err?.message || "Không tìm thấy hộp game.");
      setBoxInspection(null);
    } finally {
      setCheckingBox(false);
    }
  };

  // HÀM XÁC NHẬN BẮT ĐẦU PHIÊN CHƠI
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!barcode.trim()) {
      alert("Vui lòng nhập hoặc quét mã Barcode hộp game!");
      return;
    }

    setLoading(true);
    const success = await onStart(selectedTable.id, barcode.trim());
    setLoading(false);

    if (success) {
      setBarcode("");
      setBoxInspection(null);
      onClose();
    }
  };

  const handleCloseModal = () => {
    setBarcode("");
    setBoxInspection(null);
    onClose();
  };

  return (
    <div className="fixed inset-0 bg-neutral-950/40 backdrop-blur-xs z-50 flex items-center justify-center p-4">
      <div className="bg-white border border-neutral-200 rounded-2xl max-w-md w-full p-6 space-y-4 shadow-xl animate-in fade-in-50 duration-150">
        {/* HEADER MODAL */}
        <div className="flex items-center justify-between border-b border-neutral-100 pb-3">
          <div>
            <h3 className="font-bold text-base text-neutral-950">
              Mở Bàn & Bắt Đầu Phiên Chơi
            </h3>
            <p className="text-xs text-neutral-500 font-medium">
              Bàn được chọn:{" "}
              <strong className="text-neutral-900">{selectedTable.name}</strong>
            </p>
          </div>
          <button
            type="button"
            onClick={handleCloseModal}
            className="text-neutral-400 hover:text-neutral-950 p-1 rounded-lg"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* FORM NHẬP BARCODE & NÚT KIỂM TRA */}
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-1.5">
            <label className="text-xs font-bold text-neutral-800 flex items-center gap-1">
              <Barcode className="w-3.5 h-3.5 text-neutral-500" /> Mã Barcode
              Hộp Game
            </label>

            {/* Ô INPUT VÀ NÚT KIỂM TRA XỌT NGANG */}
            <div className="flex gap-2">
              <Input
                type="text"
                autoFocus
                placeholder="Nhập hoặc quét mã Barcode (vd: BV-a477...)..."
                value={barcode}
                onChange={(e) => {
                  setBarcode(e.target.value);
                  if (boxInspection) setBoxInspection(null); // Reset kết quả cũ khi gõ mã mới
                }}
                className="h-9 text-xs border-neutral-300 focus:border-neutral-900 rounded-lg bg-neutral-50/50 font-mono"
              />

              <Button
                type="button"
                variant="outline"
                disabled={checkingBox || !barcode.trim()}
                onClick={handleInspectBox}
                className="h-9 px-3 border-amber-300 bg-amber-50 text-amber-800 hover:bg-amber-100 text-xs font-bold rounded-lg shrink-0 flex items-center gap-1 shadow-2xs"
              >
                {checkingBox ? (
                  <Loader2 className="w-3.5 h-3.5 animate-spin" />
                ) : (
                  <Search className="w-3.5 h-3.5 text-amber-700" />
                )}
                <span>Kiểm tra</span>
              </Button>
            </div>
          </div>

          {/* HIỂN THỊ KẾT QUẢ KIỂM TRA TRƯỚC BÀN GIAO */}
          {boxInspection && boxInspection.hasChecked && (
            <div className="p-3 bg-neutral-50 border border-neutral-200 rounded-xl space-y-2 animate-in fade-in-50 duration-150">
              <div className="flex items-center justify-between text-xs">
                <span className="font-bold text-neutral-900">
                  {boxInspection.gameName}
                </span>
                <span className="text-[10px] font-mono text-neutral-500">
                  {boxInspection.barcode}
                </span>
              </div>

              {/* TRƯỜNG HỢP 1: HỘP CÓ LINH KIỆN BỊ THIẾU/HỎNG */}
              {boxInspection.missingComponents &&
              boxInspection.missingComponents.length > 0 ? (
                <div className="p-2.5 bg-rose-50 border border-rose-200 rounded-lg space-y-1.5">
                  <div className="text-[10px] font-bold text-rose-800 uppercase flex items-center gap-1">
                    <AlertTriangle className="w-3.5 h-3.5 text-rose-600" />
                    Cảnh báo: Hộp game ghi nhận thiếu{" "}
                    {boxInspection.missingComponents.length} loại linh kiện!
                  </div>

                  <div className="space-y-1 max-h-24 overflow-y-auto pr-1">
                    {boxInspection.missingComponents.map(
                      (comp: any, idx: number) => (
                        <div
                          key={comp.componentId || idx}
                          className="bg-white border border-rose-100 px-2 py-1 rounded text-[11px] flex items-center justify-between shadow-2xs"
                        >
                          <span className="font-bold text-neutral-800">
                            • {comp.componentName}
                          </span>
                          <span className="font-mono font-bold text-rose-600 text-[10px]">
                            Thiếu {comp.missingQuantity || 1} (
                            {comp.componentKind || "Mảnh"})
                          </span>
                        </div>
                      ),
                    )}
                  </div>
                  <p className="text-[10px] text-rose-700 italic">
                    * Nhân viên hãy nhắc khách hàng tình trạng thiếu đồ trước
                    khi giao!
                  </p>
                </div>
              ) : (
                /* TRƯỜNG HỢP 2: HỘP GAME ĐẦY ĐỦ */
                <div className="p-2 bg-emerald-50 border border-emerald-200 rounded-lg flex items-center gap-1.5 text-[11px] text-emerald-800 font-medium">
                  <ShieldCheck className="w-4 h-4 text-emerald-600 shrink-0" />
                  <span>
                    Hộp đầy đủ linh kiện, sẵn sàng bàn giao cho khách.
                  </span>
                </div>
              )}
            </div>
          )}

          {/* FOOTER ACTIONS */}
          <div className="pt-3 border-t border-neutral-100 flex justify-end gap-2">
            <Button
              type="button"
              variant="outline"
              onClick={handleCloseModal}
              className="h-9 text-xs rounded-lg border-neutral-200"
            >
              Hủy
            </Button>

            <Button
              type="submit"
              disabled={loading || !barcode.trim()}
              className="h-9 bg-neutral-950 hover:bg-neutral-800 text-white text-xs font-bold rounded-lg px-4 flex items-center gap-1.5 shadow-2xs"
            >
              <Play className="w-3.5 h-3.5" />
              <span>{loading ? "Đang mở bàn..." : "Xác Nhận Mở Bàn"}</span>
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
}
