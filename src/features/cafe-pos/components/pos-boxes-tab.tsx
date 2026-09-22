"use client";

import { useState, useMemo, useEffect } from "react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import {
  Search,
  Barcode,
  Copy,
  Check,
  ChevronRight,
  X,
  Layers,
} from "lucide-react";
import { GameCoverThumb } from "./game-cover-thumb";
import { useGameCoverLookup } from "@/features/pos-check-in/hooks/useGameCoverLookup";
import {
  arcadeCardClass,
  hexChipClass,
  statusOrbClass,
} from "../lib/game-theme";
import { cn } from "@/lib/utils";

// Bảng màu arcade neon cho từng tựa game — xoay vòng theo index
const ARCADE_PALETTES = [
  {
    ring: "border-orange-400",
    soft: "from-orange-100 via-orange-50 to-neutral-50",
    text: "text-orange-950",
    sub: "text-orange-800",
    shadow: "shadow-[2px_2px_0_rgba(249,115,22,0.45)] hover:shadow-[3px_3px_0_rgba(249,115,22,0.6)]",
    accent: "bg-orange-500",
    ledRing: "border-orange-400 bg-orange-100",
    ledOrb: "bg-orange-500",
    chipText: "border-orange-500 bg-gradient-to-b from-orange-400 to-orange-600 text-white",
  },
  {
    ring: "border-amber-400",
    soft: "from-amber-100 via-orange-50 to-orange-50",
    text: "text-amber-950",
    sub: "text-amber-800",
    shadow: "shadow-[2px_2px_0_rgba(245,158,11,0.45)] hover:shadow-[3px_3px_0_rgba(245,158,11,0.6)]",
    accent: "bg-amber-500",
    ledRing: "border-amber-400 bg-amber-100",
    ledOrb: "bg-amber-500",
    chipText: "border-amber-500 bg-gradient-to-b from-amber-400 to-amber-600 text-white",
  },
  {
    ring: "border-amber-400",
    soft: "from-amber-100 via-yellow-50 to-orange-50",
    text: "text-amber-950",
    sub: "text-amber-800",
    shadow: "shadow-[2px_2px_0_rgba(245,158,11,0.45)] hover:shadow-[3px_3px_0_rgba(245,158,11,0.6)]",
    accent: "bg-amber-500",
    ledRing: "border-amber-400 bg-amber-100",
    ledOrb: "bg-amber-500",
    chipText: "border-amber-500 bg-gradient-to-b from-amber-400 to-amber-600 text-white",
  },
  {
    ring: "border-orange-400",
    soft: "from-orange-100 via-amber-50 to-orange-50",
    text: "text-orange-950",
    sub: "text-orange-800",
    shadow: "shadow-[2px_2px_0_rgba(249,115,22,0.45)] hover:shadow-[3px_3px_0_rgba(249,115,22,0.6)]",
    accent: "bg-orange-500",
    ledRing: "border-orange-400 bg-orange-100",
    ledOrb: "bg-orange-500",
    chipText: "border-orange-500 bg-gradient-to-b from-orange-400 to-orange-600 text-white",
  },
  {
    ring: "border-amber-400",
    soft: "from-amber-100 via-amber-50 to-amber-50",
    text: "text-amber-950",
    sub: "text-amber-800",
    shadow: "shadow-[2px_2px_0_rgba(245,158,11,0.45)] hover:shadow-[3px_3px_0_rgba(245,158,11,0.6)]",
    accent: "bg-amber-500",
    ledRing: "border-amber-400 bg-amber-100",
    ledOrb: "bg-amber-500",
    chipText: "border-amber-500 bg-gradient-to-b from-amber-400 to-amber-600 text-white",
  },
  {
    ring: "border-orange-400",
    soft: "from-orange-100 via-orange-50 to-amber-50",
    text: "text-orange-950",
    sub: "text-orange-800",
    shadow: "shadow-[2px_2px_0_rgba(249,115,22,0.45)] hover:shadow-[3px_3px_0_rgba(249,115,22,0.6)]",
    accent: "bg-orange-500",
    ledRing: "border-orange-400 bg-orange-100",
    ledOrb: "bg-orange-500",
    chipText: "border-orange-500 bg-gradient-to-b from-orange-400 to-orange-600 text-white",
  },
  {
    ring: "border-neutral-400",
    soft: "from-neutral-100 via-orange-50 to-orange-50",
    text: "text-neutral-950",
    sub: "text-neutral-800",
    shadow: "shadow-[2px_2px_0_rgba(249,115,22,0.45)] hover:shadow-[3px_3px_0_rgba(249,115,22,0.6)]",
    accent: "bg-neutral-500",
    ledRing: "border-neutral-400 bg-neutral-100",
    ledOrb: "bg-neutral-500",
    chipText: "border-neutral-500 bg-gradient-to-b from-neutral-400 to-neutral-600 text-white",
  },
] as const;

function paletteFor(idx: number) {
  return ARCADE_PALETTES[idx % ARCADE_PALETTES.length];
}

export interface PosBoxItem {
  id: string;
  cafeGameInventoryId: string;
  gameTemplateId: string;
  gameName: string;
  barcode: string;
  status: string;
  /** Ảnh bìa game (có thể có hoặc không). */
  imageUrl?: string | null;
}

/** Hộp Available mới được gán / thêm vào phiên. */
export function isBoxStatusAvailable(status?: string | null) {
  return (
    String(status ?? "")
      .toLowerCase()
      .replace(/[_\s-]/g, "") === "available"
  );
}

/** Barcode đang gắn phiên live (Active/Checking/Unpaid…). */
export function getAssignedBoxBarcodes(sessions: any[]): Set<string> {
  const set = new Set<string>();
  for (const session of sessions) {
    const games = session?.games ?? session?.Games ?? [];
    if (!Array.isArray(games)) continue;
    for (const game of games) {
      const barcode = String(
        game?.boxBarcode ?? game?.BoxBarcode ?? game?.barcode ?? "",
      ).trim();
      if (barcode) set.add(barcode.toUpperCase());
    }
  }
  return set;
}

/** Hộp Available và không còn nằm trong games của phiên đang chạy. */
export function filterBoxesAssignableForPos(
  boxes: PosBoxItem[],
  sessions: any[],
): PosBoxItem[] {
  const assigned = getAssignedBoxBarcodes(sessions);
  return boxes.filter((box) => {
    if (!isBoxStatusAvailable(box.status)) return false;
    const barcode = String(box.barcode ?? "").trim();
    if (!barcode) return false;
    if (assigned.has(barcode.toUpperCase())) return false;
    return true;
  });
}

interface PosBoxesTabProps {
  boxes: PosBoxItem[];
  cafeId?: string | null;
}

interface GroupedGame {
  gameName: string;
  gameTemplateId: string;
  totalBoxes: number;
  availableBoxes: PosBoxItem[];
  allBoxes: PosBoxItem[];
}

export function PosBoxesTab({ boxes, cafeId }: PosBoxesTabProps) {
  const [searchTerm, setSearchTerm] = useState("");
  const [copiedBarcode, setCopiedBarcode] = useState<string | null>(null);
  const [selectedGame, setSelectedGame] = useState<GroupedGame | null>(null);
  const { lookup } = useGameCoverLookup(cafeId, boxes);

  // Nhấn Escape để đóng modal chi tiết game
  useEffect(() => {
    if (!selectedGame) return;
    const onKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") setSelectedGame(null);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [selectedGame]);

  // 1. Sao chép Barcode
  const handleCopyBarcode = (barcode: string, e?: React.MouseEvent) => {
    if (e) e.stopPropagation();
    navigator.clipboard.writeText(barcode);
    setCopiedBarcode(barcode);
    setTimeout(() => setCopiedBarcode(null), 2000);
  };

  // 2. Gom nhóm toàn bộ Hộp Game theo `gameName`
  const groupedGames = useMemo(() => {
    const map = new Map<string, GroupedGame>();

    boxes.forEach((box) => {
      const existing = map.get(box.gameName) || {
        gameName: box.gameName,
        gameTemplateId: box.gameTemplateId,
        totalBoxes: 0,
        availableBoxes: [],
        allBoxes: [],
      };

      existing.totalBoxes += 1;
      existing.allBoxes.push(box);
      if (box.status === "Available") {
        existing.availableBoxes.push(box);
      }

      map.set(box.gameName, existing);
    });

    return Array.from(map.values());
  }, [boxes]);

  // 3. Lọc danh sách theo từ khóa
  const filteredGroups = useMemo(() => {
    if (!searchTerm.trim()) return groupedGames;
    const term = searchTerm.toLowerCase();
    return groupedGames.filter((group) => {
      const matchName = group.gameName.toLowerCase().includes(term);
      const matchBarcode = group.allBoxes.some((b) =>
        b.barcode.toLowerCase().includes(term),
      );
      return matchName || matchBarcode;
    });
  }, [groupedGames, searchTerm]);

  return (
    <div className="space-y-4">
      {/* THANH TÌM KIẾM TỰA GAME */}
      <div className="flex flex-col items-stretch justify-between gap-3 rounded-lg border-2 border-amber-300/70 bg-gradient-to-r from-amber-100/60 via-white to-amber-100/60 p-4 shadow-[2px_2px_0_rgba(245,158,11,0.2)] sm:flex-row sm:items-center">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-amber-500" />
          <Input
            type="text"
            placeholder="Tìm theo tên trò chơi hoặc mã vạch..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="h-9 w-full rounded-md border-2 border-amber-300 bg-white pl-9 font-mono text-xs focus-visible:border-amber-500 focus-visible:ring-amber-300"
          />
        </div>
        <div className="flex shrink-0 items-center gap-2">
          <span className={cn(hexChipClass, "bg-amber-600 text-white shadow-sm")}>
            ► {groupedGames.length} GAMES
          </span>
          <span className={cn(hexChipClass, "bg-amber-600 text-white shadow-sm")}>
            ► {boxes.length} BOXES
          </span>
        </div>
      </div>

      {/* DANH SÁCH HÀNG DỌC (MỖI HÀNG NGANG CHỈ 1 BOX GAME) */}
      {filteredGroups.length === 0 ? (
        <div className="rounded-lg border-2 border-dashed border-amber-300 bg-gradient-to-br from-amber-50/40 to-amber-50/30 py-16 text-center font-mono text-xs font-bold uppercase tracking-widest text-amber-500">
          ▸ KHÔNG TÌM THẤY KẾT QUẢ
        </div>
      ) : (
        <div className="flex flex-col gap-2.5">
          {filteredGroups.map((group, groupIdx) => {
            const firstAvailableBox = group.availableBoxes[0];
            const hasAvailable = group.availableBoxes.length > 0;
            const sampleBox = group.allBoxes[0];
            const coverSrc = lookup({
              gameTemplateId: group.gameTemplateId,
              gameName: group.gameName,
              cafeGameInventoryId: sampleBox?.id ?? sampleBox?.cafeGameInventoryId,
              imageUrl: sampleBox?.imageUrl,
            });
            const pal = paletteFor(groupIdx);

            return (
              <div
                key={group.gameName}
                onClick={() => setSelectedGame(group)}
                className={cn(
                  "group relative flex w-full cursor-pointer select-none items-center justify-between gap-4 overflow-hidden rounded-xl border-2 bg-gradient-to-r p-3.5 transition-all hover:-translate-y-0.5",
                  pal.ring,
                  pal.soft,
                  pal.shadow,
                )}
              >
                {/* CRT scanlines */}
                <div className="pointer-events-none absolute inset-0 bg-[repeating-linear-gradient(0deg,transparent_0,transparent_2px,rgba(255,255,255,0.05)_2px,rgba(255,255,255,0.05)_4px)]" />
                {/* LED góc phải-trên */}
                <span
                  className={cn(
                    "pointer-events-none absolute right-2 top-2 size-1.5 animate-pulse rounded-full shadow-[0_0_6px_currentColor]",
                    pal.ledOrb,
                  )}
                />
                {/* BÊN TRÁI: ICON VÀ TÊN GAME */}
                <div className="relative flex items-center gap-3.5 min-w-0 flex-1">
                  <div className="relative shrink-0">
                    <GameCoverThumb
                      src={coverSrc}
                      alt={group.gameName}
                      initials={group.gameName}
                      size="md"
                      className="ring-2 ring-white/70"
                    />
                    <span
                      className={cn(
                        "absolute -right-1 -top-1 inline-flex size-5 items-center justify-center rounded-full border-2 font-mono text-[9px] font-extrabold",
                        pal.ledRing,
                        pal.text,
                      )}
                    >
                      {groupIdx + 1}
                    </span>
                  </div>
                  <div className="min-w-0 space-y-1">
                    <h4
                      className={cn(
                        "truncate font-mono text-sm font-extrabold uppercase tracking-wider",
                        pal.text,
                      )}
                    >
                      ► {group.gameName}
                    </h4>
                    <div className="flex items-center gap-2">
                      <span
                        className={cn(
                          "inline-flex items-center gap-1 rounded-md border-2 px-2 py-0.5 font-mono text-[10px] font-extrabold uppercase tracking-widest shadow-[inset_0_-1px_0_rgba(0,0,0,0.08)]",
                          hasAvailable
                            ? pal.chipText
                            : "border-orange-500 bg-gradient-to-b from-orange-400 to-orange-600 text-white",
                        )}
                      >
                        <span
                          className={cn(
                            statusOrbClass,
                            hasAvailable ? pal.ledOrb : "bg-orange-500",
                            "[animation-duration:2s]",
                          )}
                        />
                        {group.availableBoxes.length}/{group.totalBoxes} TRỐNG
                      </span>
                      {!hasAvailable && (
                        <span className="inline-flex items-center gap-1 rounded-md border-2 border-orange-400 bg-gradient-to-r from-orange-100 to-orange-100 px-2 py-0.5 font-mono text-[10px] font-extrabold uppercase tracking-widest text-orange-700 shadow-[inset_0_-1px_0_rgba(0,0,0,0.08)]">
                          ⚠ Hết hàng
                        </span>
                      )}
                    </div>
                  </div>
                </div>

                {/* BÊN PHẢI: CỤM CHÉP MÃ VÀ XEM DETAIL */}
                <div className="relative flex items-center gap-3 shrink-0">
                  {hasAvailable ? (
                    <Button
                      type="button"
                      size="sm"
                      onClick={(e) =>
                        handleCopyBarcode(firstAvailableBox.barcode, e)
                      }
                      className={cn(
                        "flex h-8 shrink-0 items-center gap-1.5 rounded-md border-2 px-3 font-mono text-[11px] font-extrabold uppercase tracking-widest text-white shadow-[inset_0_-2px_0_rgba(0,0,0,0.2),0_2px_0_rgba(0,0,0,0.1)]",
                        pal.chipText,
                      )}
                    >
                      {copiedBarcode === firstAvailableBox.barcode ? (
                        <>
                          <Check className="h-3.5 w-3.5 text-orange-200" />
                          <span className="text-orange-100">Đã chép</span>
                        </>
                      ) : (
                        <>
                          <Copy className="h-3.5 w-3.5" />
                          <span>► Sao chép mã</span>
                        </>
                      )}
                    </Button>
                  ) : null}

                  <div
                    className={cn(
                      "rounded-md border-2 bg-white p-1.5 transition-colors group-hover:scale-110",
                      pal.ring,
                      pal.text,
                    )}
                  >
                    <ChevronRight className="h-4 w-4" />
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* MODAL CHI TIẾT - DANH SÁCH CÁC HỘP TRONG TỰA GAME */}
      {selectedGame && (() => {
        const modalPalIdx = groupedGames.findIndex(
          (g) => g.gameName === selectedGame.gameName,
        );
        const modalPal = paletteFor(modalPalIdx >= 0 ? modalPalIdx : 0);
        return (
        <div
          className={cn(
            "fixed inset-0 z-50 flex items-center justify-center p-4 backdrop-blur-xs",
            `bg-${modalPal.ledOrb.replace("bg-", "")}-950/40`,
          )}
          style={{ backgroundColor: "rgba(20, 8, 40, 0.4)" }}
          onClick={(event) => {
            if (event.target === event.currentTarget) {
              setSelectedGame(null);
            }
          }}
        >
          <div
            className={cn(
              "w-full max-w-lg space-y-4 rounded-lg border-2 bg-white p-6 shadow-[4px_4px_0_rgba(0,0,0,0.15),0_10px_30px_rgba(0,0,0,0.15)]",
              modalPal.ring,
            )}
            onClick={(event) => event.stopPropagation()}
          >
            {/* HEADER MODAL */}
            <div className={cn("flex items-center justify-between border-b-2 pb-3", modalPal.ring.replace("border-", "border-b-"))}>
              <div className="flex items-center gap-2">
                <div
                  className={cn(
                    "rounded-md border-2 p-2 text-white shadow-[inset_0_-2px_0_rgba(0,0,0,0.2)]",
                    modalPal.ring,
                    modalPal.chipText,
                  )}
                >
                  <Layers className="size-4" />
                </div>
                <div>
                  <h3
                    className={cn(
                      "font-mono text-base font-extrabold uppercase tracking-tight",
                      modalPal.text,
                    )}
                  >
                    ► {selectedGame.gameName}
                  </h3>
                  <p
                    className={cn(
                      "font-mono text-[11px] font-bold uppercase tracking-widest",
                      modalPal.sub,
                    )}
                  >
                    {selectedGame.totalBoxes} HỘP VẬT LÝ TRONG KHO
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setSelectedGame(null)}
                className={cn(
                  "rounded-lg border-2 p-1 transition-colors",
                  modalPal.ring,
                  modalPal.text,
                  "hover:scale-110",
                )}
              >
                <X className="size-5" />
              </button>
            </div>

            {/* DANH SÁCH CHI TIẾT TỪNG HỘP VẬT LÝ */}
            <div className="scrollbar-thin max-h-72 space-y-2 overflow-y-auto pr-1">
              {selectedGame.allBoxes.map((box, index) => {
                const isAvail = box.status === "Available";
                const isCopied = copiedBarcode === box.barcode;
                const coverSrc = lookup({
                  gameTemplateId: selectedGame.gameTemplateId,
                  gameName: selectedGame.gameName,
                  cafeGameInventoryId: box.id || box.cafeGameInventoryId,
                  imageUrl: box.imageUrl,
                  barcode: box.barcode,
                });

                return (
                  <div
                    key={box.id}
                    className={cn(
                      "group/box relative flex items-center justify-between gap-3 overflow-hidden rounded-xl border-2 p-3 transition-all",
                      isAvail
                        ? cn(
                            `${modalPal.soft} bg-gradient-to-r`,
                            modalPal.ring,
                            "shadow-[2px_2px_0_rgba(0,0,0,0.12)] hover:-translate-y-0.5",
                          )
                        : "border-amber-400 bg-gradient-to-r from-amber-100 via-yellow-50 to-orange-50 shadow-[2px_2px_0_rgba(245,158,11,0.4)]",
                    )}
                  >
                    <div className="pointer-events-none absolute inset-0 bg-[repeating-linear-gradient(0deg,transparent_0,transparent_2px,rgba(255,255,255,0.05)_2px,rgba(255,255,255,0.05)_4px)]" />
                    {isAvail && (
                      <span
                        className={cn(
                          "pointer-events-none absolute right-2 top-2 size-1.5 animate-pulse rounded-full shadow-[0_0_6px_currentColor]",
                          modalPal.ledOrb,
                        )}
                      />
                    )}
                    <div className="relative flex items-center gap-3 min-w-0 flex-1">
                      <GameCoverThumb
                        src={coverSrc}
                        alt={box.gameName}
                        initials={box.gameName}
                        size="sm"
                        className="ring-2 ring-white/70"
                      />
                      <div className="space-y-0.5 min-w-0">
                        <div className="flex flex-wrap items-center gap-2">
                          <span
                            className={cn(
                              "font-mono text-xs font-extrabold uppercase tracking-wider truncate",
                              isAvail ? modalPal.text : "text-amber-950",
                            )}
                          >
                            ► {box.gameName} #{index + 1}
                          </span>
                          <span
                            className={cn(
                              "rounded-md border-2 px-1.5 py-0.5 font-mono text-[9px] font-extrabold uppercase tracking-widest shadow-[inset_0_-1px_0_rgba(0,0,0,0.08)]",
                              isAvail
                                ? modalPal.chipText
                                : "border-amber-500 bg-gradient-to-b from-amber-400 to-amber-600 text-white",
                            )}
                          >
                            {isAvail ? "Sẵn sàng" : "Đang dùng"}
                          </span>
                        </div>
                        <div className={cn("flex items-center gap-1 text-[11px] font-mono font-bold uppercase tracking-widest", isAvail ? modalPal.sub : "text-amber-800")}>
                          <Barcode className={cn("w-3 h-3", isAvail ? modalPal.ledOrb : "text-amber-500")} />
                          <span className="truncate">{box.barcode}</span>
                        </div>
                      </div>
                    </div>

                    <Button
                      type="button"
                      size="sm"
                      onClick={() => handleCopyBarcode(box.barcode)}
                      className={cn(
                        "relative h-8 rounded-md border-2 px-3 font-mono text-[11px] font-extrabold uppercase tracking-widest shadow-[inset_0_-2px_0_rgba(0,0,0,0.2)]",
                        isAvail
                          ? modalPal.chipText
                          : "border-amber-600 bg-gradient-to-b from-amber-400 to-amber-600 text-white",
                      )}
                    >
                      {isCopied ? (
                        <>
                          <Check className="w-3.5 h-3.5 mr-1 text-orange-200" />
                          <span className="text-orange-100">Đã chép</span>
                        </>
                      ) : (
                        <>
                          <Copy className="w-3.5 h-3.5 mr-1" />
                          <span>► Chép mã</span>
                        </>
                      )}
                    </Button>
                  </div>
                );
              })}
            </div>

            {/* FOOTER MODAL */}
            <div className="flex justify-end border-t-2 border-neutral-200 pt-3">
              <Button
                type="button"
                onClick={() => setSelectedGame(null)}
                className={cn(
                  "h-9 rounded-lg border-2 px-4 font-mono text-xs font-extrabold uppercase tracking-widest text-white shadow-[inset_0_-2px_0_rgba(0,0,0,0.2)]",
                  modalPal.chipText,
                )}
              >
                ► Đóng
              </Button>
            </div>
          </div>
        </div>
        );
      })()}
    </div>
  );
}
