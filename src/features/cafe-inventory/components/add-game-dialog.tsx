"use client";

import { useState, useEffect, useMemo, useRef, useCallback } from "react";
import Image from "next/image";
import { toast } from "sonner";
import { apiClient } from "@/core/api/client";
import {
  type MasterGameItem,
  useBulkAddInventory,
} from "../hooks/useBulkAddInventory";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Search, Trash2, Plus, Minus, Inbox, ImageOff } from "lucide-react";
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

/** Hard cap mirrored in the validator — keeps the Sheet from accepting
 *  more selections than the API will. */
const MAX_CART_ITEMS = 20;
/** Largest box quantity a single game template can have at insert time. */
const MAX_BOX_QUANTITY = 1000;

interface CartItem {
  gameTemplateId: string;
  gameName: string;
  gameThumbnailUrl: string | null;
  boxQuantity: number;
  status: "Available" | "Maintenance";
  componentPenalties: { gameComponentTemplateId: string; penaltyFee: number }[];
}

interface CardConfig {
  status: "Available" | "Maintenance";
  quantity: number;
}

const NETWORK_FALLBACK_VI =
  "Không thể tải danh sách board game hệ thống. Vui lòng kiểm tra mạng và thử lại.";

interface GameThumbnailProps {
  src: string | null;
  alt: string;
  size: number;
  className?: string;
}

/** Tiny thumbnail with a graceful fallback when the master-game API
 *  returns a broken / 404 / blocked image URL. Renders Next/Image so
 *  the loading is lazy and respects the configured remote patterns.
 *  When the image fails to load — or no URL was provided — we swap to
 *  a neutral pill with an `ImageOff` icon so the card still reads as
 *  a product card instead of an empty box. */
function GameThumbnail({ src, alt, size, className }: GameThumbnailProps) {
  const [errored, setErrored] = useState(false);
  const showImage = src && !errored;
  return (
    <div
      className={`relative shrink-0 overflow-hidden rounded-md bg-neutral-100 ${className ?? ""}`}
      style={{ width: size, height: size }}
      aria-hidden={!showImage}
    >
      {showImage ? (
        <Image
          src={src}
          alt={alt}
          fill
          sizes={`${size}px`}
          unoptimized
          className="object-cover"
          onError={() => setErrored(true)}
        />
      ) : (
        <div className="flex h-full w-full items-center justify-center text-neutral-400">
          <ImageOff className="h-1/2 w-1/2" aria-hidden />
        </div>
      )}
    </div>
  );
}

export function AddGameDialog({
  isOpen,
  onClose,
  cafeId,
  onSuccess,
}: AddGameDialogProps) {
  // Local UI state — the Sheet remounts on close so these reset
  // naturally without a "reset on isOpen=false" effect.
  const [searchTerm, setSearchTerm] = useState("");
  const [cart, setCart] = useState<CartItem[]>([]);
  const [cardConfigs, setCardConfigs] = useState<Record<string, CardConfig>>(
    {},
  );
  const [submitLoading, setSubmitLoading] = useState(false);
  const submitLoadingRef = useRef(false);

  const { masterGames, loading, refreshFor } = useBulkAddInventory(
    isOpen,
    cafeId,
  );

  // Keep a stable handle to `refreshFor` so the debounce effect below
  // doesn't list it as a dependency — the hook returns a stable
  // callback already, but storing it in a ref is a belt-and-braces
  // guard that keeps the dep list down to `[isOpen, searchTerm]`.
  const refreshForRef = useRef(refreshFor);
  useEffect(() => {
    refreshForRef.current = refreshFor;
  }, [refreshFor]);

  // Debounced refresh — keeps the search input snappy while still
  // triggering a fresh fetch once typing settles. The early `return`
  // on the first render where `searchTerm` is empty AND the hook
  // already kicked off the initial prime fetch is important: without
  // it the dialog would fire one extra `/board-games` on mount and
  // race with the prime call.
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  useEffect(() => {
    if (!isOpen) return;
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => {
      refreshForRef.current(searchTerm);
    }, 350);
    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
    };
  }, [isOpen, searchTerm]);

  // Card config defaults are read on-demand with a getter-style helper
  // (see `getCardConfig`) so we don't need a "seed new configs as
  // masterGames grows" effect — that would be the
  // `react-hooks/set-state-in-effect` lint violation this file
  // already steers around. The downside is configs reset on close
  // alongside the cart, which is fine for a dialog-scoped concern.
  const getCardConfig = (gameId: string): CardConfig =>
    cardConfigs[gameId] ?? { status: "Available", quantity: 1 };

  const toggleCardStatus = (gameId: string) => {
    setCardConfigs((prev) => {
      const current = prev[gameId] ?? { status: "Available", quantity: 1 };
      return {
        ...prev,
        [gameId]: {
          ...current,
          status: current.status === "Available" ? "Maintenance" : "Available",
        },
      };
    });
  };

  const updateCardQuantity = (gameId: string, val: number) => {
    const clamped = Math.max(1, Math.min(MAX_BOX_QUANTITY, val));
    setCardConfigs((prev) => ({
      ...prev,
      [gameId]: { ...prev[gameId], quantity: clamped },
    }));
  };

  const addToCart = (game: MasterGameItem) => {
    // Status on the card is intentionally NOT carried over into the
    // cart row: the user-facing intent of "Chọn game" is to add the
    // game in its default, ready-to-rent state. If the manager wants
    // a row in maintenance they can flip the pill inside the cart
    // summary on the right. Reading `cardConfigs[game.id]?.status`
    // here would silently propagate a stale toggle — exactly what the
    // report "ấn + thì status tự chuyển sang Bảo trì" was about.
    //
    // We also snap the left-hand card pill back to "Sẵn sàng" after
    // a successful add so the two sides never disagree about the
    // current intent. Quantity is preserved (the manager may want to
    // re-add the same game with the same box count later).
    const quantity =
      cardConfigs[game.id]?.quantity ?? 1;
    setCart((prev) => {
      if (prev.some((item) => item.gameTemplateId === game.id)) return prev;
      if (prev.length >= MAX_CART_ITEMS) {
        toast.error(`Tối đa ${MAX_CART_ITEMS} tựa mỗi lần nhập kho.`);
        return prev;
      }
      const componentPenalties = (game.components || []).map(
        (comp: { id: string }) => ({
          gameComponentTemplateId: comp.id,
          penaltyFee: 0,
        }),
      );
      return [
        ...prev,
        {
          gameTemplateId: game.id,
          gameName: game.name,
          gameThumbnailUrl: game.thumbnailUrl ?? null,
          boxQuantity: quantity,
          status: "Available",
          componentPenalties,
        },
      ];
    });
    setCardConfigs((prev) => {
      const current = prev[game.id] ?? { status: "Available", quantity };
      // No-op when the card is already at default — avoids a needless
      // re-render of the (now-disabled) "Chọn game" button row.
      if (current.status === "Available" && current.quantity === quantity) {
        return prev;
      }
      return {
        ...prev,
        [game.id]: { status: "Available", quantity },
      };
    });
  };

  const removeFromCart = (gameTemplateId: string) => {
    setCart((prev) => prev.filter((item) => item.gameTemplateId !== gameTemplateId));
  };

  const updateCartItemQuantity = (id: string, qty: number) => {
    const clamped = Math.max(1, Math.min(MAX_BOX_QUANTITY, qty));
    setCart((prev) =>
      prev.map((item) =>
        item.gameTemplateId === id ? { ...item, boxQuantity: clamped } : item,
      ),
    );
  };

  const updateCartItemStatus = (id: string, status: "Available" | "Maintenance") => {
    setCart((prev) =>
      prev.map((item) => (item.gameTemplateId === id ? { ...item, status } : item)),
    );
  };

  const clearCart = () => setCart([]);

  const handleBulkSubmit = useCallback(async () => {
    if (submitLoadingRef.current) return;
    if (cart.length === 0) return;
    if (cart.length > MAX_CART_ITEMS) {
      toast.error(`Mỗi lần nhập tối đa ${MAX_CART_ITEMS} tựa.`);
      return;
    }
    submitLoadingRef.current = true;
    setSubmitLoading(true);

    // Promise.allSettled so a single 4xx for one game doesn't kill the
    // rest of the batch — the manager can fix the bad rows and
    // re-submit only those, instead of starting over.
    const results = await Promise.allSettled(
      cart.map((item) =>
        apiClient.post(`/api/cafes/${cafeId}/inventory`, {
          gameTemplateId: item.gameTemplateId,
          boxQuantity: item.boxQuantity,
          status: item.status,
          componentPenalties: item.componentPenalties,
        }),
      ),
    );

    const failed = results
      .map((result, i) => ({ result, item: cart[i] }))
      .filter((entry) => entry.result.status === "rejected");

    if (failed.length === 0) {
      toast.success(`Nhập kho thành công ${cart.length} tựa game.`);
      clearCart();
      onSuccess();
      onClose();
    } else if (failed.length === cart.length) {
      const first = failed[0];
      const rejected = first.result as PromiseRejectedResult;
      const reason =
        rejected.reason instanceof Error
          ? rejected.reason.message
          : typeof rejected.reason === "string"
            ? rejected.reason
            : NETWORK_FALLBACK_VI;
      // Log the full rejection so we can diagnose failures that the
      // toast can't surface (status code, upstream message, payload).
      // Without this, "thêm game không thành công" is a black box —
      // the user reports the symptom but we can't tell whether it's a
      // 401, a 403 on cafe ownership, a 422 from the validator, or a
      // network timeout.
      console.error("[add-game-dialog] all cart rows failed", {
        cafeId,
        cart: cart.map((c) => ({
          gameTemplateId: c.gameTemplateId,
          gameName: c.gameName,
          boxQuantity: c.boxQuantity,
          status: c.status,
          penaltyCount: c.componentPenalties.length,
        })),
        rejection: rejected.reason,
      });
      toast.error(reason);
    } else {
      const succeededIds = new Set(
        results
          .map((r, i) => ({ r, i }))
          .filter((entry) => entry.r.status === "fulfilled")
          .map((entry) => cart[entry.i].gameTemplateId),
      );
      setCart((prev) =>
        prev.filter((it) => !succeededIds.has(it.gameTemplateId)),
      );
      const failedNames = failed
        .map((f) => f.item.gameName)
        .join(", ");
      toast.error(
        `${failed.length}/${cart.length} tựa nhập thất bại: ${failedNames}. Vui lòng thử lại với các mục còn lại.`,
      );
      onSuccess();
    }

    submitLoadingRef.current = false;
    setSubmitLoading(false);
  }, [cart, cafeId, onSuccess, onClose]);

  const cartIsFull = cart.length === MAX_CART_ITEMS;
  // Avoid re-creating the empty-state copy unless the search term flips.
  const noResultsLabel = useMemo(() => {
    if (searchTerm.trim()) {
      return `Không có tựa game nào khớp với “${searchTerm.trim()}”.`;
    }
    return "Không còn tựa game nào có thể nhập — tất cả đều đã ở trong kho hoặc thùng rác.";
  }, [searchTerm]);

  return (
    <Sheet open={isOpen} onOpenChange={onClose}>
      <SheetContent
        side="right"
        className="!w-[70vw] !max-w-[70vw] h-screen bg-[#F6F6F7] p-0 flex flex-col gap-0 border-l border-neutral-200 text-neutral-900 font-sans antialiased overflow-hidden"
      >
        <SheetHeader className="bg-white p-5 border-b border-neutral-200 shrink-0">
          <SheetTitle className="text-lg font-bold tracking-tight text-neutral-900">
            Nhập game mới
          </SheetTitle>
          <SheetDescription className="text-xs font-medium text-neutral-500">
            Tìm kiếm board game hệ thống, thêm vào danh sách và thiết lập trạng
            thái, số lượng trực tiếp tại vùng Summary.
          </SheetDescription>
        </SheetHeader>

        <div className="flex-1 flex min-h-0 w-full overflow-hidden">
          {/* PHÂN VÙNG 1: TÌM KIẾM & LƯỚI CARD (70% DIỆN TÍCH) */}
          <div className="w-[70%] p-6 flex flex-col gap-4 min-h-0 border-r border-neutral-200 bg-[#F6F6F7]">
            <div className="relative shrink-0">
              <label htmlFor="add-game-search" className="sr-only">
                Tìm kiếm board game
              </label>
              <Search
                className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-neutral-400"
                aria-hidden
              />
              <Input
                id="add-game-search"
                type="search"
                role="searchbox"
                inputMode="search"
                autoComplete="off"
                placeholder="Nhập từ khóa tìm kiếm tên board game hệ thống..."
                value={searchTerm}
                maxLength={120}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full h-10 border-neutral-200 rounded-lg pl-9 bg-white text-sm focus-visible:ring-1 focus-visible:ring-neutral-400 shadow-xs"
              />
            </div>

            <div
              className="flex-1 overflow-y-auto pr-2 min-h-0 scrollbar-thin"
              aria-busy={loading}
              aria-live="polite"
            >
              {loading ? (
                <div className="text-center py-20 text-xs font-semibold text-neutral-400 uppercase tracking-wider">
                  Đang quét dữ liệu kho…
                </div>
              ) : masterGames.length === 0 ? (
                <div className="text-center py-20 px-6 space-y-1">
                  <Inbox
                    className="w-7 h-7 text-neutral-300 mx-auto"
                    aria-hidden
                  />
                  <p className="text-xs font-semibold text-neutral-400 uppercase tracking-wider max-w-sm mx-auto leading-relaxed">
                    {noResultsLabel}
                  </p>
                </div>
              ) : (
                <ul className="grid grid-cols-1 xl:grid-cols-2 gap-4 pb-6 list-none p-0 auto-rows-fr">
                  {masterGames.map((game) => {
                    const isAddedInCart = cart.some(
                      (c) => c.gameTemplateId === game.id,
                    );
                    const config = getCardConfig(game.id);
                    return (
                      <li
                        key={game.id}
                        className="group bg-white border border-neutral-200/80 rounded-xl p-4 flex flex-col gap-3 h-full transition-all hover:border-neutral-300 hover:shadow-sm min-w-0"
                      >
                        <div className="flex gap-3 min-w-0">
                          <GameThumbnail
                            src={game.thumbnailUrl}
                            alt={game.name}
                            size={56}
                            className="rounded-lg border border-neutral-200/60"
                          />
                          <div className="flex-1 space-y-1.5 min-w-0">
                            <h4 className="font-bold text-sm text-neutral-900 tracking-tight line-clamp-2 leading-snug">
                              {game.name}
                            </h4>
                            <p className="text-xs text-neutral-500 line-clamp-2 leading-relaxed">
                              {game.description?.trim() ||
                                "Chưa có mô tả tóm tắt nội dung."}
                            </p>
                          </div>
                        </div>

                        <div className="mt-auto border-t border-neutral-100 pt-3 space-y-2.5 shrink-0">
                          <div className="flex items-center gap-2 min-w-0">
                            <button
                              type="button"
                              aria-label={
                                config.status === "Available"
                                  ? `Đặt ${game.name} thành Bảo trì`
                                  : `Đặt ${game.name} thành Sẵn sàng`
                              }
                              aria-pressed={config.status !== "Available"}
                              onClick={() => toggleCardStatus(game.id)}
                              className={`h-7 px-2.5 text-[10px] font-bold uppercase tracking-wide rounded-md border transition-colors shrink-0 ${
                                config.status === "Available"
                                  ? "bg-emerald-50 border-emerald-200 text-emerald-700 hover:bg-emerald-100"
                                  : "bg-amber-50 border-amber-200 text-amber-800 hover:bg-amber-100"
                              }`}
                            >
                              {config.status === "Available"
                                ? "Sẵn sàng"
                                : "Bảo trì"}
                            </button>

                            <div
                              role="group"
                              aria-label={`Số hộp cho ${game.name}`}
                              className="flex items-center border border-neutral-200 rounded-md bg-white h-7 px-0.5 shadow-xs ml-auto"
                            >
                              <Button
                                type="button"
                                aria-label="Giảm 1 hộp"
                                disabled={config.quantity <= 1}
                                onClick={() =>
                                  updateCardQuantity(game.id, config.quantity - 1)
                                }
                                className="h-6 w-7 p-0 text-neutral-400 hover:text-neutral-900 transition-colors disabled:opacity-30"
                              >
                                <Minus className="w-3 h-3" aria-hidden />
                              </Button>

                              <Input
                                type="number"
                                aria-label={`Số hộp cho ${game.name}`}
                                inputMode="numeric"
                                min={1}
                                max={MAX_BOX_QUANTITY}
                                step={1}
                                value={config.quantity}
                                onChange={(e) => {
                                  const raw = e.target.value;
                                  if (raw === "") {
                                    updateCardQuantity(game.id, 1);
                                    return;
                                  }
                                  const parsed = parseInt(raw, 10);
                                  if (Number.isNaN(parsed)) return;
                                  updateCardQuantity(game.id, parsed);
                                }}
                                className="w-12 h-6 text-center text-sm font-mono font-bold text-neutral-800 focus:outline-none bg-transparent tabular-nums border-0 focus-visible:ring-0 px-1"
                              />

                              <Button
                                type="button"
                                aria-label="Tăng 1 hộp"
                                disabled={config.quantity >= MAX_BOX_QUANTITY}
                                onClick={() =>
                                  updateCardQuantity(game.id, config.quantity + 1)
                                }
                                className="h-6 w-7 p-0 text-neutral-400 hover:text-neutral-900 transition-colors disabled:opacity-30"
                              >
                                <Plus className="w-3 h-3" aria-hidden />
                              </Button>
                            </div>
                          </div>

                          <Button
                            type="button"
                            disabled={isAddedInCart || cartIsFull}
                            aria-label={
                              isAddedInCart
                                ? `${game.name} đã có trong danh sách nhập`
                                : cartIsFull
                                  ? `Đã đạt giới hạn ${MAX_CART_ITEMS} tựa — không thể thêm`
                                  : `Thêm ${game.name} vào danh sách nhập`
                            }
                            onClick={() => addToCart(game)}
                            className="w-full h-8 bg-neutral-950 text-white hover:bg-neutral-800 text-[11px] font-bold uppercase tracking-wider rounded-md disabled:bg-neutral-100 disabled:text-neutral-400 shadow-xs transition-colors"
                          >
                            {isAddedInCart ? "Đã chọn" : "Chọn game"}
                          </Button>
                        </div>
                      </li>
                    );
                  })}
                </ul>
              )}
            </div>
          </div>

          {/* PHÂN VÙNG 2: SUMMARY TÓM TẮT GIỎ HÀNG (30% DIỆN TÍCH) */}
          <aside
            aria-label="Danh sách chờ nhập"
            className="w-[30%] bg-white p-5 flex flex-col justify-between min-h-0 shadow-[-2px_0px_12px_rgba(0,0,0,0.03)] z-10"
          >
            <div className="flex flex-col min-h-0 flex-1">
              <div className="border-b border-neutral-100 pb-3 flex justify-between items-center shrink-0">
                <span className="text-xs font-bold uppercase tracking-wider text-neutral-900">
                  Danh sách chọn ({cart.length}/{MAX_CART_ITEMS})
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

              <ul className="flex-1 overflow-y-auto space-y-3 pt-3 pr-1 min-h-0 scrollbar-thin list-none p-0">
                {cart.length === 0 ? (
                  <li className="text-center py-20 text-xs text-neutral-400 font-medium leading-relaxed px-4">
                    Chưa có board game nào được chọn vào danh sách tóm tắt.
                  </li>
                ) : (
                  cart.map((item) => (
                    <li
                      key={item.gameTemplateId}
                      className="border border-neutral-200/80 rounded-xl p-3 space-y-2.5 bg-neutral-50/50 relative transition-colors hover:border-neutral-300 min-w-0"
                    >
                      <Button
                        type="button"
                        aria-label={`Bỏ ${item.gameName} khỏi danh sách`}
                        onClick={() => removeFromCart(item.gameTemplateId)}
                        className="absolute top-2.5 right-2.5 h-6 w-6 p-0 text-neutral-400 hover:text-red-600 transition-colors z-10"
                      >
                        <Trash2 className="w-3.5 h-3.5" aria-hidden />
                      </Button>

                      <div className="flex gap-2.5 min-w-0">
                        <GameThumbnail
                          src={item.gameThumbnailUrl}
                          alt={item.gameName}
                          size={40}
                          className="rounded-md border border-neutral-200/60"
                        />
                        <div className="font-bold text-xs text-neutral-900 pr-7 line-clamp-2 leading-snug">
                          {item.gameName}
                        </div>
                      </div>

                      <div className="flex items-center gap-2 border-t border-neutral-100/70 pt-2.5">
                        <button
                          type="button"
                          aria-label={
                            item.status === "Available"
                              ? `Đặt ${item.gameName} thành Bảo trì`
                              : `Đặt ${item.gameName} thành Sẵn sàng`
                          }
                          aria-pressed={item.status !== "Available"}
                          onClick={() =>
                            updateCartItemStatus(
                              item.gameTemplateId,
                              item.status === "Available"
                                ? "Maintenance"
                                : "Available",
                            )
                          }
                          className={`h-7 px-2.5 text-[10px] font-bold uppercase tracking-wide rounded-md border transition-colors shrink-0 ${
                            item.status === "Available"
                              ? "bg-emerald-50 border-emerald-200 text-emerald-700 hover:bg-emerald-100"
                              : "bg-amber-50 border-amber-200 text-amber-800 hover:bg-amber-100"
                          }`}
                        >
                          {item.status === "Available" ? "Sẵn sàng" : "Bảo trì"}
                        </button>

                        <div
                          role="group"
                          aria-label={`Số hộp cho ${item.gameName}`}
                          className="flex items-center border border-neutral-200 rounded-md bg-white h-7 px-0.5 shadow-xs ml-auto"
                        >
                          <Button
                            type="button"
                            aria-label="Giảm 1 hộp"
                            disabled={item.boxQuantity <= 1}
                            onClick={() =>
                              updateCartItemQuantity(
                                item.gameTemplateId,
                                item.boxQuantity - 1,
                              )
                            }
                            className="h-6 w-7 p-0 text-neutral-400 hover:text-neutral-900 transition-colors disabled:opacity-30"
                          >
                            <Minus className="w-3 h-3" aria-hidden />
                          </Button>

                          <Input
                            type="number"
                            aria-label={`Số hộp cho ${item.gameName}`}
                            inputMode="numeric"
                            min={1}
                            max={MAX_BOX_QUANTITY}
                            step={1}
                            value={item.boxQuantity}
                            onChange={(e) => {
                              const raw = e.target.value;
                              if (raw === "") {
                                updateCartItemQuantity(item.gameTemplateId, 1);
                                return;
                              }
                              const parsed = parseInt(raw, 10);
                              if (Number.isNaN(parsed)) return;
                              updateCartItemQuantity(item.gameTemplateId, parsed);
                            }}
                            className="w-12 h-6 text-center text-sm font-mono font-bold text-neutral-800 focus:outline-none bg-transparent tabular-nums border-0 focus-visible:ring-0 px-1"
                          />

                          <Button
                            type="button"
                            aria-label="Tăng 1 hộp"
                            disabled={item.boxQuantity >= MAX_BOX_QUANTITY}
                            onClick={() =>
                              updateCartItemQuantity(
                                item.gameTemplateId,
                                item.boxQuantity + 1,
                              )
                            }
                            className="h-6 w-7 p-0 text-neutral-400 hover:text-neutral-900 transition-colors disabled:opacity-30"
                          >
                            <Plus className="w-3 h-3" aria-hidden />
                          </Button>
                        </div>
                      </div>
                    </li>
                  ))
                )}
              </ul>
            </div>

            <div className="pt-4 border-t border-neutral-100 shrink-0 bg-white">
              <Button
                type="button"
                onClick={() => {
                  void handleBulkSubmit();
                }}
                disabled={cart.length === 0 || submitLoading}
                aria-busy={submitLoading}
                className="w-full h-10 bg-gradient-to-b from-[#2A2A2A] to-[#1A1A1A] text-white font-semibold text-xs uppercase tracking-wider rounded-lg border border-neutral-950 border-t-neutral-700 shadow-[0px_1px_2px_rgba(0,0,0,0.15),inset_0px_1px_0px_rgba(255,255,255,0.08)] hover:from-[#333333] hover:to-[#222222] active:from-[#1A1A1A] active:to-[#111111] disabled:from-neutral-200 disabled:to-neutral-200 disabled:text-neutral-400 disabled:border-neutral-200 disabled:shadow-none flex items-center justify-center gap-2 transition-all duration-150"
              >
                {submitLoading ? (
                  <>
                    <span
                      className="w-3.5 h-3.5 border-2 border-white/20 border-t-white rounded-full animate-spin"
                      aria-hidden
                    />
                    <span>ĐANG LƯU KHO…</span>
                  </>
                ) : (
                  `XÁC NHẬN NHẬP KHO (${cart.length})`
                )}
              </Button>
              {cartIsFull && (
                <p
                  role="status"
                  className="mt-2 text-[10px] text-neutral-500 text-center"
                >
                  Đã đạt giới hạn {MAX_CART_ITEMS} tựa mỗi lần nhập.
                </p>
              )}
            </div>
          </aside>
        </div>
      </SheetContent>
    </Sheet>
  );
}