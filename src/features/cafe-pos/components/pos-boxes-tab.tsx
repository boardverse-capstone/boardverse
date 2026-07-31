"use client";

import { useState, useMemo } from "react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import {
  Search,
  Box,
  Barcode,
  Copy,
  Check,
  ChevronRight,
  X,
  Layers,
} from "lucide-react";

export interface PosBoxItem {
  id: string;
  cafeGameInventoryId: string;
  gameTemplateId: string;
  gameName: string;
  barcode: string;
  status: string;
}

interface PosBoxesTabProps {
  boxes: PosBoxItem[];
}

interface GroupedGame {
  gameName: string;
  gameTemplateId: string;
  totalBoxes: number;
  availableBoxes: PosBoxItem[];
  allBoxes: PosBoxItem[];
}

export function PosBoxesTab({ boxes }: PosBoxesTabProps) {
  const [searchTerm, setSearchTerm] = useState("");
  const [copiedBarcode, setCopiedBarcode] = useState<string | null>(null);
  const [selectedGame, setSelectedGame] = useState<GroupedGame | null>(null);

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
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 bg-white p-4 rounded-xl border border-neutral-200 shadow-2xs">
        <div className="relative flex-1">
          <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-neutral-400" />
          <Input
            type="text"
            placeholder="Tìm theo tên trò chơi hoặc mã Barcode..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full h-9 pl-9 text-xs border-neutral-200 rounded-lg bg-neutral-50/50"
          />
        </div>
        <div className="text-xs font-semibold text-neutral-500 shrink-0">
          Tổng cộng: <b className="text-neutral-950">{groupedGames.length}</b>{" "}
          tựa game ({boxes.length} hộp)
        </div>
      </div>

      {/* DANH SÁCH HÀNG DỌC (MỖI HÀNG NGANG CHỈ 1 BOX GAME) */}
      {filteredGroups.length === 0 ? (
        <div className="text-center py-16 border border-dashed border-neutral-300 rounded-2xl bg-white text-xs font-semibold text-neutral-400 uppercase tracking-wider">
          Không tìm thấy tựa game nào trùng khớp.
        </div>
      ) : (
        <div className="flex flex-col gap-2.5">
          {filteredGroups.map((group) => {
            const firstAvailableBox = group.availableBoxes[0];
            const hasAvailable = group.availableBoxes.length > 0;

            return (
              <div
                key={group.gameName}
                onClick={() => setSelectedGame(group)}
                className="group w-full bg-white border border-neutral-200 rounded-xl p-3.5 flex items-center justify-between gap-4 shadow-2xs hover:border-neutral-400 transition-all cursor-pointer select-none"
              >
                {/* BÊN TRÁI: ICON VÀ TÊN GAME */}
                <div className="flex items-center gap-3.5 min-w-0 flex-1">
                  <div className="w-10 h-10 rounded-xl bg-neutral-100 border border-neutral-200 flex items-center justify-center text-neutral-700 shrink-0 group-hover:bg-neutral-950 group-hover:text-white transition-colors">
                    <Box className="w-5 h-5" />
                  </div>
                  <div className="min-w-0 space-y-0.5">
                    <h4 className="font-extrabold text-sm text-neutral-950 truncate">
                      {group.gameName}
                    </h4>
                    <div className="flex items-center gap-2 text-[11px] text-neutral-500">
                      <span className="font-semibold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-md border border-emerald-200">
                        {group.availableBoxes.length}/{group.totalBoxes} hộp sẵn
                        sàng
                      </span>
                    </div>
                  </div>
                </div>

                {/* BÊN PHẢI: CỤM CHÉP MÃ VÀ XEM DETAIL */}
                <div className="flex items-center gap-3 shrink-0">
                  {hasAvailable ? (
                    <Button
                      type="button"
                      size="sm"
                      onClick={(e) =>
                        handleCopyBarcode(firstAvailableBox.barcode, e)
                      }
                      className="h-8 px-3 bg-neutral-950 text-white hover:bg-neutral-800 text-xs font-bold rounded-lg flex items-center gap-1.5 shadow-2xs"
                    >
                      {copiedBarcode === firstAvailableBox.barcode ? (
                        <>
                          <Check className="w-3.5 h-3.5 text-emerald-400" />
                          <span className="text-emerald-400">Đã chép</span>
                        </>
                      ) : (
                        <>
                          <Copy className="w-3.5 h-3.5" />
                          <span>Chép mã</span>
                        </>
                      )}
                    </Button>
                  ) : (
                    <span className="text-[11px] font-bold text-neutral-400 bg-neutral-100 px-2.5 py-1 rounded-lg border border-neutral-200">
                      Hết hộp trống
                    </span>
                  )}

                  <div className="p-1 text-neutral-400 group-hover:text-neutral-950 transition-colors">
                    <ChevronRight className="w-5 h-5" />
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* MODAL CHI TIẾT - DANH SÁCH CÁC HỘP TRONG TỰA GAME */}
      {selectedGame && (
        <div className="fixed inset-0 bg-neutral-950/40 backdrop-blur-xs z-50 flex items-center justify-center p-4">
          <div className="bg-white border border-neutral-200 rounded-2xl max-w-lg w-full p-6 space-y-4 shadow-xl">
            {/* HEADER MODAL */}
            <div className="flex items-center justify-between border-b border-neutral-100 pb-3">
              <div className="flex items-center gap-2">
                <div className="p-2 rounded-lg bg-neutral-100 border border-neutral-200">
                  <Layers className="w-4 h-4 text-neutral-800" />
                </div>
                <div>
                  <h3 className="font-bold text-base text-neutral-950">
                    {selectedGame.gameName}
                  </h3>
                  <p className="text-[11px] text-neutral-500 font-medium">
                    Danh sách {selectedGame.totalBoxes} hộp game vật lý trong
                    kho
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setSelectedGame(null)}
                className="text-neutral-400 hover:text-neutral-950 p-1 rounded-lg hover:bg-neutral-100 transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* DANH SÁCH CHI TIẾT TỪNG HỘP VẬT LÝ */}
            <div className="max-h-72 overflow-y-auto space-y-2 pr-1 scrollbar-thin">
              {selectedGame.allBoxes.map((box, index) => {
                const isAvail = box.status === "Available";
                const isCopied = copiedBarcode === box.barcode;

                return (
                  <div
                    key={box.id}
                    className="flex items-center justify-between p-3 bg-neutral-50 rounded-xl border border-neutral-200/80 hover:border-neutral-300 transition-colors"
                  >
                    <div className="space-y-0.5">
                      <div className="flex items-center gap-2">
                        <span className="font-bold text-xs text-neutral-900">
                          {box.gameName} #{index + 1}
                        </span>
                        <span
                          className={`px-1.5 py-0.2 rounded text-[9px] font-bold uppercase border ${
                            isAvail
                              ? "bg-emerald-50 text-emerald-700 border-emerald-200"
                              : "bg-amber-100 text-amber-800 border-amber-200"
                          }`}
                        >
                          {box.status}
                        </span>
                      </div>
                      <div className="flex items-center gap-1 text-[11px] font-mono text-neutral-500">
                        <Barcode className="w-3 h-3 text-neutral-400" />
                        <span>{box.barcode}</span>
                      </div>
                    </div>

                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={() => handleCopyBarcode(box.barcode)}
                      className="h-8 px-3 text-xs font-semibold rounded-lg bg-white border-neutral-200 hover:bg-neutral-100"
                    >
                      {isCopied ? (
                        <>
                          <Check className="w-3.5 h-3.5 text-emerald-600 mr-1" />
                          <span className="text-emerald-600 font-bold">
                            Đã chép
                          </span>
                        </>
                      ) : (
                        <>
                          <Copy className="w-3.5 h-3.5 mr-1" />
                          <span>Chép mã</span>
                        </>
                      )}
                    </Button>
                  </div>
                );
              })}
            </div>

            {/* FOOTER MODAL */}
            <div className="pt-3 border-t border-neutral-100 flex justify-end">
              <Button
                type="button"
                variant="outline"
                onClick={() => setSelectedGame(null)}
                className="h-9 text-xs rounded-lg px-4 border-neutral-200"
              >
                Đóng
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
