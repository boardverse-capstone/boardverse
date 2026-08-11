/* eslint-disable @typescript-eslint/no-explicit-any */
"use client";

import { useState, useRef } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  X,
  Plus,
  Trash2,
  GripVertical,
  Users,
  ArrowUp,
  ArrowDown,
  LayoutGrid,
} from "lucide-react";

export interface TableItem {
  id?: string;
  name: string;
  seatCount: number;
  sortOrder: number;
}

interface SyncTablesModalProps {
  isOpen: boolean;
  onClose: () => void;
  currentTables: any[];
  onSave: (
    tables: Array<{ name: string; seatCount: number; sortOrder: number }>,
  ) => Promise<boolean | undefined>;
}

export function SyncTablesModal({
  isOpen,
  onClose,
  currentTables,
  onSave,
}: SyncTablesModalProps) {
  // Pattern Adjusting State During Render (Chuẩn React 19 / No useEffect error)
  const [prevIsOpen, setPrevIsOpen] = useState(false);
  const [tablesList, setTablesList] = useState<TableItem[]>([]);
  const [newTableName, setNewTableName] = useState("");
  const [newSeatCount, setNewSeatCount] = useState<number>(4);
  const [saving, setSaving] = useState(false);

  // Drag & drop index trackers
  const dragItem = useRef<number | null>(null);
  const dragOverItem = useRef<number | null>(null);

  if (isOpen !== prevIsOpen) {
    setPrevIsOpen(isOpen);
    if (isOpen) {
      const sorted = [...currentTables]
        .sort((a, b) => (a.sortOrder ?? 0) - (b.sortOrder ?? 0))
        .map((t, idx) => ({
          id: t.id,
          name: t.name || `Bàn ${idx + 1}`,
          seatCount: t.seatCount || 4,
          sortOrder: idx,
        }));
      setTablesList(sorted);
      setNewTableName("");
      setNewSeatCount(4);
    }
  }

  if (!isOpen) return null;

  // --- 1. THÊM BÀN MỚI ---
  const handleAddTable = () => {
    if (!newTableName.trim()) return;
    setTablesList((prev) => [
      ...prev,
      {
        name: newTableName.trim(),
        seatCount: newSeatCount || 4,
        sortOrder: prev.length,
      },
    ]);
    setNewTableName("");
    setNewSeatCount(4);
  };

  // --- 2. XÓA BÀN ---
  const handleRemoveTable = (index: number) => {
    setTablesList((prev) =>
      prev
        .filter((_, i) => i !== index)
        .map((t, idx) => ({ ...t, sortOrder: idx })),
    );
  };

  // --- 3. SỬA TÊN & SỐ GHẾ ---
  const handleUpdateTableField = (
    index: number,
    field: "name" | "seatCount",
    val: any,
  ) => {
    setTablesList((prev) =>
      prev.map((t, i) =>
        i === index
          ? {
              ...t,
              [field]:
                field === "seatCount" ? Math.max(1, parseInt(val) || 1) : val,
            }
          : t,
      ),
    );
  };

  // --- 4. DRAG & DROP SẮP XẾP ---
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

  // --- 5. LƯU TẤT CẢ VỀ SERVER (API PUT) ---
  const handleSubmit = async () => {
    setSaving(true);
    const payload = tablesList.map((t, idx) => ({
      name: t.name,
      seatCount: t.seatCount,
      sortOrder: idx,
    }));

    const success = await onSave(payload);
    setSaving(false);
    if (success) onClose();
  };

  return (
    <div className="fixed inset-0 bg-neutral-950/40 backdrop-blur-xs z-50 flex items-center justify-center p-4">
      <div className="bg-white border border-neutral-200 rounded-2xl max-w-lg w-full p-6 space-y-4 shadow-xl">
        {/* HEADER MODAL */}
        <div className="flex items-center justify-between border-b border-neutral-100 pb-3">
          <h3 className="font-bold text-base text-neutral-950 flex items-center gap-2">
            <LayoutGrid className="w-4 h-4 text-neutral-800" /> Cấu hình & Sắp
            xếp sơ đồ bàn
          </h3>
          <button
            type="button"
            onClick={onClose}
            className="text-neutral-400 hover:text-neutral-950 transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <p className="text-xs text-neutral-500 leading-normal">
          Thêm bàn mới, thay đổi số ghế, đổi tên hoặc kéo thả để thay đổi thứ tự
          hiển thị sơ đồ bàn.
        </p>

        {/* CỤM Ô THÊM BÀN MỚI (TÊN + SỐ GHẾ) */}
        <div className="flex items-center gap-2 bg-neutral-50 p-2 border border-neutral-200 rounded-xl">
          <Input
            type="text"
            placeholder="Nhập tên bàn mới..."
            value={newTableName}
            onChange={(e) => setNewTableName(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter") {
                e.preventDefault();
                handleAddTable();
              }
            }}
            className="h-9 text-xs bg-white border-neutral-200 rounded-lg flex-1"
          />
          <div className="flex items-center gap-1 bg-white border border-neutral-200 px-2 h-9 rounded-lg shrink-0">
            <Users className="w-3.5 h-3.5 text-neutral-400" />
            <input
              type="number"
              min={1}
              max={50}
              title="Số chỗ tối đa"
              value={newSeatCount}
              onChange={(e) => setNewSeatCount(parseInt(e.target.value) || 4)}
              className="w-8 text-xs font-mono font-bold text-center bg-transparent focus:outline-none"
            />
            <span className="text-[10px] text-neutral-400 font-semibold">
              chỗ
            </span>
          </div>
          <Button
            type="button"
            onClick={handleAddTable}
            className="h-9 px-3 bg-neutral-950 text-white text-xs font-semibold rounded-lg shrink-0 flex items-center gap-1 hover:bg-neutral-800"
          >
            <Plus className="w-3.5 h-3.5" /> Thêm
          </Button>
        </div>

        {/* DANH SÁCH BÀN CHO PHÉP KÉO THẢ, SỬA TÊN VÀ ĐỔI SỐ GHẾ */}
        <div className="max-h-72 overflow-y-auto space-y-2 pr-1 scrollbar-thin">
          {tablesList.length === 0 ? (
            <div className="text-center py-8 border border-dashed border-neutral-200 rounded-xl text-xs text-neutral-400 font-medium">
              Chưa có bàn nào. Hãy nhập tên để thêm bàn đầu tiên.
            </div>
          ) : (
            tablesList.map((table, index) => (
              <div
                key={index}
                draggable
                onDragStart={() => handleDragStart(index)}
                onDragEnter={() => handleDragEnter(index)}
                onDragEnd={handleDragEnd}
                onDragOver={(e) => e.preventDefault()}
                className="group flex items-center justify-between gap-2.5 p-2.5 bg-neutral-50 rounded-xl border border-neutral-200 hover:border-neutral-400 transition-all cursor-grab active:cursor-grabbing select-none hover:shadow-2xs"
              >
                {/* TAY CẦM KÉO THẢ & THỨ TỰ */}
                <div className="flex items-center gap-1.5 shrink-0">
                  <div className="p-1 text-neutral-400 group-hover:text-neutral-700">
                    <GripVertical className="w-4 h-4" />
                  </div>
                  <span className="text-[10px] font-mono font-bold text-neutral-400 w-5">
                    #{index}
                  </span>
                </div>

                {/* SỬA TÊN BÀN */}
                <Input
                  type="text"
                  value={table.name}
                  onChange={(e) =>
                    handleUpdateTableField(index, "name", e.target.value)
                  }
                  className="h-8 text-xs font-bold bg-white border-neutral-200 rounded-lg flex-1 min-w-0"
                />

                {/* SỬA SỐ GHẾ */}
                <div className="flex items-center gap-1 bg-white border border-neutral-200 px-2 h-8 rounded-lg shrink-0">
                  <Users className="w-3 h-3 text-neutral-400" />
                  <input
                    type="number"
                    min={1}
                    max={50}
                    value={table.seatCount}
                    onChange={(e) =>
                      handleUpdateTableField(index, "seatCount", e.target.value)
                    }
                    className="w-8 text-xs font-mono font-bold text-center bg-transparent focus:outline-none"
                  />
                  <span className="text-[10px] text-neutral-400 font-medium">
                    chỗ
                  </span>
                </div>

                {/* NÚT UP/DOWN NHANH */}
                <div className="flex items-center gap-0.5 shrink-0">
                  <button
                    type="button"
                    disabled={index === 0}
                    onClick={() => moveItem(index, "up")}
                    className="p-1 text-neutral-400 hover:text-neutral-950 disabled:opacity-20 rounded"
                  >
                    <ArrowUp className="w-3.5 h-3.5" />
                  </button>
                  <button
                    type="button"
                    disabled={index === tablesList.length - 1}
                    onClick={() => moveItem(index, "down")}
                    className="p-1 text-neutral-400 hover:text-neutral-950 disabled:opacity-20 rounded"
                  >
                    <ArrowDown className="w-3.5 h-3.5" />
                  </button>
                </div>

                {/* NÚT XÓA BÀN */}
                <button
                  type="button"
                  onClick={() => handleRemoveTable(index)}
                  title="Xóa bàn này"
                  className="p-1.5 text-neutral-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-colors shrink-0"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                </button>
              </div>
            ))
          )}
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
            disabled={saving}
            onClick={handleSubmit}
            className="h-9 bg-neutral-950 text-white text-xs font-bold rounded-lg px-4 hover:bg-neutral-800 disabled:opacity-50"
          >
            {saving
              ? "Đang đồng bộ..."
              : `Lưu Tất Cả (${tablesList.length} bàn)`}
          </Button>
        </div>
      </div>
    </div>
  );
}
