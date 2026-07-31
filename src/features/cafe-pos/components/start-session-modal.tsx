"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { X, Play, Barcode, LayoutGrid } from "lucide-react";

interface StartSessionModalProps {
  isOpen: boolean;
  onClose: () => void;
  selectedTable: { id: string; name: string } | null;
  onStart: (tableId: string, barcode: string) => Promise<boolean>;
}

export function StartSessionModal({
  isOpen,
  onClose,
  selectedTable,
  onStart,
}: StartSessionModalProps) {
  const [barcode, setBarcode] = useState("");
  const [submitting, setSubmitting] = useState(false);

  if (!isOpen || !selectedTable) return null;

  const handleSubmit = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!barcode.trim()) {
      alert("Vui lòng quét hoặc nhập mã Barcode hộp game!");
      return;
    }

    setSubmitting(true);
    const success = await onStart(selectedTable.id, barcode.trim());
    setSubmitting(false);

    if (success) {
      setBarcode("");
      onClose();
    }
  };

  return (
    <div className="fixed inset-0 bg-neutral-950/40 backdrop-blur-xs z-50 flex items-center justify-center p-4">
      <div className="bg-white border border-neutral-200 rounded-2xl max-w-md w-full p-6 space-y-4 shadow-xl">
        {/* HEADER MODAL */}
        <div className="flex items-center justify-between border-b border-neutral-100 pb-3">
          <div className="flex items-center gap-2">
            <div className="p-2 rounded-lg bg-emerald-50 text-emerald-700 border border-emerald-200">
              <Play className="w-4 h-4 fill-emerald-600" />
            </div>
            <div>
              <h3 className="font-bold text-base text-neutral-950">
                Gán Phiên Chơi Mới
              </h3>
              <p className="text-[11px] text-neutral-500 font-medium">
                Khởi tạo session tính giờ & giao hộp game
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="text-neutral-400 hover:text-neutral-950 p-1 rounded-lg transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* THÔNG TIN BÀN ĐƯỢC CHỌN */}
        <div className="p-3 bg-neutral-50 border border-neutral-200 rounded-xl flex items-center justify-between">
          <div className="flex items-center gap-2">
            <LayoutGrid className="w-4 h-4 text-neutral-500" />
            <span className="text-xs font-bold text-neutral-700">
              Vị trí bàn:
            </span>
          </div>
          <span className="text-sm font-extrabold text-neutral-950 bg-white px-2.5 py-0.5 border border-neutral-200 rounded-md">
            {selectedTable.name}
          </span>
        </div>

        {/* Ô BẮT MÃ BARCODE (TỰ ĐỘNG ENTER CỦA SÚNG QUÉT) */}
        <form onSubmit={handleSubmit} className="space-y-3">
          <div className="space-y-1.5">
            <label className="text-xs font-bold text-neutral-700 flex items-center gap-1.5">
              <Barcode className="w-4 h-4 text-neutral-500" />
              <span>Mã Barcode Hộp Game Vật Lý:</span>
            </label>
            <Input
              type="text"
              autoFocus
              placeholder="Bắn súng quét hoặc nhập mã (vd: BV-a477...)"
              value={barcode}
              onChange={(e) => setBarcode(e.target.value)}
              className="h-10 text-xs font-mono bg-white border-neutral-200 rounded-xl focus:border-neutral-900"
            />
            <p className="text-[10px] text-neutral-400">
              * Bắn súng quét barcode để kích hoạt bắt đầu ngay lập tức.
            </p>
          </div>

          {/* FOOTER ACTIONS */}
          <div className="pt-3 border-t border-neutral-100 flex justify-end gap-2">
            <Button
              type="button"
              variant="outline"
              onClick={onClose}
              className="h-9 text-xs rounded-lg border-neutral-200"
            >
              Hủy
            </Button>
            <Button
              type="submit"
              disabled={submitting}
              className="h-9 bg-neutral-950 text-white text-xs font-bold rounded-lg px-4 hover:bg-neutral-800 disabled:opacity-50"
            >
              {submitting ? "Đang xử lý..." : "Xác Nhận & Mở Bàn"}
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
}
