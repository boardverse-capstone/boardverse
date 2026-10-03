"use client";

import { useState } from "react";
import {
  Banknote,
  Building2,
  ChevronDown,
  ChevronRight,
  Edit3,
  Loader2,
  Wallet,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Dialog,
  DialogContent,
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

// Giá trị mặc định cố định cho các field kỹ thuật của SePay.
// 3 field này bị ẩn khỏi UI (manager quán hiếm khi cần đổi), nhưng
// vẫn được gửi lên BE để giữ payload đầy đủ theo schema SePay account.
const SEPAY_DEFAULTS = {
  environment: "Production" as const,
  webhookAuthType: "HmacSha256" as const,
  apiBaseUrl: "https://pgapi.sepay.vn/",
};

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
  // ─── Form mode state ──────────────────────────────────────
  const [bankCode, setBankCode] = useState(() => config?.bankCode ?? "");
  const [accountNumber, setAccountNumber] = useState(
    () => config?.accountNumber ?? "",
  );
  const [accountHolder, setAccountHolder] = useState(
    () => config?.accountHolder ?? "",
  );
  // Các field nâng cao — đã được backend accept ở POST nhưng không
  // trả về trong SePayConfig read-model. Default khi edit = giá trị
  // trong JSON template (user có thể đổi trong Form hoặc JSON).
  // `environment`, `webhookAuthType`, `apiBaseUrl` đã được ẩn khỏi UI
  // — luôn gửi giá trị mặc định từ SEPAY_DEFAULTS xuống BE.
  const [secretKey, setSecretKey] = useState<string>(() => "");
  const [webhookToken, setWebhookToken] = useState<string>(() => "");
  const [merchantId, setMerchantId] = useState<string>(() => "");
  // Ẩn mặc định nhóm "Cấu hình SePay" (Environment, API base URL,
  // Webhook auth type, Secret key, Webhook token, Merchant ID) — đây
  // là các field kỹ thuật, manager quán hiếm khi cần đụng. Khi bấm
  // "Hiển thị cấu hình nâng cao" mới bung ra.
  const [showAdvanced, setShowAdvanced] = useState(false);

  const mutation = isCreateMode ? createMutation : updateMutation;
  const isSubmitting = mutation.isPending;

  // Quyết định submit dùng Form data hay JSON data.
  const buildPayloadFromForm = () => ({
    bankCode: bankCode.trim().toUpperCase(),
    accountNumber: accountNumber.trim(),
    accountHolder: accountHolder.trim(),
    // 3 field ẩn — luôn lấy từ SEPAY_DEFAULTS để payload đầy đủ.
    environment: SEPAY_DEFAULTS.environment,
    secretKey: secretKey.trim(),
    webhookToken: webhookToken.trim(),
    webhookAuthType: SEPAY_DEFAULTS.webhookAuthType,
    merchantId: merchantId.trim() || undefined,
    apiBaseUrl: SEPAY_DEFAULTS.apiBaseUrl,
  });

  // Điều kiện cho phép submit.
  const canSubmit =
    bankCode.trim().length > 0 &&
    accountNumber.trim().length >= 6 &&
    accountHolder.trim().length > 0 &&
    !isSubmitting;

  function handleSubmit() {
    if (!canSubmit) return;
    if (isCreateMode) {
      createMutation.mutate(buildPayloadFromForm() as never, {
        onSuccess: () => onOpenChange(false),
      });
      return;
    }
    // Update mode: chỉ gửi 3 field chính (giữ behavior cũ).
    updateMutation.mutate(
      {
        bankCode: bankCode.trim().toUpperCase(),
        accountNumber: accountNumber.trim(),
        accountHolder: accountHolder.trim() || null,
      },
      { onSuccess: () => onOpenChange(false) },
    );
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="bg-white border border-neutral-200 rounded-xl p-5 max-w-lg mx-auto text-neutral-900 max-h-[90vh] overflow-y-auto">
        <DialogHeader className="space-y-1.5">
          <DialogTitle className="text-base font-bold tracking-tight">
            {isCreateMode ? "Thiết lập SePay" : "Cấu hình SePay"}
          </DialogTitle>
          {/* <DialogDescription className="text-helper">
            {isCreateMode
              ? "POST /api/sepay-accounts/my-cafe"
              : "PUT /api/cafes/{id}/sepay-config"}
          </DialogDescription> */}
        </DialogHeader>

        <div className="space-y-3">
          {/* Nhóm 1: Thông tin ngân hàng */}
            <div className="space-y-3 rounded-lg border border-neutral-100 bg-neutral-50/30 p-3">
              <p className="text-[10px] font-bold uppercase tracking-wider text-neutral-500">
                Thông tin ngân hàng
              </p>
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
                  id="accountNumber"
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
                  id="accountHolder"
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

            {/* Nhóm 2: Cấu hình SePay (ẩn mặc định, bấm toggle để bung) */}
            <div className="space-y-3 rounded-lg border border-neutral-100 bg-neutral-50/30 p-3">
              <button
                type="button"
                onClick={() => setShowAdvanced((v) => !v)}
                aria-expanded={showAdvanced}
                aria-controls="sepay-advanced-config"
                className="w-full flex items-center justify-between gap-2 text-left focus:outline-none focus-visible:ring-2 focus-visible:ring-ring rounded-sm"
              >
                <span className="text-[10px] font-bold uppercase tracking-wider text-neutral-500">
                  Cấu hình SePay
                </span>
                <span className="inline-flex items-center gap-1 text-[10px] font-medium text-neutral-500">
                  {showAdvanced ? "Ẩn cấu hình nâng cao" : "Hiển thị cấu hình nâng cao"}
                  {showAdvanced ? (
                    <ChevronDown className="h-3.5 w-3.5" aria-hidden />
                  ) : (
                    <ChevronRight className="h-3.5 w-3.5" aria-hidden />
                  )}
                </span>
              </button>

              {showAdvanced && (
                <div id="sepay-advanced-config" className="space-y-3">
                  <Field>
                    <FieldLabel htmlFor="sepay-merchant" className="text-sub-label">
                      Merchant ID
                    </FieldLabel>
                    <Input
                      id="merchantId"
                      value={merchantId}
                      onChange={(e) => setMerchantId(e.target.value)}
                      placeholder="SP-LIVE-XXXXX"
                      className="w-full h-11 text-base border-neutral-200 rounded-lg focus-visible:ring-2 focus-visible:ring-ring bg-white font-mono text-sm"
                    />
                  </Field>

                  <Field>
                    <FieldLabel htmlFor="sepay-secret" className="text-sub-label">
                      Secret key
                    </FieldLabel>
                    <Input
                      id="secretKey"
                      type="password"
                      value={secretKey}
                      onChange={(e) => setSecretKey(e.target.value)}
                      placeholder="••••••••"
                      autoComplete="off"
                      className="w-full h-11 text-base border-neutral-200 rounded-lg focus-visible:ring-2 focus-visible:ring-ring bg-white font-mono text-sm"
                    />
                    <FieldDescription className="text-helper">
                      Để trống nếu không dùng. Field này không đọc từ server sau
                      khi lưu.
                    </FieldDescription>
                  </Field>

                  <Field>
                    <FieldLabel htmlFor="sepay-webhook" className="text-sub-label">
                      Webhook token
                    </FieldLabel>
                    <Input
                      id="webhookToken"
                      type="password"
                      value={webhookToken}
                      onChange={(e) => setWebhookToken(e.target.value)}
                      placeholder="••••••••"
                      autoComplete="off"
                      className="w-full h-11 text-base border-neutral-200 rounded-lg focus-visible:ring-2 focus-visible:ring-ring bg-white font-mono text-sm"
                    />
                  </Field>

                  <div className="rounded-md border border-neutral-200 bg-white/60 px-3 py-2 text-xs text-neutral-600">
                    <p className="font-medium text-neutral-700">
                      Cấu hình cố định
                    </p>
                    <ul className="mt-1 space-y-0.5 tabular-nums">
                      <li>
                        <span className="text-neutral-500">Environment: </span>
                        <span className="font-medium">
                          {SEPAY_DEFAULTS.environment}
                        </span>
                      </li>
                      <li>
                        <span className="text-neutral-500">Webhook auth: </span>
                        <span className="font-medium">
                          {SEPAY_DEFAULTS.webhookAuthType}
                        </span>
                      </li>
                      <li>
                        <span className="text-neutral-500">API base URL: </span>
                        <span className="font-mono break-all">
                          {SEPAY_DEFAULTS.apiBaseUrl}
                        </span>
                      </li>
                    </ul>
                  </div>
                </div>
              )}
            </div>
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