"use client";

import { useState } from "react";
import {
  Banknote,
  Building2,
  Edit3,
  Loader2,
  Wallet,
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
  useSePayConfig,
  useUpdateSePayConfig,
  useCreateSePayAccount,
} from "../../hooks/useCafeMe";

export interface SePayConfigSectionProps {
  cafeId: string;
}

const BANK_CODE_HINT = "VCB / MB / TCB / ACB / ...";

/** Default values cho các field backend yêu cầu khi tạo account.
 *  Manager chỉ cần nhập 3 field bank info; phần còn lại backend
 *  dùng default / cho phép null. */
const CREATE_DEFAULTS = {
  environment: "Production",
  secretKey: "",
  webhookToken: "",
  merchantId: "",
  apiBaseUrl: "",
} as const;

export function SePayConfigSection({ cafeId }: SePayConfigSectionProps) {
  const sepayQuery = useSePayConfig(cafeId);
  const updateMutation = useUpdateSePayConfig(cafeId);
  const createMutation = useCreateSePayAccount(cafeId);
  const [editOpen, setEditOpen] = useState(false);

  const config = sepayQuery.data;
  const isLoading = sepayQuery.isLoading;
  const isCreateMode = !config;
  const activeMutation = isCreateMode ? createMutation : updateMutation;

  return (
    <section
      aria-labelledby="sepay-config"
      className="rounded-2xl border border-neutral-200 bg-white p-5 space-y-3"
    >
      <div className="pb-1 border-b border-neutral-100 flex items-baseline gap-2">
        <Wallet className="h-4 w-4 text-neutral-600 shrink-0" aria-hidden />
        <h2 id="sepay-config" className="text-section-header">
          Tài khoản SePay
        </h2>
        <Button
          type="button"
          variant="ghost"
          size="sm"
          onClick={() => setEditOpen(true)}
          disabled={isLoading || activeMutation.isPending}
          className="ml-auto h-8 px-2 text-xs font-medium text-neutral-600 hover:text-neutral-900"
        >
          <Edit3 className="h-3.5 w-3.5 mr-1" aria-hidden />
          {isCreateMode ? "Thiết lập" : "Sửa"}
        </Button>
      </div>

      {isLoading ? (
        <div
          role="status"
          aria-live="polite"
          className="flex items-center gap-2 text-helper px-3 py-2 rounded-lg border border-neutral-200 bg-neutral-50"
        >
          <Loader2 className="h-3.5 w-3.5 animate-spin" aria-hidden />
          Đang tải cấu hình SePay…
        </div>
      ) : isCreateMode ? (
        <p className="text-helper">
          Chưa có tài khoản SePay. Nhấn <strong>Thiết lập</strong> để thêm mã
          ngân hàng và số tài khoản nhận thanh toán.
        </p>
      ) : (
        <div className="space-y-2.5">
          <KVRow
            icon={Building2}
            label="Ngân hàng"
            value={
              <span className="font-semibold uppercase tracking-tight">
                {config.bankCode || "—"}
              </span>
            }
          />
          <KVRow
            icon={Banknote}
            label="Số tài khoản"
            value={
              <span className="font-semibold tabular-nums">
                {config.accountNumber || "—"}
              </span>
            }
          />
          {config.accountHolder ? (
            <KVRow
              label="Chủ tài khoản"
              value={
                <span className="font-medium text-neutral-800">
                  {config.accountHolder}
                </span>
              }
            />
          ) : null}
          {config.updatedAt && (
            <p className="text-[11px] text-neutral-500 tabular-nums pt-1">
              Cập nhật lúc {formatRelative(config.updatedAt)}
            </p>
          )}
        </div>
      )}

      <SePayEditDialog
        key={`${isCreateMode ? "create" : "edit"}-${config?.updatedAt ?? "none"}`}
        open={editOpen}
        onOpenChange={setEditOpen}
        config={config}
        isCreateMode={isCreateMode}
        createMutation={createMutation}
        updateMutation={updateMutation}
      />
    </section>
  );
}

function SePayEditDialog({
  open,
  onOpenChange,
  config,
  isCreateMode,
  createMutation,
  updateMutation,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  config: ReturnType<typeof useSePayConfig>["data"];
  isCreateMode: boolean;
  createMutation: ReturnType<typeof useCreateSePayAccount>;
  updateMutation: ReturnType<typeof useUpdateSePayConfig>;
}) {
  const [bankCode, setBankCode] = useState(() => config?.bankCode ?? "");
  const [accountNumber, setAccountNumber] = useState(
    () => config?.accountNumber ?? "",
  );
  const [accountHolder, setAccountHolder] = useState(
    () => config?.accountHolder ?? "",
  );

  const mutation = isCreateMode ? createMutation : updateMutation;
  const isSubmitting = mutation.isPending;
  const canSubmit =
    bankCode.trim().length > 0 &&
    accountNumber.trim().length >= 6 &&
    accountHolder.trim().length > 0 &&
    !isSubmitting;

  function handleSubmit() {
    if (isCreateMode) {
      createMutation.mutate(
        {
          bankCode: bankCode.trim().toUpperCase(),
          accountNumber: accountNumber.trim(),
          accountHolder: accountHolder.trim(),
          environment: CREATE_DEFAULTS.environment,
          secretKey: CREATE_DEFAULTS.secretKey,
          webhookToken: CREATE_DEFAULTS.webhookToken,
          webhookAuthType: undefined,
          merchantId: CREATE_DEFAULTS.merchantId || undefined,
          apiBaseUrl: CREATE_DEFAULTS.apiBaseUrl || undefined,
        },
        {
          onSuccess: () => {
            onOpenChange(false);
          },
        },
      );
      return;
    }
    updateMutation.mutate(
      {
        bankCode: bankCode.trim().toUpperCase(),
        accountNumber: accountNumber.trim(),
        accountHolder: accountHolder.trim() || null,
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
            {isCreateMode ? "Thiết lập SePay" : "Cấu hình SePay"}
          </DialogTitle>
          <DialogDescription className="text-helper">
            {isCreateMode
              ? "POST /api/sepay-accounts/my-cafe"
              : "PUT /api/cafes/{id}/sepay-config"}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-3">
          <Field>
            <FieldLabel htmlFor="sepay-bank" className="text-sub-label">
              Mã ngân hàng
            </FieldLabel>
            <Input
              id="sepay-bank"
              value={bankCode}
              onChange={(e) => setBankCode(e.target.value)}
              placeholder={BANK_CODE_HINT}
              maxLength={16}
              className="w-full h-11 text-base border-neutral-200 rounded-lg focus-visible:ring-2 focus-visible:ring-ring bg-white uppercase"
            />
            <FieldDescription className="text-helper">
              Tra cứu tại trang SePay nếu không biết mã.
            </FieldDescription>
          </Field>

          <Field>
            <FieldLabel htmlFor="sepay-account" className="text-sub-label">
              Số tài khoản
            </FieldLabel>
            <Input
              id="sepay-account"
              value={accountNumber}
              onChange={(e) => setAccountNumber(e.target.value)}
              placeholder="0123456789"
              inputMode="numeric"
              className="w-full h-11 text-base border-neutral-200 rounded-lg focus-visible:ring-2 focus-visible:ring-ring bg-white tabular-nums"
            />
          </Field>

          <Field>
            <FieldLabel htmlFor="sepay-holder" className="text-sub-label">
              Chủ tài khoản{isCreateMode ? "" : " (tuỳ chọn)"}
            </FieldLabel>
            <Input
              id="sepay-holder"
              value={accountHolder}
              onChange={(e) => setAccountHolder(e.target.value)}
              placeholder="NGUYEN VAN A"
              className="w-full h-11 text-base border-neutral-200 rounded-lg focus-visible:ring-2 focus-visible:ring-ring bg-white"
            />
            <FieldDescription className="text-helper">
              {isCreateMode
                ? "Bắt buộc khi tạo SePay account — dùng để verify giao dịch."
                : "Giúp verify giao dịch khi đối soát."}
            </FieldDescription>
          </Field>
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
            ) : isCreateMode ? (
              "Tạo SePay"
            ) : (
              "Lưu SePay"
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
  icon?: React.ComponentType<{ className?: string }>;
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