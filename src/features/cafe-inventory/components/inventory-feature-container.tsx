"use client";

import { useState } from "react";
import Link from "next/link";
import { useInventory } from "@/features/cafe-inventory/hooks/useInventory";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ROUTES } from "@/core/constants/routes";
import {
  Search,
  ArrowUp,
  ArrowDown,
  ChevronLeft,
  ChevronRight,
  AlertCircle,
  RefreshCw,
  X,
  Trash2,
  Store,
} from "lucide-react";
import { InventoryCard } from "@/features/cafe-inventory/components/inventory-card";
import { AddGameDialog } from "@/features/cafe-inventory/components/add-game-dialog";
import { EditGameDialog } from "@/features/cafe-inventory/components/edit-game-dialog";
import {
  AlertDialog,
  AlertDialogContent,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogCancel,
  AlertDialogAction,
} from "@/components/ui/alert-dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

/** Hard caps that match the API validators so the UI never offers options
 *  the upstream would immediately reject. */
const PAGE_SIZE_OPTIONS = [10, 20, 50] as const;

/** Visual treatment for primary CTAs across this surface — single source
 *  of truth so header CTA, empty-state CTA, and confirm dialogs all
 *  match. */
const PRIMARY_BUTTON_CLASS =
  "h-10 bg-gradient-to-b from-[#2A2A2A] to-[#1A1A1A] text-white font-semibold text-xs uppercase tracking-wider rounded-lg border border-neutral-950 border-t-neutral-700 shadow-[0px_1px_2px_rgba(0,0,0,0.15),inset_0px_1px_0px_rgba(255,255,255,0.08)] hover:from-[#333333] hover:to-[#222222] active:from-[#1A1A1A] active:to-[#111111] disabled:from-neutral-200 disabled:to-neutral-200 disabled:text-neutral-400 disabled:border-neutral-200 disabled:shadow-none transition-all duration-150";

/** Destructive CTA — soft red on white, pairs with `PRIMARY_BUTTON_CLASS`
 *  for the same disabled treatment so a disabled primary and a disabled
 *  destructive read identically. */
const DESTRUCTIVE_BUTTON_CLASS =
  "h-9 bg-red-600 text-white font-semibold text-xs uppercase tracking-wider rounded-lg border border-red-700 hover:bg-red-700 active:bg-red-800 disabled:from-neutral-200 disabled:to-neutral-200 disabled:text-neutral-400 disabled:border-neutral-200 disabled:shadow-none px-5 flex items-center justify-center gap-2 transition-all duration-150";

/** Secondary CTA in the dialog footer — explicit cancel surface, pairs
 *  with the destructive action. */
const SECONDARY_BUTTON_CLASS =
  "h-9 border border-neutral-200 bg-white text-neutral-700 font-semibold text-xs uppercase tracking-wider rounded-lg px-5 hover:bg-neutral-50 hover:text-neutral-900 transition-colors disabled:opacity-50";

/** Visual treatment for the AlertDialog content surface. Mirrors the
 *  card and panel surfaces elsewhere on the page so the dialog feels
 *  native to the inventory, not borrowed from another feature. */
const DIALOG_CONTENT_CLASS =
  "bg-white border border-neutral-200/80 rounded-xl p-6 shadow-[0px_8px_24px_rgba(0,0,0,0.06)] max-w-md mx-auto text-neutral-900";

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
    totalCount,
    loading,
    error,
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
    requestDelete,
    confirmDelete,
    cancelDelete,
    pendingDeleteId,
    mutatingId,
    handleRestore,
  } = useInventory();

  // Pass-through flag to the edit dialog: true when the user clicked
  // the `+N` overflow on the card (signalling "I came here for the
  // component list"), false when they clicked "Sửa hồ sơ" (signalling
  // "let me see the box count and status first"). Reset on close so
  // the next open defaults to the natural top.
  const [scrollToComponentsOnOpen, setScrollToComponentsOnOpen] =
    useState(false);

  // "Is there a next page?" — prefer the upstream total when available
  // (correct on every page); otherwise fall back to the cheap heuristic
  // (works for every page except the last full one, which is an
  // acceptable failure mode for a polish pass — the API contract
  // upgrade to expose `totalCount` is the proper fix).
  const hasNextPage =
    totalCount !== null
      ? pageNumber * pageSize < totalCount
      : inventoryList.length >= pageSize;

  // `my-cafes` resolved empty — manager chưa sở hữu cơ sở nào (hoặc cafe
  // chưa activate và upstream filter). Nút "Thêm game" bị disable nhưng
  // user không có lý do rõ ràng → hiển thị inline hint + link đăng ký
  // cafe thay vì để nút chết khô mà không biết tại sao.
  const noCafeResolved = !cafeId && !loading && !error;

  return (
    <div className="space-y-6">
      {/* HEADER BAR */}
      <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-3 border-b border-neutral-200 pb-4">
        <div className="min-w-0">
          <h1 className="text-xl font-bold tracking-tight text-neutral-950">
            Quản Lý Kho Board Game
          </h1>
          <p className="text-xs text-neutral-500 font-medium mt-0.5">
            Xem trạng thái chi tiết, lưu trữ và khôi phục danh mục trò chơi của
            cơ sở.
          </p>
        </div>
        <div className="flex items-center gap-3 shrink-0">
          <Button
            onClick={() => setIsAddOpen(true)}
            disabled={!cafeId}
            aria-label="Thêm board game mới vào kho"
            className={`${PRIMARY_BUTTON_CLASS} px-4`}
          >
            + Thêm Game Mới
          </Button>
        </div>
      </div>

      {/* Inline hint khi manager chưa có cơ sở — giải thích tại sao nút
          "Thêm game" bị disable và chỉ đường đến form đăng ký cafe. */}
      {noCafeResolved && (
        <div
          role="status"
          aria-live="polite"
          className="flex flex-wrap items-start gap-3 text-xs text-neutral-700 px-3 py-2.5 rounded-lg border border-amber-200 bg-amber-50"
        >
          <Store
            className="h-4 w-4 mt-0.5 shrink-0 text-amber-700"
            aria-hidden
          />
          <div className="leading-snug flex-1 min-w-0">
            <p className="font-medium text-amber-900">
              Bạn chưa có cơ sở nào để quản lý kho.
            </p>
            <p className="text-amber-800/90 mt-0.5">
              Đăng ký một cơ sở trước rồi quay lại đây để nhập các board
              game. Bạn có thể thêm game ngay cả khi chưa kích hoạt.
            </p>
          </div>
          <Button
            asChild
            size="sm"
            variant="outline"
            className="h-7 text-xs font-medium border-amber-300 bg-white hover:bg-amber-100 text-amber-900 shrink-0"
          >
            <Link href={ROUTES.PARTNER.REGISTER}>
              Đăng ký cơ sở
            </Link>
          </Button>
        </div>
      )}

      {/* FILTER BAR — single column on mobile, two columns from `sm`,
          four columns from `xl`. The previous `lg:grid-cols-4` made
          the cells too narrow at common laptop widths (1024-1280px)
          because the sort cell holds a Select + toggle button pair;
          two controls per cell need ~280px each, and four of those
          don't fit in 1024px. Defer the 4-up layout to `xl` (≥1280px)
          where each cell has comfortable room. */}
      <div className="w-full bg-neutral-50 p-4 border border-neutral-200 rounded-xl">
        <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-3">
          {/* Search — the only cell without a label before this
              change, which made its row taller than the other three
              and broke the grid alignment. Adding a small uppercase
              label matches the visual rhythm of the three sibling
              cells and keeps the column heights in lockstep. */}
          <div className="min-w-0">
            <label
              htmlFor="inventory-search"
              className="block text-[11px] font-bold text-neutral-500 uppercase tracking-tight mb-1"
            >
              Tìm kiếm
            </label>
            <div className="relative min-w-0">
              <Search
                className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-neutral-400 pointer-events-none"
                aria-hidden
              />
              <Input
                id="inventory-search"
                type="search"
                role="searchbox"
                inputMode="search"
                autoComplete="off"
                placeholder="Tìm nhanh tên game..."
                value={searchTerm}
                maxLength={120}
                onChange={(e) => {
                  setSearchTerm(e.target.value);
                  setPageNumber(1);
                }}
                className="w-full h-9 border-neutral-200 rounded-lg pl-9 pr-9 bg-white text-xs shadow-2xs focus-visible:ring-1 focus-visible:ring-neutral-400"
              />
              {/* Clear button — surfaced only when the field has content.
                  `type="button"` keeps it from triggering form submit if
                  the field ever moves inside a form ancestor. */}
              {searchTerm.length > 0 && (
                <button
                  type="button"
                  onClick={() => {
                    setSearchTerm("");
                    setPageNumber(1);
                  }}
                  aria-label="Xóa nội dung tìm kiếm"
                  className="absolute right-2 top-1/2 -translate-y-1/2 h-6 w-6 inline-flex items-center justify-center rounded-md text-neutral-400 hover:text-neutral-900 hover:bg-neutral-100 transition-colors"
                >
                  <X className="w-3.5 h-3.5" aria-hidden />
                </button>
              )}
            </div>
          </div>

          {/* Status */}
          <div className="min-w-0">
            <label
              htmlFor="inventory-status-filter"
              className="block text-[11px] font-bold text-neutral-500 uppercase tracking-tight mb-1"
            >
              Trạng thái
            </label>
            <Select
              value={status}
              onValueChange={(val) => {
                setStatus(val);
                setPageNumber(1);
              }}
            >
              <SelectTrigger
                id="inventory-status-filter"
                className="h-9 w-full bg-white border-neutral-200 text-xs font-semibold rounded-lg focus:ring-0 focus:ring-offset-0 shadow-2xs"
              >
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

          {/* Sort by + direction */}
          <div className="min-w-0">
            <label
              htmlFor="inventory-sort-by"
              className="block text-[11px] font-bold text-neutral-500 uppercase tracking-tight mb-1"
            >
              Sắp xếp
            </label>
            <div className="flex items-stretch -space-x-px">
              <Select value={sortBy} onValueChange={(val) => setSortBy(val)}>
                <SelectTrigger
                  id="inventory-sort-by"
                  className="h-9 w-full bg-white border-neutral-200 text-xs font-semibold rounded-l-lg rounded-r-none focus:ring-0 focus:ring-offset-0 shadow-2xs"
                >
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

              {/*
                Direction toggle — icon-only since the previous design
                showed both an icon AND a "Giảm"/"Tăng" label, which
                pushed this cell wider than the other three and broke
                the 4-column grid at common laptop widths. We now
                surface the state via the icon itself: ArrowDown for
                descending, ArrowUp for ascending. The `aria-label`
                carries the same meaning for screen readers, and the
                title attribute gives hover users the explicit text.
              */}
              <button
                type="button"
                aria-label={
                  sortDescending
                    ? "Đang sắp xếp giảm dần — bấm để chuyển sang tăng dần"
                    : "Đang sắp xếp tăng dần — bấm để chuyển sang giảm dần"
                }
                title={sortDescending ? "Giảm dần" : "Tăng dần"}
                aria-pressed={sortDescending}
                onClick={() => setSortDescending(!sortDescending)}
                className={`h-9 w-9 shrink-0 flex items-center justify-center text-xs font-bold rounded-r-lg border border-neutral-200 transition-colors bg-white shadow-2xs select-none ${
                  sortDescending
                    ? "text-neutral-950"
                    : "text-neutral-500"
                }`}
              >
                {sortDescending ? (
                  <ArrowDown className="w-3.5 h-3.5" aria-hidden />
                ) : (
                  <ArrowUp className="w-3.5 h-3.5" aria-hidden />
                )}
              </button>
            </div>
          </div>

          {/* Page size */}
          <div className="min-w-0">
            <label
              htmlFor="inventory-page-size"
              className="block text-[11px] font-bold text-neutral-500 uppercase tracking-tight mb-1"
            >
              Hiển thị
            </label>
            <Select
              value={String(pageSize)}
              onValueChange={(val) => {
                // Guard against a malformed upstream value or a future
                // SelectItem with a non-numeric `value` — `parseInt`
                // returns NaN, and sending `pageSize=NaN` to the BE
                // would 400 the request.
                const parsed = parseInt(val, 10);
                if (Number.isFinite(parsed) && parsed > 0) {
                  setPageSize(parsed);
                  setPageNumber(1);
                }
              }}
            >
              <SelectTrigger
                id="inventory-page-size"
                className="h-9 w-full bg-white border-neutral-200 text-xs font-semibold rounded-lg focus:ring-0 focus:ring-offset-0 shadow-2xs"
              >
                <SelectValue placeholder="10 mục" />
              </SelectTrigger>
              <SelectContent className="bg-white border border-neutral-200 rounded-lg shadow-sm">
                {PAGE_SIZE_OPTIONS.map((size) => (
                  <SelectItem
                    key={size}
                    value={String(size)}
                    className="text-xs font-medium cursor-pointer"
                  >
                    {size} mục
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>
      </div>

      {/* TABS — count reflects `totalCount` (real total) when the
          upstream exposes it, else falls back to "…". Showing a page
          count here was misleading: it said "10" when there were 47. */}
      <div
        role="tablist"
        aria-label="Chế độ hiển thị kho"
        className="flex gap-1 border-b border-neutral-200"
      >
        <button
          role="tab"
          aria-selected={viewMode === "active"}
          onClick={() => setViewMode("active")}
          className={`px-4 py-2 text-xs font-bold uppercase border-b-2 transition-all duration-200 ${
            viewMode === "active"
              ? "border-neutral-950 text-neutral-950"
              : "border-transparent text-neutral-500 hover:text-neutral-700"
          }`}
        >
          Kho đang hoạt động
          {totalCount !== null && viewMode === "active" && (
            <span
              className="ml-1.5 text-[10px] font-bold text-neutral-500 tabular-nums"
              aria-label={`${totalCount} mục`}
            >
              ({totalCount})
            </span>
          )}
        </button>
        <button
          role="tab"
          aria-selected={viewMode === "trash"}
          onClick={() => setViewMode("trash")}
          className={`px-4 py-2 text-xs font-bold uppercase border-b-2 transition-all duration-200 ${
            viewMode === "trash"
              ? "border-neutral-950 text-neutral-950"
              : "border-transparent text-neutral-500 hover:text-neutral-700"
          }`}
        >
          Thùng rác / Đã xóa tạm
          {totalCount !== null && viewMode === "trash" && (
            <span
              className="ml-1.5 text-[10px] font-bold text-neutral-500 tabular-nums"
              aria-label={`${totalCount} mục trong thùng rác`}
            >
              ({totalCount})
            </span>
          )}
        </button>
      </div>

      {/* ERROR STATE — recoverable network / 5xx with retry. */}
      {error && !loading && inventoryList.length === 0 ? (
        <div
          role="alert"
          aria-live="assertive"
          className="flex flex-col items-center justify-center gap-3 py-12 border border-red-200 bg-red-50/60 rounded-xl text-center"
        >
          <AlertCircle className="w-7 h-7 text-red-500" aria-hidden />
          <div className="space-y-1 px-6">
            <p className="text-sm font-bold text-red-700">
              Không tải được kho game
            </p>
            <p className="text-xs font-medium text-red-600/80 max-w-md">
              {error.message}
            </p>
          </div>
          <Button
            type="button"
            onClick={() => void refreshInventory()}
            className="h-8 px-3.5 bg-white text-neutral-800 hover:bg-neutral-50 font-semibold text-xs uppercase border border-neutral-200 rounded-lg shadow-sm"
          >
            <RefreshCw className="w-3.5 h-3.5 mr-1.5" aria-hidden />
            Thử lại
          </Button>
        </div>
      ) : loading ? (
        <div
          aria-live="polite"
          aria-busy="true"
          className="space-y-3"
        >
          {[0, 1, 2].map((i) => (
            <div
              key={i}
              className="border border-neutral-200/80 rounded-xl p-5 bg-white shadow-[0px_1px_3px_rgba(0,0,0,0.04)] animate-pulse"
            >
              <div className="flex items-center gap-2">
                <div className="h-4 w-44 bg-neutral-200 rounded" />
                <div className="h-4 w-16 bg-neutral-100 rounded-md" />
              </div>
              <div className="h-3 w-72 bg-neutral-100 rounded mt-2.5" />
              <div className="h-5 w-32 bg-neutral-900/10 rounded-md mt-3" />
            </div>
          ))}
          <span className="sr-only">Đang tải dữ liệu kho…</span>
        </div>
      ) : inventoryList.length === 0 ? (
        <div className="text-center px-6 py-16 border border-dashed border-neutral-300 rounded-xl bg-neutral-50/50 space-y-2">
          <p className="font-semibold text-sm text-neutral-700">
            {viewMode === "trash"
              ? "Thùng rác đang trống."
              : searchTerm || status !== "All"
                ? "Không tìm thấy board game nào trùng khớp với bộ lọc hiện tại."
                : "Kho game của quán đang trống."}
          </p>
          <p className="text-xs font-medium text-neutral-500 max-w-md mx-auto">
            {viewMode === "trash"
              ? "Mục bạn xóa tạm sẽ xuất hiện ở đây và có thể khôi phục lại."
              : searchTerm || status !== "All"
                ? "Thử bỏ bộ lọc hoặc đổi từ khóa tìm kiếm để thấy các tựa khác."
                : "Bắt đầu bằng cách nhập các board game từ danh mục hệ thống."}
          </p>
          {/* Only show the primary CTA when the cafe context is loaded —
              otherwise the button would error on open. */}
          {viewMode === "active" && !searchTerm && status === "All" && cafeId && (
            <Button
              type="button"
              onClick={() => setIsAddOpen(true)}
              className={`${PRIMARY_BUTTON_CLASS} mt-3 px-4`}
            >
              + Thêm game đầu tiên
            </Button>
          )}
          {/* Khi không có cafe: hint inline + link đăng ký thay vì nút
              "Thêm game đầu tiên" chết khô. */}
          {viewMode === "active" &&
            !searchTerm &&
            status === "All" &&
            noCafeResolved && (
              <div className="mt-3 inline-flex flex-col items-center gap-2">
                <p className="text-xs text-neutral-600">
                  Bạn cần đăng ký một cơ sở trước khi nhập kho.
                </p>
                <Button
                  asChild
                  size="sm"
                  variant="outline"
                  className="h-8 text-xs font-medium"
                >
                  <Link href={ROUTES.PARTNER.REGISTER}>
                    Đăng ký cơ sở ngay
                  </Link>
                </Button>
              </div>
            )}
        </div>
      ) : (
        <>
          <p
            aria-live="polite"
            aria-atomic="true"
            className="sr-only"
          >
            {`Hiển thị ${inventoryList.length} mục trên trang ${pageNumber}.`}
          </p>

          <ul className="grid grid-cols-1 gap-4 list-none p-0">
            {inventoryList.map((game) => {
              const isThisRowMutating = mutatingId === game.id;
              return (
                <li key={game.id}>
                  <InventoryCard
                    game={game}
                    viewMode={viewMode}
                    isMutating={isThisRowMutating}
                    onEdit={(id) => {
                      setSelectedInventoryId(id);
                      setScrollToComponentsOnOpen(false);
                      setIsEditOpen(true);
                    }}
                    onOpenComponents={(id) => {
                      setSelectedInventoryId(id);
                      setScrollToComponentsOnOpen(true);
                      setIsEditOpen(true);
                    }}
                    onDelete={requestDelete}
                    onRestore={handleRestore}
                  />
                </li>
              );
            })}
          </ul>

          <nav
            aria-label="Phân trang kho game"
            className="flex items-center justify-end gap-2 pt-2 shrink-0"
          >
            <span className="text-xs font-medium text-neutral-500 mr-2">
              Trang {pageNumber}
              {totalCount !== null && (
                <span className="text-neutral-400 ml-1 tabular-nums">
                  / {Math.max(1, Math.ceil(totalCount / pageSize))}
                </span>
              )}
            </span>
            <Button
              type="button"
              variant="outline"
              aria-label="Trang trước"
              disabled={pageNumber <= 1 || loading}
              onClick={() => setPageNumber(pageNumber - 1)}
              className="h-8 w-8 p-0 rounded-md border-neutral-200 hover:bg-neutral-50 disabled:opacity-50"
            >
              <ChevronLeft className="w-4 h-4" />
            </Button>
            <Button
              type="button"
              variant="outline"
              aria-label="Trang sau"
              disabled={!hasNextPage || loading}
              onClick={() => setPageNumber(pageNumber + 1)}
              className="h-8 w-8 p-0 rounded-md border-neutral-200 hover:bg-neutral-50 disabled:opacity-50"
            >
              <ChevronRight className="w-4 h-4" />
            </Button>
          </nav>
        </>
      )}

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
              setScrollToComponentsOnOpen(false);
            }}
            cafeId={cafeId}
            inventoryId={selectedInventoryId}
            onSuccess={refreshInventory}
            scrollToComponentsOnOpen={scrollToComponentsOnOpen}
          />
        </>
      )}

      {/* Soft-delete confirmation. Replaces the native `window.confirm`
          so the action matches the rest of the design system, supports
          keyboard nav, and is screen-reader friendly.

          The dialog stays open while `mutatingId` is set so the in-flight
          spinner inside the action button stays visible — closing the
          dialog the moment the user clicks "Xóa tạm" would leave the
          user without feedback during the network round-trip. */}
      <AlertDialog
        open={pendingDeleteId !== null || Boolean(mutatingId)}
        onOpenChange={(open) => {
          // Only honor the user's dismiss intent when nothing is
          // currently in flight — closing the dialog mid-request would
          // race with the in-flight `setMutatingId(null)` and lose the
          // success/error toast.
          if (!open && !mutatingId) cancelDelete();
        }}
      >
        <AlertDialogContent className={DIALOG_CONTENT_CLASS}>
          <AlertDialogHeader className="border-b border-neutral-100 pb-3 mb-4 space-y-1">
            <AlertDialogTitle className="text-lg font-bold tracking-tight text-neutral-900 flex items-center gap-2">
              <Trash2
                className="w-4 h-4 text-red-500"
                aria-hidden
              />
              Xóa tạm tựa game?
            </AlertDialogTitle>
            <AlertDialogDescription className="text-xs font-medium text-neutral-500">
              Tựa game sẽ được chuyển vào thùng rác và có thể khôi phục lại
              bất kỳ lúc nào. Hành động này không xóa vĩnh viễn.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter className="gap-2 sm:gap-2">
            <AlertDialogCancel
              type="button"
              disabled={Boolean(mutatingId)}
              onClick={cancelDelete}
              className={SECONDARY_BUTTON_CLASS}
            >
              Hủy
            </AlertDialogCancel>
            <AlertDialogAction
              type="button"
              disabled={Boolean(mutatingId)}
              onClick={() => {
                void confirmDelete();
              }}
              className={DESTRUCTIVE_BUTTON_CLASS}
            >
              {mutatingId ? (
                <>
                  <span
                    className="w-3 h-3 border-2 border-white/30 border-t-white rounded-full animate-spin"
                    aria-hidden
                  />
                  <span>ĐANG XÓA…</span>
                </>
              ) : (
                "Xóa tạm"
              )}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}