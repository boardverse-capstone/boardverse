"use client";

import { useState } from "react";
import {
  Edit3,
  ListChecks,
  Loader2,
  ScrollText,
} from "lucide-react";
import { Button } from "@/components/ui/button";
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
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";
import {
  useDepositRefundPolicy,
  useUpdateDepositRefundPolicy,
} from "../../hooks/useCafeMe";
import type { RefundPolicy } from "../../types/manager-cafe.interface";

export interface DepositRefundPolicySectionProps {
  cafeId: string;
}

const POLICY_OPTIONS: ReadonlyArray<{
  value: RefundPolicy;
  label: string;
  hint: string;
}> = [
  {
    value: "Full",
    label: "Hoàn 100%",
    hint: "Khách được hoàn lại toàn bộ tiền cọc khi huỷ booking.",
  },
  {
    value: "Partial",
    label: "Hoàn một phần (theo bậc thang)",
    hint: "Phần trăm hoàn phụ thuộc số giờ trước giờ chơi.",
  },
  {
    value: "None",
    label: "Không hoàn (tịch thu)",
    hint: "Toàn bộ tiền cọc được giữ lại khi khách huỷ.",
  },
];

export function DepositRefundPolicySection({
  cafeId,
}: DepositRefundPolicySectionProps) {
  const policyQuery = useDepositRefundPolicy(cafeId);
  const updateMutation = useUpdateDepositRefundPolicy(cafeId);
  const [editOpen, setEditOpen] = useState(false);

  const policy = policyQuery.data;
  const isLoading = policyQuery.isLoading;

  return (
    <section
      aria-labelledby="refund-policy"
      className="rounded-2xl border border-neutral-200 bg-white p-5 space-y-3"
    >
      <div className="pb-1 border-b border-neutral-100 flex items-baseline gap-2">
        <ScrollText
          className="h-4 w-4 text-neutral-600 shrink-0"
          aria-hidden
        />
        <h2 id="refund-policy" className="text-section-header">
          Chính sách hoàn cọc
        </h2>
        <Button
          type="button"
          variant="ghost"
          size="sm"
          onClick={() => setEditOpen(true)}
          disabled={isLoading || updateMutation.isPending}
          className="ml-auto h-8 px-2 text-xs font-medium text-neutral-600 hover:text-neutral-900"
        >
          <Edit3 className="h-3.5 w-3.5 mr-1" aria-hidden />
          {policy ? "Sửa" : "Thiết lập"}
        </Button>
      </div>

      {isLoading ? (
        <div
          role="status"
          aria-live="polite"
          className="flex items-center gap-2 text-helper px-3 py-2 rounded-lg border border-neutral-200 bg-neutral-50"
        >
          <Loader2 className="h-3.5 w-3.5 animate-spin" aria-hidden />
          Đang tải chính sách…
        </div>
      ) : !policy ? (
        <p className="text-helper">
          Chưa thiết lập chính sách hoàn cọc. Booking bị huỷ sẽ theo rule mặc
          định của hệ thống.
        </p>
      ) : (
        <div className="space-y-2">
          <p className="text-sm font-semibold text-neutral-900">
            {POLICY_OPTIONS.find((o) => o.value === policy.policy)?.label ??
              policy.policy}
          </p>
          {policy.policy === "Partial" && policy.tiers && policy.tiers.length > 0 && (
            <div className="rounded-lg bg-neutral-50/60 border border-neutral-100 p-3">
              <p className="text-sub-label mb-1.5">Bậc thang hoàn</p>
              <ul className="space-y-1 text-sm text-neutral-800">
                {policy.tiers.map((tier, idx) => (
                  <li
                    key={`${tier.afterHours}-${idx}`}
                    className="flex items-baseline justify-between gap-3"
                  >
                    <span>Huỷ trước giờ chơi ≥ {tier.afterHours} giờ</span>
                    <span className="font-semibold tabular-nums">
                      {tier.refundPercentage}%
                    </span>
                  </li>
                ))}
              </ul>
            </div>
          )}
          {policy.policy === "Partial" &&
            (!policy.tiers || policy.tiers.length === 0) && (
              <p className="text-helper">
                Chưa cấu hình bậc thang — mọi trường hợp sẽ hoàn 0%.
              </p>
            )}
          {policy.updatedAt && (
            <p className="text-[11px] text-neutral-500 tabular-nums pt-1">
              Cập nhật lúc {formatRelative(policy.updatedAt)}
            </p>
          )}
        </div>
      )}

      <RefundPolicyEditDialog
        key={policy?.updatedAt ?? "no-policy"}
        open={editOpen}
        onOpenChange={setEditOpen}
        policy={policy}
        mutation={updateMutation}
      />
    </section>
  );
}

function RefundPolicyEditDialog({
  open,
  onOpenChange,
  policy,
  mutation,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  policy: ReturnType<typeof useDepositRefundPolicy>["data"];
  mutation: ReturnType<typeof useUpdateDepositRefundPolicy>;
}) {
  const [selectedPolicy, setSelectedPolicy] = useState<RefundPolicy>(
    () => policy?.policy ?? "Full",
  );
  const [tiers, setTiers] = useState<
    Array<{ afterHours: string; refundPercentage: string }>
  >(
    () =>
      policy?.tiers?.map((t) => ({
        afterHours: String(t.afterHours),
        refundPercentage: String(t.refundPercentage),
      })) ?? [
        { afterHours: "48", refundPercentage: "100" },
        { afterHours: "24", refundPercentage: "50" },
      ],
  );

  const isSubmitting = mutation.isPending;
  const canSubmit = !isSubmitting;

  function handleSubmit() {
    if (selectedPolicy !== "Partial") {
      mutation.mutate(
        { policy: selectedPolicy, tiers: undefined },
        { onSuccess: () => onOpenChange(false) },
      );
      return;
    }

    const cleaned = tiers
      .map((t) => ({
        afterHours: Number(t.afterHours),
        refundPercentage: Number(t.refundPercentage),
      }))
      .filter(
        (t) =>
          Number.isFinite(t.afterHours) &&
          Number.isFinite(t.refundPercentage) &&
          t.afterHours >= 0 &&
          t.refundPercentage >= 0 &&
          t.refundPercentage <= 100,
      )
      .sort((a, b) => b.afterHours - a.afterHours);

    mutation.mutate(
      { policy: "Partial", tiers: cleaned },
      { onSuccess: () => onOpenChange(false) },
    );
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="bg-white border border-neutral-200 rounded-xl p-5 max-w-md mx-auto text-neutral-900 max-h-[85vh] overflow-y-auto">
        <DialogHeader className="space-y-1.5">
          <DialogTitle className="text-base font-bold tracking-tight">
            Chính sách hoàn cọc
          </DialogTitle>
          <DialogDescription className="text-helper">
            PATCH /api/cafes/&#123;id&#125;/deposit-refund-policy
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          <Field>
            <FieldLabel className="text-sub-label">
              Cách xử lý khi booking bị huỷ
            </FieldLabel>
            <RadioGroup
              value={selectedPolicy}
              onValueChange={(v) => {
                if (v === "Full" || v === "Partial" || v === "None") {
                  setSelectedPolicy(v);
                }
              }}
              className="flex flex-col gap-2"
            >
              {POLICY_OPTIONS.map((opt) => (
                <label
                  key={opt.value}
                  htmlFor={`refund-policy-${opt.value}`}
                  className={cn(
                    "flex items-start gap-3 p-3 rounded-lg border transition-colors cursor-pointer",
                    selectedPolicy === opt.value
                      ? "border-primary bg-primary/5"
                      : "border-neutral-200 bg-white hover:border-neutral-400",
                  )}
                >
                  <RadioGroupItem
                    value={opt.value}
                    id={`refund-policy-${opt.value}`}
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

          {selectedPolicy === "Partial" && (
            <div className="space-y-2 rounded-lg bg-neutral-50/60 border border-neutral-100 p-3">
              <div className="flex items-center gap-1.5">
                <ListChecks className="h-3.5 w-3.5 text-neutral-600" aria-hidden />
                <p className="text-sub-label">Bậc thang hoàn tiền</p>
              </div>
              <FieldDescription className="text-helper">
                Sắp xếp giảm dần theo số giờ trước giờ chơi. Tier đầu tiên là
                rule thoả đầu tiên khi khách huỷ.
              </FieldDescription>
              <ul className="space-y-2 pt-1">
                {tiers.map((tier, idx) => (
                  <li
                    key={idx}
                    className="flex items-center gap-2"
                  >
                    <span className="text-xs text-neutral-600 shrink-0 w-24">
                      Huỷ ≥
                    </span>
                    <Input
                      type="number"
                      min={0}
                      value={tier.afterHours}
                      onChange={(e) => {
                        const v = e.target.value;
                        setTiers((prev) =>
                          prev.map((t, i) =>
                            i === idx ? { ...t, afterHours: v } : t,
                          ),
                        );
                      }}
                      className="h-9 w-20 tabular-nums"
                    />
                    <span className="text-xs text-neutral-600">giờ →</span>
                    <Input
                      type="number"
                      min={0}
                      max={100}
                      value={tier.refundPercentage}
                      onChange={(e) => {
                        const v = e.target.value;
                        setTiers((prev) =>
                          prev.map((t, i) =>
                            i === idx ? { ...t, refundPercentage: v } : t,
                          ),
                        );
                      }}
                      className="h-9 w-20 tabular-nums"
                    />
                    <span className="text-xs text-neutral-600">% hoàn</span>
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      onClick={() =>
                        setTiers((prev) => prev.filter((_, i) => i !== idx))
                      }
                      className="h-8 px-2 text-xs"
                    >
                      Xoá
                    </Button>
                  </li>
                ))}
              </ul>
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() =>
                  setTiers((prev) => [
                    ...prev,
                    { afterHours: "12", refundPercentage: "0" },
                  ])
                }
                className="h-8 text-xs"
              >
                + Thêm bậc
              </Button>
            </div>
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
            disabled={!canSubmit}
            className="h-11 px-5 text-sm font-medium flex items-center justify-center gap-2 w-full sm:w-auto"
          >
            {isSubmitting ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin" aria-hidden />
                Đang lưu…
              </>
            ) : (
              "Lưu chính sách"
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
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