"use client";

import { useBulkAddInventory } from "../hooks/useBulkAddInventory";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Search, Trash2, Plus, Minus } from "lucide-react";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetDescription,
} from "@/components/ui/sheet";

interface AddGameDialogProps {
  isOpen: boolean;
  onClose: () => void;
  cafeId: string;
  onSuccess: () => void;
}

export function AddGameDialog({
  isOpen,
  onClose,
  cafeId,
  onSuccess,
}: AddGameDialogProps) {
  const {
    searchTerm,
    setSearchTerm,
    masterGames,
    cart,
    clearCart,
    loading,
    submitLoading,
    addToCart,
    removeFromCart,
    updateCartItemQuantity,
    updateCartItemStatus,
    handleBulkSubmit,
  } = useBulkAddInventory(isOpen, cafeId, onClose, onSuccess);

  return (
    <Sheet open={isOpen} onOpenChange={onClose}>
      <SheetContent
        side="right"
        className="!w-[70vw] !max-w-[70vw] h-screen bg-[#F6F6F7] p-0 flex flex-col gap-0 border-l border-neutral-200 text-neutral-900 font-sans antialiased overflow-hidden"
      >
        {/* HEADER */}
        <SheetHeader className="bg-white p-5 border-b border-neutral-200 shrink-0">
          <SheetTitle className="text-lg font-bold tracking-tight text-neutral-900">
            Nhập game mới
          </SheetTitle>
          <SheetDescription className="text-xs font-medium text-neutral-500">
            Tìm kiếm board game hệ thống, thêm vào danh sách và thiết lập trạng
            thái, số lượng trực tiếp tại vùng Summary.
          </SheetDescription>
        </SheetHeader>

        {/* WORKSPACE CONTAINER */}
        <div className="flex-1 flex min-h-0 w-full overflow-hidden">
          {/* PHÂN VÙNG 1: TÌM KIẾM & LƯỚI CARD (70% DIỆN TÍCH) */}
          <div className="w-[70%] p-6 flex flex-col gap-4 min-h-0 border-r border-neutral-200 bg-[#F6F6F7]">
            <div className="relative shrink-0">
              <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-neutral-400" />
              <Input
                type="text"
                placeholder="Nhập từ khóa tìm kiếm tên board game hệ thống..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full h-10 border-neutral-200 rounded-lg pl-9 bg-white text-sm focus-visible:ring-1 focus-visible:ring-neutral-400 shadow-xs"
              />
            </div>

            {/* VÙNG LƯỚI CARD CUỘN */}
            <div className="flex-1 overflow-y-auto pr-2 min-h-0 scrollbar-thin">
              {loading ? (
                <div className="text-center py-20 text-xs font-semibold text-neutral-400 uppercase tracking-wider">
                  Đang quét dữ liệu kho...
                </div>
              ) : masterGames.length === 0 ? (
                <div className="text-center py-20 text-xs font-semibold text-neutral-400 uppercase tracking-wider">
                  Không có tựa game mới nào phù hợp.
                </div>
              ) : (
                <div className="grid grid-cols-1 xl:grid-cols-2 gap-4 pb-6">
                  {masterGames.map((game) => {
                    const isAddedInCart = cart.some(
                      (c) => c.gameTemplateId === game.id,
                    );

                    return (
                      <div
                        key={game.id}
                        className="bg-white border border-neutral-200/80 rounded-xl p-4 flex flex-col justify-between gap-3 min-h-[130px] h-auto transition-all hover:border-neutral-300"
                      >
                        <div className="space-y-1.5 min-w-0">
                          <h4 className="font-bold text-sm text-neutral-900 truncate tracking-tight">
                            {game.name}
                          </h4>
                          <p className="text-xs text-neutral-400 line-clamp-2 leading-normal">
                            {game.description ||
                              "Chưa có mô tả tóm tắt nội dung."}
                          </p>
                        </div>

                        {/* ĐÃ SỬA: Đưa dòng linh kiện và nút Chọn Game nằm ngang hàng nhau */}
                        <div className="flex items-center justify-between gap-2 border-t border-neutral-100 pt-2.5 mt-auto shrink-0">
                          <span className="inline-block text-[10px] font-semibold text-neutral-500 bg-neutral-50 border border-neutral-200 rounded px-2 py-0.5 tracking-tight truncate max-w-[70%]">
                            💡 Linh kiện: Phí phạt mặc định là 0đ
                          </span>

                          <Button
                            type="button"
                            disabled={isAddedInCart}
                            onClick={() => addToCart(game)}
                            className="h-7 px-3.5 bg-neutral-950 text-white hover:bg-neutral-800 text-[11px] font-semibold rounded-md disabled:bg-neutral-100 disabled:text-neutral-400 shrink-0 shadow-xs transition-colors"
                          >
                            {isAddedInCart ? "Đã Chọn" : "Chọn Game"}
                          </Button>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          </div>

          {/* PHÂN VÙNG 2: SUMMARY TÓM TẮT GIỎ HÀNG (30% DIỆN TÍCH) */}
          <div className="w-[30%] bg-white p-5 flex flex-col justify-between min-h-0 shadow-[-2px_0px_12px_rgba(0,0,0,0.03)] z-10">
            <div className="flex flex-col min-h-0 flex-1">
              <div className="border-b border-neutral-100 pb-3 flex justify-between items-center shrink-0">
                <span className="text-xs font-bold uppercase tracking-wider text-neutral-900">
                  Danh sách chọn ({cart.length})
                </span>
                {cart.length > 0 && (
                  <button
                    type="button"
                    onClick={clearCart}
                    className="text-[10px] font-bold text-neutral-400 hover:text-red-500 uppercase transition-colors"
                  >
                    Xóa hết
                  </button>
                )}
              </div>

              {/* Danh sách cuộn các game đã chọn ở summary */}
              <div className="flex-1 overflow-y-auto space-y-3 pt-3 pr-1 min-h-0 scrollbar-thin">
                {cart.length === 0 ? (
                  <div className="text-center py-20 text-xs text-neutral-400 font-medium leading-relaxed px-4">
                    Chưa có board game nào được chọn vào danh sách tóm tắt.
                  </div>
                ) : (
                  cart.map((item) => (
                    <div
                      key={item.gameTemplateId}
                      className="border border-neutral-200/80 rounded-xl p-3 space-y-3 bg-neutral-50/50 relative transition-colors hover:border-neutral-300"
                    >
                      <Button
                        type="button"
                        onClick={() => removeFromCart(item.gameTemplateId)}
                        className="absolute top-2.5 right-2.5 text-neutral-400 hover:text-red-600 transition-colors"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </Button>

                      <div className="font-bold text-xs text-neutral-900 pr-6 truncate">
                        {item.gameName}
                      </div>

                      <div className="flex items-center justify-between gap-2 border-t border-neutral-100/70 pt-2">
                        <button
                          type="button"
                          onClick={() =>
                            updateCartItemStatus(
                              item.gameTemplateId,
                              item.status === "Available"
                                ? "Maintenance"
                                : "Available",
                            )
                          }
                          className={`h-6 px-2 text-[9px] font-bold uppercase rounded-md border transition-colors ${
                            item.status === "Available"
                              ? "bg-emerald-50 border-emerald-200 text-emerald-700"
                              : "bg-red-50 border-red-200 text-red-600"
                          }`}
                        >
                          {item.status === "Available"
                            ? "Available"
                            : "UnAvail"}
                        </button>

                        <div className="flex items-center border border-neutral-200 rounded-md bg-white h-6 px-0.5 shadow-2xs">
                          <Button
                            type="button"
                            onClick={() =>
                              updateCartItemQuantity(
                                item.gameTemplateId,
                                item.boxQuantity - 1,
                              )
                            }
                            className="p-1 text-neutral-400 hover:text-neutral-900 transition-colors"
                          >
                            <Minus className="w-2.5 h-2.5" />
                          </Button>

                          <Input
                            type="number"
                            min={1}
                            max={1000}
                            value={item.boxQuantity}
                            onChange={(e) =>
                              updateCartItemQuantity(
                                item.gameTemplateId,
                                parseInt(e.target.value) || 1,
                              )
                            }
                            className="w-8 h-full text-center text-xs font-mono font-bold text-neutral-800 focus:outline-none bg-transparent"
                          />

                          <Button
                            type="button"
                            onClick={() =>
                              updateCartItemQuantity(
                                item.gameTemplateId,
                                item.boxQuantity + 1,
                              )
                            }
                            className="p-1 text-neutral-400 hover:text-neutral-900 transition-colors"
                          >
                            <Plus className="w-2.5 h-2.5" />
                          </Button>
                        </div>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>

            {/* ACTION SUBMIT CHÂN FORM */}
            <div className="pt-4 border-t border-neutral-100 shrink-0 bg-white">
              <Button
                type="button"
                onClick={handleBulkSubmit}
                disabled={
                  cart.length === 0 || cart.length > 20 || submitLoading
                }
                className="w-full h-10 bg-linear-to-b from-[#2A2A2A] to-[#1A1A1A] text-white font-semibold text-xs uppercase tracking-wider rounded-lg border border-neutral-950 border-t-neutral-700 shadow-[0px_1px_2px_rgba(0,0,0,0.15),inset_0px_1px_0px_rgba(255,255,255,0.08)] hover:from-[#333333] hover:to-[#222222] active:from-[#1A1A1A] active:to-[#111111] disabled:from-neutral-200 disabled:to-neutral-200 disabled:text-neutral-400 disabled:border-neutral-200 disabled:shadow-none flex items-center justify-center gap-2 transition-all duration-150"
              >
                {submitLoading ? (
                  <>
                    <span className="w-3.5 h-3.5 border-2 border-white/20 border-t-white rounded-full animate-spin" />
                    <span>ĐANG LƯU KHO...</span>
                  </>
                ) : (
                  `XÁC NHẬN NHẬP KHO (${cart.length})`
                )}
              </Button>
            </div>
          </div>
        </div>
      </SheetContent>
    </Sheet>
  );
}
