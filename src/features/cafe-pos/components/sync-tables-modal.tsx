/* eslint-disable @typescript-eslint/no-explicit-any */
"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { X, Plus, Trash2, LayoutGrid } from "lucide-react";

interface SyncTablesModalProps {
  isOpen: boolean;
  onClose: () => void;
  currentTables: any[];
  onSave: (tableNames: string[]) => Promise<boolean | undefined>;
}

export function SyncTablesModal({
  isOpen,
  onClose,
  currentTables,
  onSave,
}: SyncTablesModalProps) {
  // 1. Quản lý state mở trước đó để phát hiện khoảnh khắc Modal vừa được MỞ
  const [prevIsOpen, setPrevIsOpen] = useState(false);
  const [tableNames, setTableNames] = useState<string[]>([]);
  const [newTableName, setNewTableName] = useState("");
  const [saving, setSaving] = useState(false);

  // 2. Đồng bộ State trực tiếp trong lúc Render (Không dùng useEffect -> Tránh lỗi set-state-in-effect)
  if (isOpen !== prevIsOpen) {
    setPrevIsOpen(isOpen);
    if (isOpen) {
      setTableNames(currentTables.map((t) => t.name));
      setNewTableName("");
    }
  }

  if (!isOpen) return null;

  // Thêm 1 bàn mới
  const handleAddTable = () => {
    if (!newTableName.trim()) return;
    setTableNames((prev) => [...prev, newTableName.trim()]);
    setNewTableName("");
  };

  // Xóa bớt 1 bàn
  const handleRemoveTable = (index: number) => {
    setTableNames((prev) => prev.filter((_, i) => i !== index));
  };

  // Sửa tên bàn
  const handleUpdateTableName = (index: number, val: string) => {
    setTableNames((prev) => prev.map((name, i) => (i === index ? val : name)));
  };

  const handleSubmit = async () => {
    setSaving(true);
    const success = await onSave(tableNames);
    setSaving(false);
    if (success) onClose();
  };

  return (
    <div className="fixed inset-0 bg-neutral-950/40 backdrop-blur-xs z-50 flex items-center justify-center p-4">
      <div className="bg-white border border-neutral-200 rounded-2xl max-w-md w-full p-6 space-y-4 shadow-xl">
        {/* HEADER MODAL */}
        <div className="flex items-center justify-between border-b border-neutral-100 pb-3">
          <h3 className="font-bold text-base text-neutral-950 flex items-center gap-2">
            <LayoutGrid className="w-4 h-4 text-neutral-800" /> Quản lý & Cấu
            hình sơ đồ bàn
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
          Thêm bàn mới, sửa tên hoặc xóa bớt bàn trực tiếp trên danh sách hiện
          có bên dưới.
        </p>

        {/* Ô THÊM BÀN MỚI */}
        <div className="flex gap-2">
          <Input
            type="text"
            placeholder="Nhập tên bàn mới muốn thêm..."
            value={newTableName}
            onChange={(e) => setNewTableName(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter") {
                e.preventDefault();
                handleAddTable();
              }
            }}
            className="h-9 text-xs border-neutral-200 rounded-lg"
          />
          <Button
            type="button"
            onClick={handleAddTable}
            className="h-9 px-3 bg-neutral-900 text-white text-xs font-semibold rounded-lg shrink-0 flex items-center gap-1 hover:bg-neutral-800"
          >
            <Plus className="w-3.5 h-3.5" /> Thêm bàn
          </Button>
        </div>

        {/* DANH SÁCH BÀN HIỆN CÓ VÀ ĐÃ BỔ SUNG */}
        <div className="max-h-64 overflow-y-auto space-y-2 pr-1 scrollbar-thin">
          {tableNames.length === 0 ? (
            <div className="text-center py-8 border border-dashed border-neutral-200 rounded-xl text-xs text-neutral-400 font-medium">
              Chưa có bàn nào trong kho. Hãy nhập tên để thêm bàn đầu tiên.
            </div>
          ) : (
            tableNames.map((name, index) => (
              <div
                key={index}
                className="flex items-center gap-2 p-1.5 bg-neutral-50 rounded-lg border border-neutral-200/80 transition-colors hover:border-neutral-300"
              >
                <span className="text-[10px] font-mono font-bold text-neutral-400 w-8 text-center shrink-0">
                  #{index + 1}
                </span>
                <Input
                  type="text"
                  value={name}
                  onChange={(e) => handleUpdateTableName(index, e.target.value)}
                  className="h-8 text-xs bg-white font-medium border-neutral-200 rounded-md shadow-2xs"
                />
                <button
                  type="button"
                  onClick={() => handleRemoveTable(index)}
                  title="Xóa bàn này"
                  className="p-1.5 text-neutral-400 hover:text-red-600 hover:bg-red-50 rounded-md transition-colors shrink-0"
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
              : `Lưu thay đổi (${tableNames.length} bàn)`}
          </Button>
        </div>
      </div>
    </div>
  );
}
