"use client";

import { useState, useRef } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  X,
  GripVertical,
  Users,
  ArrowUp,
  ArrowDown,
  Save,
  Check,
} from "lucide-react";

interface PosTable {
  id: string;
  name: string;
  seatCount: number;
  sortOrder: number;
  status: string;
}

interface ReorderTablesModalProps {
  isOpen: boolean;
  onClose: () => void;
  currentTables: PosTable[];
  onUpdateTable: (
    tableId: string,
    payload: { name?: string; seatCount?: number; sortOrder?: number },
  ) => Promise<boolean>;
}

export function ReorderTablesModal({
  isOpen,
  onClose,
  currentTables,
  onUpdateTable,
}: ReorderTablesModalProps) {
  // State theo dõi trạng thái Modal mở/đóng ở lần render trước
  const [prevIsOpen, setPrevIsOpen] = useState(false);
  const [tablesList, setTablesList] = useState<PosTable[]>([]);
  const [saving, setSaving] = useState(false);
  const [savedSuccess, setSavedSuccess] = useState(false);

  // Drag & drop index trackers
  const dragItem = useRef<number | null>(null);
  const dragOverItem = useRef<number | null>(null);

  // 🎯 ĐỒNG BỘ STATE TRỰC TIẾP TRONG LÚC RENDER (Không dùng useEffect)
  if (isOpen !== prevIsOpen) {
    setPrevIsOpen(isOpen);
    if (isOpen) {
      const sorted = [...currentTables].sort(
        (a, b) => a.sortOrder - b.sortOrder,
      );
      setTablesList(sorted);
      setSavedSuccess(false);
    }
  }

  if (!isOpen) return null;

  // --- XỬ LÝ KÉO THẢ (DRAG & DROP) ---
  const handleDragStart = (index: number) => {
    dragItem.current = index;
  };

  const handleDragEnter = (index: number) => {
    dragOverItem.current = index;
  };

  const handleDragEnd = () => {
    if (dragItem.current === null || dragOverItem.current === null) return;
    const copyList = [...tablesList];
    const dragContent = copyList[dragItem.current];

    copyList.splice(dragItem.current, 1);
    copyList.splice(dragOverItem.current, 0, dragContent);

    const reordered = copyList.map((item, idx) => ({
      ...item,
      sortOrder: idx,
    }));

    dragItem.current = null;
    dragOverItem.current = null;
    setTablesList(reordered);
  };

  // Nút di chuyển lên/xuống bổ trợ
  const moveItem = (index: number, direction: "up" | "down") => {
    const newIndex = direction === "up" ? index - 1 : index + 1;
    if (newIndex < 0 || newIndex >= tablesList.length) return;

    const copyList = [...tablesList];
    const temp = copyList[index];
    copyList[index] = copyList[newIndex];
    copyList[newIndex] = temp;

    const reordered = copyList.map((item, idx) => ({
      ...item,
      sortOrder: idx,
    }));
    setTablesList(reordered);
  };

  // Cập nhật số ghế (SeatCount)
  const handleSeatCountChange = (index: number, value: number) => {
    setTablesList((prev) =>
      prev.map((item, i) =>
        i === index ? { ...item, seatCount: Math.max(1, value) } : item,
      ),
    );
  };

  // Cập nhật Tên bàn
  const handleNameChange = (index: number, name: string) => {
    setTablesList((prev) =>
      prev.map((item, i) => (i === index ? { ...item, name } : item)),
    );
  };

  // Gửi API PATCH cập nhật danh sách
  const handleSaveAll = async () => {
    setSaving(true);
    let allSuccess = true;

    for (const table of tablesList) {
      const res = await onUpdateTable(table.id, {
        name: table.name,
        seatCount: table.seatCount,
        sortOrder: table.sortOrder,
      });
      if (!res) allSuccess = false;
    }

    setSaving(false);
    if (allSuccess) {
      setSavedSuccess(true);
      setTimeout(() => {
        setSavedSuccess(false);
        onClose();
      }, 1000);
    }
  };

  return (
    <div className="fixed inset-0 bg-neutral-950/40 backdrop-blur-xs z-50 flex items-center justify-center p-4">
      <div className="bg-white border border-neutral-200 rounded-2xl max-w-lg w-full p-6 space-y-4 shadow-xl">
        {/* HEADER MODAL */}
        <div className="flex items-center justify-between border-b border-neutral-100 pb-3">
          <div className="flex items-center gap-2">
            <div className="p-2 rounded-lg bg-neutral-100 border border-neutral-200 text-neutral-800">
              <GripVertical className="w-4 h-4" />
            </div>
            <div>
              <h3 className="font-bold text-base text-neutral-950">
                Sắp Xếp & Đổi Số Ghế Bàn
              </h3>
              <p className="text-[11px] text-neutral-500 font-medium">
                Kéo thả các ô bàn lên/xuống để thay đổi thứ tự (sortOrder) & cập
                nhật chỗ ngồi.
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

        {/* DANH SÁCH BÀN KÉO THẢ */}
        <div className="max-h-80 overflow-y-auto space-y-2 pr-1 scrollbar-thin">
          {tablesList.map((table, index) => (
            <div
              key={table.id}
              draggable
              onDragStart={() => handleDragStart(index)}
              onDragEnter={() => handleDragEnter(index)}
              onDragEnd={handleDragEnd}
              onDragOver={(e) => e.preventDefault()}
              className="group flex items-center justify-between gap-3 p-3 bg-neutral-50 rounded-xl border border-neutral-200 hover:border-neutral-400 transition-all cursor-grab active:cursor-grabbing select-none hover:shadow-2xs"
            >
              {/* NÚT TAY CẦM KÉO & INDEX */}
              <div className="flex items-center gap-2 shrink-0">
                <div className="p-1 text-neutral-400 group-hover:text-neutral-700">
                  <GripVertical className="w-4 h-4" />
                </div>
                <span className="text-[11px] font-mono font-bold text-neutral-400 w-6">
                  #{table.sortOrder}
                </span>
              </div>

              {/* TÊN BÀN */}
              <div className="flex-1 min-w-0">
                <Input
                  type="text"
                  value={table.name}
                  onChange={(e) => handleNameChange(index, e.target.value)}
                  className="h-8 text-xs font-extrabold text-neutral-950 bg-white border-neutral-200 rounded-lg"
                />
              </div>

              {/* ĐỔI SỐ GHẾ (SEAT COUNT) */}
              <div className="flex items-center gap-1.5 shrink-0 bg-white border border-neutral-200 px-2 py-0.5 rounded-lg">
                <Users className="w-3.5 h-3.5 text-neutral-500" />
                <span className="text-[10px] font-semibold text-neutral-500">
                  Chỗ:
                </span>
                <input
                  type="number"
                  min={1}
                  max={50}
                  value={table.seatCount || 4}
                  onChange={(e) =>
                    handleSeatCountChange(index, parseInt(e.target.value) || 1)
                  }
                  className="w-10 h-7 text-xs font-mono font-bold text-center bg-transparent focus:outline-none"
                />
              </div>

              {/* NÚT ĐIỀU HƯỚNG LÊN/XUỐNG NHANH */}
              <div className="flex items-center gap-1 shrink-0">
                <button
                  type="button"
                  disabled={index === 0}
                  onClick={() => moveItem(index, "up")}
                  className="p-1 text-neutral-400 hover:text-neutral-950 disabled:opacity-30 rounded hover:bg-neutral-200/60"
                >
                  <ArrowUp className="w-3.5 h-3.5" />
                </button>
                <button
                  type="button"
                  disabled={index === tablesList.length - 1}
                  onClick={() => moveItem(index, "down")}
                  className="p-1 text-neutral-400 hover:text-neutral-950 disabled:opacity-30 rounded hover:bg-neutral-200/60"
                >
                  <ArrowDown className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>
          ))}
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
            type="button"
            disabled={saving || savedSuccess}
            onClick={handleSaveAll}
            className="h-9 bg-neutral-950 text-white text-xs font-bold rounded-lg px-4 flex items-center gap-1.5 hover:bg-neutral-800 disabled:opacity-50"
          >
            {savedSuccess ? (
              <>
                <Check className="w-4 h-4 text-emerald-400" />
                <span>Đã lưu thành công!</span>
              </>
            ) : (
              <>
                <Save className="w-4 h-4" />
                <span>{saving ? "Đang lưu..." : "Lưu Thứ Tự & Số Chỗ"}</span>
              </>
            )}
          </Button>
        </div>
      </div>
    </div>
  );
}
