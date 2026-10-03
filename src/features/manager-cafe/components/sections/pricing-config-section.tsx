"use client";

import { useState } from "react";
import {
  Banknote,
  Edit3,
  Loader2,
  Lock,
  Receipt,
  type LucideIcon,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Field,
  FieldDescription,
  FieldLabel,
} from "@/components/ui/field";
import {
  RadioGroup,
  RadioGroupItem,
} from "@/components/ui/radio-group";
import { cn } from "@/lib/utils";
import {
  usePricingConfig,
  useUpdatePricingConfig,
} from "../../hooks/useCafeMe";
import type { BillingModel } from "@/features/partner/types/partner.interface";
import type { PricingConfig } from "../../types/manager-cafe.interface";

export interface PricingConfigSectionProps {
  cafeId: string;
  /** Số phòng riêng hiện tại (fallback khi chưa load pricing config). */
  fallbackPrivateRooms: number;
}

const CURRENCY = new Intl.NumberFormat("vi-VN", {
  style: "currency",
  currency: "VND",
  maximumFractionDigits: 0,
});

function formatVnd(v: number | undefined): string {
  if (v === undefined || !Number.isFinite(v)) return "—";
  return CURRENCY.format(v);
}

const BILLING_OPTIONS: ReadonlyArray<{
  value: BillingModel;
  label: string;
  hint: string;
}> = [
  {
    value: "BY_HOUR",
    label: "Tính phí theo giờ chơi",
    hint: "Khách trả phí theo thời lượng sử dụng phòng và bàn.",
  },
  {
    value: "PER_DRINK",
    label: "Tính phí theo đồ uống",
    hint: "Khách mua đồ uống và chơi board game tại khu vực chung.",
  },
];

export function PricingConfigSection({
  cafeId,
  fallbackPrivateRooms,
}: PricingConfigSectionProps) {
  const pricingQuery = usePricingConfig(cafeId);
  const updateMutation = useUpdatePricingConfig(cafeId);

  const config = pricingQuery.data ?? null;
  const isLoading = pricingQuery.isLoading;
  const isLocked = !!config?.isPricingLocked;

  const [editOpen, setEditOpen] = useState(false);

  const isByHour = (config?.billingModel ?? "BY_HOUR") === "BY_HOUR";
  const isPerDrink = (config?.billingModel ?? "BY_HOUR") === "PER_DRINK";

  return (
    <section
      aria-labelledby="pricing-config"
      className="rounded-2xl border border-neutral-200 bg-white p-5 space-y-3"
    >
      <div className="pb-1 border-b border-neutral-100 flex items-baseline gap-2">
        <Receipt className="h-4 w-4 text-neutral-600 shrink-0" aria-hidden />
        <h2 id="pricing-config" className="text-section-header">
          Cấu hình giá
        </h2>
        {isLocked ? (
          <span
            title="BR-04: chỉ chỉnh khi quán đóng cửa"
            className="ml-auto inline-flex items-center gap-1 text-[10px] font-semibold uppercase tracking-wider px-1.5 py-0.5 rounded border border-amber-200 text-amber-800 bg-amber-50"
          >
            <Lock className="h-3 w-3" aria-hidden />
            Đã khoá
          </span>
        ) : (
          <Button
            type="button"
            variant="ghost"
            size="sm"
            onClick={() => setEditOpen(true)}
            disabled={isLoading || !config}
            className="ml-auto h-8 px-2 text-xs font-medium text-neutral-600 hover:text-neutral-900"
          >
            <Edit3 className="h-3.5 w-3.5 mr-1" aria-hidden />
            Sửa
          </Button>
        )}
      </div>

      {isLoading ? (
        <PricingSkeleton />
      ) : !config ? (
        <p className="text-helper">
          Chưa tải được biểu phí. Làm mới trang để thử lại.
        </p>
      ) : (
        <div className="space-y-3">
          <KVRow
            icon={Banknote}
            label="Cách tính phí"
            value={
              <span className="text-sm font-semibold text-neutral-900">
                {isByHour ? "Theo giờ chơi" : "Theo đơn đồ uống"}
              </span>
            }
          />
          <div className="rounded-lg bg-neutral-50/60 border border-neutral-100 p-3 space-y-1.5">
            <KVRow
              label="Số phòng riêng"
              value={
                <span className="font-semibold tabular-nums">
                  {config.numberOfPrivateRooms.toLocaleString("vi-VN")}
                </span>
              }
            />
            {isByHour && (
              <>
                <KVRow
                  label="Giá giờ đầu"
                  value={
                    <span className="font-semibold tabular-nums">
                      {formatVnd(config.basePrice)}
                    </span>
                  }
                />
                <KVRow
                  label="Phí mỗi khung giờ"
                  value={
                    <span className="font-semibold tabular-nums">
                      {formatVnd(config.tieredBlockRate)}
                    </span>
                  }
                />
                <KVRow
                  label="Độ dài khung giờ"
                  value={
                    <span className="font-semibold tabular-nums">
                      {config.tieredBlockMinutes !== undefined
                        ? `${config.tieredBlockMinutes} phút`
                        : "—"}
                    </span>
                  }
                />
              </>
            )}
            {isPerDrink && (
              <KVRow
                label="Tỷ lệ đặt cọc"
                value={
                  <span className="font-semibold tabular-nums">
                    {config.depositPercentage !== undefined
                      ? `${(config.depositPercentage * 100).toLocaleString("vi-VN")}%`
                      : "—"}
                  </span>
                }
              />
            )}
          </div>
          {config.updatedAt && (
            <p className="text-[11px] text-neutral-500 tabular-nums">
              Cập nhật lúc {formatRelative(config.updatedAt)}
            </p>
          )}
        </div>
      )}

      <PricingEditDialog
        key={config?.updatedAt ?? "no-config"}
        open={editOpen}
        onOpenChange={setEditOpen}
        config={config}
        fallbackPrivateRooms={fallbackPrivateRooms}
        mutation={updateMutation}
        cafeId={cafeId}
      />
    </section>
  );
}

/** Inline edit dialog — giữ shape giống form vận hành. */
function PricingEditDialog({
  open,
  onOpenChange,
  config,
  fallbackPrivateRooms,
  mutation,
  cafeId,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  config: PricingConfig | null;
  fallbackPrivateRooms: number;
  mutation: ReturnType<typeof useUpdatePricingConfig>;
  cafeId: string;
}) {
  const [billingModel, setBillingModel] = useState<BillingModel>(
    () => config?.billingModel ?? "BY_HOUR",
  );
  const [rooms, setRooms] = useState<string>(() =>
    config ? String(config.numberOfPrivateRooms ?? "") : "",
  );
  const [basePrice, setBasePrice] = useState<string>(() =>
    config?.basePrice !== undefined ? String(config.basePrice) : "",
  );
  const [tieredBlockRate, setTieredBlockRate] = useState<string>(() =>
    config?.tieredBlockRate !== undefined ? String(config.tieredBlockRate) : "",
  );
  const [tieredBlockMinutes, setTieredBlockMinutes] = useState<string>(() =>
    config?.tieredBlockMinutes !== undefined
      ? String(config.tieredBlockMinutes)
      : "",
  );
  const [depositPercentage, setDepositPercentage] = useState<string>(() =>
    config?.depositPercentage !== undefined
      ? String(config.depositPercentage * 100)
      : "",
  );

  const isByHour = billingModel === "BY_HOUR";
  const isPerDrink = billingModel === "PER_DRINK";

  const submitDisabled = mutation.isPending || !config;

  function handleSubmit() {
    if (!config) return;
    mutation.mutate(
      {
        billingModel,
        numberOfPrivateRooms: Number(rooms) || 0,
        basePrice: isByHour && basePrice !== "" ? Number(basePrice) : undefined,
        tieredBlockRate:
          isByHour && tieredBlockRate !== "" ? Number(tieredBlockRate) : undefined,
        tieredBlockMinutes:
          isByHour && tieredBlockMinutes !== ""
            ? Number(tieredBlockMinutes)
            : undefined,
        depositPercentage:
          isPerDrink && depositPercentage !== ""
            ? Number(depositPercentage) / 100
            : undefined,
      },
      {
        onSuccess: () => {
          onOpenChange(false);
        },
      },
    );
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="bg-white border border-neutral-200 rounded-xl p-5 max-w-md mx-auto text-neutral-900">
        <DialogHeader className="space-y-1.5">
          <DialogTitle className="text-base font-bold tracking-tight">
            Sửa cấu hình giá
          </DialogTitle>
          <DialogDescription className="text-helper">
            PUT /api/cafes/{cafeId}/pricing-config
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 max-h-[60vh] overflow-y-auto pr-1">
          <Field>
            <FieldLabel className="text-sub-label">
              Cách tính phí cho khách
            </FieldLabel>
            <RadioGroup
              value={billingModel}
              onValueChange={(v) => {
                if (v === "BY_HOUR" || v === "PER_DRINK") setBillingModel(v);
              }}
              className="flex flex-col gap-2"
            >
              {BILLING_OPTIONS.map((opt) => (
                <label
                  key={opt.value}
                  htmlFor={`pricing-billing-${opt.value}`}
                  className={cn(
                    "flex items-start gap-3 p-3 rounded-lg border transition-colors cursor-pointer",
                    billingModel === opt.value
                      ? "border-primary bg-primary/5"
                      : "border-neutral-200 bg-white hover:border-neutral-400",
                  )}
                >
                  <RadioGroupItem
                    value={opt.value}
                    id={`pricing-billing-${opt.value}`}
                    className="mt-0.5"
                  />
                  <div className="flex flex-col gap-0.5">
                    <span className="text-sm font-medium leading-snug text-neutral-900">
                      {opt.label}
                    </span>
                    <span className="text-helper">{opt.hint}</span>
                  </div>
                </label>
              ))}
            </RadioGroup>
          </Field>

          <Field>
            <FieldLabel htmlFor="pricing-rooms" className="text-sub-label">
              Số phòng riêng
            </FieldLabel>
            <Input
              id="pricing-rooms"
              type="number"
              min={0}
              max={500}
              step={1}
              inputMode="numeric"
              value={rooms}
              onChange={(e) => setRooms(e.target.value)}
              placeholder={String(fallbackPrivateRooms || 0)}
              className="w-full h-11 text-base border-neutral-200 rounded-lg focus-visible:ring-2 focus-visible:ring-ring bg-white"
            />
            <FieldDescription className="text-helper">
              Phòng kín cho nhóm khách đặt riêng.
            </FieldDescription>
          </Field>

          {isByHour && (
            <div className="space-y-3 pl-1 border-l-2 border-primary/20">
              <p className="text-sub-label">Giá theo giờ chơi</p>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <Field>
                  <FieldLabel
                    htmlFor="pricing-basePrice"
                    className="text-sub-label"
                  >
                    Giá giờ đầu
                  </FieldLabel>
                  <Input
                    id="pricing-basePrice"
                    type="number"
                    min={0}
                    step={1000}
                    inputMode="numeric"
                    value={basePrice}
                    onChange={(e) => setBasePrice(e.target.value)}
                    placeholder="60000"
                    className="w-full h-11 text-base border-neutral-200 rounded-lg focus-visible:ring-2 focus-visible:ring-ring bg-white"
                  />
                </Field>
                <Field>
                  <FieldLabel
                    htmlFor="pricing-blockMin"
                    className="text-sub-label"
                  >
                    Khung (phút)
                  </FieldLabel>
                  <Input
                    id="pricing-blockMin"
                    type="number"
                    min={1}
                    max={480}
                    step={1}
                    inputMode="numeric"
                    value={tieredBlockMinutes}
                    onChange={(e) => setTieredBlockMinutes(e.target.value)}
                    placeholder="15"
                    className="w-full h-11 text-base border-neutral-200 rounded-lg focus-visible:ring-2 focus-visible:ring-ring bg-white"
                  />
                </Field>
                <Field>
                  <FieldLabel
                    htmlFor="pricing-blockRate"
                    className="text-sub-label"
                  >
                    Phí/khung
                  </FieldLabel>
                  <Input
                    id="pricing-blockRate"
                    type="number"
                    min={0}
                    step={1000}
                    inputMode="numeric"
                    value={tieredBlockRate}
                    onChange={(e) => setTieredBlockRate(e.target.value)}
                    placeholder="20000"
                    className="w-full h-11 text-base border-neutral-200 rounded-lg focus-visible:ring-2 focus-visible:ring-ring bg-white"
                  />
                </Field>
              </div>
            </div>
          )}

          {isPerDrink && (
            <Field>
              <FieldLabel
                htmlFor="pricing-deposit"
                className="text-sub-label"
              >
                Tỷ lệ đặt cọc (%)
              </FieldLabel>
              <Input
                id="pricing-deposit"
                type="number"
                min={0}
                max={100}
                step={0.5}
                inputMode="decimal"
                value={depositPercentage}
                onChange={(e) => setDepositPercentage(e.target.value)}
                placeholder="50"
                className="w-full h-11 text-base border-neutral-200 rounded-lg focus-visible:ring-2 focus-visible:ring-ring bg-white"
              />
            </Field>
          )}
        </div>

        <DialogFooter className="pt-3 sm:flex-row sm:justify-end gap-2">
          <Button
            type="button"
            variant="ghost"
            onClick={() => onOpenChange(false)}
            className="h-11 text-xs font-medium px-4 w-full sm:w-auto"
          >
            Huỷ
          </Button>
          <Button
            type="button"
            onClick={handleSubmit}
            disabled={submitDisabled}
            className="h-11 px-5 text-sm font-medium flex items-center justify-center gap-2 w-full sm:w-auto"
          >
            {mutation.isPending ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin" aria-hidden />
                Đang lưu…
              </>
            ) : (
              "Lưu biểu phí"
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

/* ─── Helpers ─────────────────────────────────────────────────────── */

function KVRow({
  label,
  value,
  icon: Icon,
}: {
  label: string;
  value: React.ReactNode;
  icon?: LucideIcon;
}) {
  return (
    <div className="flex items-baseline justify-between gap-3 py-1.5">
      <span className="inline-flex items-center gap-1.5 text-xs font-medium text-neutral-600 tracking-tight">
        {Icon ? <Icon className="h-3.5 w-3.5" aria-hidden /> : null}
        {label}
      </span>
      <span className="text-sm font-medium text-neutral-900 text-right truncate">
        {value}
      </span>
    </div>
  );
}

function PricingSkeleton() {
  return (
    <div
      role="status"
      aria-live="polite"
      className="flex items-center gap-2 text-helper px-3 py-2 rounded-lg border border-neutral-200 bg-neutral-50"
    >
      <Loader2 className="h-3.5 w-3.5 animate-spin" aria-hidden />
      Đang tải biểu phí…
    </div>
  );
}

function formatRelative(iso: string): string {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return iso;
  const now = Date.now();
  const diff = now - d.getTime();
  const mins = Math.floor(diff / 60_000);
  if (mins < 1) return "vừa xong";
  if (mins < 60) return `${mins} phút trước`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `${hours} giờ trước`;
  const days = Math.floor(hours / 24);
  if (days < 30) return `${days} ngày trước`;
  return d.toLocaleString("vi-VN");
}