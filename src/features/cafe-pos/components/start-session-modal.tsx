/* eslint-disable @typescript-eslint/no-explicit-any */
"use client";

import { useEffect, useMemo, useState } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  X,
  Play,
  Barcode,
  Search,
  AlertTriangle,
  ShieldCheck,
  Loader2,
  Users,
  UserPlus,
  Phone,
  ChevronRight,
  ChevronLeft,
  Layers,
} from "lucide-react";
import { apiClient } from "@/core/api/client";
import { formatPlayerRange, readPlayerRange } from "../lib/player-range";
import type { PosBoxItem } from "./pos-boxes-tab";
import { isBoxStatusAvailable } from "./pos-boxes-tab";
import { NumberStepper } from "./number-stepper";
import { GameCoverThumb } from "./game-cover-thumb";
import { useGameCoverLookup } from "@/features/pos-check-in/hooks/useGameCoverLookup";

/** SĐT VN mobile — cùng rule cafe-partner: 10–11 số, đầu 03/05/07/08/09 */
const VN_MOBILE_PHONE = /^0[35789]\d{8,9}$/;

function isVnWalkInPhone(raw: string) {
  return VN_MOBILE_PHONE.test(raw.replace(/\s/g, ""));
}

function formatBoxStatus(status?: string) {
  const st = String(status ?? "")
    .toLowerCase()
    .replace(/[_\s-]/g, "");
  if (st === "available") return "Sẵn sàng";
  if (st === "inuse" || st === "occupied") return "Đang dùng";
  if (st === "maintenance") return "Bảo trì";
  return status?.trim() || "Không rõ";
}

interface GroupedGame {
  gameName: string;
  gameTemplateId: string;
  totalBoxes: number;
  availableBoxes: PosBoxItem[];
  allBoxes: PosBoxItem[];
}

export interface StartSessionModalProps {
  isOpen: boolean;
  onClose: () => void;
  selectedTable: {
    id: string;
    name: string;
    minPlayers?: number | null;
    maxPlayers?: number | null;
  } | null;
  cafeId: string | null;
  boxes?: PosBoxItem[];
  /** Prefill khách từ cửa sổ walk-in. */
  prefill?: {
    guestCount: number;
    guestNames: string[];
    guestPhones: string[];
  } | null;
  onStart: (
    cafeTableId: string,
    barcode: string,
    walkInGuests?: Array<{ displayName: string; phoneNumber?: string }>,
  ) => Promise<boolean>;
}

export function StartSessionModal({
  isOpen,
  onClose,
  selectedTable,
  cafeId,
  boxes = [],
  prefill = null,
  onStart,
}: StartSessionModalProps) {
  const [barcode, setBarcode] = useState("");
  const [loading, setLoading] = useState(false);
  const [checkingBox, setCheckingBox] = useState(false);
  const [guestCount, setGuestCount] = useState(1);
  const [guestNames, setGuestNames] = useState<string[]>([""]);
  const [guestPhones, setGuestPhones] = useState<string[]>([""]);
  const [pickerOpen, setPickerOpen] = useState(false);
  const [pickerSearch, setPickerSearch] = useState("");
  const [pickerGame, setPickerGame] = useState<GroupedGame | null>(null);

  const [boxInspection, setBoxInspection] = useState<{
    gameName?: string;
    barcode?: string;
    status?: string;
    imageUrl?: string | null;
    minPlayers?: number | null;
    maxPlayers?: number | null;
    missingComponents?: any[];
    hasChecked: boolean;
  } | null>(null);

  useEffect(() => {
    if (!isOpen || !prefill) return;
    const count = Math.max(1, prefill.guestCount || 1);
    setGuestCount(count);
    setGuestNames(
      Array.from({ length: count }, (_, i) => prefill.guestNames[i] ?? ""),
    );
    setGuestPhones(
      Array.from({ length: count }, (_, i) => prefill.guestPhones[i] ?? ""),
    );
  }, [isOpen, prefill]);

  const coverLookup = useGameCoverLookup(cafeId, boxes);

  const groupedGames = useMemo(() => {
    const map = new Map<string, GroupedGame>();
    boxes.forEach((box) => {
      const key = box.gameName || box.gameTemplateId || "Game";
      const existing = map.get(key) || {
        gameName: box.gameName || "Game",
        gameTemplateId: box.gameTemplateId,
        totalBoxes: 0,
        availableBoxes: [],
        allBoxes: [],
      };
      existing.totalBoxes += 1;
      existing.allBoxes.push(box);
      if (String(box.status).toLowerCase() === "available") {
        existing.availableBoxes.push(box);
      }
      map.set(key, existing);
    });
    return Array.from(map.values()).sort((a, b) =>
      a.gameName.localeCompare(b.gameName, "vi"),
    );
  }, [boxes]);

  const filteredGames = useMemo(() => {
    const withStock = groupedGames.filter((g) => g.availableBoxes.length > 0);
    const term = pickerSearch.trim().toLowerCase();
    if (!term) return withStock;
    return withStock.filter((group) => {
      if (group.gameName.toLowerCase().includes(term)) return true;
      return group.availableBoxes.some((b) =>
        b.barcode.toLowerCase().includes(term),
      );
    });
  }, [groupedGames, pickerSearch]);

  if (!isOpen || !selectedTable) return null;

  const minPlayers =
    boxInspection?.minPlayers ?? selectedTable.minPlayers ?? 1;
  const maxPlayers =
    boxInspection?.maxPlayers ?? selectedTable.maxPlayers ?? 8;

  const syncGuestCount = (next: number) => {
    const clamped = Math.max(
      1,
      Math.min(maxPlayers, Math.round(next) || 1),
    );
    setGuestCount(clamped);
    setGuestNames((prev) => {
      const names = prev.slice(0, clamped);
      while (names.length < clamped) names.push("");
      return names;
    });
    setGuestPhones((prev) => {
      const phones = prev.slice(0, clamped);
      while (phones.length < clamped) phones.push("");
      return phones;
    });
  };

  const inspectBarcode = async (code: string) => {
    if (!cafeId || !code.trim()) {
      toast.error("Vui lòng nhập hoặc chọn mã vạch hộp game.");
      return;
    }

    try {
      setCheckingBox(true);
      const boxRes: any = await apiClient.get(
        `/api/cafes/${cafeId}/pos/boxes/by-barcode/${encodeURIComponent(code.trim())}`,
      );
      const boxData = boxRes?.data || boxRes;

      if (!boxData?.id) {
        toast.error("Không tìm thấy hộp game với mã vạch này.");
        setBoxInspection(null);
        return;
      }

      if (!isBoxStatusAvailable(boxData.status)) {
        toast.error(
          `Hộp "${boxData.barcode || code}" không sẵn sàng để gán (đang dùng / bảo trì).`,
        );
        setBoxInspection(null);
        return;
      }

      const nextBarcode = String(boxData.barcode || code).trim();
      if (
        boxes.length > 0 &&
        !boxes.some(
          (b) =>
            b.barcode.toLowerCase() === nextBarcode.toLowerCase() &&
            isBoxStatusAvailable(b.status),
        )
      ) {
        toast.error(
          `Hộp "${nextBarcode}" đang được gán cho phiên chơi khác.`,
        );
        setBoxInspection(null);
        return;
      }

      let missingList: any[] = [];
      try {
        const historyRes: any = await apiClient.get(
          `/api/cafes/${cafeId}/pos/boxes/${boxData.id}/component-history`,
        );
        const historyData = historyRes?.data || historyRes;
        missingList =
          historyData?.incidents?.flatMap(
            (incident: any) => incident.missingComponents || [],
          ) || [];
      } catch (err) {
        console.warn("Không thể tải lịch sử kiểm kê:", err);
      }

      const playerRange = readPlayerRange(boxData);
      const nextMin = playerRange.min ?? selectedTable.minPlayers ?? 1;
      setBoxInspection({
        gameName: boxData.gameName,
        barcode: boxData.barcode,
        status: boxData.status,
        imageUrl: boxData.imageUrl ?? boxData.thumbnailUrl ?? null,
        minPlayers: playerRange.min,
        maxPlayers: playerRange.max,
        missingComponents: missingList,
        hasChecked: true,
      });
      syncGuestCount(Math.max(guestCount, nextMin));
    } catch (err: any) {
      toast.error(err?.message || "Không tìm thấy hộp game.");
      setBoxInspection(null);
    } finally {
      setCheckingBox(false);
    }
  };

  const selectBox = (box: PosBoxItem) => {
    setBarcode(box.barcode);
    setPickerOpen(false);
    setPickerGame(null);
    setPickerSearch("");
    void inspectBarcode(box.barcode);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!barcode.trim()) {
      toast.error("Vui lòng nhập hoặc chọn mã vạch hộp game!");
      return;
    }
    if (
      boxInspection?.hasChecked &&
      !isBoxStatusAvailable(boxInspection.status)
    ) {
      toast.error("Hộp game không sẵn sàng — chọn hộp khác.");
      return;
    }
    if (guestCount < minPlayers) {
      toast.error(`Game/bàn cần tối thiểu ${minPlayers} khách vãng lai.`);
      return;
    }
    if (guestCount > maxPlayers) {
      toast.error(`Tối đa ${maxPlayers} người.`);
      return;
    }
    const primaryPhone = guestPhones[0]?.replace(/\s/g, "") || "";
    if (!primaryPhone) {
      toast.error("Nhập SĐT khách liên hệ (khách 1).");
      return;
    }
    if (!isVnWalkInPhone(primaryPhone)) {
      toast.error("SĐT khách 1 phải là số VN 10–11 chữ số, đầu 03/05/07/08/09.");
      return;
    }
    const invalidPhone = guestPhones.findIndex((raw, idx) => {
      if (idx === 0) return false;
      const phone = raw.replace(/\s/g, "");
      return phone.length > 0 && !isVnWalkInPhone(phone);
    });
    if (invalidPhone >= 0) {
      toast.error(
        `SĐT khách ${invalidPhone + 1} phải là số VN 10–11 chữ số, đầu 03/05/07/08/09.`,
      );
      return;
    }

    const walkInGuests = guestNames.map((name, idx) => {
      const displayName = name.trim() || `Khách ${idx + 1}`;
      const phoneNumber = guestPhones[idx]?.replace(/\s/g, "") || "";
      return { displayName, phoneNumber };
    });

    setLoading(true);
    const success = await onStart(
      selectedTable.id,
      barcode.trim(),
      walkInGuests,
    );
    setLoading(false);

    if (success) {
      setBarcode("");
      setBoxInspection(null);
      setGuestCount(1);
      setGuestNames([""]);
      setGuestPhones([""]);
      onClose();
    }
  };

  const handleCloseModal = () => {
    setBarcode("");
    setBoxInspection(null);
    setGuestCount(1);
    setGuestNames([""]);
    setGuestPhones([""]);
    setPickerOpen(false);
    setPickerGame(null);
    setPickerSearch("");
    onClose();
  };

  return (
    <div className="fixed inset-0 bg-neutral-950/40 backdrop-blur-xs z-50 flex items-center justify-center p-4">
      <div className="bg-white border border-neutral-200 rounded-2xl w-full max-w-5xl shadow-xl animate-in fade-in-50 duration-150 max-h-[90vh] flex flex-col overflow-hidden">
        {/* HEADER */}
        <div className="flex items-center justify-between border-b border-neutral-100 px-5 py-3 shrink-0">
          <div>
            <h3 className="font-bold text-base text-neutral-950">
              Mở Bàn & Bắt Đầu Phiên Chơi
            </h3>
            <p className="text-xs text-neutral-500 font-medium">
              Bàn được chọn:{" "}
              <strong className="text-neutral-900">{selectedTable.name}</strong>
              {" · "}
              {formatPlayerRange({
                min: minPlayers ?? null,
                max: maxPlayers ?? null,
              }) || "Không giới hạn người chơi"}
            </p>
          </div>
          <button
            type="button"
            onClick={handleCloseModal}
            className="text-neutral-400 hover:text-neutral-950 p-1 rounded-lg"
            aria-label="Đóng"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <form
          onSubmit={handleSubmit}
          className="grid min-h-0 flex-1 gap-0 md:grid-cols-2 overflow-hidden"
        >
          {/* CỘT TRÁI: BARCODE + PICKER GAME */}
          <div className="space-y-4 overflow-y-auto border-b border-neutral-100 p-5 md:border-b-0 md:border-r">
            <div className="space-y-1.5">
              <label className="text-xs font-bold text-neutral-800 flex items-center gap-1">
                <Barcode className="w-3.5 h-3.5 text-neutral-500" /> Mã vạch hộp
                game
              </label>
              <div className="flex gap-2">
                <Input
                  type="text"
                  placeholder="Nhập hoặc quét mã vạch (vd: BV-a4...)"
                  value={barcode}
                  onChange={(e) => {
                    setBarcode(e.target.value);
                    setBoxInspection(null);
                  }}
                  className="h-9 text-xs border-neutral-300 rounded-lg bg-neutral-50/50 font-mono"
                  autoFocus
                />
                <Button
                  type="button"
                  variant="outline"
                  disabled={checkingBox || !barcode.trim()}
                  onClick={() => void inspectBarcode(barcode)}
                  className="h-9 shrink-0 gap-1.5 rounded-lg border-amber-300 bg-amber-50 px-3 text-xs font-bold text-amber-900 hover:bg-amber-100"
                >
                  {checkingBox ? (
                    <Loader2 className="size-3.5 animate-spin" />
                  ) : (
                    <Search className="size-3.5" />
                  )}
                  Kiểm tra
                </Button>
              </div>

              <button
                type="button"
                onClick={() => {
                  setPickerOpen(true);
                  setPickerGame(null);
                  setPickerSearch("");
                }}
                className="flex w-full items-center justify-between gap-2 rounded-lg border border-dashed border-neutral-300 bg-white px-3 py-2 text-left hover:border-neutral-500 hover:bg-neutral-50"
              >
                <span className="flex items-center gap-1.5 text-xs font-semibold text-neutral-700">
                  <Layers className="size-3.5 text-neutral-500" />
                  Hoặc chọn từ kho (game → hộp)
                </span>
                <ChevronRight className="size-4 shrink-0 text-neutral-400" />
              </button>
            </div>

            {boxInspection && boxInspection.hasChecked && (
              <div className="p-3 bg-neutral-50 border border-neutral-200 rounded-xl space-y-2 animate-in fade-in-50 duration-150">
                <div className="flex items-center gap-2">
                  <GameCoverThumb
                    src={coverLookup.lookup({
                      gameTemplateId: null,
                      gameName: boxInspection.gameName,
                      cafeGameInventoryId: null,
                      barcode: boxInspection.barcode,
                      imageUrl: boxInspection.imageUrl ?? null,
                    })}
                    alt={boxInspection.gameName || "Hộp game"}
                    className="size-12 shrink-0 rounded-md"
                  />
                  <div className="flex min-w-0 flex-1 items-center justify-between gap-2">
                    <span className="truncate text-xs font-bold text-neutral-900">
                      {boxInspection.gameName}
                    </span>
                    <span className="shrink-0 text-[10px] font-mono text-neutral-500">
                      {boxInspection.barcode}
                    </span>
                  </div>
                </div>
                {formatPlayerRange({
                  min: boxInspection.minPlayers ?? null,
                  max: boxInspection.maxPlayers ?? null,
                }) && (
                  <div className="text-[11px] font-semibold text-neutral-700">
                    {formatPlayerRange({
                      min: boxInspection.minPlayers ?? null,
                      max: boxInspection.maxPlayers ?? null,
                    })}
                  </div>
                )}

                {boxInspection.missingComponents &&
                boxInspection.missingComponents.length > 0 ? (
                  <div className="p-2.5 bg-rose-50 border border-rose-200 rounded-lg space-y-1.5">
                    <div className="text-[10px] font-bold text-rose-800 uppercase flex items-center gap-1">
                      <AlertTriangle className="w-3.5 h-3.5 text-rose-600" />
                      Cảnh báo: Hộp game ghi nhận thiếu{" "}
                      {boxInspection.missingComponents.length} loại linh kiện!
                    </div>
                    <div className="space-y-1 max-h-24 overflow-y-auto pr-1">
                      {boxInspection.missingComponents.map(
                        (comp: any, idx: number) => (
                          <div
                            key={comp.componentId || idx}
                            className="bg-white border border-rose-100 px-2 py-1 rounded text-[11px] flex items-center justify-between shadow-2xs"
                          >
                            <span className="font-bold text-neutral-800">
                              • {comp.componentName}
                            </span>
                            <span className="font-mono font-bold text-rose-600 text-[10px]">
                              Thiếu {comp.missingQuantity || 1} (
                              {comp.componentKind || "Mảnh"})
                            </span>
                          </div>
                        ),
                      )}
                    </div>
                    <p className="text-[10px] text-rose-700 italic">
                      * Nhân viên hãy nhắc khách hàng tình trạng thiếu đồ trước
                      khi giao!
                    </p>
                  </div>
                ) : (
                  <div className="p-2 bg-emerald-50 border border-emerald-200 rounded-lg flex items-center gap-1.5 text-[11px] text-emerald-800 font-medium">
                    <ShieldCheck className="w-4 h-4 text-emerald-600 shrink-0" />
                    <span>
                      Hộp đầy đủ linh kiện, sẵn sàng bàn giao cho khách.
                    </span>
                  </div>
                )}
              </div>
            )}
          </div>

          {/* CỘT PHẢI: KHÁCH + ACTIONS */}
          <div className="flex min-h-0 flex-col overflow-hidden">
            <div className="flex-1 space-y-4 overflow-y-auto p-5">
              <div className="space-y-2">
                <div className="flex items-center justify-between gap-2">
                  <label className="text-xs font-bold text-neutral-800 flex items-center gap-1">
                    <Users className="w-3.5 h-3.5 text-neutral-500" /> Khách vãng lai
                  </label>
                  <span className="text-[11px] font-medium text-neutral-500">
                    Tối thiểu {minPlayers} · Tối đa {maxPlayers} người
                  </span>
                </div>
                <NumberStepper
                  value={guestCount}
                  onChange={syncGuestCount}
                  min={1}
                  max={maxPlayers}
                  ariaLabelDec="Giảm số khách"
                  ariaLabelInc="Tăng số khách"
                  size="md"
                  className="w-full"
                />
                <div className="space-y-2 max-h-72 overflow-y-auto pr-1">
                  {guestNames.map((name, idx) => (
                    <div key={idx} className="space-y-1">
                      <div className="flex items-center gap-1.5">
                        <UserPlus className="w-3.5 h-3.5 text-neutral-400 shrink-0" />
                        <Input
                          type="text"
                          placeholder={`Tên khách ${idx + 1} (để trống = Khách ${idx + 1})`}
                          value={name}
                          onChange={(e) =>
                            setGuestNames((prev) =>
                              prev.map((item, i) =>
                                i === idx ? e.target.value : item,
                              ),
                            )
                          }
                          className="h-8 text-xs border-neutral-300 rounded-lg"
                        />
                      </div>
                      <div className="flex items-center gap-1.5 pl-5">
                        <Phone className="w-3.5 h-3.5 text-neutral-400 shrink-0" />
                        <Input
                          type="tel"
                          inputMode="tel"
                          placeholder={
                            idx === 0
                              ? `SĐT khách ${idx + 1} (03/05/07/08/09, 10–11 số)`
                              : `SĐT khách ${idx + 1} (tuỳ chọn)`
                          }
                          value={guestPhones[idx] ?? ""}
                          onChange={(e) =>
                            setGuestPhones((prev) =>
                              prev.map((item, i) =>
                                i === idx ? e.target.value : item,
                              ),
                            )
                          }
                          className="h-8 text-xs border-neutral-300 rounded-lg font-mono"
                        />
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            <div className="shrink-0 border-t border-neutral-100 bg-white px-5 py-3 flex justify-end gap-2">
              <Button
                type="button"
                variant="outline"
                onClick={handleCloseModal}
                className="h-9 text-xs rounded-lg border-neutral-200"
              >
                Hủy
              </Button>
              <Button
                type="submit"
                disabled={loading || !barcode.trim()}
                className="h-9 bg-neutral-950 hover:bg-neutral-800 text-white text-xs font-bold rounded-lg px-4 flex items-center gap-1.5 shadow-2xs"
              >
                <Play className="w-3.5 h-3.5" />
                <span>{loading ? "Đang mở bàn..." : "Xác Nhận Mở Bàn"}</span>
              </Button>
            </div>
          </div>
        </form>
      </div>

      {pickerOpen && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center bg-neutral-950/50 p-4 backdrop-blur-xs">
          <div className="flex max-h-[85vh] w-full max-w-3xl flex-col overflow-hidden rounded-2xl border border-neutral-200 bg-white shadow-xl">
            <div className="flex items-center justify-between border-b border-neutral-100 px-4 py-3">
              <div className="flex items-center gap-2 min-w-0">
                {pickerGame ? (
                  <button
                    type="button"
                    onClick={() => setPickerGame(null)}
                    className="rounded-lg p-1 text-neutral-500 hover:bg-neutral-100 hover:text-neutral-950"
                    aria-label="Quay lại danh sách game"
                  >
                    <ChevronLeft className="size-5" />
                  </button>
                ) : (
                  <div className="rounded-lg border border-neutral-200 bg-neutral-100 p-2">
                    <Layers className="size-4 text-neutral-800" />
                  </div>
                )}
                <div className="min-w-0">
                  <h3 className="truncate font-bold text-neutral-950">
                    {pickerGame ? pickerGame.gameName : "Chọn game từ kho"}
                  </h3>
                  <p className="text-[11px] text-neutral-500">
                    {pickerGame
                      ? `${pickerGame.availableBoxes.length}/${pickerGame.totalBoxes} hộp sẵn sàng`
                      : `${groupedGames.length} tựa · ${boxes.length} hộp`}
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => {
                  setPickerOpen(false);
                  setPickerGame(null);
                  setPickerSearch("");
                }}
                className="rounded-lg p-1 text-neutral-400 hover:bg-neutral-100 hover:text-neutral-950"
                aria-label="Đóng"
              >
                <X className="size-5" />
              </button>
            </div>

            {!pickerGame ? (
              <>
                <div className="border-b border-neutral-100 p-3">
                  <div className="relative">
                    <Search className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-neutral-400" />
                    <Input
                      value={pickerSearch}
                      onChange={(e) => setPickerSearch(e.target.value)}
                      placeholder="Tìm tên game hoặc mã vạch..."
                      className="h-9 border-neutral-200 bg-neutral-50/50 pl-9 text-xs"
                      autoFocus
                    />
                  </div>
                </div>
                <div className="flex-1 space-y-2 overflow-y-auto p-3">
                  {filteredGames.length === 0 ? (
                    <p className="py-10 text-center text-xs text-neutral-400">
                      Không có game/hộp phù hợp trong kho.
                    </p>
                  ) : (
                    <StartSessionGameList
                      groups={filteredGames}
                      cafeId={cafeId}
                      boxes={boxes}
                      onPick={setPickerGame}
                    />
                  )}
                </div>
              </>
            ) : (
              <div className="flex-1 space-y-2 overflow-y-auto p-3">
                {pickerGame.availableBoxes.length === 0 ? (
                  <p className="py-10 text-center text-xs text-neutral-400">
                    Game này không còn hộp trống để gán.
                  </p>
                ) : (
                  pickerGame.availableBoxes.map((box, boxIdx) => (
                      <button
                        key={box.barcode || `${box.id}-${boxIdx}`}
                        type="button"
                        onClick={() => selectBox(box)}
                        className="flex w-full items-center justify-between gap-3 rounded-xl border border-neutral-200 bg-white p-3 text-left hover:border-emerald-400 hover:bg-emerald-50/40"
                      >
                        <div className="min-w-0">
                          <p className="font-mono text-sm font-bold text-neutral-950">
                            {box.barcode}
                          </p>
                          <p className="text-[11px] text-neutral-500">
                            {formatBoxStatus(box.status)}
                          </p>
                        </div>
                        <span className="shrink-0 rounded-md border border-emerald-200 bg-emerald-50 px-2 py-0.5 text-[10px] font-bold text-emerald-800">
                          Chọn
                        </span>
                      </button>
                    ))
                )}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

/**
 * Danh sách game trong modal chọn kho — có ảnh bìa từ useGameCoverLookup.
 * Tách riêng để gọi được hook (rules-of-hooks).
 */
interface StartSessionGameListProps {
  groups: GroupedGame[];
  cafeId: string | null;
  boxes: PosBoxItem[];
  onPick: (group: GroupedGame) => void;
}

function StartSessionGameList({
  groups,
  cafeId,
  boxes,
  onPick,
}: StartSessionGameListProps) {
  const { lookup } = useGameCoverLookup(cafeId, boxes);
  // Map imageUrl theo gameTemplateId / gameName từ prop boxes (đã normalize từ usePosDashboard)
  const localImageMap = useMemo(() => {
    const byTemplate = new Map<string, string>();
    const byName = new Map<string, string>();
    for (const b of boxes) {
      const url = b.imageUrl?.trim();
      if (!url) continue;
      if (b.gameTemplateId) byTemplate.set(b.gameTemplateId, url);
      if (b.gameName) {
        byName.set(b.gameName.trim().toLowerCase(), url);
      }
    }
    return { byTemplate, byName };
  }, [boxes]);

  const resolveCover = (group: GroupedGame): string | null => {
    if (group.gameTemplateId) {
      const fromTemplate = localImageMap.byTemplate.get(group.gameTemplateId);
      if (fromTemplate) return fromTemplate;
    }
    if (group.gameName) {
      const fromName = localImageMap.byName.get(
        group.gameName.trim().toLowerCase(),
      );
      if (fromName) return fromName;
    }
    // Fallback: hook lookup (useAlternativeGames / usePosBoxes)
    const sampleBox = group.allBoxes[0];
    return lookup({
      gameTemplateId: group.gameTemplateId,
      gameName: group.gameName,
      cafeGameInventoryId: sampleBox?.id ?? sampleBox?.cafeGameInventoryId,
      imageUrl: sampleBox?.imageUrl,
    });
  };

  return (
    <>
      {groups.map((group, groupIdx) => {
        const src = resolveCover(group);
        return (
          <button
            key={`${group.gameTemplateId || "g"}-${group.gameName}-${groupIdx}`}
            type="button"
            onClick={() => onPick(group)}
            className="flex w-full items-center justify-between gap-3 rounded-xl border border-neutral-200 bg-white p-3 text-left hover:border-neutral-400"
          >
            <div className="flex min-w-0 items-center gap-3">
              <GameCoverThumb
                src={src}
                alt={group.gameName}
                initials={group.gameName}
                size="sm"
              />
              <div className="min-w-0">
                <p className="truncate text-sm font-extrabold text-neutral-950">
                  {group.gameName}
                </p>
                <p className="text-[11px] font-semibold text-emerald-700">
                  {group.availableBoxes.length}/{group.totalBoxes} hộp sẵn sàng
                </p>
              </div>
            </div>
            <ChevronRight className="size-5 shrink-0 text-neutral-400" />
          </button>
        );
      })}
    </>
  );
}
