/* eslint-disable @typescript-eslint/no-explicit-any */
"use client";

import { useState, useEffect, useMemo, useRef } from "react";
import { apiClient } from "@/core/api/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Field } from "@/components/ui/field";
import {
  AlertDialog,
  AlertDialogContent,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogCancel,
} from "@/components/ui/alert-dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Equal, Sparkles, AlertCircle, RefreshCw, Check } from "lucide-react";

/** Mirrors `src/shared/validators/cafe-inventory.validator.ts` — keep
 *  these two in lock-step so the UI never lets a value through that the
 *  upstream will reject. */
const MAX_BOX_QUANTITY = 1000;
const MAX_PENALTY_FEE = 2_147_483_647;

/** Status enum kept in lock-step with the API validator. The previous
 *  implementation only offered 3 options; the BE actually accepts 6 —
 *  exposing the rest prevents the manager from having to ask dev to
 *  flip a status they can't see in the dialog. */
const STATUS_OPTIONS = [
  { value: "Available", label: "Sẵn sàng" },
  { value: "InUse", label: "Đang cho thuê" },
  { value: "Damaged", label: "Hư hỏng" },
  { value: "Maintenance", label: "Bảo trì" },
  { value: "Retired", label: "Ngừng sử dụng" },
  { value: "OutofStock", label: "Hết hàng" },
] as const;

interface ComponentPenalty {
  id: string;
  gameComponentTemplateId: string;
  componentName: string;
  /**
   * The master template's default quantity — the number of physical
   * pieces a brand-new set ships with (e.g. 19 Resource Cards, 30 Road
   * Pieces, 2 Dice). The upstream returns this on the GET response so
   * the manager can see the per-piece cost of a damage. When the field
   * is missing or 0, we coerce to 1 — a single-piece component has
   * no split to compute, and the row behaves the same as before this
   * change. We carry it through the local state but never send it on
   * PUT: it's a read-only detail, not a write-side field.
   */
  defaultQuantity: number;
  penaltyFee: number;
}

interface EditGameDialogProps {
  isOpen: boolean;
  onClose: () => void;
  cafeId: string;
  inventoryId: string | null;
  onSuccess: () => void;
  /** True when the dialog was opened from the `+N` overflow pill on
   *  the card, signalling that the user wants the component list
   *  in view rather than the box-quantity / status section at the
   *  top. The dialog scrolls to the component fieldset on open.
   *  False (default) for any other entry point — the dialog opens
   *  to its natural top, where the user can review the name and
   *  box quantity first. */
  scrollToComponentsOnOpen?: boolean;
}

/**
 * Vietnamese VND formatter using `Intl.NumberFormat('vi-VN')`. Returns
 * `"0 ₫"` for any non-finite input so a momentary NaN can't crash the
 * bulk-price preview card.
 */
function formatVND(value: number): string {
  if (!Number.isFinite(value)) return "0 ₫";
  return new Intl.NumberFormat("vi-VN", {
    style: "currency",
    currency: "VND",
    maximumFractionDigits: 0,
  }).format(value);
}

/**
 * Parse a free-form VND string (potentially containing thousand
 * separators, spaces, or ₫ symbol) into an integer. Defensive against
 * `parseInt` quirks on user-typed input.
 */
function parseVNDInput(raw: string): number {
  const digits = raw.replace(/\D/g, "");
  if (!digits) return 0;
  const parsed = parseInt(digits, 10);
  return Number.isFinite(parsed) ? parsed : 0;
}

/** Clamp an arbitrary number into the [min, max] integer range, falling
 *  back to `min` for non-finite values. */
function clampInt(value: number, min: number, max: number): number {
  if (!Number.isFinite(value)) return min;
  const floored = Math.floor(value);
  if (floored < min) return min;
  if (floored > max) return max;
  return floored;
}

export function EditGameDialog({
  isOpen,
  onClose,
  cafeId,
  inventoryId,
  onSuccess,
  scrollToComponentsOnOpen = false,
}: EditGameDialogProps) {
  const [loading, setLoading] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [fetchError, setFetchError] = useState<string | null>(null);
  const [gameName, setGameName] = useState("");
  const [boxQuantity, setBoxQuantity] = useState<number>(1);
  const [status, setStatus] = useState<string>("Available");
  const [penalties, setPenalties] = useState<ComponentPenalty[]>([]);
  const [message, setMessage] = useState<{
    type: "success" | "error";
    text: string;
  } | null>(null);

  const [bulkPriceInput, setBulkPriceInput] = useState<string>("");

  // Per-row state for the component-health save buttons. We track the
  // index of the row currently mid-save so the spinner lands on the
  // right row and the input disables, while the rest of the dialog
  // stays interactive. Per-row errors stay inline (not a toast) so the
  // manager can see which row failed and retry without losing the
  // input value.
  const [rowSavingIndex, setRowSavingIndex] = useState<number | null>(null);
  const [rowError, setRowError] = useState<{
    index: number;
    message: string;
  } | null>(null);

  // Hold the in-flight detail fetch so we can abort it when the dialog
  // closes mid-load — otherwise the late response would write to
  // unmounted component state. Storing the controller in a ref lets the
  // useEffect cleanup read the same instance we just attached.
  const detailInflightRef = useRef<AbortController | null>(null);
  useEffect(() => {
    return () => {
      detailInflightRef.current?.abort();
      detailInflightRef.current = null;
    };
  }, []);

  const penaltyCount = penalties.length;
  // Sum of all `defaultQuantity` values across rows. Used as the
  // denominator for the weighted bulk distribution below. Computed
  // inline (not memoised) because `penalties` is small (≤ ~30 rows
  // for any real board game) and the surrounding memo would only
  // re-run when `penalties` changes anyway.
  const totalQuantity = penalties.reduce(
    (sum, p) => sum + (p.defaultQuantity > 0 ? p.defaultQuantity : 1),
    0,
  );
  const priceDistribution = useMemo(() => {
    const total = parseVNDInput(bulkPriceInput);
    if (total <= 0 || penaltyCount === 0) {
      return null;
    }
    // Weighted-by-quantity distribution: a 30-piece Road set gets
    // 30/132 ≈ 22.7% of the total budget, while a 4-piece Wood set
    // gets 4/132 ≈ 3.0%. This keeps the per-piece price roughly
    // uniform across all components — which is what the manager
    // actually wants when they enter a "total budget per damage
    // case" and click "Phân bổ".
    //
    // Edge case: every `defaultQuantity` is 1 (treated as such by
    // the parser), so `totalQuantity === penaltyCount` and the
    // weighting collapses to the legacy equal-split. Single-piece
    // components continue to work the same as before.
    //
    // Edge case: `totalQuantity === 0` cannot happen because the
    // parser coerces every row to ≥ 1, but we guard anyway so a
    // future code change can't divide by zero.
    if (totalQuantity === 0) {
      return null;
    }
    const perPieceBudget = total / totalQuantity;
    const distribution = penalties.map((p) => {
      const qty = p.defaultQuantity > 0 ? p.defaultQuantity : 1;
      return Math.round((perPieceBudget * qty) / 1000) * 1000;
    });
    const allocatedTotal = distribution.reduce((sum, v) => sum + v, 0);
    const leftover = total - allocatedTotal;
    return {
      total,
      count: penaltyCount,
      totalQuantity,
      perPiece: Math.round(perPieceBudget / 1000) * 1000,
      distribution,
      leftover,
      allocatedTotal,
    };
  }, [bulkPriceInput, penaltyCount, penalties, totalQuantity]);

  // GET /api/cafes/{cafeId}/inventory/{inventoryId} - Lấy chi tiết cấu hình game
  useEffect(() => {
    if (!isOpen || !inventoryId) return;

    const fetchDetail = async () => {
      const controller = new AbortController();
      detailInflightRef.current?.abort();
      detailInflightRef.current = controller;

      setLoading(true);
      setFetchError(null);
      try {
        const response: any = await apiClient.get(
          `/api/cafes/${cafeId}/inventory/${inventoryId}`,
          { signal: controller.signal },
        );
        if (controller.signal.aborted) return;
        const detail = response?.data || response;
        setGameName(typeof detail?.gameName === "string" ? detail.gameName : "");
        setBoxQuantity(
          clampInt(Number(detail?.boxQuantity) || 1, 1, MAX_BOX_QUANTITY),
        );
        setStatus(
          typeof detail?.status === "string" && detail.status
            ? detail.status
            : "Available",
        );
                // Map the upstream `componentPenalties` array to the local
        // `ComponentPenalty` shape. We normalize `defaultQuantity` to
        // an integer ≥ 1 so the per-piece math in the row hint and
        // the bulk distribution never divides by zero. Anything the
        // upstream omits or sends as 0 is treated as a single-piece
        // component (no split, behaves like the pre-change rows).
        const rawPenalties = Array.isArray(detail?.componentPenalties)
          ? detail.componentPenalties
          : [];
        setPenalties(
          rawPenalties.map((p: any) => {
            const qty = Number(p?.defaultQuantity);
            const safeQty = Number.isFinite(qty) && qty > 0 ? Math.floor(qty) : 1;
            return {
              id: typeof p?.id === "string" ? p.id : "",
              gameComponentTemplateId:
                typeof p?.gameComponentTemplateId === "string"
                  ? p.gameComponentTemplateId
                  : "",
              componentName:
                typeof p?.componentName === "string" ? p.componentName : "",
              defaultQuantity: safeQty,
              penaltyFee: Number.isFinite(p?.penaltyFee) ? p.penaltyFee : 0,
            };
          }),
        );
      } catch (err: any) {
        if (err?.name === "CanceledError") return;
        console.error("Lỗi tải chi tiết game:", err?.message);
        setFetchError(
          err instanceof Error
            ? err.message
            : "Không tải được chi tiết kho game.",
        );
      } finally {
        if (detailInflightRef.current === controller) {
          detailInflightRef.current = null;
        }
        setLoading(false);
      }
    };

    void fetchDetail();

    // Re-fetch only when dialog identity changes (`isOpen`,
    // `inventoryId`, `cafeId`). Cleanup lives in the dedicated unmount
    // effect above.
  }, [isOpen, inventoryId, cafeId]);

  // Scroll to the component list when the dialog was opened from the
  // `+N` overflow pill on the card. We run on `[isOpen, ...]` so the
  // scroll re-fires on each open, and on `[penalties.length]` so the
  // scroll waits for the fieldset to render its data — a 0-length
  // fieldset scrolled to is a blank header. `requestAnimationFrame`
  // defers until the Portal has painted the dialog. No `setTimeout`
  // magic — Radix's open-animation is short enough that one RAF is
  // safe (verified: `next/dialog` Portal mounts before the next
  // paint). If reduced-motion is set, `scrollIntoView({ behavior:
  // 'smooth' })` falls back to instant per the spec.
  useEffect(() => {
    if (!isOpen || !scrollToComponentsOnOpen) return;
    if (penalties.length === 0) return;
    const anchor = document.querySelector("[data-component-list-anchor]");
    if (!anchor) return;
    const frame = window.requestAnimationFrame(() => {
      anchor.scrollIntoView({ behavior: "smooth", block: "start" });
    });
    return () => window.cancelAnimationFrame(frame);
  }, [isOpen, scrollToComponentsOnOpen, penalties.length]);

  // Reset transient state when the dialog is fully closed — handled
  // implicitly by Radix `AlertDialog` unmounting its content on close
  // (no `forceMount`), so the next mount starts clean.

  const handlePenaltyFeeChange = (index: number, value: string) => {
    const updated = [...penalties];
    const parsed = parseInt(value, 10);
    updated[index].penaltyFee = clampInt(
      Number.isNaN(parsed) ? 0 : parsed,
      0,
      MAX_PENALTY_FEE,
    );
    setPenalties(updated);
  };

  const applyBulkPrice = () => {
    if (!priceDistribution) return;
    const updated = penalties.map((p, i) => ({
      ...p,
      penaltyFee: priceDistribution.distribution[i],
    }));
    setPenalties(updated);
    setMessage({
      type: "success",
      text: `Đã phân bổ ${formatVND(priceDistribution.total)} cho ${priceDistribution.count} linh kiện (${priceDistribution.totalQuantity} món, mỗi món ${formatVND(priceDistribution.perPiece)}).`,
    });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!inventoryId) return;
    if (submitting) return; // double-submit lock

    setSubmitting(true);
    setMessage(null);

    const apiPayload = {
      boxQuantity: clampInt(boxQuantity, 1, MAX_BOX_QUANTITY),
      status,
      componentPenalties: penalties.map(
        ({ gameComponentTemplateId, penaltyFee }) => ({
          gameComponentTemplateId,
          penaltyFee: clampInt(penaltyFee, 0, MAX_PENALTY_FEE),
        }),
      ),
    };

    try {
      await apiClient.put(
        `/api/cafes/${cafeId}/inventory/${inventoryId}`,
        apiPayload,
      );
      setMessage({
        type: "success",
        text: "Cập nhật hồ sơ kho game thành công!",
      });
      setTimeout(() => {
        onSuccess();
        onClose();
        setMessage(null);
      }, 1200);
    } catch (err: any) {
      setMessage({
        type: "error",
        text:
          err instanceof Error
            ? err.message
            : "Cập nhật thất bại. Vui lòng thử lại.",
      });
    } finally {
      setSubmitting(false);
    }
  };

  /** Per-row save — PUT just the changed row's fee while sending the
   *  full array (BE requires the full array if the field is present).
   *  Inline spinner on the row, inline error on failure. The whole-form
   *  submit stays available for bulk edits. */
  const saveOneComponent = async (index: number) => {
    if (rowSavingIndex !== null) return; // double-submit lock
    if (submitting) return; // whole-form submit in flight
    const row = penalties[index];
    if (!row) return;

    setRowSavingIndex(index);
    setRowError(null);

    try {
      // BE's `UpdateInventorySchema` requires the full array if the
      // `componentPenalties` field is present (no partial updates). We
      // re-send the whole array with all rows clamped — the user has
      // already typed the new value into the input via
      // `handlePenaltyFeeChange`, so the local `penalties` state is
      // the source of truth and we just send it as-is.
      const apiPayload = {
        componentPenalties: penalties.map((p) => ({
          gameComponentTemplateId: p.gameComponentTemplateId,
          penaltyFee: clampInt(p.penaltyFee, 0, MAX_PENALTY_FEE),
        })),
      };
      await apiClient.put(
        `/api/cafes/${cafeId}/inventory/${inventoryId}`,
        apiPayload,
      );
      // On success, the upstream has accepted the change. We keep the
      // local state already in sync — `handlePenaltyFeeChange` updated
      // the input synchronously — so no further setPenalties is needed.
      // Trigger the parent's refresh so the card stays in step on close.
      onSuccess();
    } catch (err) {
      const message =
        err instanceof Error
          ? err.message
          : "Lưu phí phạt thất bại. Vui lòng thử lại.";
      setRowError({ index, message });
    } finally {
      setRowSavingIndex(null);
    }
  };

  return (
    <AlertDialog open={isOpen} onOpenChange={onClose}>
      <AlertDialogContent
        // `max-h-[90dvh]` + `overflow-y-auto` keeps the dialog inside
        // the viewport on short mobile (e.g. iPhone SE 667px tall) and
        // on tall forms with many components. `dvh` (dynamic viewport
        // height) follows the OS browser chrome — Safari's URL bar
        // collapses as you scroll — so the dialog never gets trapped
        // under the chrome on iOS. Without this, the form's component
        // list clipped top and bottom and the per-row ✓ button became
        // unreachable.
        className="bg-white border border-neutral-200/80 rounded-xl p-6 shadow-[0px_8px_24px_rgba(0,0,0,0.06)] max-w-lg mx-auto max-h-[90dvh] overflow-y-auto text-neutral-900"
        aria-describedby="edit-game-description"
      >
        <AlertDialogHeader className="border-b border-neutral-100 pb-3 mb-4 space-y-1">
          <AlertDialogTitle className="text-lg font-bold tracking-tight text-neutral-900">
            Chỉnh Sửa Kho Game:{" "}
            <span className="break-words [overflow-wrap:anywhere]">
              {gameName || "(đang tải…)"}
            </span>
          </AlertDialogTitle>
          <AlertDialogDescription
            id="edit-game-description"
            className="text-xs font-medium text-neutral-500"
          >
            Thay đổi số lượng hộp hiện có, cập nhật trạng thái hoạt động hoặc
            tùy chỉnh biểu phí đền bù linh kiện.
          </AlertDialogDescription>
        </AlertDialogHeader>

        {/* DETAIL-FETCH FAILURE — surfaced instead of silently swallowed. */}
        {fetchError && !loading && (
          <div
            role="alert"
            className="mb-4 flex items-start gap-2 p-3 text-xs font-semibold border border-red-100 bg-red-50/60 text-red-700 rounded-lg"
          >
            <AlertCircle className="w-3.5 h-3.5 mt-0.5 shrink-0" aria-hidden />
            <div className="flex-1 space-y-2">
              <p>Không tải được chi tiết kho game.</p>
              <p className="font-medium text-red-600/80 break-words [overflow-wrap:anywhere]">
                {fetchError}
              </p>
              <Button
                type="button"
                size="sm"
                onClick={() => {
                  // Re-trigger the effect by toggling a refresh token in
                  // the inventoryId prop is not viable here — instead
                  // call fetchDetail again inline via the same endpoint.
                  setFetchError(null);
                  setLoading(true);
                  const controller = new AbortController();
                  detailInflightRef.current = controller;
                  apiClient
                    .get(`/api/cafes/${cafeId}/inventory/${inventoryId}`, {
                      signal: controller.signal,
                    })
                    .then((response: any) => {
                      const detail = response?.data || response;
                      setGameName(
                        typeof detail?.gameName === "string"
                          ? detail.gameName
                          : "",
                      );
                      setBoxQuantity(
                        clampInt(
                          Number(detail?.boxQuantity) || 1,
                          1,
                          MAX_BOX_QUANTITY,
                        ),
                      );
                      setStatus(
                        typeof detail?.status === "string" && detail.status
                          ? detail.status
                          : "Available",
                      );
                      setPenalties(
                        Array.isArray(detail?.componentPenalties)
                          ? detail.componentPenalties
                          : [],
                      );
                      setFetchError(null);
                    })
                    .catch((err: any) => {
                      if (err?.name === "CanceledError") return;
                      setFetchError(
                        err instanceof Error
                          ? err.message
                          : "Không tải được chi tiết kho game.",
                      );
                    })
                    .finally(() => setLoading(false));
                }}
                className="h-7 px-3 bg-white text-neutral-800 hover:bg-neutral-50 font-semibold text-[11px] uppercase tracking-wider border border-neutral-200 rounded-md"
              >
                <RefreshCw className="w-3 h-3 mr-1.5" aria-hidden />
                Thử lại
              </Button>
            </div>
          </div>
        )}

        {message && (
          <div
            role={message.type === "error" ? "alert" : "status"}
            aria-live="polite"
            className={`p-3 mb-4 text-xs font-semibold border rounded-lg ${
              message.type === "success"
                ? "bg-neutral-50 border-neutral-200 text-neutral-900"
                : "bg-red-50 border-red-100 text-red-600"
            }`}
          >
            <span aria-hidden className="mr-1">
              {message.type === "success" ? "✓" : "⚠️"}
            </span>
            <span className="break-words [overflow-wrap:anywhere]">
              {message.text}
            </span>
          </div>
        )}

        {loading && !fetchError ? (
          <div
            aria-busy="true"
            aria-live="polite"
            className="py-10 text-center text-xs font-semibold text-neutral-400 uppercase tracking-wider"
          >
            Đang tải chi tiết…
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-5" noValidate>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <Field>
                <label
                  htmlFor="edit-box-quantity"
                  className="block text-[11px] font-semibold text-neutral-600 uppercase mb-1.5 tracking-wide"
                >
                  Số lượng hộp hiện có *
                </label>
                <Input
                  id="edit-box-quantity"
                  type="number"
                  inputMode="numeric"
                  required
                  min={1}
                  max={MAX_BOX_QUANTITY}
                  step={1}
                  value={boxQuantity}
                  onChange={(e) => {
                    const raw = e.target.value;
                    if (raw === "") {
                      setBoxQuantity(1);
                      return;
                    }
                    const parsed = parseInt(raw, 10);
                    if (Number.isNaN(parsed)) return;
                    setBoxQuantity(clampInt(parsed, 1, MAX_BOX_QUANTITY));
                  }}
                  className="w-full h-9 border-neutral-200 rounded-lg focus-visible:ring-1 focus-visible:ring-neutral-400 focus-visible:ring-offset-0 bg-white text-sm tabular-nums"
                />
              </Field>

              <Field>
                <label
                  htmlFor="edit-status"
                  className="block text-[11px] font-semibold text-neutral-600 uppercase mb-1.5 tracking-wide"
                >
                  Trạng thái kho *
                </label>
                <Select value={status} onValueChange={(value) => setStatus(value)}>
                  <SelectTrigger
                    id="edit-status"
                    className="w-full h-9 px-3 py-2 border border-neutral-200 bg-white font-medium text-sm rounded-lg focus:ring-1 focus:ring-neutral-400 focus-visible:ring-1 focus-visible:ring-neutral-400 focus-visible:ring-offset-0 text-left text-neutral-900"
                  >
                    <SelectValue placeholder="Chọn trạng thái..." />
                  </SelectTrigger>

                  <SelectContent className="bg-white border border-neutral-200 rounded-lg shadow-[0px_4px_12px_rgba(0,0,0,0.05)] text-neutral-900">
                    {STATUS_OPTIONS.map((opt) => (
                      <SelectItem
                        key={opt.value}
                        value={opt.value}
                        className="font-medium text-sm rounded-md focus:bg-neutral-50 focus:text-neutral-900 cursor-pointer py-2"
                      >
                        {opt.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </Field>
            </div>

            {/* BULK PRICE DISTRIBUTION */}
            {penalties.length > 1 && (
              <div className="space-y-2 border border-neutral-200 bg-neutral-50/40 rounded-xl p-3">
                <div className="flex items-center gap-1.5">
                  <Equal className="h-3.5 w-3.5 text-neutral-500" aria-hidden />
                  <label
                    htmlFor="bulkPriceInput"
                    className="text-[11px] font-bold text-neutral-800 uppercase tracking-wide"
                  >
                    Phân bổ theo số lượng (VND)
                  </label>
                </div>
                <div className="flex items-stretch gap-2">
                  <Input
                    id="bulkPriceInput"
                    type="text"
                    inputMode="numeric"
                    value={bulkPriceInput}
                    maxLength={15}
                    // Use `onInput` (not `onChange`) so paste of
                    // "100.000 ₫" is sanitised the moment the value lands
                    // in the input — matches what shadcn Input exposes
                    // while keeping the digit-only contract.
                    onInput={(e) =>
                      setBulkPriceInput(
                        (e.target as HTMLInputElement).value.replace(/\D/g, ""),
                      )
                    }
                    placeholder={
                      penalties.length > 0
                        ? `VD: 100,000 chia cho ${totalQuantity} món của ${penalties.length} linh kiện`
                        : "Nhập tổng giá thành"
                    }
                    className="flex-1 h-9 border-neutral-200 rounded-lg focus-visible:ring-1 focus-visible:ring-neutral-400 focus-visible:ring-offset-0 bg-white text-sm font-mono tabular-nums"
                  />
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    disabled={!priceDistribution}
                    onClick={applyBulkPrice}
                    className="h-9 px-3 border-neutral-300 bg-white text-neutral-800 font-semibold text-xs uppercase tracking-wider rounded-lg hover:bg-neutral-100 disabled:opacity-50"
                  >
                    <Sparkles className="mr-1.5 h-3.5 w-3.5" aria-hidden />
                    Phân bổ
                  </Button>
                </div>

                {priceDistribution && (
                  // Single-line explainer so the manager knows the
                  // distribution is *weighted by quantity* — not equal
                  // split. Without this hint, a manager who enters
                  // 100,000 and sees "Road Pieces (30) → 22,700₫" but
                  // "Wood Tiles (4) → 3,000₫" might think the form is
                  // buggy. The explainer links the numbers back to the
                  // "per piece" budget.
                  <p className="text-[10px] text-neutral-500 leading-snug">
                    Phân bổ theo trọng số là số món: linh kiện có nhiều món
                    hơn sẽ nhận phí phạt cao hơn, sao cho giá mỗi món là
                    đồng đều.
                  </p>
                )}

                {priceDistribution && (
                  <dl className="grid grid-cols-2 gap-2 text-[10px]">
                    <div className="rounded-md border border-neutral-200 bg-white px-2 py-1.5">
                      <dt className="uppercase tracking-wider text-neutral-500 font-semibold">
                        Tổng nhập
                      </dt>
                      <dd className="font-mono text-xs font-bold text-neutral-900 tabular-nums">
                        {formatVND(priceDistribution.total)}
                      </dd>
                    </div>
                    <div className="rounded-md border border-neutral-200 bg-white px-2 py-1.5">
                      <dt className="uppercase tracking-wider text-neutral-500 font-semibold">
                        Mỗi món
                      </dt>
                      <dd
                        className="font-mono text-xs font-bold text-neutral-900 tabular-nums"
                        // The "per-piece" budget is the weighted divisor:
                        // each component's share is `perPiece × quantity`,
                        // so the per-piece figure lets the manager read off
                        // the implied cost of one missing piece before
                        // they click "Phân bổ".
                        title="Giá chia đều theo số lượng món của mỗi linh kiện"
                      >
                        {formatVND(priceDistribution.perPiece)}
                      </dd>
                    </div>
                    <div className="rounded-md border border-neutral-200 bg-white px-2 py-1.5">
                      <dt className="uppercase tracking-wider text-neutral-500 font-semibold">
                        Tổng số món
                      </dt>
                      <dd
                        className="font-mono text-xs font-bold text-neutral-900 tabular-nums"
                        title="Tổng `defaultQuantity` của tất cả linh kiện trong danh sách"
                      >
                        {priceDistribution.totalQuantity}
                      </dd>
                    </div>
                    <div
                      className={`rounded-md border px-2 py-1.5 ${
                        priceDistribution.leftover === 0
                          ? "border-neutral-200 bg-white"
                          : "border-amber-200 bg-amber-50"
                      }`}
                    >
                      <dt
                        className={`uppercase tracking-wider font-semibold ${
                          priceDistribution.leftover === 0
                            ? "text-neutral-500"
                            : "text-amber-700"
                        }`}
                      >
                        Chênh lệch
                      </dt>
                      <dd
                        className={`font-mono text-xs font-bold tabular-nums ${
                          priceDistribution.leftover === 0
                            ? "text-neutral-900"
                            : "text-amber-800"
                        }`}
                      >
                        {priceDistribution.leftover > 0
                          ? `+${formatVND(priceDistribution.leftover)}`
                          : formatVND(priceDistribution.leftover)}
                      </dd>
                    </div>
                  </dl>
                )}

                {priceDistribution && priceDistribution.leftover !== 0 && (
                  <p className="text-[10px] text-amber-700 leading-snug">
                    Phân bổ làm tròn đến 1,000đ. Phần chênh lệch sẽ không được
                    cộng vào — chủ quán tự điều chỉnh thủ công nếu cần.
                  </p>
                )}
                {bulkPriceInput && !priceDistribution && (
                  <p className="text-[10px] text-neutral-500">
                    Nhập số tiền &gt; 0 để xem trước phân bổ.
                  </p>
                )}
              </div>
            )}

            {/* ĐIỀU CHỈNH PHÍ PHẠT LINH KIỆN */}
            <fieldset
              data-component-list-anchor
              className="space-y-2 border-0 p-0 m-0 scroll-mt-20"
            >
              <legend className="block text-[11px] font-bold text-neutral-800 uppercase tracking-wide">
                Điều chỉnh phí phạt linh kiện ({penalties.length} mục)
              </legend>

              {penalties.length > 0 ? (
                <ul className="max-h-40 overflow-y-auto border border-neutral-200 p-3 bg-neutral-50/60 rounded-xl space-y-1.5 scrollbar-thin list-none">
                  {penalties.map((item, index) => {
                    const isThisRowSaving = rowSavingIndex === index;
                    const thisRowError =
                      rowError && rowError.index === index ? rowError : null;
                    const isAnyRowSaving = rowSavingIndex !== null;
                    // The per-piece cost is shown beneath the input
                    // whenever the component ships in a quantity > 1.
                    // For a single-piece row, the per-piece number is
                    // identical to the input value, so we hide the
                    // hint to avoid noise.
                    const safeQty =
                      item.defaultQuantity > 0 ? item.defaultQuantity : 1;
                    const perPieceFee =
                      safeQty > 1 && item.penaltyFee > 0
                        ? Math.round(item.penaltyFee / safeQty)
                        : null;
                    return (
                      <li
                        key={item.id || item.gameComponentTemplateId}
                        className="flex flex-wrap items-center justify-between gap-3 bg-white p-2 border border-neutral-200/60 rounded-lg shadow-[0px_1px_2px_rgba(0,0,0,0.01)] min-w-0"
                      >
                        <span className="text-xs font-semibold text-neutral-700 truncate max-w-[55%] [overflow-wrap:anywhere] flex-1 min-w-0 flex items-center gap-1.5">
                          <span className="truncate">
                            {item.componentName || "Linh kiện"}
                          </span>
                          {safeQty > 1 && (
                            // Quantity badge: shows the master template's
                            // default piece count so the manager knows the
                            // input value applies to the whole set, not
                            // one piece. Hidden when the component is a
                            // single piece (no split to reason about).
                            <span
                              className="inline-flex items-center px-1.5 py-0.5 rounded-md bg-neutral-100 text-[10px] font-bold text-neutral-600 tabular-nums shrink-0"
                              title={`Bộ gốc gồm ${safeQty} món`}
                            >
                              ×{safeQty}
                            </span>
                          )}
                        </span>
                        <div className="flex items-center gap-1.5 shrink-0">
                          <Input
                            type="number"
                            inputMode="numeric"
                            aria-label={
                              safeQty > 1
                                ? `Phí phạt cho ${item.componentName || "linh kiện"} (bộ ${safeQty} món)`
                                : `Phí phạt cho ${item.componentName || "linh kiện"}`
                            }
                            required
                            min={0}
                            max={MAX_PENALTY_FEE}
                            step={1000}
                            value={item.penaltyFee}
                            disabled={isThisRowSaving || isAnyRowSaving}
                            onChange={(e) =>
                              handlePenaltyFeeChange(index, e.target.value)
                            }
                            className="w-28 h-10 text-right px-2.5 py-1 border border-neutral-200 rounded-md text-xs font-mono font-bold focus-visible:ring-1 focus-visible:ring-neutral-400 focus-visible:ring-offset-0 tabular-nums disabled:bg-neutral-50 disabled:text-neutral-500 touch-manipulation"
                          />
                          {/* Per-row ✓ save. Disabled while any other row is
                              mid-save or while the whole-form submit is in
                              flight, to keep the contract clear: one mutation
                              per row at a time. */}
                          <Button
                            type="button"
                            onClick={() => void saveOneComponent(index)}
                            disabled={
                              isThisRowSaving ||
                              isAnyRowSaving ||
                              submitting
                            }
                            aria-busy={isThisRowSaving}
                            aria-label={`Lưu phí phạt cho ${item.componentName || "linh kiện"}`}
                            // `h-10 w-10` (40×40px) keeps the per-row ✓
                            // above the WCAG 2.5.8 AA minimum of 24×24 and
                            // within reach of the 44×44 AAA target on
                            // mobile. The displayed input is `h-10` so
                            // the row's input+button pair share one
                            // visual height. `touch-manipulation` cuts
                            // the 300ms tap delay on legacy mobile.
                            className="h-10 w-10 p-0 rounded-md border border-neutral-200 bg-white text-neutral-700 hover:bg-neutral-50 hover:text-neutral-900 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center touch-manipulation focus-visible:ring-1 focus-visible:ring-neutral-400 focus-visible:ring-offset-0"
                          >
                            {isThisRowSaving ? (
                              <span
                                className="w-4 h-4 border-2 border-neutral-300 border-t-neutral-700 rounded-full animate-spin"
                                aria-hidden
                              />
                            ) : (
                              <Check className="w-4 h-4" aria-hidden />
                            )}
                          </Button>
                        </div>
                        {perPieceFee !== null && (
                          // Per-piece hint. Wraps to its own line on
                          // narrow viewports (the row is `flex-wrap`,
                          // so `basis-full` consumes the full width).
                          // The hint is the "decision aid" the
                          // manager needs: they read the per-piece
                          // number against comparable components
                          // and adjust the input until the hint
                          // feels fair.
                          <p className="basis-full text-[10px] text-neutral-500 leading-snug -mt-1">
                            ={" "}
                            <span className="font-mono font-bold text-neutral-700 tabular-nums">
                              {formatVND(perPieceFee)}
                            </span>{" "}
                            / món
                          </p>
                        )}
                        {thisRowError && (
                          <p
                            role="alert"
                            className="basis-full text-[11px] font-semibold text-red-700 break-words [overflow-wrap:anywhere]"
                          >
                            {thisRowError.message}
                          </p>
                        )}
                      </li>
                    );
                  })}
                </ul>
              ) : (
                <p className="text-xs font-medium text-neutral-400 italic p-4 border border-dashed border-neutral-200 rounded-xl text-center bg-neutral-50/40">
                  Tựa game này không có cấu trúc linh kiện riêng lẻ để điều
                  chỉnh.
                </p>
              )}
            </fieldset>

            <AlertDialogFooter className="pt-3 border-t border-neutral-100 flex sm:items-center gap-2">
              <AlertDialogCancel
                type="button"
                onClick={onClose}
                disabled={submitting}
                className="h-10 border border-neutral-200 bg-white text-neutral-700 font-semibold text-xs uppercase tracking-wider rounded-lg px-5 hover:bg-neutral-50 hover:text-neutral-900 transition-colors disabled:opacity-50 touch-manipulation focus-visible:ring-1 focus-visible:ring-neutral-400 focus-visible:ring-offset-0"
              >
                Hủy
              </AlertDialogCancel>

              <Button
                type="submit"
                disabled={submitting || loading}
                aria-busy={submitting}
                className="h-10 bg-gradient-to-b from-[#2A2A2A] to-[#1A1A1A] text-white font-semibold text-xs uppercase tracking-wider rounded-lg border border-neutral-950 border-t-neutral-700 shadow-[0px_1px_2px_rgba(0,0,0,0.15),inset_0px_1px_0px_rgba(255,255,255,0.08)] hover:from-[#333333] hover:to-[#222222] active:from-[#1A1A1A] active:to-[#111111] disabled:from-neutral-200 disabled:to-neutral-200 disabled:text-neutral-400 disabled:border-neutral-200 disabled:shadow-none transition-all duration-150 flex items-center justify-center gap-2 px-6 touch-manipulation focus-visible:ring-1 focus-visible:ring-neutral-400 focus-visible:ring-offset-0"
              >
                {submitting ? (
                  <>
                    <span
                      className="w-4 h-4 border-2 border-white/20 border-t-white rounded-full animate-spin"
                      aria-hidden
                    />
                    <span>ĐANG LƯU…</span>
                  </>
                ) : (
                  "Lưu thay đổi"
                )}
              </Button>
            </AlertDialogFooter>
          </form>
        )}
      </AlertDialogContent>
    </AlertDialog>
  );
}