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
  Package,
} from "lucide-react";
import { apiClient } from "@/core/api/client";
import { cn } from "@/shared/utils/cn.util";
import { formatPlayerRange, readPlayerRange } from "../lib/player-range";
import type { PosBoxItem } from "./pos-boxes-tab";
import { isBoxStatusAvailable } from "./pos-boxes-tab";
import { NumberStepper } from "./number-stepper";
import { GameCoverThumb } from "./game-cover-thumb";
import { useGameCoverLookup } from "@/features/pos-check-in/hooks/useGameCoverLookup";
import {
  backdropCloseHandler,
  useDismissOnBackdrop,
} from "../lib/use-dismiss-on-backdrop";

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

  // Cho phép click ra ngoài hoặc nhấn Escape để đóng modal chính
  useDismissOnBackdrop(
    isOpen,
    () => {
      if (loading || checkingBox) return;
      handleCloseModal();
    },
    { busy: loading || checkingBox },
  );

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
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-indigo-950/40 p-4 backdrop-blur-xs"
      onClick={backdropCloseHandler(() => {
        if (loading || checkingBox) return;
        handleCloseModal();
      }, loading || checkingBox)}
    >
      <div
        className="flex max-h-[90vh] w-full max-w-5xl flex-col overflow-hidden rounded-lg border-2 border-indigo-400/70 bg-white shadow-[4px_4px_0_rgba(99,102,241,0.25),0_10px_30px_rgba(0,0,0,0.15)] animate-in fade-in-50 duration-150"
        onClick={(event) => event.stopPropagation()}
      >
        {/* HEADER */}
        <div className="relative shrink-0 overflow-hidden border-b-2 border-indigo-700/30 bg-gradient-to-br from-indigo-600 via-purple-600 to-pink-600 px-5 py-3 text-white shadow-[inset_0_-3px_0_rgba(0,0,0,0.18)]">
          <div className="pointer-events-none absolute -top-8 -right-8 size-24 rounded-full bg-white/15 blur-2xl" />
          <div className="pointer-events-none absolute -bottom-6 left-1/3 size-16 rounded-full bg-yellow-300/20 blur-xl" />
          {/* CRT scanlines */}
          <div className="pointer-events-none absolute inset-0 bg-[repeating-linear-gradient(0deg,transparent_0,transparent_2px,rgba(255,255,255,0.04)_2px,rgba(255,255,255,0.04)_4px)]" />
          <div className="relative flex items-center justify-between">
            <div>
              <h3 className="flex items-center gap-1.5 font-mono text-sm font-extrabold uppercase tracking-widest">
                <span className="size-1.5 animate-pulse rounded-full bg-yellow-300 shadow-[0_0_6px_currentColor]" />
                ► Mở Bàn & Bắt Đầu Phiên
              </h3>
              <p className="mt-0.5 font-mono text-[11px] font-bold uppercase tracking-widest text-white/90">
                TABLE{" "}
                <span className="ml-1 inline-block bg-black/30 px-1.5 py-0.5 text-yellow-300">
                  ▸ {selectedTable.name}
                </span>
                {formatPlayerRange({
                  min: minPlayers ?? null,
                  max: maxPlayers ?? null,
                }) || "Không giới hạn người chơi"}
              </p>
            </div>
            <button
              type="button"
              onClick={handleCloseModal}
              className="rounded-lg p-1 text-white/80 transition-colors hover:bg-white/20 hover:text-white"
              aria-label="Đóng"
            >
              <X className="size-5" />
            </button>
          </div>
        </div>

        <form
          onSubmit={handleSubmit}
          className="grid min-h-0 flex-1 gap-0 overflow-hidden md:grid-cols-2"
        >
          {/* CỘT TRÁI: BARCODE + PICKER GAME */}
          <div className="space-y-4 overflow-y-auto border-b border-indigo-100 bg-gradient-to-br from-indigo-50/30 via-white to-purple-50/20 p-5 md:border-b-0 md:border-r">
            <div className="space-y-1.5">
              <label className="flex items-center gap-1 text-xs font-bold text-indigo-800">
                <Barcode className="size-3.5 text-indigo-500" /> Mã vạch hộp
                game
              </label>
              <div className="flex gap-2">
                <div className="relative flex-1">
                  <Package className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-indigo-400" />
                  <Input
                    type="text"
                    placeholder="Nhập hoặc quét mã vạch (vd: BV-a4...)"
                    value={barcode}
                    onChange={(e) => {
                      setBarcode(e.target.value);
                      setBoxInspection(null);
                    }}
                    className="h-9 rounded-lg border-indigo-200 bg-white pl-9 font-mono text-xs focus-visible:border-indigo-400 focus-visible:ring-indigo-200"
                    autoFocus
                  />
                </div>
                <Button
                  type="button"
                  variant="outline"
                  disabled={checkingBox || !barcode.trim()}
                  onClick={() => void inspectBarcode(barcode)}
                  className="h-9 shrink-0 gap-1.5 rounded-lg border-amber-300 bg-gradient-to-r from-amber-50 to-orange-50 px-3 text-xs font-bold text-amber-900 hover:from-amber-100 hover:to-orange-100"
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
                className="group/picker flex w-full items-center justify-between gap-2 overflow-hidden rounded-lg border-2 border-dashed border-violet-400 bg-gradient-to-r from-violet-100 via-purple-50 to-fuchsia-100 px-3 py-2 text-left shadow-[2px_2px_0_rgba(139,92,246,0.4)] transition-all hover:-translate-y-0.5 hover:border-violet-500 hover:shadow-[3px_3px_0_rgba(139,92,246,0.55)]"
              >
                <span className="flex items-center gap-1.5 font-mono text-xs font-extrabold uppercase tracking-widest text-violet-800">
                  <Layers className="size-3.5 text-violet-600" />
                  ► Hoặc chọn từ kho (game → hộp)
                </span>
                <ChevronRight className="size-4 shrink-0 text-violet-600 transition-transform group-hover/picker:translate-x-0.5" />
              </button>
            </div>

            {boxInspection && boxInspection.hasChecked && (
              <div className="space-y-2 rounded-xl border border-cyan-200/70 bg-gradient-to-br from-cyan-50/50 via-white to-sky-50/40 p-3 animate-in fade-in-50 duration-150">
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
                    <span className="flex min-w-0 items-center gap-1 truncate text-xs font-bold text-cyan-950">
                      <Package className="size-3.5 shrink-0 text-cyan-600" />
                      <span className="truncate">{boxInspection.gameName}</span>
                    </span>
                    <span className="shrink-0 rounded-md border border-cyan-200 bg-white/70 px-1.5 py-0.5 font-mono text-[10px] font-bold text-cyan-700">
                      {boxInspection.barcode}
                    </span>
                  </div>
                </div>
                {formatPlayerRange({
                  min: boxInspection.minPlayers ?? null,
                  max: boxInspection.maxPlayers ?? null,
                }) && (
                  <div className="text-[11px] font-semibold text-cyan-800">
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
            <div className="flex-1 space-y-4 overflow-y-auto bg-gradient-to-br from-pink-50/30 via-white to-rose-50/20 p-5">
              <div className="space-y-2">
                <div className="flex items-center justify-between gap-2">
                  <label className="flex items-center gap-1 text-xs font-bold text-pink-800">
                    <Users className="size-3.5 text-pink-500" /> Khách vãng lai
                  </label>
                  <span className="text-[11px] font-medium text-pink-700/80">
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
                <div className="max-h-72 space-y-2 overflow-y-auto pr-1">
                  {guestNames.map((name, idx) => (
                    <div
                      key={idx}
                      className="space-y-1 rounded-lg border border-pink-200/60 bg-white/60 p-2"
                    >
                      <div className="flex items-center gap-1.5">
                        <UserPlus className="size-3.5 shrink-0 text-pink-400" />
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
                          className="h-8 rounded-lg border-pink-200 bg-white text-xs focus-visible:border-pink-400 focus-visible:ring-pink-200"
                        />
                      </div>
                      <div className="flex items-center gap-1.5 pl-5">
                        <Phone className="size-3.5 shrink-0 text-pink-400" />
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
                          className="h-8 rounded-lg border-pink-200 bg-white font-mono text-xs focus-visible:border-pink-400 focus-visible:ring-pink-200"
                        />
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            <div className="flex shrink-0 justify-end gap-2 border-t border-pink-100 bg-white/80 px-5 py-3 backdrop-blur-xs">
              <Button
                type="button"
                variant="outline"
                onClick={handleCloseModal}
                className="h-9 rounded-lg border-pink-200 text-xs text-pink-700 hover:bg-pink-50"
              >
                Hủy
              </Button>
              <Button
                type="submit"
                disabled={loading || !barcode.trim()}
                className="flex h-9 items-center gap-1.5 rounded-md border-2 border-rose-700 bg-gradient-to-b from-pink-500 to-rose-600 px-4 font-mono text-xs font-extrabold uppercase tracking-widest text-white shadow-[inset_0_-2px_0_rgba(0,0,0,0.2),0_0_12px_rgba(244,63,94,0.3)] hover:from-pink-500 hover:to-rose-500"
              >
                <Play className="size-3.5" />
                <span>{loading ? "Đang xử lý…" : "► XÁC NHẬN MỞ BÀN"}</span>
              </Button>
            </div>
          </div>
        </form>
      </div>

      {pickerOpen && (
        <div
          className="fixed inset-0 z-[60] flex items-center justify-center bg-violet-950/50 p-4 backdrop-blur-xs"
          onClick={backdropCloseHandler(() => {
            setPickerOpen(false);
            setPickerGame(null);
            setPickerSearch("");
          })}
        >
          <div
            className="flex max-h-[85vh] w-full max-w-3xl flex-col overflow-hidden rounded-lg border-2 border-violet-500/70 bg-white shadow-[4px_4px_0_rgba(139,92,246,0.25),0_10px_30px_rgba(0,0,0,0.15)]"
            onClick={(event) => event.stopPropagation()}
          >
            <div className="relative flex items-center justify-between overflow-hidden border-b-2 border-violet-700/30 bg-gradient-to-br from-violet-600 via-purple-600 to-fuchsia-600 px-4 py-3 text-white shadow-[inset_0_-3px_0_rgba(0,0,0,0.18)]">
              <div className="pointer-events-none absolute inset-0 bg-[repeating-linear-gradient(0deg,transparent_0,transparent_2px,rgba(255,255,255,0.04)_2px,rgba(255,255,255,0.04)_4px)]" />
              <div className="relative flex min-w-0 items-center gap-2">
                {pickerGame ? (
                  <button
                    type="button"
                    onClick={() => setPickerGame(null)}
                    className="rounded-md border-2 border-white/40 p-1 text-white/90 transition-all hover:bg-white/20 hover:text-white"
                    aria-label="Quay lại danh sách game"
                  >
                    <ChevronLeft className="size-5" />
                  </button>
                ) : (
                  <div className="rounded-md border-2 border-white/40 bg-white/20 p-2 text-white shadow-[inset_0_-2px_0_rgba(0,0,0,0.15)] backdrop-blur-xs">
                    <Layers className="size-4" />
                  </div>
                )}
                <div className="min-w-0">
                  <h3 className="truncate font-mono text-sm font-extrabold uppercase tracking-widest">
                    {pickerGame ? `▸ ${pickerGame.gameName}` : "► Chọn Game Kho"}
                  </h3>
                  <p className="font-mono text-[11px] font-bold uppercase tracking-widest text-white/90">
                    {pickerGame
                      ? `${pickerGame.availableBoxes.length}/${pickerGame.totalBoxes} HỘP SẴN SÀNG`
                      : `${groupedGames.length} TỰA · ${boxes.length} HỘP`}
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
                className="rounded-lg p-1 text-white/80 transition-colors hover:bg-white/20 hover:text-white"
                aria-label="Đóng"
              >
                <X className="size-5" />
              </button>
            </div>

            {!pickerGame ? (
              <>
                <div className="border-b border-violet-100 bg-gradient-to-r from-violet-50/50 via-white to-purple-50/40 p-3">
                  <div className="relative">
                    <Search className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-violet-400" />
                    <Input
                      value={pickerSearch}
                      onChange={(e) => setPickerSearch(e.target.value)}
                      placeholder="Tìm tên game hoặc mã vạch..."
                      className="h-9 border-violet-200 bg-white pl-9 text-xs focus-visible:border-violet-400 focus-visible:ring-violet-200"
                      autoFocus
                    />
                  </div>
                </div>
                <div className="flex-1 space-y-2 overflow-y-auto bg-gradient-to-br from-violet-50/20 via-white to-purple-50/20 p-3">
                  {filteredGames.length === 0 ? (
                    <p className="py-10 text-center text-xs font-medium text-violet-600">
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
              <div className="flex-1 space-y-2 overflow-y-auto bg-gradient-to-br from-violet-50/20 via-white to-purple-50/20 p-3">
                {pickerGame.availableBoxes.length === 0 ? (
                  <p className="py-10 text-center text-xs font-medium text-rose-600">
                    Game này không còn hộp trống để gán.
                  </p>
                ) : (
                  pickerGame.availableBoxes.map((box, boxIdx) => (
                      <button
                        key={box.barcode || `${box.id}-${boxIdx}`}
                        type="button"
                        onClick={() => selectBox(box)}
                        className="group/box relative flex w-full items-center justify-between gap-3 overflow-hidden rounded-xl border-2 border-emerald-400 bg-gradient-to-r from-emerald-100 via-teal-50 to-cyan-50 p-3 text-left shadow-[2px_2px_0_rgba(16,185,129,0.45)] transition-all hover:-translate-y-0.5 hover:border-emerald-500 hover:shadow-[3px_3px_0_rgba(16,185,129,0.6)]"
                      >
                        {/* CRT scanlines */}
                        <div className="pointer-events-none absolute inset-0 bg-[repeating-linear-gradient(0deg,transparent_0,transparent_2px,rgba(255,255,255,0.06)_2px,rgba(255,255,255,0.06)_4px)]" />
                        <span className="pointer-events-none absolute right-2 top-2 size-1.5 animate-pulse rounded-full bg-emerald-500 shadow-[0_0_6px_currentColor]" />
                        <div className="relative flex min-w-0 items-center gap-2">
                          <Package className="size-4 shrink-0 text-emerald-600" />
                          <div className="min-w-0">
                            <p className="font-mono text-sm font-extrabold uppercase tracking-wider text-emerald-950">
                              {box.barcode}
                            </p>
                            <p className="font-mono text-[11px] font-bold uppercase tracking-widest text-emerald-800">
                              ► {formatBoxStatus(box.status)}
                            </p>
                          </div>
                        </div>
                        <span className="relative shrink-0 rounded-md border-2 border-emerald-600 bg-gradient-to-b from-emerald-400 to-emerald-600 px-2 py-1 font-mono text-[10px] font-extrabold uppercase tracking-widest text-white shadow-[inset_0_-2px_0_rgba(0,0,0,0.2)] group-hover/box:translate-x-0.5">
                          Chọn ▶
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

  // Bảng màu arcade neon cho từng game trong kho — xoay vòng theo index
const ARCADE_PALETTES = [
  {
    ring: "border-cyan-400",
    soft: "from-cyan-100 via-sky-50 to-indigo-50",
    text: "text-cyan-950",
    sub: "text-cyan-800",
    chip: "border-cyan-500 bg-gradient-to-b from-cyan-400 to-cyan-600 text-white",
    shadow: "shadow-[2px_2px_0_rgba(34,211,238,0.45)] hover:shadow-[3px_3px_0_rgba(34,211,238,0.6)]",
    accent: "bg-cyan-500",
  },
  {
    ring: "border-fuchsia-400",
    soft: "from-fuchsia-100 via-pink-50 to-rose-50",
    text: "text-fuchsia-950",
    sub: "text-fuchsia-800",
    chip: "border-fuchsia-500 bg-gradient-to-b from-fuchsia-400 to-fuchsia-600 text-white",
    shadow: "shadow-[2px_2px_0_rgba(217,70,239,0.45)] hover:shadow-[3px_3px_0_rgba(217,70,239,0.6)]",
    accent: "bg-fuchsia-500",
  },
  {
    ring: "border-amber-400",
    soft: "from-amber-100 via-yellow-50 to-orange-50",
    text: "text-amber-950",
    sub: "text-amber-800",
    chip: "border-amber-500 bg-gradient-to-b from-amber-400 to-amber-600 text-white",
    shadow: "shadow-[2px_2px_0_rgba(245,158,11,0.45)] hover:shadow-[3px_3px_0_rgba(245,158,11,0.6)]",
    accent: "bg-amber-500",
  },
  {
    ring: "border-emerald-400",
    soft: "from-emerald-100 via-teal-50 to-cyan-50",
    text: "text-emerald-950",
    sub: "text-emerald-800",
    chip: "border-emerald-500 bg-gradient-to-b from-emerald-400 to-emerald-600 text-white",
    shadow: "shadow-[2px_2px_0_rgba(16,185,129,0.45)] hover:shadow-[3px_3px_0_rgba(16,185,129,0.6)]",
    accent: "bg-emerald-500",
  },
  {
    ring: "border-violet-400",
    soft: "from-violet-100 via-purple-50 to-fuchsia-50",
    text: "text-violet-950",
    sub: "text-violet-800",
    chip: "border-violet-500 bg-gradient-to-b from-violet-400 to-violet-600 text-white",
    shadow: "shadow-[2px_2px_0_rgba(139,92,246,0.45)] hover:shadow-[3px_3px_0_rgba(139,92,246,0.6)]",
    accent: "bg-violet-500",
  },
  {
    ring: "border-rose-400",
    soft: "from-rose-100 via-pink-50 to-fuchsia-50",
    text: "text-rose-950",
    sub: "text-rose-800",
    chip: "border-rose-500 bg-gradient-to-b from-rose-400 to-rose-600 text-white",
    shadow: "shadow-[2px_2px_0_rgba(244,63,94,0.45)] hover:shadow-[3px_3px_0_rgba(244,63,94,0.6)]",
    accent: "bg-rose-500",
  },
  {
    ring: "border-indigo-400",
    soft: "from-indigo-100 via-blue-50 to-cyan-50",
    text: "text-indigo-950",
    sub: "text-indigo-800",
    chip: "border-indigo-500 bg-gradient-to-b from-indigo-400 to-indigo-600 text-white",
    shadow: "shadow-[2px_2px_0_rgba(99,102,241,0.45)] hover:shadow-[3px_3px_0_rgba(99,102,241,0.6)]",
    accent: "bg-indigo-500",
  },
] as const;

function paletteFor(idx: number) {
  return ARCADE_PALETTES[idx % ARCADE_PALETTES.length];
}

return (
    <>
      {groups.map((group, groupIdx) => {
        const src = resolveCover(group);
        const pal = paletteFor(groupIdx);
        return (
          <button
            key={`${group.gameTemplateId || "g"}-${group.gameName}-${groupIdx}`}
            type="button"
            onClick={() => onPick(group)}
            className={cn(
              "group/game relative flex w-full items-center justify-between gap-3 overflow-hidden rounded-xl border-2 bg-gradient-to-r p-3 text-left transition-all hover:-translate-y-0.5",
              pal.ring,
              pal.soft,
              pal.shadow,
            )}
          >
            {/* CRT scanlines mờ */}
            <div className="pointer-events-none absolute inset-0 bg-[repeating-linear-gradient(0deg,transparent_0,transparent_2px,rgba(255,255,255,0.05)_2px,rgba(255,255,255,0.05)_4px)]" />
            {/* Đèn LED góc trái */}
            <span
              className={cn(
                "pointer-events-none absolute left-2 top-2 size-1.5 animate-pulse rounded-full shadow-[0_0_6px_currentColor]",
                pal.accent,
              )}
            />
            <div className="relative flex min-w-0 items-center gap-3">
              <GameCoverThumb
                src={src}
                alt={group.gameName}
                initials={group.gameName}
                size="sm"
                className="ring-2 ring-white/70"
              />
              <div className="min-w-0">
                <p
                  className={cn(
                    "truncate font-mono text-sm font-extrabold uppercase tracking-wider",
                    pal.text,
                  )}
                >
                  {group.gameName}
                </p>
                <p
                  className={cn(
                    "font-mono text-[11px] font-bold uppercase tracking-widest",
                    pal.sub,
                  )}
                >
                  ► {group.availableBoxes.length}/{group.totalBoxes} hộp sẵn sàng
                </p>
              </div>
            </div>
            <span
              className={cn(
                "relative shrink-0 rounded-md border-2 px-2 py-1 font-mono text-[10px] font-extrabold uppercase tracking-widest shadow-[inset_0_-2px_0_rgba(0,0,0,0.2)] group-hover/game:translate-x-0.5",
                pal.chip,
              )}
            >
              Chọn ▶
            </span>
          </button>
        );
      })}
    </>
  );
}
