"use client";

import { useInventory } from "@/features/cafe-inventory/hooks/useInventory";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Search, ArrowUpDown, ChevronLeft, ChevronRight } from "lucide-react";
import { InventoryCard } from "@/features/cafe-inventory/components/inventory-card";
import { AddGameDialog } from "@/features/cafe-inventory/components/add-game-dialog";
import { EditGameDialog } from "@/features/cafe-inventory/components/edit-game-dialog";

// ĐÃ SỬA: Import đầy đủ các linh kiện bổ trợ của bộ Select shadcn
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

export function InventoryFeatureContainer() {
  const {
    viewMode,
    setViewMode,
    isAddOpen,
    setIsAddOpen,
    isEditOpen,
    setIsEditOpen,
    selectedInventoryId,
    setSelectedInventoryId,
    cafeId,
    inventoryList,
    loading,
    searchTerm,
    setSearchTerm,
    status,
    setStatus,
    sortBy,
    setSortBy,
    sortDescending,
    setSortDescending,
    pageNumber,
    setPageNumber,
    pageSize,
    setPageSize,
    refreshInventory,
    handleDelete,
    handleRestore,
  } = useInventory();

  return (
    <div className="space-y-6">
      {/* HEADER BAR */}
      <div className="flex justify-between items-center border-b border-neutral-200 pb-4">
        <div>
          <h1 className="text-xl font-bold tracking-tight text-neutral-950">
            Quản Lý Kho Board Game
          </h1>
          <p className="text-xs text-neutral-500 font-medium mt-0.5">
            Xem trạng thái chi tiết, lưu trữ và khôi phục danh mục trò chơi của
            cơ sở.
          </p>
        </div>
        <Button
          onClick={() => setIsAddOpen(true)}
          disabled={!cafeId}
          className="h-10 bg-gradient-to-b from-[#2A2A2A] to-[#1A1A1A] text-white font-semibold text-xs uppercase tracking-wider rounded-lg border border-neutral-950 border-t-neutral-700 shadow-[0px_1px_2px_rgba(0,0,0,0.15),inset_0px_1px_0px_rgba(255,255,255,0.08)] hover:from-[#333333] hover:to-[#222222] px-4 disabled:from-neutral-200"
        >
          + Thêm Game Mới
        </Button>
      </div>

      {/* THANH BỘ LỌC ĐA NĂNG (FILTER BAR - ĐÃ BO LẠI KHOẢNG CÁCH KHU BÊN PHẢI) */}
      <div className="w-full bg-neutral-50 p-4 border border-neutral-200 rounded-xl flex flex-col gap-4">
        {/* DÒNG 1: Ô TÌM KIẾM & BỘ LỌC TRẠNG THÁI */}
        <div className="flex items-center gap-6 w-full">
          {/* Ô Tìm Kiếm */}
          <div className="relative w-full md:w-64 shrink-0">
            <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-neutral-400" />
            <Input
              type="text"
              placeholder="Tìm nhanh tên game..."
              value={searchTerm}
              onChange={(e) => {
                setSearchTerm(e.target.value);
                setPageNumber(1);
              }}
              className="w-full h-9 border-neutral-200 rounded-lg pl-9 bg-white text-xs shadow-2xs focus-visible:ring-1 focus-visible:ring-neutral-400"
            />
          </div>

          {/* Lọc Trạng Thái */}
          <div className="flex items-center gap-1.5 shrink-0">
            <span className="text-[11px] font-bold text-neutral-500 uppercase tracking-tight w-[75px] text-right pr-0.5">
              Trạng thái:
            </span>
            <Select
              value={status}
              onValueChange={(val) => {
                setStatus(val);
                setPageNumber(1);
              }}
            >
              <SelectTrigger className="h-9 w-[160px] bg-white border-neutral-200 text-xs font-semibold rounded-lg focus:ring-0 focus:ring-offset-0 shadow-2xs">
                <SelectValue placeholder="Tất cả trạng thái" />
              </SelectTrigger>
              <SelectContent className="bg-white border border-neutral-200 rounded-lg shadow-sm">
                <SelectItem
                  value="All"
                  className="text-xs font-medium cursor-pointer"
                >
                  Tất cả trạng thái
                </SelectItem>
                <SelectItem
                  value="Available"
                  className="text-xs font-medium cursor-pointer"
                >
                  Available
                </SelectItem>
                <SelectItem
                  value="InUse"
                  className="text-xs font-medium cursor-pointer"
                >
                  InUse
                </SelectItem>
                <SelectItem
                  value="Damaged"
                  className="text-xs font-medium cursor-pointer"
                >
                  Damaged
                </SelectItem>
                <SelectItem
                  value="Maintenance"
                  className="text-xs font-medium cursor-pointer"
                >
                  Maintenance
                </SelectItem>
                <SelectItem
                  value="Retired"
                  className="text-xs font-medium cursor-pointer"
                >
                  Retired
                </SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>

        {/* DÒNG 2: CỤM SẮP XẾP VÀ CỤM HIỂN THỊ TRÊN CÙNG MỘT TUYẾN DỌC */}
        <div className="flex items-center gap-6 w-full">
          {/* Trường Sắp Xếp + Nút Chiều Sắp Xếp */}
          <div className="flex items-center gap-1.5 shrink-0 w-full md:w-64">
            <span className="text-[11px] font-bold text-neutral-500 uppercase tracking-tight shrink-0">
              Sắp xếp:
            </span>
            <div className="flex items-center -space-x-px flex-1">
              <Select value={sortBy} onValueChange={(val) => setSortBy(val)}>
                <SelectTrigger className="h-9 w-full bg-white border-neutral-200 text-xs font-semibold rounded-l-lg rounded-r-none focus:ring-0 focus:ring-offset-0 shadow-2xs">
                  <SelectValue placeholder="Chọn trường sắp xếp" />
                </SelectTrigger>
                <SelectContent className="bg-white border border-neutral-200 rounded-lg shadow-sm">
                  <SelectItem
                    value="UpdatedAt"
                    className="text-xs font-medium cursor-pointer"
                  >
                    Mặc định (Cập nhật)
                  </SelectItem>
                  <SelectItem
                    value="Name"
                    className="text-xs font-medium cursor-pointer"
                  >
                    Tên trò chơi
                  </SelectItem>
                  <SelectItem
                    value="BoxQuantity"
                    className="text-xs font-medium cursor-pointer"
                  >
                    Số lượng hộp
                  </SelectItem>
                </SelectContent>
              </Select>

              <button
                type="button"
                onClick={() => setSortDescending(!sortDescending)}
                className={`h-9 px-3 flex items-center gap-1.5 text-xs font-bold rounded-r-lg border transition-colors bg-white shadow-2xs select-none border-neutral-200 ${
                  sortDescending
                    ? "text-neutral-950 font-extrabold"
                    : "text-neutral-400"
                }`}
              >
                <ArrowUpDown className="w-3.5 h-3.5" />
                <span>{sortDescending ? "Giảm" : "Tăng"}</span>
              </button>
            </div>
          </div>

          {/* KHU VỰC BÊN PHẢI (HIỂN THỊ): Đã bo gọn, căn lề w-[75px] thẳng tắp với dòng trên */}
          <div className="flex items-center gap-1.5 shrink-0">
            <span className="text-[11px] font-bold text-neutral-500 uppercase tracking-tight w-[75px] text-right pr-0.5">
              Hiển thị:
            </span>
            <Select
              value={String(pageSize)}
              onValueChange={(val) => {
                setPageSize(parseInt(val));
                setPageNumber(1);
              }}
            >
              <SelectTrigger className="h-9 w-[160px] bg-white border-neutral-200 text-xs font-semibold rounded-lg focus:ring-0 focus:ring-offset-0 shadow-2xs">
                <SelectValue placeholder="10 mục" />
              </SelectTrigger>
              <SelectContent className="bg-white border border-neutral-200 rounded-lg shadow-sm">
                <SelectItem
                  value="10"
                  className="text-xs font-medium cursor-pointer"
                >
                  10 mục
                </SelectItem>
                <SelectItem
                  value="20"
                  className="text-xs font-medium cursor-pointer"
                >
                  20 mục
                </SelectItem>
                <SelectItem
                  value="50"
                  className="text-xs font-medium cursor-pointer"
                >
                  50 mục
                </SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>
      </div>

      {/* TABS ĐIỀU HƯỚNG TỐI GIẢN */}
      <div className="flex gap-1 border-b border-neutral-200 pb-px">
        <button
          onClick={() => setViewMode("active")}
          className={`px-4 py-2 text-xs font-bold uppercase border-b-2 transition-all duration-200 ${
            viewMode === "active"
              ? "border-neutral-950 text-neutral-950 font-extrabold"
              : "border-transparent text-neutral-500"
          }`}
        >
          Kho đang hoạt động (
          {viewMode === "active" ? inventoryList.length : "..."})
        </button>
        <button
          onClick={() => setViewMode("trash")}
          className={`px-4 py-2 text-xs font-bold uppercase border-b-2 transition-all duration-200 ${
            viewMode === "trash"
              ? "border-neutral-950 text-neutral-950 font-extrabold"
              : "border-transparent text-neutral-500"
          }`}
        >
          Thùng rác / Đã xóa tạm
        </button>
      </div>

      {/* DANH SÁCH HIỂN THỊ */}
      {loading ? (
        <div className="text-center py-16 border border-dashed border-neutral-300 rounded-xl font-semibold text-xs text-neutral-400 uppercase bg-neutral-50/50 tracking-wider">
          Đang tải dữ liệu hệ thống kho...
        </div>
      ) : inventoryList.length === 0 ? (
        <div className="text-center py-16 border border-dashed border-neutral-300 rounded-xl font-semibold text-xs text-neutral-400 uppercase bg-neutral-50/50 tracking-wider">
          Không tìm thấy board game nào trùng khớp.
        </div>
      ) : (
        <>
          <div className="grid grid-cols-1 gap-4">
            {inventoryList.map((game) => (
              <InventoryCard
                key={game.id}
                game={game}
                viewMode={viewMode}
                onEdit={(id) => {
                  setSelectedInventoryId(id);
                  setIsEditOpen(true);
                }}
                onDelete={handleDelete}
                onRestore={handleRestore}
              />
            ))}
          </div>

          {/* CỤM ĐIỀU HƯỚNG PHÂN TRANG */}
          <div className="flex items-center justify-end gap-2 pt-2 shrink-0">
            <span className="text-xs font-medium text-neutral-500 mr-2">
              Trang {pageNumber}
            </span>
            <Button
              type="button"
              variant="outline"
              disabled={pageNumber <= 1 || loading}
              onClick={() => setPageNumber(pageNumber - 1)}
              className="h-8 w-8 p-0 rounded-md border-neutral-200 hover:bg-neutral-50"
            >
              <ChevronLeft className="w-4 h-4" />
            </Button>
            <Button
              type="button"
              variant="outline"
              disabled={inventoryList.length < pageSize || loading}
              onClick={() => setPageNumber(pageNumber + 1)}
              className="h-8 w-8 p-0 rounded-md border-neutral-200 hover:bg-neutral-50"
            >
              <ChevronRight className="w-4 h-4" />
            </Button>
          </div>
        </>
      )}

      {/* POPUPS DIALOGS */}
      {cafeId && (
        <>
          <AddGameDialog
            isOpen={isAddOpen}
            onClose={() => setIsAddOpen(false)}
            cafeId={cafeId}
            onSuccess={refreshInventory}
          />
          <EditGameDialog
            isOpen={isEditOpen}
            onClose={() => {
              setIsEditOpen(false);
              setSelectedInventoryId(null);
            }}
            cafeId={cafeId}
            inventoryId={selectedInventoryId}
            onSuccess={refreshInventory}
          />
        </>
      )}
    </div>
  );
}
